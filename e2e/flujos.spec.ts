/**
 * Pruebas E2E de los flujos críticos del sistema.
 *
 * Cubren lo que un fallo dejaría inservible: entrar, dar de alta una unidad,
 * intercambiar un padrón e importar un Excel. Cada flujo se ejecuta contra la
 * aplicación real (no contra mocks).
 */

import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import ExcelJS from 'exceljs';

/** Credenciales de demostración sembradas por el seed. */
const ADMIN = { email: 'admin@transporte.pe', password: 'admin123' };
const OPERADOR = { email: 'operador@transporte.pe', password: 'operador123' };

/** Inicia sesión en la aplicación real. */
async function iniciarSesion(page: Page, cuenta = ADMIN) {
  await page.goto('/');
  await page.getByLabel('Correo Electrónico').fill(cuenta.email);
  await page.getByLabel('Contraseña').fill(cuenta.password);
  await page.getByRole('button', { name: 'Ingresar al sistema' }).click();
  await expect(page.locator('main')).toBeVisible({ timeout: 20_000 });
}

/** Espera a que el sidebar haya cargado los módulos. */
async function esperarSidebar(page: Page) {
  await expect(page.getByRole('button', { name: 'Padrón Vehicular' })).toBeVisible({
    timeout: 20_000,
  });
}

/**
 * Crea una unidad usando el `fetch` del navegador (misma sesión y cookies que
 * la interfaz). Evita reutilizar conexiones keep-alive del cliente HTTP de
 * Playwright, que pueden quedar cerradas por el servidor y devolver ECONNRESET.
 */
async function crearUnidad(page: Page, padronNumber: string, plate: string) {
  const resultado = await page.evaluate(
    async (payload) => {
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });
      return { status: res.status, body: await res.text() };
    },
    { padronNumber, plate, brand: 'Honda', modelYear: 2024 }
  );

  expect(resultado.status, `Alta de ${padronNumber}/${plate}: ${resultado.body}`).toBe(201);
  return JSON.parse(resultado.body) as { id: number; padronNumber: string; plate: string };
}


test.describe('Acceso y sesión', () => {
  test('el administrador inicia sesión y ve el panel', async ({ page }) => {
    await iniciarSesion(page);
    await esperarSidebar(page);
    await expect(page.getByText('ASOCIACIÓN CENTRAL DE TRANSPORTES EN MOTOTAXIS')).toBeVisible();
  });

  test('una contraseña incorrecta muestra un error y no entra', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Correo Electrónico').fill(ADMIN.email);
    await page.getByLabel('Contraseña').fill('contraseña-incorrecta');
    await page.getByRole('button', { name: 'Ingresar al sistema' }).click();

    // SweetAlert muestra el error y deja el resto de la página en aria-hidden,
    // así que primero se cierra el diálogo y luego se comprueba el login.
    await expect(page.getByText('No se pudo iniciar sesión')).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Cerrar' }).click();
    await expect(page.getByRole('button', { name: 'Ingresar al sistema' })).toBeVisible();
  });

  test('el login no tiene errores de accesibilidad graves', async ({ page }) => {
    await page.goto('/');

    const resultados = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const graves = resultados.violations.filter((v) =>
      ['critical', 'serious'].includes(v.impact ?? '')
    );
    expect(
      graves.map((v) => `${v.id}: ${v.help}`).join('\n')
    ).toBe('');
  });
});

test.describe('Padrón vehicular', () => {
  test('el registrador da de alta una unidad y aparece en el listado', async ({ page }) => {
    await iniciarSesion(page, { email: 'registro@transporte.pe', password: 'registro123' });
    await esperarSidebar(page);

    const padron = `E2E-${Date.now().toString().slice(-6)}`;
    const placa = `E2${Date.now().toString().slice(-5)}`;

    await page.getByRole('button', { name: 'Registrar Unidad' }).click();
    await expect(
      page.getByRole('heading', { name: 'Registrar Nuevo Vehículo en el Padrón' })
    ).toBeVisible({ timeout: 25_000 });

    // Datos obligatorios de la unidad.
    await page.getByPlaceholder('Ej. PAD-001').fill(padron);
    await page.getByPlaceholder('Ej. 1234-5B o ABC-123').fill(placa);
    await page.getByPlaceholder('Ej. BAJAJ, TVS, HONDA, WANXIN').fill('Honda');
    await page.locator('input[type="number"]').first().fill('2024');

    // El alta exige al menos un propietario.
    await page.getByRole('button', { name: '2. Propietarios (1)' }).click();
    await page.getByPlaceholder('Ej. PÉREZ GARCÍA JUAN CARLOS').fill('PEREZ GOMEZ JUAN');
    await page.getByPlaceholder('8 dígitos').fill('12345678');

    await page.getByRole('button', { name: 'Guardar en Padrón' }).click();

    // Vuelve al padrón y la unidad recién creada está en el listado.
    await expect(
      page.getByRole('heading', { name: 'Gestión del Padrón Vehicular' })
    ).toBeVisible({ timeout: 25_000 });
    await expect(page.getByText(padron)).toBeVisible({ timeout: 20_000 });
  });

  test('el padrón no tiene errores de accesibilidad graves', async ({ page }) => {
    await iniciarSesion(page);
    await esperarSidebar(page);
    await page.getByRole('button', { name: 'Padrón Vehicular' }).click();
    await page.waitForTimeout(2500);

    const resultados = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const graves = resultados.violations.filter((v) =>
      ['critical', 'serious'].includes(v.impact ?? '')
    );
    expect(
      graves.map((v) => `${v.id}: ${v.help}`).join('\n')
    ).toBe('');
  });
});

test.describe('Intercambio de padrón', () => {
  test('el administrador intercambia el padrón entre dos unidades', async ({ page }) => {
    const sello = Date.now().toString().slice(-6);
    const padronA = `SWA-${sello}`;
    const plateA = `SA${sello.slice(-4)}`;
    const padronB = `SWB-${sello}`;
    const plateB = `SB${sello.slice(-4)}`;

    await iniciarSesion(page);
    await crearUnidad(page, padronA, plateA);
    await crearUnidad(page, padronB, plateB);
    await esperarSidebar(page);

    await page.getByRole('button', { name: 'Padrón Vehicular' }).click();
    await page
      .getByPlaceholder('Buscar por padrón, placa, DNI, propietario, conductor o n.° de licencia...')
      .fill(padronA);

    // Espera a que el filtro deje solo la fila de la unidad A antes de actuar.
    const filaA = page.getByRole('row', { name: new RegExp(padronA) });
    await expect(filaA).toBeVisible({ timeout: 15_000 });
    await filaA.getByTitle('Reasignar o intercambiar padrón').click();

    // Modo intercambio cruzado.
    await page.getByRole('button', { name: 'Intercambiar entre Unidades' }).click();
    await page.getByText(`[${plateB}]`).click();
    await page
      .getByPlaceholder('Ej. Permuta de turno acordada y respaldada por asamblea extraordinaria...')
      .fill('Permuta de unidades acordada en asamblea (prueba E2E).');
    await page
      .getByPlaceholder('Ej. Acta de Directorio N° 08-2024')
      .fill('Acta E2E N° 01-2026');
    await page
      .getByPlaceholder('Ej. Junta Directiva de la Asociación')
      .fill('Junta Directiva');

    await page.getByRole('button', { name: 'Revisar y Confirmar' }).click();
    await page.getByRole('button', { name: 'Confirmar y Ejecutar Cambio' }).click();

    // El intercambio se confirma en pantalla y deja rastro en el historial.
    await expect(page.getByText(/Intercambio completado/)).toBeVisible({ timeout: 20_000 });
  });
});

test.describe('Importación de Excel', () => {
  test('importa un archivo Excel desde la interfaz', async ({ page }) => {
    const sello = Date.now().toString().slice(-6);
    const padron = `IMP-${sello}`;
    const plate = `IM${sello.slice(-4)}`;

    await iniciarSesion(page);
    await esperarSidebar(page);

    await page.getByRole('button', { name: 'Importar (PDF/Excel) & Exportar' }).click();

    // Libro en memoria con las cabeceras que reconoce el importador.
    const libro = new ExcelJS.Workbook();
    const hoja = libro.addWorksheet('Padrón');
    hoja.addRows([
      ['N° Padrón', 'Placa', 'Marca', 'Año', 'Propietario', 'DNI Propietario'],
      [padron, plate, 'Bajaj', 2023, 'PEREZ GOMEZ JUAN', '12345678'],
    ]);
    const buffer = Buffer.from(await libro.xlsx.writeBuffer());

    await page.locator('input[type="file"]').setInputFiles({
      name: 'padron-e2e.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer,
    });

    // La previsualización se abre sola al terminar el análisis.
    await expect(page.getByText('Previsualización y Verificación de Importación')).toBeVisible({
      timeout: 25_000,
    });
    await page
      .getByRole('button', { name: /Confirmar e Incorporar a Módulos/ })
      .click();

    await expect(page.getByText('Importación Exitosa')).toBeVisible({ timeout: 25_000 });
  });
});

test.describe('Control de acceso por rol', () => {
  test('el operario no puede gestionar los usuarios', async ({ page }) => {
    await iniciarSesion(page, OPERADOR);
    await esperarSidebar(page);

    // El módulo de usuarios no debe estar disponible para el operario.
    const moduloUsuarios = page.getByRole('button', { name: 'Cuentas y Accesos' });
    if (await moduloUsuarios.count()) {
      await expect(moduloUsuarios).toHaveCount(0);
    }
  });

  test('la API rechaza una escritura sin sesión', async ({ request }) => {
    const res = await request.post('/api/portal/posts', {
      data: { title: 'Sin sesión', content: 'No debe entrar' },
    });
    expect(res.status()).toBe(401);
  });

  test('la API rechaza un cuerpo inválido', async ({ request }) => {
    const res = await request.post('/api/auth/login', {
      data: { email: 'no-es-correo', password: '' },
    });
    expect(res.status()).toBe(400);
  });
});
