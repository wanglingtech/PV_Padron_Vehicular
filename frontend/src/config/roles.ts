import type {
  CurrentUser,
  ModulePermissionMode,
  RoleDefinition,
  SystemModuleId,
  UserAccount,
} from '../types/index.ts';

/**
 * Catálogo único de módulos del sistema.
 *
 * Es la fuente de verdad para:
 * - La matriz de permisos (frontend y backend).
 * - El seed de roles en PostgreSQL.
 * - Los textos y categorías que muestra la interfaz.
 *
 * Si se agrega un módulo nuevo, debe agregarse también en
 * `SystemModuleId` (`frontend/src/types/index.ts`).
 */
export const SYSTEM_MODULES_CONFIG: Array<{
  id: SystemModuleId;
  name: string;
  category: string;
  description: string;
}> = [
  {
    id: 'portal-inicio',
    name: 'Portal de Inicio y Cartelera',
    category: 'Portal',
    description: 'Cartelera digital institucional, carrusel de eventos, comunicados oficiales y agenda',
  },
  {
    id: 'dashboard',
    name: 'Dashboard Operativo & Flota',
    category: 'Operaciones',
    description: 'Métricas clave de flota, resumen de estado operativo y alertas rápidas',
  },
  {
    id: 'padron',
    name: 'Padrón Vehicular',
    category: 'Operaciones',
    description: 'Padrón maestro, búsqueda avanzada, filtros, exportaciones e historial',
  },
  {
    id: 'nuevo',
    name: 'Registrar Nueva Unidad',
    category: 'Operaciones',
    description: 'Alta de vehículos en padrón, registro de placa, motor y documentación inicial',
  },
  {
    id: 'personas',
    name: 'Directorio de Personas',
    category: 'Personal',
    description: 'Padrón de Propietarios y Conductores con DNI, contacto y ficha técnica',
  },
  {
    id: 'curso-vial',
    name: 'Conductores & Curso Vial',
    category: 'Personal',
    description: 'Gestión de curso de educación vial anual, actas presenciales y sincronización',
  },
  {
    id: 'directorio-contacto',
    name: 'Directorio WhatsApp por Roles',
    category: 'Personal',
    description:
      'Directorio de contacto telefónico y comunicación directa vía WhatsApp entre conductores, administradores y asociados según rol',
  },
  {
    id: 'vencimientos',
    name: 'Alertas de Vencimiento',
    category: 'Control',
    description: 'Monitoreo de SOAT/AFOCAT, CITV, Licencias y Cursos con semaforización',
  },
  {
    id: 'importar-exportar',
    name: 'Importar / Exportar Excel',
    category: 'Control',
    description: 'Carga masiva diagnóstica de archivos Excel y descarga de base de datos',
  },
  {
    id: 'operario-portal',
    name: 'Portal del Operario',
    category: 'Operario',
    description: 'Ficha individual del operador/conductor, cámara fotográfica y reportes de unidad',
  },
  {
    id: 'historial',
    name: 'Historial de Auditoría',
    category: 'Administración',
    description: 'Bitácora inmutable de modificaciones, canjes de padrón y trazabilidad',
  },
  {
    id: 'usuarios',
    name: 'Cuentas y Accesos',
    category: 'Administración',
    description: 'Creación de cuentas, asignación de roles y configuración de matriz de permisos',
  },
  {
    id: 'configuracion',
    name: 'Configuración & Empresa',
    category: 'Administración',
    description: 'Personalización institucional de membrete, base de datos y parámetros del sistema',
  },
  {
    id: 'gestion-portal',
    name: 'Gestión de Cartelera & Portal',
    category: 'Administración',
    description: 'Configuración de carrusel, multimedia, estados de vigencia, orden y agenda de eventos',
  },
  {
    id: 'backup-migracion',
    name: 'Backup & Migración Multi-BD',
    category: 'Administración',
    description:
      'Copias de seguridad completas en JSON y SQL para migración a cualquier base de datos o plataforma',
  },
];

/**
 * Roles con acceso total al sistema.
 *
 * `admin`, `developer` (programador/soporte) y `gerente` administran todos
 * los módulos. El resto de roles solo accede a su módulo propio y a las
 * lecturas relacionadas definidas en su matriz.
 */
export const PRIVILEGED_ROLE_IDS = ['admin', 'developer', 'gerente'] as const;

export type PrivilegedRoleId = (typeof PRIVILEGED_ROLE_IDS)[number];

export const isPrivilegedRole = (roleId?: string | null): boolean =>
  Boolean(roleId && (PRIVILEGED_ROLE_IDS as readonly string[]).includes(roleId));

/** Crea un mapa de permisos con todos los módulos en `none`. */
export const emptyPermissions = (): Record<SystemModuleId, ModulePermissionMode> =>
  Object.fromEntries(
    SYSTEM_MODULES_CONFIG.map((module) => [module.id, 'none'])
  ) as Record<SystemModuleId, ModulePermissionMode>;

/** Crea un mapa de permisos con todos los módulos en `write`. */
export const fullPermissions = (): Record<SystemModuleId, ModulePermissionMode> =>
  Object.fromEntries(
    SYSTEM_MODULES_CONFIG.map((module) => [module.id, 'write'])
  ) as Record<SystemModuleId, ModulePermissionMode>;

/** Construye permisos partiendo de `none` y aplicando overrides. */
export const buildPermissions = (
  overrides: Partial<Record<SystemModuleId, ModulePermissionMode>> = {}
): Record<SystemModuleId, ModulePermissionMode> => ({
  ...emptyPermissions(),
  ...overrides,
});

/**
 * Definición de los roles institucionales del sistema.
 *
 * Notas:
 * - `operator` conserva el id histórico de "operario" para no romper datos.
 * - Todos los roles base son `isSystem: true` para evitar su eliminación
 *   accidental; sus permisos sí pueden ajustarse desde "Cuentas y Accesos".
 * - Los roles personalizados creados por el usuario quedan fuera de esta lista.
 */
export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: 'admin',
    name: 'Administrador General',
    description:
      'Control y supervisión total de la asociación, configuración, usuarios y auditoría del padrón',
    badgeColor: 'indigo',
    isSystem: true,
    permissions: fullPermissions(),
  },
  {
    id: 'developer',
    name: 'Programador / Soporte Técnico',
    description:
      'Acceso técnico completo para mantenimiento, diagnóstico, migraciones y soporte del sistema',
    badgeColor: 'purple',
    isSystem: true,
    permissions: fullPermissions(),
  },
  {
    id: 'gerente',
    name: 'Gerente General',
    description:
      'Supervisión integral de la operación, reportes estratégicos y todos los módulos institucionales',
    badgeColor: 'blue',
    isSystem: true,
    permissions: fullPermissions(),
  },
  {
    id: 'operator',
    name: 'Operario de Turno',
    description:
      'Acceso operativo para registro en campo, consulta de flota y portal vehicular de su unidad',
    badgeColor: 'amber',
    isSystem: true,
    permissions: buildPermissions({
      'portal-inicio': 'read',
      dashboard: 'read',
      padron: 'read',
      personas: 'read',
      'curso-vial': 'read',
      vencimientos: 'read',
      'directorio-contacto': 'read',
      'operario-portal': 'write',
    }),
  },
  {
    id: 'tesorero',
    name: 'Tesorero / Finanzas',
    description:
      'Supervisión contable, reportes oficiales, importación/exportación y consulta del padrón',
    badgeColor: 'emerald',
    isSystem: true,
    permissions: buildPermissions({
      'portal-inicio': 'read',
      dashboard: 'read',
      padron: 'read',
      personas: 'read',
      'curso-vial': 'read',
      vencimientos: 'read',
      'importar-exportar': 'write',
      historial: 'read',
      'directorio-contacto': 'read',
      configuracion: 'read',
      'backup-migracion': 'read',
    }),
  },
  {
    id: 'fiscalizador',
    name: 'Fiscalizador de Flota',
    description:
      'Control documentario y fiscalización en campo: vencimientos, SOAT/AFOCAT, CITV y cursos',
    badgeColor: 'rose',
    isSystem: true,
    permissions: buildPermissions({
      'portal-inicio': 'read',
      dashboard: 'read',
      padron: 'read',
      personas: 'read',
      'curso-vial': 'read',
      vencimientos: 'write',
      historial: 'read',
      'directorio-contacto': 'read',
    }),
  },
  {
    id: 'secretaria',
    name: 'Secretaría General',
    description:
      'Gestión de socios, conductores, cursos viales, comunicados y agenda institucional',
    badgeColor: 'cyan',
    isSystem: true,
    permissions: buildPermissions({
      'portal-inicio': 'read',
      dashboard: 'read',
      padron: 'read',
      personas: 'write',
      'curso-vial': 'write',
      vencimientos: 'read',
      historial: 'read',
      'directorio-contacto': 'write',
      'gestion-portal': 'write',
    }),
  },
  {
    id: 'registrador',
    name: 'Registrador de Unidades',
    description:
      'Alta y actualización de unidades y propietarios; consulta de vencimientos y conductores',
    badgeColor: 'orange',
    isSystem: true,
    permissions: buildPermissions({
      'portal-inicio': 'read',
      dashboard: 'read',
      padron: 'write',
      nuevo: 'write',
      personas: 'write',
      'curso-vial': 'read',
      vencimientos: 'read',
      'directorio-contacto': 'read',
    }),
  },
];

/** Alias retrocompatible usado por la interfaz existente. */
export const DEFAULT_ROLES: RoleDefinition[] = ROLE_DEFINITIONS;

/**
 * Cuentas demo locales.
 *
 * Los `uid` coinciden con el seed histórico de PostgreSQL para no duplicar
 * usuarios al arrancar. La autenticación real llegará en la Fase 1; por ahora
 * sirven para probar la distribución de módulos por rol.
 */
export const DEFAULT_USER_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr-admin-01',
    uid: 'admin-dev-01',
    name: 'Carlos Mendoza (Administrador)',
    email: 'admin@transporte.pe',
    role: 'admin',
    password: 'admin123',
    isActive: true,
    createdAt: '2025-01-10T08:00:00Z',
    lastLogin: 'Hace 5 minutos',
  },
  {
    id: 'usr-developer-01',
    uid: 'developer-dev-01',
    name: 'Diego Ramírez (Programador)',
    email: 'soporte@transporte.pe',
    role: 'developer',
    password: 'soporte123',
    isActive: true,
    createdAt: '2025-01-10T08:30:00Z',
  },
  {
    id: 'usr-gerente-01',
    uid: 'gerente-dev-01',
    name: 'Lucía Torres (Gerente General)',
    email: 'gerencia@transporte.pe',
    role: 'gerente',
    password: 'gerencia123',
    isActive: true,
    createdAt: '2025-01-12T09:00:00Z',
  },
  {
    id: 'usr-op-01',
    uid: 'operador-dev-01',
    name: 'Juan Quispe (Operario Padrón 04)',
    email: 'operador@transporte.pe',
    role: 'operator',
    password: 'operador123',
    assignedPadron: 'PAD-004',
    isActive: true,
    createdAt: '2025-02-14T09:30:00Z',
    lastLogin: 'Hace 2 horas',
  },
  {
    id: 'usr-tesorero-01',
    uid: 'tesorero-dev-01',
    name: 'Ana María Rojas (Tesorera)',
    email: 'finanzas@transporte.pe',
    role: 'tesorero',
    password: 'tesorero123',
    isActive: true,
    createdAt: '2025-03-15T10:00:00Z',
  },
  {
    id: 'usr-fiscalizador-01',
    uid: 'fiscalizador-dev-01',
    name: 'Pedro Salazar (Fiscalizador)',
    email: 'fiscalizacion@transporte.pe',
    role: 'fiscalizador',
    password: 'fiscalizador123',
    isActive: true,
    createdAt: '2025-04-02T08:00:00Z',
  },
  {
    id: 'usr-secretaria-01',
    uid: 'secretaria-dev-01',
    name: 'María Fernández (Secretaria)',
    email: 'secretaria@transporte.pe',
    role: 'secretaria',
    password: 'secretaria123',
    isActive: true,
    createdAt: '2025-04-05T08:00:00Z',
  },
  {
    id: 'usr-registrador-01',
    uid: 'registrador-dev-01',
    name: 'Jorge Paredes (Registrador)',
    email: 'registro@transporte.pe',
    role: 'registrador',
    password: 'registro123',
    isActive: true,
    createdAt: '2025-04-10T08:00:00Z',
  },
];

/** Accesos rápidos de demostración para la pantalla de login. */
export const DEMO_USERS: Record<string, CurrentUser> = Object.fromEntries(
  DEFAULT_USER_ACCOUNTS.map((account) => [
    account.role,
    {
      uid: account.uid,
      email: account.email,
      name: account.name,
      role: account.role,
      assignedPadron: account.assignedPadron,
    } satisfies CurrentUser,
  ])
);
