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
