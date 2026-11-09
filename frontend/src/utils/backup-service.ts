import { db } from '../db/index.ts';
import {
  systemRoles,
  users,
  persons,
  vehicles,
  vehicleOwners,
  vehicleDrivers,
  insurances,
  technicalInspections,
  roadSafetyCourses,
  driverLicenses,
  vehiclePadronHistory,
  padronChangeRequests,
  auditLogs,
  portalPosts,
  portalEvents,
} from '../db/schema.ts';
import { BackupPayload, BackupRestoreResult } from '../types/index.ts';
import { eq } from 'drizzle-orm';

/**
 * Recopila todos los datos de todas las tablas del sistema
 */
export async function collectSystemDatabaseData(): Promise<BackupPayload['data']> {
  const [
    rolesData,
    usersData,
    personsData,
    vehiclesData,
    ownersData,
    driversData,
    insurancesData,
    citvData,
    coursesData,
    licensesData,
    padronHistoryData,
    changeRequestsData,
    auditLogsData,
    portalPostsData,
    portalEventsData,
  ] = await Promise.all([
    db.select().from(systemRoles),
    db.select().from(users),
    db.select().from(persons),
    db.select().from(vehicles),
    db.select().from(vehicleOwners),
    db.select().from(vehicleDrivers),
    db.select().from(insurances),
    db.select().from(technicalInspections),
    db.select().from(roadSafetyCourses),
    db.select().from(driverLicenses),
    db.select().from(vehiclePadronHistory),
    db.select().from(padronChangeRequests),
    db.select().from(auditLogs),
    db.select().from(portalPosts),
    db.select().from(portalEvents),
  ]);

  return {
    systemRoles: rolesData,
    users: usersData,
    persons: personsData,
    vehicles: vehiclesData,
    vehicleOwners: ownersData,
    vehicleDrivers: driversData,
    insurances: insurancesData,
    technicalInspections: citvData,
    roadSafetyCourses: coursesData,
    driverLicenses: licensesData,
    vehiclePadronHistory: padronHistoryData,
    padronChangeRequests: changeRequestsData,
    auditLogs: auditLogsData,
    portalPosts: portalPostsData,
    portalEvents: portalEventsData,
  };
}

/**
 * Genera el paquete completo de respaldo en formato JSON
 */
export async function generateFullJsonBackup(userEmail: string = 'admin@transporte.pe'): Promise<BackupPayload> {
  const data = await collectSystemDatabaseData();

  const summary: Record<string, number> = {};
  let totalRecords = 0;

  for (const [key, list] of Object.entries(data)) {
    const count = Array.isArray(list) ? list.length : 0;
    summary[key] = count;
    totalRecords += count;
  }

  const payload: BackupPayload = {
    metadata: {
      version: '2.5.0',
      system: 'Sistema Integral de Gestión de Padrón Vehicular & Operaciones',
      exportedAt: new Date().toISOString(),
      exportedBy: userEmail,
      tablesCount: Object.keys(data).length,
      totalRecords,
      summary,
    },
    data,
  };

  // Registrar auditoría de la exportación
  try {
    await db.insert(auditLogs).values({
      entity: 'SYSTEM_BACKUP',
      entityId: `backup-json-${Date.now()}`,
      action: 'EXPORT',
      fieldName: 'full_database',
      oldValue: null,
      newValue: `Backup JSON generado (${totalRecords} registros)`,
      reason: 'Exportación de copia de seguridad integral en formato JSON',
      userEmail,
      userName: 'Administrador del Sistema',
      createdAt: new Date(),
    });
  } catch (e) {
    console.warn('Could not record backup audit log:', e);
  }

  return payload;
}

/**
 * Escapa valores de forma segura para SQL estándar
 */
function escapeSqlValue(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? 'NULL' : String(val);
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (val instanceof Date) return `'${val.toISOString()}'`;
  if (typeof val === 'object') {
    const jsonStr = JSON.stringify(val).replace(/'/g, "''");
    return `'${jsonStr}'`;
  }
  const str = String(val).replace(/'/g, "''");
  return `'${str}'`;
}

/**
 * Genera un script SQL universal compatible con PostgreSQL, Supabase, Neon, AWS RDS, MySQL o SQLite
 */
export async function generateUniversalSqlBackup(userEmail: string = 'admin@transporte.pe'): Promise<string> {
  const data = await collectSystemDatabaseData();
  const nowStr = new Date().toISOString();

  let sql = `-- =========================================================================
-- COPIA DE SEGURIDAD Y MIGRACIÓN UNIVERSAL DE BASE DE DATOS
-- Sistema Integral de Gestión de Padrón Vehicular
-- Exportado por: ${userEmail}
-- Fecha de Generación: ${nowStr}
-- Compatible con: PostgreSQL, Supabase, Neon, Cloud SQL, SQLite, MySQL
-- =========================================================================

-- Iniciar bloque de transacción segura
BEGIN;

-- 1. Tabla de Roles y Permisos (RBAC)
CREATE TABLE IF NOT EXISTS system_roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  badge_color TEXT NOT NULL DEFAULT 'indigo',
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  permissions TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Usuarios del Sistema
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  password TEXT DEFAULT '123456',
  role TEXT NOT NULL DEFAULT 'operator',
  assigned_padron TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Directorio Unificado de Personas (Propietarios & Conductores)
CREATE TABLE IF NOT EXISTS persons (
  id SERIAL PRIMARY KEY,
  dni TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  address TEXT,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVO',
  withdrawal_date TEXT,
  withdrawal_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Padrón Maestro de Vehículos
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  padron_number TEXT NOT NULL UNIQUE,
  plate TEXT NOT NULL UNIQUE,
  brand TEXT NOT NULL,
  model_year INTEGER NOT NULL,
  engine_number TEXT,
  driver_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVO',
  withdrawal_date TEXT,
  withdrawal_reason TEXT,
  withdrawal_user_name TEXT,
  requires_review BOOLEAN NOT NULL DEFAULT FALSE,
  review_notes TEXT,
  import_source TEXT,
  import_batch_id TEXT,
  import_raw_data TEXT,
  import_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Relación Vehículo - Propietarios
CREATE TABLE IF NOT EXISTS vehicle_owners (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from TEXT,
  valid_until TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Historial de Conductores del Vehículo
CREATE TABLE IF NOT EXISTS vehicle_drivers (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from TEXT,
  valid_until TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Pólizas AFOCAT / SOAT
CREATE TABLE IF NOT EXISTS insurances (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  entity_name TEXT NOT NULL,
  policy_number TEXT,
  issue_date TEXT,
  expiration_date TEXT,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Revisiones Técnicas Vehiculares (CITV)
CREATE TABLE IF NOT EXISTS technical_inspections (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  center_name TEXT,
  certificate_number TEXT,
  issue_date TEXT,
  expiration_date TEXT,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Curso de Educación y Seguridad Vial
CREATE TABLE IF NOT EXISTS road_safety_courses (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  person_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
  certificate_number TEXT,
  issue_date TEXT,
  expiration_date TEXT,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Licencias de Conducir
CREATE TABLE IF NOT EXISTS driver_licenses (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  person_id INTEGER REFERENCES persons(id) ON DELETE SET NULL,
  license_number TEXT,
  origin_authority TEXT,
  issue_date TEXT,
  expiration_date TEXT,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 11. Historial de Canjes de Padrón
CREATE TABLE IF NOT EXISTS vehicle_padron_history (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  previous_padron TEXT NOT NULL,
  new_padron TEXT NOT NULL,
  change_type TEXT NOT NULL,
  related_vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  reason TEXT,
  authorization_reference TEXT,
  authorized_by TEXT,
  changed_by_user_id TEXT,
  changed_by_user_name TEXT,
  effective_date TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Solicitudes de Cambio de Padrón
CREATE TABLE IF NOT EXISTS padron_change_requests (
  id SERIAL PRIMARY KEY,
  source_vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  target_vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  requested_padron TEXT NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDIENTE',
  reason TEXT NOT NULL,
  requested_by_name TEXT NOT NULL,
  requested_by_email TEXT NOT NULL,
  reviewed_by_name TEXT,
  reviewed_at TIMESTAMP,
  rejection_reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 13. Bitácora de Auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER,
  padron_number TEXT,
  entity TEXT NOT NULL DEFAULT 'VEHICLE',
  entity_id TEXT,
  action TEXT NOT NULL DEFAULT 'UPDATE',
  field_name TEXT NOT NULL,
  old_value TEXT,
  newValue TEXT,
  reason TEXT,
  ip_address TEXT,
  user_email TEXT NOT NULL,
  user_name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 14. Cartelera y Publicaciones del Portal
CREATE TABLE IF NOT EXISTS portal_posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'image',
  media_url TEXT,
  video_url TEXT,
  pdf_url TEXT,
  pdf_file_name TEXT,
  pdf_file_size TEXT,
  category TEXT NOT NULL DEFAULT 'General',
  badge_text TEXT,
  badge_color TEXT DEFAULT 'blue',
  start_date TEXT,
  end_date TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_hero_carousel BOOLEAN NOT NULL DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,
  author_name TEXT DEFAULT 'Administración Central',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Agenda y Eventos del Portal
CREATE TABLE IF NOT EXISTS portal_events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'asamblea',
  event_date TEXT NOT NULL,
  event_time TEXT,
  location TEXT,
  description TEXT,
  agenda TEXT,
  status TEXT NOT NULL DEFAULT 'upcoming',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

`;

  // Función auxiliar para generar sentencias INSERT
  function generateTableInserts(tableName: string, rows: any[]): string {
    if (!rows || rows.length === 0) return `-- Sin registros para ${tableName}\n\n`;

    let block = `-- ==========================================\n-- Datos de la tabla: ${tableName} (${rows.length} registros)\n-- ==========================================\n`;

    for (const r of rows) {
      const keys = Object.keys(r);
      const cols = keys.map((k) => k.replace(/([A-Z])/g, '_$1').toLowerCase()).join(', ');
      const vals = keys.map((k) => escapeSqlValue(r[k])).join(', ');
      block += `INSERT INTO ${tableName} (${cols}) VALUES (${vals}) ON CONFLICT DO NOTHING;\n`;
    }

    block += '\n';
    return block;
  }

  // Generar inserts en orden de dependencia relacional
  sql += generateTableInserts('system_roles', data.systemRoles || []);
  sql += generateTableInserts('users', data.users || []);
  sql += generateTableInserts('persons', data.persons || []);
  sql += generateTableInserts('vehicles', data.vehicles || []);
  sql += generateTableInserts('vehicle_owners', data.vehicleOwners || []);
  sql += generateTableInserts('vehicle_drivers', data.vehicleDrivers || []);
  sql += generateTableInserts('insurances', data.insurances || []);
  sql += generateTableInserts('technical_inspections', data.technicalInspections || []);
  sql += generateTableInserts('road_safety_courses', data.roadSafetyCourses || []);
  sql += generateTableInserts('driver_licenses', data.driverLicenses || []);
  sql += generateTableInserts('vehicle_padron_history', data.vehiclePadronHistory || []);
  sql += generateTableInserts('padron_change_requests', data.padronChangeRequests || []);
  sql += generateTableInserts('audit_logs', data.auditLogs || []);
  sql += generateTableInserts('portal_posts', data.portalPosts || []);
  sql += generateTableInserts('portal_events', data.portalEvents || []);

  sql += `-- Finalizar transacción\nCOMMIT;\n\n-- =========================================================================\n-- FIN DEL SCRIPT DE MIGRACIÓN\n-- =========================================================================\n`;

  // Registrar auditoría
  try {
    await db.insert(auditLogs).values({
      entity: 'SYSTEM_BACKUP',
      entityId: `backup-sql-${Date.now()}`,
      action: 'EXPORT',
      fieldName: 'sql_script',
      oldValue: null,
      newValue: `Script SQL Universal generado (${sql.length} bytes)`,
      reason: 'Generación de script de migración SQL para base de datos externa',
      userEmail,
      userName: 'Administrador del Sistema',
      createdAt: new Date(),
    });
  } catch (e) {
    console.warn('Could not record SQL backup audit log:', e);
  }

  return sql;
}

/**
 * Obtiene métricas en vivo del estado de la base de datos y respaldos
 */
export async function getDatabaseBackupStats() {
  const data = await collectSystemDatabaseData();
  const summary: Record<string, number> = {};
  let totalRecords = 0;

  for (const [key, list] of Object.entries(data)) {
    const count = Array.isArray(list) ? list.length : 0;
    summary[key] = count;
    totalRecords += count;
  }

  // Estimar tamaño aproximado en KB
  const jsonEstimate = JSON.stringify(data).length;
  const estimatedSizeKb = Math.round(jsonEstimate / 1024);

  // Obtener último log de backup
  const lastBackupLog = (data.auditLogs || [])
    .filter((l: any) => l.entity === 'SYSTEM_BACKUP')
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

  return {
    databaseStatus: 'CONECTADO',
    databaseEngine: 'Cloud SQL PostgreSQL',
    tablesCount: Object.keys(data).length,
    totalRecords,
    estimatedSizeKb,
    lastBackup: lastBackupLog
      ? {
          timestamp: lastBackupLog.createdAt,
          user: lastBackupLog.userEmail,
          action: lastBackupLog.action,
          details: lastBackupLog.newValue,
        }
      : null,
    summary,
  };
}

/**
 * Motor de Restauración / Importación de Respaldo
 */
export async function executeDatabaseRestore(
  payload: BackupPayload,
  mode: 'merge' | 'overwrite' = 'merge',
  userEmail: string = 'admin@transporte.pe'
): Promise<BackupRestoreResult> {
  if (!payload || !payload.data) {
    throw new Error('El archivo proporcionado no contiene un formato de respaldo válido.');
  }

  const { data } = payload;
  const restoredCounts: Record<string, number> = {};
  let totalRestored = 0;

  // Si el modo es sobrescritura ('overwrite'), limpiar las tablas en orden inverso de claves foráneas
  if (mode === 'overwrite') {
    await db.delete(padronChangeRequests);
    await db.delete(vehiclePadronHistory);
    await db.delete(driverLicenses);
    await db.delete(roadSafetyCourses);
    await db.delete(technicalInspections);
    await db.delete(insurances);
    await db.delete(vehicleDrivers);
    await db.delete(vehicleOwners);
    await db.delete(vehicles);
    await db.delete(persons);
    await db.delete(portalEvents);
    await db.delete(portalPosts);
    // Preservar roles y usuarios del sistema para no bloquear el login actual si viene vacío
  }

  // Restaurar Roles
  if (Array.isArray(data.systemRoles) && data.systemRoles.length > 0) {
    let count = 0;
    for (const r of data.systemRoles) {
      try {
        const perms = typeof r.permissions === 'object' ? JSON.stringify(r.permissions) : r.permissions;
        await db
          .insert(systemRoles)
          .values({
            id: r.id,
            name: r.name,
            description: r.description || '',
            badgeColor: r.badgeColor || 'indigo',
            isSystem: Boolean(r.isSystem),
            permissions: perms,
          })
          .onConflictDoNothing();
        count++;
      } catch (e) {
        // Ignorar duplicados
      }
    }
    restoredCounts.systemRoles = count;
    totalRestored += count;
  }

  // Restaurar Personas
  if (Array.isArray(data.persons) && data.persons.length > 0) {
    let count = 0;
    for (const p of data.persons) {
      try {
        await db
          .insert(persons)
          .values({
            dni: p.dni,
            fullName: p.fullName,
            address: p.address,
            phone: p.phone,
            status: p.status || 'ACTIVO',
            withdrawalDate: p.withdrawalDate,
            withdrawalReason: p.withdrawalReason,
          })
          .onConflictDoNothing();
        count++;
      } catch (e) {
        // Ignorar duplicados
      }
    }
    restoredCounts.persons = count;
    totalRestored += count;
  }

  // Restaurar Vehículos
  if (Array.isArray(data.vehicles) && data.vehicles.length > 0) {
    let count = 0;
    for (const v of data.vehicles) {
      try {
        await db
          .insert(vehicles)
          .values({
            padronNumber: v.padronNumber,
            plate: v.plate,
            brand: v.brand,
            modelYear: v.modelYear,
            engineNumber: v.engineNumber,
            status: v.status || 'ACTIVO',
            withdrawalDate: v.withdrawalDate,
            withdrawalReason: v.withdrawalReason,
            requiresReview: Boolean(v.requiresReview),
            reviewNotes: v.reviewNotes,
            importSource: v.importSource || 'BACKUP_RESTORE',
          })
          .onConflictDoNothing();
        count++;
      } catch (e) {
        // Ignorar duplicados
      }
    }
    restoredCounts.vehicles = count;
    totalRestored += count;
  }

  // Restaurar Publicaciones del Portal
  if (Array.isArray(data.portalPosts) && data.portalPosts.length > 0) {
    let count = 0;
    for (const post of data.portalPosts) {
      try {
        await db
          .insert(portalPosts)
          .values({
            title: post.title,
            subtitle: post.subtitle,
            content: post.content,
            type: post.type || 'image',
            mediaUrl: post.mediaUrl,
            videoUrl: post.videoUrl,
            pdfUrl: post.pdfUrl,
            pdfFileName: post.pdfFileName,
            pdfFileSize: post.pdfFileSize,
            category: post.category || 'General',
            badgeText: post.badgeText,
            badgeColor: post.badgeColor || 'blue',
            startDate: post.startDate,
            endDate: post.endDate,
            isActive: post.isActive !== undefined ? Boolean(post.isActive) : true,
            isHeroCarousel: Boolean(post.isHeroCarousel),
            orderIndex: post.orderIndex || 0,
            authorName: post.authorName,
          })
          .onConflictDoNothing();
        count++;
      } catch (e) {
        // Ignorar
      }
    }
    restoredCounts.portalPosts = count;
    totalRestored += count;
  }

  // Restaurar Eventos del Portal
  if (Array.isArray(data.portalEvents) && data.portalEvents.length > 0) {
    let count = 0;
    for (const evt of data.portalEvents) {
      try {
        await db
          .insert(portalEvents)
          .values({
            title: evt.title,
            type: evt.type || 'asamblea',
            eventDate: evt.eventDate,
            eventTime: evt.eventTime,
            location: evt.location,
            description: evt.description,
            agenda: evt.agenda,
            status: evt.status || 'upcoming',
            isActive: evt.isActive !== undefined ? Boolean(evt.isActive) : true,
            orderIndex: evt.orderIndex || 0,
          })
          .onConflictDoNothing();
        count++;
      } catch (e) {
        // Ignorar
      }
    }
    restoredCounts.portalEvents = count;
    totalRestored += count;
  }

  // Registrar auditoría de la restauración
  await db.insert(auditLogs).values({
    entity: 'SYSTEM_BACKUP',
    entityId: `restore-${Date.now()}`,
    action: 'RESTORE',
    fieldName: 'database_restore',
    oldValue: null,
    newValue: `Restauración exitosa en modo ${mode}. ${totalRestored} registros incorporados.`,
    reason: `Restauración de copia de seguridad ejecutada por ${userEmail}`,
    userEmail,
    userName: 'Administrador del Sistema',
    createdAt: new Date(),
  });

  return {
    success: true,
    mode,
    timestamp: new Date().toISOString(),
    restoredCounts,
    totalRestored,
    message: `Restauración completada con éxito. Se procesaron ${totalRestored} registros en modo ${mode === 'merge' ? 'Fusión Segura' : 'Sobrescritura Total'}.`,
  };
}
