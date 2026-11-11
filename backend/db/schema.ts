import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// 1. Roles y Permisos del Sistema (RBAC)
export const systemRoles = pgTable('system_roles', {
  id: text('id').primaryKey(), // 'admin', 'operator', 'tesorero', 'fiscalizador', etc.
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  badgeColor: text('badge_color').notNull().default('indigo'),
  isSystem: boolean('is_system').notNull().default(false),
  permissions: text('permissions').notNull(), // JSON string: Record<SystemModuleId, ModulePermissionMode>
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 1.1 Usuarios del sistema (Admin / Operador / Tesorero / etc.)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID o identificador único
  email: text('email').notNull(),
  name: text('name').notNull(),
  password: text('password').default('123456'),
  role: text('role').notNull().default('operator'),
  assignedPadron: text('assigned_padron'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 2. Personas (Propietarios y Conductores unificados para evitar duplicación)
export const persons = pgTable('persons', {
  id: serial('id').primaryKey(),
  dni: text('dni').notNull().unique(),
  fullName: text('full_name').notNull(),
  address: text('address'),
  phone: text('phone'),
  status: text('status').notNull().default('ACTIVO'), // 'ACTIVO' | 'INACTIVO'
  withdrawalDate: text('withdrawal_date'),
  withdrawalReason: text('withdrawal_reason'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 3. Vehículos del Padrón
export const vehicles = pgTable('vehicles', {
  id: serial('id').primaryKey(),
  padronNumber: text('padron_number').notNull().unique(),
  plate: text('plate').notNull().unique(),
  brand: text('brand').notNull(),
  modelYear: integer('model_year').notNull(),
  engineNumber: text('engine_number'),
  driverId: integer('driver_id').references(() => persons.id, { onDelete: 'set null' }),
  status: text('status').notNull().default('ACTIVO'), // 'ACTIVO' | 'INACTIVO' | 'RETIRADO'
  withdrawalDate: text('withdrawal_date'),
  withdrawalReason: text('withdrawal_reason'),
  withdrawalUserName: text('withdrawal_user_name'),
  requiresReview: boolean('requires_review').notNull().default(false),
  reviewNotes: text('review_notes'),
  importSource: text('import_source'),
  importBatchId: text('import_batch_id'),
  importRawData: text('import_raw_data'),
  importNotes: text('import_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 4. Propietarios asociados al Vehículo (Soporta múltiples propietarios con períodos de vigencia)
export const vehicleOwners = pgTable('vehicle_owners', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  personId: integer('person_id')
    .notNull()
    .references(() => persons.id, { onDelete: 'cascade' }),
  isPrimary: boolean('is_primary').notNull().default(true),
  isCurrent: boolean('is_current').notNull().default(true),
  validFrom: text('valid_from'),
  validUntil: text('valid_until'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 4b. Historial de Conductores del Vehículo
export const vehicleDrivers = pgTable('vehicle_drivers', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  personId: integer('person_id')
    .notNull()
    .references(() => persons.id, { onDelete: 'cascade' }),
  isCurrent: boolean('is_current').notNull().default(true),
  validFrom: text('valid_from'),
  validUntil: text('valid_until'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 5. AFOCAT / SOAT
export const insurances = pgTable('insurances', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  entityName: text('entity_name').notNull(),
  policyNumber: text('policy_number'),
  issueDate: text('issue_date'), // YYYY-MM-DD
  expirationDate: text('expiration_date'), // YYYY-MM-DD
  isCurrent: boolean('is_current').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 6. Revisión Técnica Vehicular
export const technicalInspections = pgTable('technical_inspections', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  centerName: text('center_name'),
  certificateNumber: text('certificate_number'),
  issueDate: text('issue_date'), // YYYY-MM-DD
  expirationDate: text('expiration_date'), // YYYY-MM-DD
  isCurrent: boolean('is_current').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 7. Curso de Educación Vial
export const roadSafetyCourses = pgTable('road_safety_courses', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  personId: integer('person_id').references(() => persons.id, { onDelete: 'set null' }),
  certificateNumber: text('certificate_number'),
  issueDate: text('issue_date'), // YYYY-MM-DD
  expirationDate: text('expiration_date'), // YYYY-MM-DD
  isCurrent: boolean('is_current').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 8. Licencia de Conducir (Categoría B-II-C)
export const driverLicenses = pgTable('driver_licenses', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  personId: integer('person_id').references(() => persons.id, { onDelete: 'set null' }),
  licenseNumber: text('license_number'),
  originAuthority: text('origin_authority'), // Municipalidad / Procedencia
  issueDate: text('issue_date'), // YYYY-MM-DD
  expirationDate: text('expiration_date'), // YYYY-MM-DD
  isCurrent: boolean('is_current').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

// 9. Historial de Padrón Vehicular (Cambios e Intercambios con preservación de vehicle.id)
export const vehiclePadronHistory = pgTable('vehicle_padron_history', {
  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  previousPadron: text('previous_padron').notNull(),
  newPadron: text('new_padron').notNull(),
  changeType: text('change_type').notNull(), // 'INITIAL_ASSIGNMENT' | 'CHANGE' | 'SWAP' | 'RELEASE' | 'REASSIGNMENT'
  relatedVehicleId: integer('related_vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),
  reason: text('reason'),
  authorizationReference: text('authorization_reference'),
  authorizedBy: text('authorized_by'),
  changedByUserId: text('changed_by_user_id'),
  changedByUserName: text('changed_by_user_name'),
  effectiveDate: text('effective_date'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 10. Solicitudes de Cambio de Padrón (Workflow de Operador -> Administrador)
export const padronChangeRequests = pgTable('padron_change_requests', {
  id: serial('id').primaryKey(),
  sourceVehicleId: integer('source_vehicle_id')
    .notNull()
    .references(() => vehicles.id, { onDelete: 'cascade' }),
  targetVehicleId: integer('target_vehicle_id').references(() => vehicles.id, { onDelete: 'set null' }),
  requestedPadron: text('requested_padron').notNull(),
  requestType: text('request_type').notNull(), // 'CHANGE' | 'SWAP'
  status: text('status').notNull().default('PENDIENTE'), // 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'EJECUTADA'
  reason: text('reason').notNull(),
  requestedByName: text('requested_by_name').notNull(),
  requestedByEmail: text('requested_by_email').notNull(),
  reviewedByName: text('reviewed_by_name'),
  reviewedAt: timestamp('reviewed_at'),
  rejectionReason: text('rejection_reason'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 14. Tokens de restablecimiento de contraseña
//
// Se guarda únicamente el hash del token: si alguien lee la tabla no puede
// usar los tokens para restablecer la contraseña de una cuenta.
export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Hash SHA-256 del token, en hexadecimal.
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow(),
});

// 11. Historial de Auditoría General de Modificaciones
export const auditLogs = pgTable('audit_logs', {  id: serial('id').primaryKey(),
  vehicleId: integer('vehicle_id'),
  padronNumber: text('padron_number'),
  entity: text('entity').notNull().default('VEHICLE'), // 'VEHICLE' | 'PERSON' | 'DOCUMENT' | 'PADRON' | 'IMPORT'
  entityId: text('entity_id'),
  action: text('action').notNull().default('UPDATE'), // 'CREATE', 'UPDATE', 'DELETE', 'RETIRE', 'REACTIVATE', 'PADRON_CHANGE', 'PADRON_SWAP', 'IMPORT'
  fieldName: text('field_name').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  reason: text('reason'),
  ipAddress: text('ip_address'),
  userEmail: text('user_email').notNull(),
  userName: text('user_name'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Definiciones de Relaciones para Drizzle ORM
export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  driver: one(persons, {
    fields: [vehicles.driverId],
    references: [persons.id],
  }),
  owners: many(vehicleOwners),
  driverHistory: many(vehicleDrivers),
  padronHistory: many(vehiclePadronHistory),
  insurances: many(insurances),
  technicalInspections: many(technicalInspections),
  roadSafetyCourses: many(roadSafetyCourses),
  driverLicenses: many(driverLicenses),
}));

export const vehicleOwnersRelations = relations(vehicleOwners, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleOwners.vehicleId],
    references: [vehicles.id],
  }),
  person: one(persons, {
    fields: [vehicleOwners.personId],
    references: [persons.id],
  }),
}));

export const vehicleDriversRelations = relations(vehicleDrivers, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehicleDrivers.vehicleId],
    references: [vehicles.id],
  }),
  person: one(persons, {
    fields: [vehicleDrivers.personId],
    references: [persons.id],
  }),
}));

export const vehiclePadronHistoryRelations = relations(vehiclePadronHistory, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [vehiclePadronHistory.vehicleId],
    references: [vehicles.id],
  }),
  relatedVehicle: one(vehicles, {
    fields: [vehiclePadronHistory.relatedVehicleId],
    references: [vehicles.id],
  }),
}));

export const padronChangeRequestsRelations = relations(padronChangeRequests, ({ one }) => ({
  sourceVehicle: one(vehicles, {
    fields: [padronChangeRequests.sourceVehicleId],
    references: [vehicles.id],
  }),
  targetVehicle: one(vehicles, {
    fields: [padronChangeRequests.targetVehicleId],
    references: [vehicles.id],
  }),
}));

export const personsRelations = relations(persons, ({ many }) => ({
  ownedVehicles: many(vehicleOwners),
  drivenVehicles: many(vehicles),
  driverHistory: many(vehicleDrivers),
}));

export const insurancesRelations = relations(insurances, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [insurances.vehicleId],
    references: [vehicles.id],
  }),
}));

export const technicalInspectionsRelations = relations(technicalInspections, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [technicalInspections.vehicleId],
    references: [vehicles.id],
  }),
}));

export const roadSafetyCoursesRelations = relations(roadSafetyCourses, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [roadSafetyCourses.vehicleId],
    references: [vehicles.id],
  }),
  person: one(persons, {
    fields: [roadSafetyCourses.personId],
    references: [persons.id],
  }),
}));

export const driverLicensesRelations = relations(driverLicenses, ({ one }) => ({
  vehicle: one(vehicles, {
    fields: [driverLicenses.vehicleId],
    references: [vehicles.id],
  }),
  person: one(persons, {
    fields: [driverLicenses.personId],
    references: [persons.id],
  }),
}));

// 12. Cartelera Informativa, Anuncios y Contenido Multimedia del Portal de Inicio
export const portalPosts = pgTable('portal_posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  content: text('content').notNull(),
  type: text('type').notNull().default('image'), // 'image' | 'video' | 'pdf' | 'notice'
  mediaUrl: text('media_url'),
  videoUrl: text('video_url'),
  pdfUrl: text('pdf_url'),
  pdfFileName: text('pdf_file_name'),
  pdfFileSize: text('pdf_file_size'),
  category: text('category').notNull().default('General'), // 'Festividades', 'Asambleas', 'Comunicado', 'Capacitación', 'Normativa', 'Social', etc.
  badgeText: text('badge_text'),
  badgeColor: text('badge_color').default('blue'), // 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo'
  startDate: text('start_date'), // YYYY-MM-DD
  endDate: text('end_date'), // YYYY-MM-DD
  isActive: boolean('is_active').notNull().default(true),
  isHeroCarousel: boolean('is_hero_carousel').notNull().default(false),
  orderIndex: integer('order_index').notNull().default(0),
  authorName: text('author_name').default('Administración Central'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// 13. Agenda y Fechas Importantes (Asambleas, Reuniones, Días Festivos)
export const portalEvents = pgTable('portal_events', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  type: text('type').notNull().default('asamblea'), // 'asamblea' | 'reunion' | 'festividad' | 'capacitacion' | 'operativo'
  eventDate: text('event_date').notNull(), // YYYY-MM-DD
  eventTime: text('event_time'), // e.g. '18:00'
  location: text('location'),
  description: text('description'),
  agenda: text('agenda'), // JSON o viñetas
  status: text('status').notNull().default('upcoming'), // 'upcoming' | 'completed' | 'cancelled'
  isActive: boolean('is_active').notNull().default(true),
  orderIndex: integer('order_index').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

