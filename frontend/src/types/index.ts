export type DocumentStatus = 'vigente' | 'proximo' | 'vencido' | 'sin_informacion';
export type VehicleOverallStatus = 'vigente' | 'proximo' | 'vencido' | 'revision' | 'sin_informacion';
export type VehicleLifeStatus = 'ACTIVO' | 'INACTIVO' | 'RETIRADO';

export interface DocumentEvaluation {
  status: DocumentStatus;
  daysRemaining: number | null;
  label: string;
  badgeClass: string;
  isUrgent: boolean;
}

export interface Owner {
  id?: number;
  fullName: string;
  dni: string;
  address?: string | null;
  phone?: string | null;
  isPrimary?: boolean;
  isCurrent?: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  notes?: string | null;
}

export interface Driver {
  id?: number;
  fullName: string;
  dni: string;
  address?: string | null;
  phone?: string | null;
  isCurrent?: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  notes?: string | null;
}

export interface Insurance {
  id?: number;
  entityName: string;
  policyNumber?: string | null;
  issueDate?: string | null;
  expirationDate?: string | null;
  isCurrent?: boolean;
}

export interface TechnicalInspection {
  id?: number;
  centerName?: string | null;
  certificateNumber?: string | null;
  issueDate?: string | null;
  expirationDate?: string | null;
  isCurrent?: boolean;
}

export interface RoadSafetyCourse {
  id?: number;
  certificateNumber?: string | null;
  issueDate?: string | null;
  expirationDate?: string | null;
  isCurrent?: boolean;
}

export interface DriverLicense {
  id?: number;
  licenseNumber?: string | null;
  originAuthority?: string | null;
  issueDate?: string | null;
  expirationDate?: string | null;
  isCurrent?: boolean;
}

export interface VehiclePadronHistoryItem {
  id: number;
  vehicleId: number;
  previousPadron: string;
  newPadron: string;
  changeType: 'INITIAL_ASSIGNMENT' | 'CHANGE' | 'SWAP' | 'RELEASE' | 'REASSIGNMENT';
  relatedVehicleId?: number | null;
  relatedVehiclePlate?: string | null;
  relatedVehiclePadron?: string | null;
  reason?: string | null;
  authorizationReference?: string | null;
  authorizedBy?: string | null;
  changedByUserId?: string | null;
  changedByUserName?: string | null;
  effectiveDate?: string | null;
  createdAt: string;
}

export interface PadronChangeRequest {
  id: number;
  sourceVehicleId: number;
  sourceVehiclePadron: string;
  sourceVehiclePlate: string;
  targetVehicleId?: number | null;
  targetVehiclePadron?: string | null;
  targetVehiclePlate?: string | null;
  requestedPadron: string;
  requestType: 'CHANGE' | 'SWAP';
  status: 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'EJECUTADA';
  reason: string;
  requestedByName: string;
  requestedByEmail: string;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

export type PadronChangeRequestItem = PadronChangeRequest;

export interface Person {
  id: number;
  dni: string;
  fullName: string;
  address?: string | null;
  phone?: string | null;
  status: 'ACTIVO' | 'INACTIVO';
  withdrawalDate?: string | null;
  withdrawalReason?: string | null;
  ownedCount: number;
  drivenCount: number;
  ownedVehicles: Array<{ vehicleId: number; padronNumber: string; plate: string }>;
  drivenVehicles: Array<{ vehicleId: number; padronNumber: string; plate: string }>;
  createdAt: string;
  updatedAt?: string;
}

export interface Vehicle {
  id: number;
  padronNumber: string;
  plate: string;
  brand: string;
  modelYear: number;
  engineNumber?: string | null;
  status: VehicleLifeStatus;
  withdrawalDate?: string | null;
  withdrawalReason?: string | null;
  withdrawalUserName?: string | null;
  requiresReview: boolean;
  reviewNotes?: string | null;
  importSource?: string | null;
  importBatchId?: string | null;
  importNotes?: string | null;
  createdAt: string;
  updatedAt: string;

  primaryOwner: Owner | null;
  owners: Owner[];
  driver: Driver | null;

  insurance: Insurance | null;
  insuranceEvaluation: DocumentEvaluation;

  technicalInspection: TechnicalInspection | null;
  technicalInspectionEvaluation: DocumentEvaluation;

  roadSafetyCourse: RoadSafetyCourse | null;
  roadSafetyCourseEvaluation: DocumentEvaluation;

  driverLicense: DriverLicense | null;
  driverLicenseEvaluation: DocumentEvaluation;

  padronHistory?: VehiclePadronHistoryItem[];
  driverHistory?: Driver[];
  ownerHistory?: Owner[];

  overallStatus: {
    status: VehicleOverallStatus;
    label: string;
    badgeClass: string;
  };
}

export interface FleetHealthStats {
  completeCount: number;
  completePercent: number;
  upcomingCount: number;
  upcomingPercent: number;
  expiredCount: number;
  expiredPercent: number;
  incompleteCount: number;
  incompletePercent: number;
}

export interface DashboardStats {
  totalVehicles: number;
  activeVehiclesCount: number;
  retiredVehiclesCount: number;
  totalPersons: number;
  totalOwners: number;
  totalDrivers: number;
  validDocumentsCount: number;
  expiredDocuments: number;
  upcomingDocuments: number;
  requiresReviewCount: number;
  fleetHealth: FleetHealthStats;
  recentPadronChanges: VehiclePadronHistoryItem[];
  documentAlerts: Array<{
    id: string;
    vehicleId: number;
    padronNumber: string;
    plate: string;
    docType: string;
    docName: string;
    expirationDate: string;
    daysRemaining: number;
    status: 'vencido' | 'proximo';
    badgeClass: string;
  }>;
  recentVehicles: Vehicle[];
}

export interface ExpirationItem {
  id: string;
  vehicleId: number;
  padronNumber: string;
  plate: string;
  brand: string;
  primaryOwnerName: string;
  driverName: string;
  docType: 'insurance' | 'technicalInspection' | 'roadSafetyCourse' | 'driverLicense';
  docTypeName: string;
  docIdentifier: string;
  expirationDate: string;
  issueDate: string | null;
  daysRemaining: number | null;
  status: DocumentStatus;
  statusLabel: string;
  badgeClass: string;
  isUrgent: boolean;
}

export interface AuditLogItem {
  id: number;
  vehicleId?: number | null;
  padronNumber?: string | null;
  entity?: string;
  entityId?: string | null;
  action: string;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  ipAddress?: string | null;
  userEmail: string;
  userName?: string | null;
  createdAt: string;
}

export type SystemModuleId =
  | 'portal-inicio'
  | 'dashboard'
  | 'padron'
  | 'nuevo'
  | 'personas'
  | 'curso-vial'
  | 'vencimientos'
  | 'importar-exportar'
  | 'operario-portal'
  | 'historial'
  | 'directorio-contacto'
  | 'usuarios'
  | 'configuracion'
  | 'gestion-portal'
  | 'backup-migracion';

export type ModulePermissionMode = 'none' | 'read' | 'write';

export interface BackupMetadata {
  version: string;
  system: string;
  exportedAt: string;
  exportedBy: string;
  tablesCount: number;
  totalRecords: number;
  summary: Record<string, number>;
}

export interface BackupPayload {
  metadata: BackupMetadata;
  data: {
    systemRoles?: any[];
    users?: any[];
    persons?: any[];
    vehicles?: any[];
    vehicleOwners?: any[];
    vehicleDrivers?: any[];
    insurances?: any[];
    technicalInspections?: any[];
    roadSafetyCourses?: any[];
    driverLicenses?: any[];
    vehiclePadronHistory?: any[];
    padronChangeRequests?: any[];
    auditLogs?: any[];
    portalPosts?: any[];
    portalEvents?: any[];
    [key: string]: any[] | undefined;
  };
}

export interface BackupRestoreResult {
  success: boolean;
  mode: 'merge' | 'overwrite';
  timestamp: string;
  restoredCounts: Record<string, number>;
  totalRestored: number;
  message: string;
}

export type PortalPostType = 'image' | 'video' | 'pdf' | 'notice';

export interface PortalPost {
  id: number;
  title: string;
  subtitle?: string | null;
  content: string;
  type: PortalPostType;
  mediaUrl?: string | null;
  videoUrl?: string | null;
  pdfUrl?: string | null;
  pdfFileName?: string | null;
  pdfFileSize?: string | null;
  category: string;
  badgeText?: string | null;
  badgeColor?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  isHeroCarousel: boolean;
  orderIndex: number;
  authorName?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type PortalEventType = 'asamblea' | 'reunion' | 'festividad' | 'capacitacion' | 'operativo';

export interface PortalEvent {
  id: number;
  title: string;
  type: PortalEventType;
  eventDate: string; // YYYY-MM-DD
  eventTime?: string | null;
  location?: string | null;
  description?: string | null;
  agenda?: string | null;
  status: 'upcoming' | 'completed' | 'cancelled';
  isActive: boolean;
  orderIndex: number;
  createdAt?: string;
}


export interface RoleDefinition {
  id: string; // 'admin' | 'operator' | 'tesorero' | custom
  name: string;
  description: string;
  badgeColor: string; // 'indigo' | 'amber' | 'emerald' | 'purple' | 'blue' | 'rose'
  isSystem?: boolean;
  permissions: Record<SystemModuleId, ModulePermissionMode>;
}

export interface UserAccount {
  id: string;
  uid: string;
  name: string;
  email: string;
  role: string;
  password?: string;
  assignedPadron?: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface CurrentUser {
  uid: string;
  email: string;
  name: string;
  role: string;
  assignedPadron?: string;
}

// Clasificación de Importación
export type ImportRowClassification =
  | 'VALIDO'
  | 'REQUIERE_REVISION'
  | 'DUPLICADO'
  | 'CONFLICTO'
  | 'ERROR_FORMATO';

export interface ImportIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  rawValue?: string;
}

export interface ExcelImportRow {
  rowIndex: number;
  padronNumber: string;
  plate: string;
  brand: string;
  modelYear: number;
  engineNumber?: string;

  // Propietarios
  ownerFullName: string;
  ownerDni: string;
  ownerPhone?: string;
  ownerAddress?: string;

  owner2FullName?: string;
  owner2Dni?: string;
  owner2Phone?: string;

  // Conductor
  driverFullName?: string;
  driverDni?: string;
  driverPhone?: string;
  driverAddress?: string;

  // Documentación
  insuranceEntity?: string;
  insurancePolicy?: string;
  insuranceIssueDate?: string;
  insuranceExpirationDate?: string;

  inspectionCenter?: string;
  inspectionCertificate?: string;
  inspectionIssueDate?: string;
  inspectionExpirationDate?: string;

  courseCertificate?: string;
  courseIssueDate?: string;
  courseExpirationDate?: string;

  licenseNumber?: string;
  licenseOrigin?: string;
  licenseIssueDate?: string;
  licenseExpirationDate?: string;

  // Clasificación diagnóstica
  classification: ImportRowClassification;
  action: 'CREATE' | 'UPDATE' | 'SKIP' | 'REVIEW';
  issues: ImportIssue[];
  rawData: Record<string, any>;
  existingMatch?: {
    vehicleId?: number;
    matchedBy?: 'plate' | 'padron' | 'both';
    conflictingPlate?: string;
    conflictingPadron?: string;
  };
}

export interface ImportPreviewResult {
  totalRows: number;
  validCount: number;
  requiresReviewCount: number;
  duplicateCount: number;
  conflictCount: number;
  formatErrorCount: number;
  toCreateCount: number;
  toUpdateCount: number;
  rows: ExcelImportRow[];
}

export interface ContactItem {
  id: string;
  sourceType: 'user' | 'person';
  sourceId: number;
  fullName: string;
  phone: string;
  role: string;
  roleLabel: string;
  badgeColor?: string;
  photoIdentifier?: string;
  status: 'ACTIVO' | 'INACTIVO';
  assignedPadron?: string | null;
}

export interface ContactsResponse {
  contacts: ContactItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  rolesSummary: Record<string, number>;
}
