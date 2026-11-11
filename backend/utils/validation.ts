import { z } from 'zod';

// Esquema para validar personas
export const PersonSchema = z.object({
  id: z.number().optional(),
  dni: z
    .string()
    .trim()
    .min(5, 'El documento o DNI debe tener al menos 5 caracteres.')
    .max(20, 'El documento o DNI no debe exceder 20 caracteres.'),
  fullName: z
    .string()
    .trim()
    .min(3, 'El nombre completo debe tener al menos 3 caracteres.'),
  address: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  status: z.enum(['ACTIVO', 'INACTIVO']).default('ACTIVO'),
});

// Esquema para propietarios de vehículo
export const VehicleOwnerInputSchema = z.object({
  fullName: z.string().trim().min(2, 'Nombre de propietario requerido'),
  dni: z.string().trim().min(5, 'DNI o documento de identidad requerido'),
  address: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  isPrimary: z.boolean().default(true),
  notes: z.string().trim().optional().nullable(),
});

// Esquema para documentos individuales
export const InsuranceSchema = z.object({
  entityName: z.string().trim().min(2, 'Nombre de la entidad aseguradora/AFOCAT requerido'),
  policyNumber: z.string().trim().optional().nullable(),
  issueDate: z.string().trim().optional().nullable(),
  expirationDate: z.string().trim().optional().nullable(),
}).optional().nullable();

export const TechnicalInspectionSchema = z.object({
  centerName: z.string().trim().optional().nullable(),
  certificateNumber: z.string().trim().optional().nullable(),
  issueDate: z.string().trim().optional().nullable(),
  expirationDate: z.string().trim().optional().nullable(),
}).optional().nullable();

export const RoadSafetyCourseSchema = z.object({
  certificateNumber: z.string().trim().optional().nullable(),
  issueDate: z.string().trim().optional().nullable(),
  expirationDate: z.string().trim().optional().nullable(),
}).optional().nullable();

export const DriverLicenseSchema = z.object({
  licenseNumber: z.string().trim().optional().nullable(),
  originAuthority: z.string().trim().optional().nullable(),
  issueDate: z.string().trim().optional().nullable(),
  expirationDate: z.string().trim().optional().nullable(),
}).optional().nullable();

// Esquema para registrar o actualizar vehículo
export const VehicleInputSchema = z.object({
  padronNumber: z
    .string()
    .trim()
    .min(1, 'El N.º de padrón es obligatorio.'),
  plate: z
    .string()
    .trim()
    .min(3, 'La placa del vehículo es obligatoria.'),
  brand: z
    .string()
    .trim()
    .min(1, 'La marca del vehículo es obligatoria.'),
  modelYear: z.coerce
    .number()
    .int()
    .min(1980, 'El año debe ser mayor a 1980')
    .max(new Date().getFullYear() + 2, 'El año no puede ser futuro lejano'),
  engineNumber: z.string().trim().optional().nullable(),
  requiresReview: z.boolean().default(false),
  reviewNotes: z.string().trim().optional().nullable(),
  status: z.enum(['ACTIVO', 'INACTIVO', 'RETIRADO']).default('ACTIVO'),

  owners: z.array(VehicleOwnerInputSchema).default([]),
  driver: z
    .object({
      fullName: z.string().trim().min(2, 'Nombre del conductor requerido'),
      dni: z.string().trim().min(5, 'DNI del conductor requerido'),
      address: z.string().trim().optional().nullable(),
      phone: z.string().trim().optional().nullable(),
    })
    .optional()
    .nullable(),

  insurance: InsuranceSchema,
  technicalInspection: TechnicalInspectionSchema,
  roadSafetyCourse: RoadSafetyCourseSchema,
  driverLicense: DriverLicenseSchema,
});

// Esquema para reasignación de padrón libre
export const ChangePadronSchema = z.object({
  newPadron: z.string().trim().min(1, 'El nuevo número de padrón es requerido'),
  reason: z.string().trim().min(3, 'El motivo del cambio es requerido'),
  authorizationReference: z.string().trim().optional().nullable(),
  authorizedBy: z.string().trim().optional().nullable(),
  effectiveDate: z.string().trim().optional().nullable(),
});

// Esquema para intercambio de padrones entre dos vehículos
export const SwapPadronSchema = z.object({
  vehicleAId: z.number().int().positive('ID de Vehículo A requerido'),
  vehicleBId: z.number().int().positive('ID de Vehículo B requerido'),
  reason: z.string().trim().min(3, 'El motivo del intercambio es obligatorio'),
  authorizationReference: z.string().trim().min(2, 'Referencia o documento de autorización requerido'),
  authorizedBy: z.string().trim().min(2, 'Nombre de quien autorizó requerido'),
  effectiveDate: z.string().trim().optional().nullable(),
});

// Esquema para retiro / baja de vehículo
export const RetireVehicleSchema = z.object({
  reason: z.string().trim().min(3, 'El motivo de retiro es obligatorio'),
  withdrawalDate: z.string().trim().optional().nullable(),
});

/* =============================================================================
 * Esquemas de las rutas de escritura del sistema.
 *
 * Cada esquema define un `.strict()` en el objeto raíz para que una clave
 * inesperada en el cuerpo provoque un 400 en lugar de guardarse en la base.
 * ============================================================================= */

/** Fecha en formato ISO `YYYY-MM-DD`, opcional. */
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener el formato AAAA-MM-DD.')
  .optional()
  .nullable();

/** Texto opcional que se normaliza a `null` cuando viene vacío. */
const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `El texto no debe exceder ${max} caracteres.`)
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v));

/* ------------------------------ Portal / cartelera ------------------------ */

/**
 * URL segura para contenido multimedia.
 *
 * `z.string().url()` acepta cualquier esquema válido, incluidos
 * `javascript:` y `data:text/html`, que luego se renderizan como `href` o
 * `src`: un vector de XSS almacenado. Aquí solo se permiten `http` y
 * `https`.
 */
const safeUrl = (mensaje = 'La URL no es válida.') =>
  z
    .string()
    .trim()
    .max(1000)
    .url(mensaje)
    .refine(
      (value) => {
        try {
          const { protocol } = new URL(value);
          return protocol === 'http:' || protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'La URL debe empezar por http:// o https://.' }
    )
    .optional()
    .nullable();

export const PortalPostCreateSchema = z
  .object({
    title: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres.').max(200),
    subtitle: optionalText(300),
    content: z.string().trim().min(3, 'El contenido debe tener al menos 3 caracteres.').max(20000),
    type: z.enum(['image', 'video', 'pdf', 'notice']).default('image'),
    mediaUrl: safeUrl('La URL de la imagen no es válida.'),
    videoUrl: safeUrl('La URL del video no es válida.'),
    pdfUrl: safeUrl('La URL del PDF no es válida.'),
    pdfFileName: optionalText(255),
    pdfFileSize: optionalText(50),
    category: z.string().trim().min(1).max(100).default('General'),
    badgeText: optionalText(80),
    badgeColor: z
      .enum(['blue', 'emerald', 'amber', 'rose', 'purple', 'indigo'])
      .default('blue'),
    startDate: isoDate,
    endDate: isoDate,
    isActive: z.boolean().default(true),
    isHeroCarousel: z.boolean().default(false),
    orderIndex: z.coerce.number().int().min(0).max(100000).default(0),
    authorName: optionalText(150),
  })
  .strict();

export const PortalPostUpdateSchema = PortalPostCreateSchema.partial().strict();

export const PortalPostReorderSchema = z
  .object({
    orderedIds: z
      .array(z.coerce.number().int().positive('Los identificadores deben ser positivos.'))
      .max(1000, 'No se pueden reordenar más de 1000 publicaciones a la vez.'),
  })
  .strict();

export const PortalEventCreateSchema = z
  .object({
    title: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres.').max(200),
    type: z
      .enum(['asamblea', 'reunion', 'festividad', 'capacitacion', 'operativo'])
      .default('asamblea'),
    eventDate: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha del evento debe tener el formato AAAA-MM-DD.'),
    eventTime: z
      .string()
      .trim()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'La hora debe tener el formato HH:MM.')
      .optional()
      .nullable(),
    location: optionalText(200),
    description: optionalText(2000),
    agenda: optionalText(5000),
    status: z.enum(['upcoming', 'completed', 'cancelled']).default('upcoming'),
    isActive: z.boolean().default(true),
    orderIndex: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict();

export const PortalEventUpdateSchema = PortalEventCreateSchema.partial().strict();

/* --------------------------------- Usuarios ------------------------------- */

/** Roles válidos: los institucionales más los personalizados de PostgreSQL. */
export const UserRoleSchema = z
  .string()
  .trim()
  .min(2, 'El rol es obligatorio.')
  .max(50)
  .regex(/^[a-z][a-z0-9_-]*$/, 'El rol solo admite letras minúsculas, números, guion y guion bajo.');

/**
 * Correo electrónico normalizado.
 *
 * Se pasa a minúsculas antes de validarlo: así `Admin@Transporte.PE` y
 * `admin@transporte.pe` son la misma cuenta y no pueden duplicarse.
 */
const EmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('El correo electrónico no es válido.')
  .max(200);

export const UserCreateSchema = z
  .object({
    email: EmailSchema,
    name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.').max(200),
    role: UserRoleSchema.default('operator'),
    password: z
      .string()
      .min(8, 'La contraseña inicial debe tener al menos 8 caracteres.')
      .max(128, 'La contraseña es demasiado larga.'),
    assignedPadron: z.string().trim().max(50).optional().nullable(),
    isActive: z.boolean().default(true),
  })
  .strict();

export const UserUpdateSchema = z
  .object({
    email: EmailSchema.optional(),
    name: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres.').max(200).optional(),
    role: UserRoleSchema.optional(),
    password: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres.')
      .max(128, 'La contraseña es demasiado larga.')
      .optional(),
    assignedPadron: z.string().trim().max(50).optional().nullable(),
    isActive: z.boolean().optional(),
  })
  .strict();

/* ---------------------------------- Roles --------------------------------- */

/** Permisos por módulo: `none`, `read` o `write`. */
const permissionModeSchema = z.enum(['none', 'read', 'write']);

export const RolePermissionsSchema = z.record(
  z.string().min(1).max(60),
  permissionModeSchema
);

export const RoleCreateSchema = z
  .object({
    id: z
      .string()
      .trim()
      .min(2, 'El ID del rol debe tener al menos 2 caracteres.')
      .max(50)
      .regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/, 'El ID solo admite letras, números, guion y guion bajo.'),
    name: z.string().trim().min(2, 'El nombre del rol es obligatorio.').max(100),
    description: optionalText(500),
    badgeColor: z
      .enum(['indigo', 'purple', 'blue', 'amber', 'emerald', 'rose', 'cyan', 'orange'])
      .default('indigo'),
    permissions: RolePermissionsSchema.default({}),
  })
  .strict();

export const RoleUpdateSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    description: optionalText(500),
    badgeColor: z
      .enum(['indigo', 'purple', 'blue', 'amber', 'emerald', 'rose', 'cyan', 'orange'])
      .optional(),
    permissions: RolePermissionsSchema.optional(),
  })
  .strict();

/* -------------------------------- Personas -------------------------------- */

export const PersonUpdateSchema = z
  .object({
    dni: z.string().trim().min(5, 'El DNI debe tener al menos 5 caracteres.').max(20).optional(),
    fullName: z.string().trim().min(3, 'El nombre completo debe tener al menos 3 caracteres.').max(200).optional(),
    address: optionalText(300),
    phone: z.string().trim().max(30).optional().nullable(),
    status: z.enum(['ACTIVO', 'INACTIVO']).optional(),
    withdrawalDate: isoDate,
    withdrawalReason: optionalText(500),
  })
  .strict();

/* --------------------------- Solicitudes de padrón ------------------------ */

export const PadronChangeRequestCreateSchema = z
  .object({
    sourceVehicleId: z.coerce.number().int().positive('El vehículo de origen es obligatorio.'),
    targetVehicleId: z.coerce.number().int().positive().optional().nullable(),
    requestedPadron: z.string().trim().min(1, 'El número de padrón solicitado es obligatorio.').max(50),
    requestType: z.enum(['CHANGE', 'SWAP']),
    reason: z.string().trim().min(5, 'El motivo debe tener al menos 5 caracteres.').max(2000),
  })
  .strict();

/**
 * Revisión de una solicitud de cambio de padrón.
 *
 * El frontend envía `approved: boolean`; también se acepta `action` con
 * `APPROVE`/`REJECT` para las integraciones que prefieran ser explícitas.
 * Rechazar sin motivo es un error: sin explicación el operador no sabe qué
 * corregir.
 */
export const PadronChangeRequestReviewSchema = z
  .object({
    approved: z.boolean().optional(),
    action: z.enum(['APPROVE', 'REJECT']).optional(),
    rejectionReason: optionalText(1000),
  })
  .strict()
  .refine((v) => v.approved !== undefined || v.action !== undefined, {
    message: 'Debe indicar si aprueba o rechaza la solicitud.',
    path: ['approved'],
  })
  .refine((v) => {
    const rechaza = v.action === 'REJECT' || v.approved === false;
    return !rechaza || Boolean(v.rejectionReason && v.rejectionReason.trim());
  }, {
    message: 'Debe indicar el motivo del rechazo.',
    path: ['rejectionReason'],
  });

/* ------------------------------- Cursos viales ---------------------------- */

/** Evaluación individual de una planilla presencial. */
const courseEvaluationSchema = z.object({
  driverId: z.coerce.number().int().positive('El conductor es obligatorio.'),
  vehicleId: z.coerce.number().int().positive().optional().nullable(),
  dni: z.string().trim().max(20).optional().nullable(),
  passed: z.boolean(),
});

export const DriverCourseUpdateSchema = z
  .object({
    personId: z.coerce.number().int().positive().optional().nullable(),
    certificateNumber: optionalText(100),
    issueDate: isoDate,
    expirationDate: isoDate,
    isCurrent: z.boolean().optional(),
  })
  .strict();

/**
 * Sincronización masiva de evaluaciones.
 *
 * Acepta dos formas: una lista de identificadores aprobados o el detalle de
 * evaluaciones (planilla). Siempre debe traer al menos una de las dos.
 */
export const BulkCourseSyncSchema = z
  .object({
    approvedIdentifiers: z.array(z.string().trim().min(1).max(120)).max(2000).optional(),
    evaluations: z.array(courseEvaluationSchema).max(2000).optional(),
    year: z.coerce
      .number()
      .int()
      .min(2000, 'El año debe ser válido.')
      .max(new Date().getFullYear() + 1)
      .optional(),
  })
  .strict()
  .refine(
    (v) => (v.approvedIdentifiers?.length ?? 0) > 0 || (v.evaluations?.length ?? 0) > 0,
    {
      message: 'Debe proporcionar una lista de evaluaciones o identificadores.',
      path: ['evaluations'],
    }
  );

/**
 * Documento escaneado para procesar con IA.
 *
 * El archivo viaja en base64: se limita su tamaño para acotar la memoria y el
 * coste de la llamada al modelo.
 */
export const CourseAiDocumentSchema = z
  .object({
    fileBase64: z
      .string()
      .min(100, 'No se envió el archivo para procesar con IA.')
      // 20 MB en base64 ≈ 15 MB binarios.
      .max(28 * 1024 * 1024, 'El archivo supera el tamaño máximo permitido (15 MB).'),
    mimeType: z
      .enum([
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
      ])
      .default('application/pdf'),
    courseYear: z.coerce
      .number()
      .int()
      .min(2000)
      .max(new Date().getFullYear() + 1)
      .default(new Date().getFullYear()),
    fileName: optionalText(255),
  })
  .strict();

/* --------------------------------- Backup -------------------------------- */

/**
 * Restauración de una copia de seguridad.
 *
 * `confirm` debe ser exactamente `RESTAURAR` para que un restore no se
 * dispare por error o por un payload manipulado: la operación puede vaciar
 * la base de datos.
 */
export const BackupRestoreSchema = z
  .object({
    backupData: z
      .object({})
      .passthrough()
      .refine((v) => Boolean(v && v.data), {
        message: 'El respaldo no contiene datos para restaurar.',
        path: ['backupData'],
      }),
    mode: z.enum(['merge', 'overwrite']).default('merge'),
    confirm: z.literal('RESTAURAR', 'Debes confirmar la restauración con el texto RESTAURAR.'),
  })
  .strict();

/* ------------------------------ Importación ------------------------------ */

/** Formatos admitidos en la carga de archivos. */
export const IMPORT_MIME_TYPES = [
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'text/csv',
  'application/pdf',
  'application/octet-stream',
] as const;

export const ImportUploadSchema = z
  .object({
    fileName: z.string().trim().min(1).max(255),
    mimeType: z
      .string()
      .trim()
      .max(120)
      .optional()
      .default('application/octet-stream'),
    sizeBytes: z.coerce.number().int().min(1, 'El archivo está vacío.').max(25 * 1024 * 1024),
  })
  .strict();

/** Clasificación diagnóstica de una fila importada. */
const importClassificationSchema = z.enum([
  'VALIDO',
  'REQUIERE_REVISION',
  'DUPLICADO',
  'CONFLICTO',
  'ERROR_FORMATO',
]);

/** Observación asociada a una fila importada. */
const importIssueSchema = z.object({
  field: z.string().trim().max(120),
  message: z.string().trim().max(500),
  severity: z.enum(['error', 'warning', 'info']),
  rawValue: z.string().max(500).optional(),
});

/**
 * Fila enviada a `POST /api/import/confirm`.
 *
 * Se aceptan solo los campos que la importación realmente persiste. Zod
 * descarta las claves desconocidas, de modo que un cliente no puede colar
 * columnas ni tipos arbitrarios hasta la base de datos.
 */
const importRowSchema = z.object({
  rowIndex: z.coerce.number().int().min(1).max(100_000),
  padronNumber: z.string().trim().max(50),
  plate: z.string().trim().max(20),
  brand: z.string().trim().max(120).optional(),
  modelYear: z.coerce.number().int().min(1950).max(2100).optional(),
  engineNumber: z.string().trim().max(120).optional(),

  ownerFullName: z.string().trim().max(200).optional(),
  ownerDni: z.string().trim().max(20).optional(),
  ownerPhone: z.string().trim().max(40).optional(),
  ownerAddress: z.string().trim().max(300).optional(),
  owner2FullName: z.string().trim().max(200).optional(),
  owner2Dni: z.string().trim().max(20).optional(),
  owner2Phone: z.string().trim().max(40).optional(),

  driverFullName: z.string().trim().max(200).optional(),
  driverDni: z.string().trim().max(20).optional(),
  driverPhone: z.string().trim().max(40).optional(),
  driverAddress: z.string().trim().max(300).optional(),

  insuranceEntity: z.string().trim().max(150).optional(),
  insurancePolicy: z.string().trim().max(80).optional(),
  insuranceIssueDate: z.string().trim().max(40).optional(),
  insuranceExpirationDate: z.string().trim().max(40).optional(),

  inspectionCenter: z.string().trim().max(150).optional(),
  inspectionCertificate: z.string().trim().max(80).optional(),
  inspectionIssueDate: z.string().trim().max(40).optional(),
  inspectionExpirationDate: z.string().trim().max(40).optional(),

  courseCertificate: z.string().trim().max(80).optional(),
  courseIssueDate: z.string().trim().max(40).optional(),
  courseExpirationDate: z.string().trim().max(40).optional(),

  licenseNumber: z.string().trim().max(80).optional(),
  licenseOrigin: z.string().trim().max(150).optional(),
  licenseIssueDate: z.string().trim().max(40).optional(),
  licenseExpirationDate: z.string().trim().max(40).optional(),

  classification: importClassificationSchema,
  action: z.enum(['CREATE', 'UPDATE', 'SKIP', 'REVIEW']),
  issues: z.array(importIssueSchema).max(200),
  rawData: z.record(z.string(), z.unknown()).optional(),
  existingMatch: z
    .object({
      vehicleId: z.coerce.number().int().positive().optional(),
      matchedBy: z.enum(['plate', 'padron', 'both']).optional(),
      conflictingPlate: z.string().trim().max(20).optional(),
      conflictingPadron: z.string().trim().max(50).optional(),
    })
    .optional(),
});

/** Cuerpo de `POST /api/import/confirm`. */
export const ImportConfirmSchema = z
  .object({
    rows: z
      .array(importRowSchema)
      .min(1, 'No hay filas válidas para importar.')
      .max(5000, 'No se pueden importar más de 5000 filas a la vez.'),
  })
  .strict();

