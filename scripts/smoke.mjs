/**
 * Smoke test de la API del Padrón Vehicular.
 *
 * Uso:
 *   npm run dev        (en otra terminal)
 *   npm run smoke
 *
 * Variables opcionales:
 *   SMOKE_BASE_URL=http://localhost:3000
 *   SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD
 *
 * Valida autenticación real (argon2 + JWT en cookie HttpOnly y Bearer),
 * RBAC por módulo y que la API nunca devuelva contraseñas. El script NO crea
 * datos: las escrituras usan cuerpos inválidos para verificar que el RBAC
 * responde antes de la validación de negocio.
 */

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

const ACCOUNTS = {
  admin: {
    email: process.env.SMOKE_ADMIN_EMAIL || 'admin@transporte.pe',
    password: process.env.SMOKE_ADMIN_PASSWORD || 'admin123',
  },
  gerente: { email: 'gerencia@transporte.pe', password: 'gerencia123' },
  operator: { email: 'operador@transporte.pe', password: 'operador123' },
  tesorero: { email: 'finanzas@transporte.pe', password: 'tesorero123' },
  fiscalizador: { email: 'fiscalizacion@transporte.pe', password: 'fiscalizador123' },
  secretaria: { email: 'secretaria@transporte.pe', password: 'secretaria123' },
  registrador: { email: 'registro@transporte.pe', password: 'registro123' },
};

const results = [];

const request = async (path, { token, cookie, method = 'GET', body } = {}) => {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  // Solo se guarda el par nombre=valor para reenviarlo como Cookie.
  const setCookie = response.headers.get('set-cookie');
  const cookieHeader = setCookie ? setCookie.split(';')[0] : null;

  return { status: response.status, data, cookie: cookieHeader };
};

const record = (name, ok, detail) => {
  results.push({ name, ok, detail });
  const icon = ok ? 'OK  ' : 'FAIL';
  console.log(`[${icon}] ${name}${detail ? ` -> ${detail}` : ''}`);
};

const expectStatus = async (name, path, options, expected) => {
  try {
    const res = await request(path, options);
    const expectedList = Array.isArray(expected) ? expected : [expected];
    const ok = expectedList.includes(res.status);
    record(name, ok, `HTTP ${res.status}${ok ? '' : ` (esperado ${expectedList.join('/')})`}`);
    return res;
  } catch (error) {
    record(name, false, `error de red: ${error.message}`);
    return { status: 0, data: null };
  }
};

const expectNotStatus = async (name, path, options, forbidden) => {
  try {
    const res = await request(path, options);
    const ok = res.status !== forbidden;
    record(name, ok, `HTTP ${res.status}${ok ? '' : ` (no esperado ${forbidden})`}`);
    return res;
  } catch (error) {
    record(name, false, `error de red: ${error.message}`);
    return { status: 0, data: null };
  }
};

/** Inicia sesión real y devuelve token Bearer + cookie de sesión. */
const login = async (key) => {
  const account = ACCOUNTS[key];
  try {
    const res = await request('/api/auth/login', {
      method: 'POST',
      body: { email: account.email, password: account.password },
    });

    if (res.status !== 200 || !res.data?.token || !res.cookie) {
      record(`Login de ${key}`, false, `HTTP ${res.status}`);
      return { token: null, cookie: null, user: null };
    }

    record(`Login de ${key}`, true, `HTTP 200 · rol=${res.data.user?.role}`);
    return { token: res.data.token, cookie: res.cookie, user: res.data.user };
  } catch (error) {
    record(`Login de ${key}`, false, `error de red: ${error.message}`);
    return { token: null, cookie: null, user: null };
  }
};

const main = async () => {
  console.log(`\nSmoke test contra ${BASE_URL}\n`);

  // 1. Salud y lectura pública
  const health = await request('/api/health').catch((error) => ({
    status: 0,
    data: { error: error.message },
  }));
  const healthOk = health.status === 200 && health.data?.database === 'up';
  record(
    'Health de la API y PostgreSQL',
    healthOk,
    `HTTP ${health.status} · database=${health.data?.database ?? 'n/d'}`
  );
  if (!healthOk) {
    console.error('\nLa API no está arriba. Ejecuta "npm run dev" en otra terminal.\n');
    process.exit(1);
  }

  await expectStatus('Listado público de vehículos', '/api/vehicles?page=1&limit=1', {}, 200);
  await expectStatus('Portal público de publicaciones', '/api/portal/posts', {}, 200);

  // 2. Autenticación real
  await expectStatus('Sin credenciales rechaza usuarios', '/api/users', {}, 401);
  await expectStatus(
    'Contraseña incorrecta es rechazada',
    '/api/auth/login',
    { method: 'POST', body: { email: ACCOUNTS.admin.email, password: 'clave-incorrecta' } },
    401
  );
  await expectStatus(
    'Correo inexistente es rechazado',
    '/api/auth/login',
    { method: 'POST', body: { email: 'no-existe@transporte.pe', password: 'cualquiera' } },
    401
  );

  const admin = await login('admin');
  if (!admin.token) {
    console.error('\nNo se pudo iniciar sesión como administrador. Revisa el seed de la base.\n');
    process.exit(1);
  }

  // La cookie HttpOnly debe restaurar la sesión sin Bearer.
  const meCookie = await expectStatus(
    'La cookie HttpOnly restaura la sesión',
    '/api/auth/me',
    { cookie: admin.cookie },
    200
  );
  record(
    'La cookie no expone el hash de la contraseña',
    meCookie.status === 200 && !('password' in (meCookie.data?.user || {})),
    'respuesta de /api/auth/me'
  );

  await expectStatus(
    'El token Bearer autentica la sesión',
    '/api/auth/me',
    { token: admin.token },
    200
  );
  await expectStatus(
    'Un token inválido es rechazado',
    '/api/auth/me',
    { token: 'token-invalido' },
    401
  );

  // 3. La API nunca devuelve contraseñas
  const usersRes = await expectStatus(
    'Administrador puede listar usuarios',
    '/api/users',
    { token: admin.token },
    200
  );
  const users = Array.isArray(usersRes.data) ? usersRes.data : [];
  const leaksPassword = users.some(
    (u) => u && ('password' in u || 'passwordHash' in u)
  );
  record(
    'El listado de usuarios no incluye contraseñas',
    users.length > 0 && !leaksPassword,
    `${users.length} usuarios · fuga=${leaksPassword}`
  );

  // 4. RBAC por rol con sesiones reales
  const gerente = await login('gerente');
  const operator = await login('operator');
  const tesorero = await login('tesorero');
  const fiscalizador = await login('fiscalizador');
  const secretaria = await login('secretaria');
  const registrador = await login('registrador');

  await expectStatus('Gerente puede listar usuarios', '/api/users', { token: gerente.token }, 200);
  await expectStatus('Operario NO puede listar usuarios', '/api/users', { token: operator.token }, 403);

  // 5. RBAC de escritura por módulo
  await expectStatus(
    'Operario NO puede registrar unidades',
    '/api/vehicles',
    { method: 'POST', token: operator.token, body: {} },
    403
  );
  await expectNotStatus(
    'Registrador SÍ pasa el control de registro',
    '/api/vehicles',
    { method: 'POST', token: registrador.token, body: {} },
    403
  );
  await expectStatus(
    'Operario NO puede publicar en el portal',
    '/api/portal/posts',
    { method: 'POST', token: operator.token, body: {} },
    403
  );
  await expectNotStatus(
    'Secretaría SÍ pasa el control del portal',
    '/api/portal/posts',
    { method: 'POST', token: secretaria.token, body: {} },
    403
  );

  // 6. RBAC de módulos sensibles
  await expectStatus('Operario NO accede a backup', '/api/backup/stats', { token: operator.token }, 403);
  await expectStatus('Tesorero SÍ consulta backup (lectura)', '/api/backup/stats', { token: tesorero.token }, 200);
  await expectStatus('Tesorero NO exporta backup completo', '/api/backup/export', { token: tesorero.token }, 403);

  // 7. Lecturas permitidas por rol
  await expectStatus('Operario consulta dashboard', '/api/dashboard/stats', { token: operator.token }, 200);
  await expectStatus('Fiscalizador consulta vencimientos', '/api/expirations', { token: fiscalizador.token }, 200);
  await expectStatus('Operario consulta directorio', '/api/contacts', { token: operator.token }, 200);
  await expectStatus(
    'Operario consulta auditoría (solo lectura)',
    '/api/audit-logs?limit=1',
    { token: operator.token },
    200
  );

  // 8. Cierre de sesión
  await expectStatus('Cierre de sesión', '/api/auth/logout', { method: 'POST', cookie: admin.cookie }, 200);

  const failed = results.filter((r) => !r.ok);
  console.log(`\nResumen: ${results.length - failed.length}/${results.length} verificaciones correctas.`);
  if (failed.length > 0) {
    console.log('\nFallos:');
    failed.forEach((f) => console.log(` - ${f.name}: ${f.detail}`));
    process.exit(1);
  }
  console.log('Smoke test completado sin fallos.\n');
};

main().catch((error) => {
  console.error('Error inesperado en el smoke test:', error);
  process.exit(1);
});
