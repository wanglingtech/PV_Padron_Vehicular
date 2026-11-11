/**
 * Pruebas unitarias de `shared/date-utils.ts`.
 *
 * Son la lógica de semáforo de vencimientos: un error aquí muestra un
 * documento como vigente cuando ya venció.
 */

import { describe, it, expect } from 'vitest';
import { evaluateDocumentDate, evaluateVehicleOverallStatus } from '../../shared/date-utils.ts';

describe('evaluateDocumentDate', () => {
  it('marca sin_informacion cuando no hay fecha', () => {
    const r = evaluateDocumentDate(null, '2026-06-15');
    expect(r.status).toBe('sin_informacion');
    expect(r.daysRemaining).toBeNull();
    expect(r.isUrgent).toBe(false);
  });

  it('marca sin_informacion cuando la fecha está vacía', () => {
    const r = evaluateDocumentDate('   ', '2026-06-15');
    expect(r.status).toBe('sin_informacion');
  });

  it('detecta una fecha inválida y la marca urgente', () => {
    const r = evaluateDocumentDate('no-es-fecha', '2026-06-15');
    expect(r.status).toBe('sin_informacion');
    expect(r.label).toBe('Fecha no válida');
    expect(r.isUrgent).toBe(true);
  });

  it('marca vencida una fecha pasada', () => {
    const r = evaluateDocumentDate('2026-06-10', '2026-06-15');
    expect(r.status).toBe('vencido');
    expect(r.daysRemaining).toBe(-5);
    expect(r.isUrgent).toBe(true);
    expect(r.label).toContain('hace 5 días');
  });

  it('usa el singular en "hace 1 día"', () => {
    const r = evaluateDocumentDate('2026-06-14', '2026-06-15');
    expect(r.label).toBe('Vencido (hace 1 día)');
  });

  it('marca próximo a vencer dentro de 30 días', () => {
    const r = evaluateDocumentDate('2026-07-01', '2026-06-15');
    expect(r.status).toBe('proximo');
    expect(r.daysRemaining).toBe(16);
    expect(r.isUrgent).toBe(false);
  });

  it('considera urgente lo que vence en 7 días o menos', () => {
    const r = evaluateDocumentDate('2026-06-20', '2026-06-15');
    expect(r.status).toBe('proximo');
    expect(r.isUrgent).toBe(true);
  });

  it('marca "Vence hoy" el día de la vencimiento', () => {
    const r = evaluateDocumentDate('2026-06-15', '2026-06-15');
    expect(r.status).toBe('proximo');
    expect(r.daysRemaining).toBe(0);
    expect(r.label).toBe('Vence hoy');
  });

  it('usa el singular en "Vence en 1 día"', () => {
    const r = evaluateDocumentDate('2026-06-16', '2026-06-15');
    expect(r.label).toBe('Vence en 1 día');
  });

  it('marca vigente más allá de 30 días', () => {
    const r = evaluateDocumentDate('2026-12-31', '2026-06-15');
    expect(r.status).toBe('vigente');
    expect(r.daysRemaining).toBe(199);
    expect(r.isUrgent).toBe(false);
  });
});

describe('evaluateVehicleOverallStatus', () => {
  const HOY = '2026-06-15';

  const todosVigentes = {
    insuranceExp: '2026-12-31',
    inspectionExp: '2026-12-31',
    courseExp: '2026-12-31',
    licenseExp: '2026-12-31',
  };

  it('prioriza el estado vencido sobre cualquier otro', () => {
    const r = evaluateVehicleOverallStatus(
      {
        ...todosVigentes,
        insuranceExp: '2026-01-01',
      },
      HOY
    );
    expect(r.status).toBe('vencido');
    expect(r.label).toBe('Documentos Vencidos');
  });

  it('detecta próximo a vencer', () => {
    const r = evaluateVehicleOverallStatus(
      {
        ...todosVigentes,
        courseExp: '2026-06-20',
      },
      HOY
    );
    expect(r.status).toBe('proximo');
    expect(r.label).toBe('Próximo a Vencer');
  });

  it('marca requiere revisión cuando ningún documento está en problemas', () => {
    const r = evaluateVehicleOverallStatus(
      {
        ...todosVigentes,
        requiresReview: true,
      },
      HOY
    );
    expect(r.status).toBe('revision');
    expect(r.label).toBe('Dato Requiere Revisión');
  });

  it('la revisión no tapa un documento vencido', () => {
    const r = evaluateVehicleOverallStatus(
      {
        ...todosVigentes,
        requiresReview: true,
        licenseExp: '2026-02-02',
      },
      HOY
    );
    expect(r.status).toBe('vencido');
  });

  it('informa documentación al día cuando todo está vigente', () => {
    const r = evaluateVehicleOverallStatus(todosVigentes, HOY);
    expect(r.status).toBe('vigente');
    expect(r.label).toBe('Documentación al Día');
  });

  it('informa documentación incompleta si falta algún documento', () => {
    const r = evaluateVehicleOverallStatus(
      {
        insuranceExp: '2026-12-31',
        inspectionExp: '2026-12-31',
        courseExp: null,
        licenseExp: null,
      },
      HOY
    );
    expect(r.status).toBe('sin_informacion');
    expect(r.label).toBe('Documentación Incompleta');
  });
});
