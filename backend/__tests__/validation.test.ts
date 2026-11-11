/**
 * Pruebas unitarias de los esquemas de validación del backend.
 *
 * Verifican que los datos inválidos se rechacen y que los válidos se
 * normalicen (defaults, espacios recortados, tipos convertidos).
 */

import { describe, it, expect } from 'vitest';
import {
  ChangePadronSchema,
  PersonSchema,
  RetireVehicleSchema,
  SwapPadronSchema,
  VehicleInputSchema,
  PortalPostCreateSchema,
  UserCreateSchema,
  RoleCreateSchema,
  PadronChangeRequestReviewSchema,
  BackupRestoreSchema,
  BulkCourseSyncSchema,
} from '../../backend/utils/validation.ts';

describe('VehicleInputSchema', () => {
  const valido = {
    padronNumber: 'PAD-001',
    plate: 'ABC-123',
    brand: 'Honda',
    modelYear: 2024,
  };

  it('acepta un vehículo mínimo y aplica los valores por defecto', () => {
    const r = VehicleInputSchema.safeParse(valido);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.status).toBe('ACTIVO');
      expect(r.data.requiresReview).toBe(false);
      expect(r.data.owners).toEqual([]);
    }
  });

  it('rechaza una placa demasiado corta', () => {
    const r = VehicleInputSchema.safeParse({ ...valido, plate: 'AB' });
    expect(r.success).toBe(false);
  });

  it('rechaza un año anterior a 1980', () => {
    const r = VehicleInputSchema.safeParse({ ...valido, modelYear: 1970 });
    expect(r.success).toBe(false);
  });

  it('rechaza un año demasiado futuro', () => {
    const r = VehicleInputSchema.safeParse({ ...valido, modelYear: 2100 });
    expect(r.success).toBe(false);
  });

  it('convierte el año que llega como texto', () => {
    const r = VehicleInputSchema.safeParse({ ...valido, modelYear: '2020' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.modelYear).toBe(2020);
  });

  it('recorta los espacios del padrón', () => {
    const r = VehicleInputSchema.safeParse({ ...valido, padronNumber: '  PAD-002  ' });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.padronNumber).toBe('PAD-002');
  });
});

describe('PersonSchema', () => {
  it('acepta una persona válida', () => {
    const r = PersonSchema.safeParse({
      dni: '41000041',
      fullName: 'Ana Lucía Rojas',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.status).toBe('ACTIVO');
  });

  it('rechaza un DNI muy corto', () => {
    const r = PersonSchema.safeParse({ dni: '12', fullName: 'Ana' });
    expect(r.success).toBe(false);
  });

  it('rechaza un nombre muy corto', () => {
    const r = PersonSchema.safeParse({ dni: '41000041', fullName: 'A' });
    expect(r.success).toBe(false);
  });
});

describe('ChangePadronSchema y SwapPadronSchema', () => {
  it('exige el motivo del cambio', () => {
    const r = ChangePadronSchema.safeParse({ newPadron: 'PAD-099' });
    expect(r.success).toBe(false);
  });

  it('exige la referencia de autorización en un intercambio', () => {
    const r = SwapPadronSchema.safeParse({
      vehicleAId: 1,
      vehicleBId: 2,
      reason: 'Prueba de intercambio',
    });
    expect(r.success).toBe(false);
  });

  it('acepta un intercambio completo', () => {
    const r = SwapPadronSchema.safeParse({
      vehicleAId: 1,
      vehicleBId: 2,
      reason: 'Intercambio por inoperatividad',
      authorizationReference: 'RES-2026-001',
      authorizedBy: 'Lucía Torres',
    });
    expect(r.success).toBe(true);
  });

  it('rechaza identificadores de vehículo no positivos', () => {
    const r = SwapPadronSchema.safeParse({
      vehicleAId: 0,
      vehicleBId: 2,
      reason: 'Intercambio por inoperatividad',
      authorizationReference: 'RES-2026-001',
      authorizedBy: 'Lucía Torres',
    });
    expect(r.success).toBe(false);
  });
});

describe('RetireVehicleSchema', () => {
  it('exige el motivo del retiro', () => {
    expect(RetireVehicleSchema.safeParse({ reason: 'x' }).success).toBe(false);
  });

  it('acepta un motivo válido', () => {
    expect(RetireVehicleSchema.safeParse({ reason: 'Baja por venta' }).success).toBe(true);
  });
});

describe('PortalPostCreateSchema', () => {
  const base = { title: 'Convocatoria', content: 'Contenido del comunicado' };

  it('aplica los valores por defecto', () => {
    const r = PortalPostCreateSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.type).toBe('image');
      expect(r.data.category).toBe('General');
      expect(r.data.badgeColor).toBe('blue');
      expect(r.data.isActive).toBe(true);
    }
  });

  it('rechaza una clave desconocida (no se puede inyectar isAdmin)', () => {
    const r = PortalPostCreateSchema.safeParse({ ...base, isAdmin: true });
    expect(r.success).toBe(false);
  });

  it('rechaza una URL de imagen inválida', () => {
    const r = PortalPostCreateSchema.safeParse({ ...base, mediaUrl: 'no-es-url' });
    expect(r.success).toBe(false);
  });

  it('rechaza una URL con esquema javascript (XSS almacenado)', () => {
    const r = PortalPostCreateSchema.safeParse({ ...base, mediaUrl: 'javascript:alert(1)' });
    expect(r.success).toBe(false);
  });

  it('rechaza una URL con esquema data', () => {
    const r = PortalPostCreateSchema.safeParse({
      ...base,
      mediaUrl: 'data:text/html,<script>alert(1)</script>',
    });
    expect(r.success).toBe(false);
  });

  it('acepta una URL https', () => {
    const r = PortalPostCreateSchema.safeParse({
      ...base,
      mediaUrl: 'https://images.example.com/foto.jpg',
    });
    expect(r.success).toBe(true);
  });

  it('rechaza un color de badge desconocido', () => {
    const r = PortalPostCreateSchema.safeParse({ ...base, badgeColor: 'neon' });
    expect(r.success).toBe(false);
  });

  it('rechaza una fecha con formato incorrecto', () => {
    const r = PortalPostCreateSchema.safeParse({ ...base, startDate: '15/06/2026' });
    expect(r.success).toBe(false);
  });
});

describe('UserCreateSchema', () => {
  it('acepta un usuario válido y normaliza el correo', () => {
    const r = UserCreateSchema.safeParse({
      email: '  Nuevo@Transporte.PE ',
      name: 'Usuario Nuevo',
      password: 'clave1234',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe('nuevo@transporte.pe');
      expect(r.data.role).toBe('operator');
    }
  });

  it('rechaza un correo inválido', () => {
    const r = UserCreateSchema.safeParse({
      email: 'no-es-correo',
      name: 'Usuario Nuevo',
      password: 'clave1234',
    });
    expect(r.success).toBe(false);
  });

  it('rechaza una contraseña de menos de 8 caracteres', () => {
    const r = UserCreateSchema.safeParse({
      email: 'nuevo@transporte.pe',
      name: 'Usuario Nuevo',
      password: 'corta',
    });
    expect(r.success).toBe(false);
  });

  it('rechaza un rol con caracteres no permitidos', () => {
    const r = UserCreateSchema.safeParse({
      email: 'nuevo@transporte.pe',
      name: 'Usuario Nuevo',
      password: 'clave1234',
      role: 'rol con espacios!',
    });
    expect(r.success).toBe(false);
  });
});

describe('RoleCreateSchema', () => {
  it('acepta un rol válido', () => {
    const r = RoleCreateSchema.safeParse({
      id: 'auditor',
      name: 'Auditor',
      permissions: { padron: 'read' },
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.badgeColor).toBe('indigo');
  });

  it('rechaza un permiso con valor desconocido', () => {
    const r = RoleCreateSchema.safeParse({
      id: 'auditor',
      name: 'Auditor',
      permissions: { padron: 'delete' },
    });
    expect(r.success).toBe(false);
  });
});

describe('PadronChangeRequestReviewSchema', () => {
  it('acepta una aprobación sin motivo', () => {
    const r = PadronChangeRequestReviewSchema.safeParse({ approved: true });
    expect(r.success).toBe(true);
  });

  it('exige el motivo al rechazar', () => {
    const r = PadronChangeRequestReviewSchema.safeParse({ approved: false });
    expect(r.success).toBe(false);
  });

  it('acepta un rechazo con motivo', () => {
    const r = PadronChangeRequestReviewSchema.safeParse({
      approved: false,
      rejectionReason: 'Falta la autorización firmada',
    });
    expect(r.success).toBe(true);
  });

  it('exige indicar si se aprueba o rechaza', () => {
    const r = PadronChangeRequestReviewSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

describe('BackupRestoreSchema', () => {
  it('exige la confirmación explícita', () => {
    const r = BackupRestoreSchema.safeParse({
      backupData: { data: { vehicles: [] } },
      mode: 'merge',
    });
    expect(r.success).toBe(false);
  });

  it('acepta la confirmación correcta', () => {
    const r = BackupRestoreSchema.safeParse({
      backupData: { data: { vehicles: [] } },
      mode: 'merge',
      confirm: 'RESTAURAR',
    });
    expect(r.success).toBe(true);
  });

  it('rechaza un texto de confirmación incorrecto', () => {
    const r = BackupRestoreSchema.safeParse({
      backupData: { data: { vehicles: [] } },
      confirm: 'si',
    });
    expect(r.success).toBe(false);
  });

  it('rechaza un respaldo sin datos', () => {
    const r = BackupRestoreSchema.safeParse({
      backupData: { meta: {} },
      confirm: 'RESTAURAR',
    });
    expect(r.success).toBe(false);
  });
});

describe('BulkCourseSyncSchema', () => {
  it('exige evaluaciones o identificadores', () => {
    const r = BulkCourseSyncSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it('acepta una lista de identificadores', () => {
    const r = BulkCourseSyncSchema.safeParse({ approvedIdentifiers: ['ABC-123'] });
    expect(r.success).toBe(true);
  });

  it('acepta una lista de evaluaciones', () => {
    const r = BulkCourseSyncSchema.safeParse({
      evaluations: [{ driverId: 1, passed: true }],
    });
    expect(r.success).toBe(true);
  });

  it('rechaza una evaluación sin el campo passed', () => {
    const r = BulkCourseSyncSchema.safeParse({ evaluations: [{ driverId: 1 }] });
    expect(r.success).toBe(false);
  });
});
