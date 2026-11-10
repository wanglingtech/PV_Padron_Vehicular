/**
 * Smoke test de la API del Padrón Vehicular.
 *
 * Uso:
 *   npm run dev        (en otra terminal)
 *   npm run smoke
 *
 * Variables opcionales:
 *   SMOKE_BASE_URL=http://localhost:3000
 *
 * Requiere que AUTH_DEV_MODE=true o NODE_ENV!=production para usar los
 * tokens `dev-<rol>-token`. El script NO crea datos: las escrituras usan
 * cuerpos inválidos para verificar que el RBAC responde antes de validar.
 */

const BASE_URL = process.env.SMOKE_BASE_URL || 'http://localhost:3000';

const results = [];

const request = async (path, { token, role, method = 'GET', body } = {}) => {
  const headers = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (role) headers['x-user-role'] = role;
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

  return { status: response.status, data };
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
  } catch (error) {
    record(name, false, `error de red: ${error.message}`);
  }
};

const expectNotStatus = async (name, path, options, forbidden) => {
  try {
    const res = await request(path, options);
    const ok = res.status !== forbidden;
    record(name, ok, `HTTP ${res.status}${ok ? '' : ` (no esperado ${forbidden})`}`);
  } catch (error) {
    record(name, false, `error de red: ${error.message}`);
  }
};

const main = async () => {
  console.log(`\nSmoke test contra ${BASE_URL}\n`);

  // 1. Salud y lectura pública
  const health = await request('/api/health').catch((error) => ({ status: 0, data: { error: error.message } }));
  const healthOk = health.status === 200 && health.data?.database === 'up';
  record('Health de la API y PostgreSQL', healthOk, `HTTP ${health.status} · database=${health.data?.database ?? 'n/d'}`);
  if (!healthOk) {
    console.error('\nLa API no está arriba. Ejecuta "npm run dev" en otra terminal.\n');
    process.exit(1);
  }

  await expectStatus('Listado público de vehículos', '/api/vehicles?page=1&limit=1', {}, 200);
  await expectStatus('Portal público de publicaciones', '/api/portal/posts', {}, 200);

  // 2. Autenticación
  await expectStatus('Sin credenciales rechaza usuarios', '/api/users', {}, 401);
  await expectStatus('Administrador puede listar usuarios', '/api/users', { token: 'dev-admin-token' }, 200);
  await expectStatus('Gerente puede listar usuarios', '/api/users', { token: 'dev-gerente-token' }, 200);
  await expectStatus('Operario NO puede listar usuarios', '/api/users', { token: 'dev-operator-token' }, 403);

  // 3. RBAC de escritura por módulo
  await expectStatus(
    'Operario NO puede registrar unidades',
    '/api/vehicles',
    { method: 'POST', token: 'dev-operator-token', body: {} },
    403
  );
  await expectNotStatus(
    'Registrador SÍ pasa el control de registro',
    '/api/vehicles',
    { method: 'POST', token: 'dev-registrador-token', body: {} },
    403
  );
  await expectStatus(
    'Operario NO puede publicar en el portal',
    '/api/portal/posts',
    { method: 'POST', token: 'dev-operator-token', body: {} },
    403
  );
  await expectNotStatus(
    'Secretaría SÍ pasa el control del portal',
    '/api/portal/posts',
    { method: 'POST', token: 'dev-secretaria-token', body: {} },
    403
  );

  // 4. RBAC de módulos sensibles
  await expectStatus('Operario NO accede a backup', '/api/backup/stats', { token: 'dev-operator-token' }, 403);
  await expectStatus('Tesorero SÍ consulta backup (lectura)', '/api/backup/stats', { token: 'dev-tesorero-token' }, 200);
  await expectStatus('Tesorero NO exporta backup completo', '/api/backup/export', { token: 'dev-tesorero-token' }, 403);

  // 5. Lecturas permitidas por rol
  await expectStatus('Operario consulta dashboard', '/api/dashboard/stats', { token: 'dev-operator-token' }, 200);
  await expectStatus('Fiscalizador consulta vencimientos', '/api/expirations', { token: 'dev-fiscalizador-token' }, 200);
  await expectStatus('Operario consulta directorio', '/api/contacts', { token: 'dev-operator-token' }, 200);
  await expectStatus('Operario consulta auditoría (solo lectura)', '/api/audit-logs?limit=1', { token: 'dev-operator-token' }, 200);

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
