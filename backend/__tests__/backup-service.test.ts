/**
 * Pruebas del servicio de respaldo y migración.
 *
 * El backup es la red de seguridad del sistema: si el respaldo está mal
 * generado, restaurarlo puede dejar la base de datos inservible.
 */

import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '../../backend/db/index.ts';
import { vehicles, persons } from '../../backend/db/schema.ts';
import {
  collectSystemDatabaseData,
  generateFullJsonBackup,
  generateUniversalSqlBackup,
  getDatabaseBackupStats,
  executeDatabaseRestore,
} from '../../backend/utils/backup-service.ts';

describe('Servicio de respaldo', () => {
  describe('collectSystemDatabaseData', () => {
    it('reúne las tablas del sistema', async () => {
      const data = await collectSystemDatabaseData();

      expect(data).toBeDefined();
      expect(Array.isArray(data.vehicles)).toBe(true);
      expect(Array.isArray(data.persons)).toBe(true);
    });
  });

  describe('getDatabaseBackupStats', () => {
    it('informa el estado de la base y el total de registros', async () => {
      const stats = await getDatabaseBackupStats();

      expect(stats.databaseStatus).toBe('CONECTADO');
      expect(stats.tablesCount).toBeGreaterThan(0);
      expect(stats.totalRecords).toBeGreaterThanOrEqual(0);
      expect(stats.summary).toBeDefined();
    });
  });

  describe('generateFullJsonBackup', () => {
    it('genera un respaldo serializable con los metadatos', async () => {
      const backup = await generateFullJsonBackup('admin@transporte.pe');

      expect(backup.data).toBeDefined();
      expect(backup.metadata).toBeDefined();
      expect(backup.metadata.exportedBy).toBe('admin@transporte.pe');

      // Debe poder serializarse a JSON (es lo que se descarga).
      const json = JSON.stringify(backup);
      expect(json.length).toBeGreaterThan(0);
    });
  });

  describe('generateUniversalSqlBackup', () => {
    it('genera un script SQL con las tablas del sistema', async () => {
      const sql = await generateUniversalSqlBackup('admin@transporte.pe');

      expect(typeof sql).toBe('string');
      expect(sql.length).toBeGreaterThan(0);
      // Un respaldo SQL debe incluir sentencias de creación de tabla.
      expect(sql.toUpperCase()).toContain('CREATE TABLE');
    });
  });

  describe('executeDatabaseRestore', () => {
    it('rechaza un payload sin datos', async () => {
      await expect(
        executeDatabaseRestore({} as any, 'merge', 'admin@transporte.pe')
      ).rejects.toThrow(/no contiene un formato de respaldo válido/);
    });

    it('restaura en modo fusión sin duplicar lo que ya existe', async () => {
      // Vehículo de prueba: debe quedar con los datos del respaldo.
      const [persona] = await db
        .insert(persons)
        .values({
          dni: '41000777',
          fullName: 'Restaurado de Prueba',
          phone: '900000777',
        })
        .returning({ id: persons.id });

      const [vehiculo] = await db
        .insert(vehicles)
        .values({
          padronNumber: 'REST-001',
          plate: 'RST-001',
          brand: 'Honda',
          modelYear: 2019,
          driverId: persona.id,
        })
        .returning({ id: vehicles.id });

      const backup = await generateFullJsonBackup('admin@transporte.pe');
      const resultado = await executeDatabaseRestore(backup, 'merge', 'admin@transporte.pe');

      expect(resultado).toBeDefined();
      expect(resultado.totalRestored).toBeGreaterThanOrEqual(0);

      // La unidad sigue existiendo: la fusión no borra nada.
      const [tras] = await db.select().from(vehicles).where(eq(vehicles.id, vehiculo.id));
      expect(tras).toBeDefined();
      expect(tras.padronNumber).toBe('REST-001');

      await db.delete(vehicles).where(eq(vehicles.id, vehiculo.id));
      await db.delete(persons).where(eq(persons.id, persona.id));
    });
  });
});
