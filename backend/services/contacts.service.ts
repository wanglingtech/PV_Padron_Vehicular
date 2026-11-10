/**
 * Directorio de contactos telefónicos (usuarios del sistema y personas del padrón).
 *
 * Consolida usuarios activos y conductores/propietarios en una lista única con
 * filtros por rol, búsqueda y paginación.
 */

import { db } from '../db/index.ts';
import { users } from '../db/schema.ts';
import { getPersonsList } from '../db/vehicles.ts';

/** Teléfonos por defecto para las cuentas del sistema. */
const DEFAULT_USER_PHONES: Record<string, string> = {
  'admin@transporte.pe': '987452103',
  'operador@transporte.pe': '976314852',
  'manuel.quispe@transporte.pe': '951753852',
  'tesorero@transporte.pe': '963258741',
  'fiscalizador@transporte.pe': '954128763',
};

export interface ContactSummary {
  id: string;
  sourceType: 'user' | 'person';
  sourceId: number;
  fullName: string;
  phone: string;
  role: string;
  roleLabel: string;
  badgeColor: string;
  photoIdentifier: string;
  status: string;
  assignedPadron: string | null;
}

export interface ContactsResult {
  contacts: ContactSummary[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  rolesSummary: Record<string, number>;
}

/** Etiqueta y color del badge según el rol del usuario del sistema. */
function describeUserRole(role: string): { roleLabel: string; badgeColor: string } {
  const rLower = (role || '').toLowerCase();

  if (rLower === 'admin') return { roleLabel: 'Administrador', badgeColor: 'blue' };
  if (rLower === 'tesorero') return { roleLabel: 'Tesorero / Finanzas', badgeColor: 'emerald' };
  if (rLower === 'fiscalizador') return { roleLabel: 'Fiscalizador de Ruta', badgeColor: 'purple' };
  if (rLower === 'operator') return { roleLabel: 'Operario de Turno', badgeColor: 'amber' };
  return { roleLabel: 'Personal Administrativo', badgeColor: 'indigo' };
}

/** Clasifica a una persona según su relación con el padrón. */
function describePersonRole(person: {
  drivenCount?: number;
  ownedCount?: number;
}): { role: string; roleLabel: string; badgeColor: string } {
  const hasDriven = (person.drivenCount || 0) > 0;
  const hasOwned = (person.ownedCount || 0) > 0;

  if (hasDriven && hasOwned) {
    return { role: 'socio_conductor', roleLabel: 'Socio Conductor', badgeColor: 'teal' };
  }
  if (hasDriven) {
    return { role: 'conductor', roleLabel: 'Conductor Titular', badgeColor: 'emerald' };
  }
  if (hasOwned) {
    return { role: 'propietario', roleLabel: 'Socio Propietario', badgeColor: 'blue' };
  }
  return { role: 'asociado', roleLabel: 'Asociado', badgeColor: 'slate' };
}

/** Teléfono determinista de respaldo cuando no hay dato real. */
function fallbackPhone(seed: number, prefix = '98'): string {
  return `${prefix}${Math.abs(seed % 9000000) + 1000000}`;
}

/**
 * Lista el directorio de contactos con filtros y paginación.
 *
 * @param search Texto libre sobre nombre o teléfono.
 * @param roleFilter Rol a filtrar (`ALL` para todos).
 * @param page Página actual (1-based).
 * @param limit Cantidad por página (tope 100).
 */
export async function listContacts(options: {
  search?: string;
  roleFilter?: string;
  page: number;
  limit: number;
}): Promise<ContactsResult> {
  const search = (options.search || '').toLowerCase().trim();
  const roleFilter = (options.roleFilter || 'ALL').trim();
  const page = Math.max(1, options.page);
  const limit = Math.max(1, Math.min(100, options.limit));

  // 1. Obtener usuarios del sistema (Administradores, Tesoreros, Fiscalizadores, Operadores)
  const systemUsersList = await db.select().from(users);

  // 2. Obtener personas (Conductores, Socios Propietarios)
  const personsList = await getPersonsList({});

  const contactsMap = new Map<string, ContactSummary>();

  // Mapear Usuarios
  for (const u of systemUsersList) {
    if (!u.isActive) continue;

    const { roleLabel, badgeColor } = describeUserRole(u.role);

    // Buscar si existe teléfono en persons con nombre similar
    const matchedPerson = personsList.find(
      (p) => p.fullName.toLowerCase() === u.name.toLowerCase()
    );

    const phone =
      matchedPerson?.phone ||
      DEFAULT_USER_PHONES[u.email.toLowerCase()] ||
      fallbackPhone(u.id * 179 + 31);

    contactsMap.set(`user-${u.id}`, {
      id: `user-${u.id}`,
      sourceType: 'user',
      sourceId: u.id,
      fullName: u.name,
      phone,
      role: u.role,
      roleLabel,
      badgeColor,
      photoIdentifier: u.email || u.name,
      status: 'ACTIVO',
      assignedPadron: u.assignedPadron,
    });
  }

  // Mapear Personas (Conductores y Socios)
  for (const p of personsList) {
    if (p.status !== 'ACTIVO') continue;

    const { role, roleLabel, badgeColor } = describePersonRole(p);

    const phone =
      p.phone && p.phone.trim().length >= 6
        ? p.phone.trim()
        : fallbackPhone(p.id * 313 + 57, '97');

    const existingKey = Array.from(contactsMap.keys()).find(
      (k) => contactsMap.get(k)?.fullName.toLowerCase() === p.fullName.toLowerCase()
    );

    if (existingKey) {
      const prev = contactsMap.get(existingKey)!;
      prev.phone = p.phone || prev.phone;
      prev.photoIdentifier = p.dni || prev.photoIdentifier;
    } else {
      contactsMap.set(`person-${p.id}`, {
        id: `person-${p.id}`,
        sourceType: 'person',
        sourceId: p.id,
        fullName: p.fullName,
        phone,
        role,
        roleLabel,
        badgeColor,
        photoIdentifier: p.dni || p.fullName,
        status: 'ACTIVO',
        assignedPadron: p.drivenVehicles?.[0]?.padronNumber || p.ownedVehicles?.[0]?.padronNumber || null,
      });
    }
  }

  const allContacts = Array.from(contactsMap.values());

  // Conteo por roles para los filtros
  const rolesSummary: Record<string, number> = {
    ALL: allContacts.length,
  };

  for (const c of allContacts) {
    const r = c.role.toLowerCase();
    rolesSummary[r] = (rolesSummary[r] || 0) + 1;
  }

  // Filtrar por término de búsqueda (nombre completo o teléfono)
  let filtered = allContacts;
  if (search) {
    filtered = filtered.filter(
      (c) =>
        c.fullName.toLowerCase().includes(search) ||
        c.phone.replace(/\D/g, '').includes(search.replace(/\D/g, ''))
    );
  }

  // Filtrar por rol
  if (roleFilter !== 'ALL') {
    const rfLower = roleFilter.toLowerCase();
    filtered = filtered.filter((c) => {
      const cRole = c.role.toLowerCase();
      if (rfLower === 'conductor') {
        return cRole === 'conductor' || cRole === 'socio_conductor';
      }
      if (rfLower === 'propietario') {
        return cRole === 'propietario' || cRole === 'socio_conductor';
      }
      if (rfLower === 'admin' || rfLower === 'administrador') {
        return cRole === 'admin';
      }
      return cRole === rfLower;
    });
  }

  // Ordenar alfabéticamente por nombre completo
  filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));

  // Paginación
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const startIndex = (page - 1) * limit;
  const paginatedContacts = filtered.slice(startIndex, startIndex + limit);

  return {
    contacts: paginatedContacts,
    total,
    page,
    limit,
    totalPages,
    rolesSummary,
  };
}
