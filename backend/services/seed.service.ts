/**
 * Seed inicial de la base de datos.
 *
 * - `seedSystemRoles()` inserta los roles institucionales y la matriz de
 *   permisos. **Siempre** se ejecuta: son el catálogo que necesita el RBAC.
 * - `seedDemoUsers()` y `seedDemoPortalContent()` insertan las cuentas de
 *   demostración y el contenido de ejemplo. Solo se ejecutan en desarrollo
 *   (o cuando `SEED_DEMO_DATA=true`).
 *
 * Todas las funciones son idempotentes: nunca sobrescriben ajustes hechos
 * desde la interfaz (permisos de roles o contenido existente).
 */

import { eq } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { portalEvents, portalPosts, systemRoles, users } from '../db/schema.ts';
import { hashPassword } from './password.service.ts';
import { DEFAULT_USER_ACCOUNTS, ROLE_DEFINITIONS } from '../../shared/roles.ts';
import { shouldSeedDemoData, isProduction } from '../config/env.ts';

/**
 * Inicializa los roles maestros y la matriz de permisos.
 *
 * Se ejecuta siempre, incluso en producción: sin roles el RBAC no puede
 * validar los permisos de ningún usuario.
 */
export async function seedSystemRoles(): Promise<void> {
  // 1. Roles institucionales: inserta los que falten sin borrar los existentes.
  const existingRoles = await db.select().from(systemRoles);
  const existingRoleIds = new Set(existingRoles.map((r) => r.id));
  const missingRoles = ROLE_DEFINITIONS.filter((role) => !existingRoleIds.has(role.id));

  if (missingRoles.length > 0) {
    await db.insert(systemRoles).values(
      missingRoles.map((role) => ({
        id: role.id,
        name: role.name,
        description: role.description,
        badgeColor: role.badgeColor,
        isSystem: true,
        permissions: JSON.stringify(role.permissions),
      }))
    );
    console.log(`Roles institucionales agregados: ${missingRoles.map((r) => r.id).join(', ')}`);
  }

  // 2. Fusiona claves de permisos nuevas en roles existentes sin pisar
  //    los ajustes que el usuario haya hecho desde la interfaz.
  for (const definition of ROLE_DEFINITIONS) {
    const existing = existingRoles.find((role) => role.id === definition.id);
    if (!existing) continue;

    let currentPermissions: Record<string, string> = {};
    try {
      const parsed = JSON.parse(existing.permissions);
      if (parsed && typeof parsed === 'object') currentPermissions = parsed;
    } catch {
      currentPermissions = {};
    }

    // Los permisos ya guardados tienen prioridad; solo se agregan claves nuevas.
    const merged = { ...definition.permissions, ...currentPermissions };
    if (JSON.stringify(merged) !== JSON.stringify(currentPermissions)) {
      await db
        .update(systemRoles)
        .set({ permissions: JSON.stringify(merged), updatedAt: new Date() })
        .where(eq(systemRoles.id, definition.id));
    }
  }
}

/**
 * Inserta las cuentas de demostración que falten (por uid o correo).
 * Sus contraseñas se guardan como hash argon2.
 */
export async function seedDemoUsers(): Promise<void> {
  const existingUsers = await db.select().from(users);
  const existingUids = new Set(existingUsers.map((u) => u.uid));
  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));
  const missingUsers = DEFAULT_USER_ACCOUNTS.filter(
    (account) =>
      !existingUids.has(account.uid) && !existingEmails.has(account.email.toLowerCase())
  );

  if (missingUsers.length > 0) {
    const hashedUsers = await Promise.all(
      missingUsers.map(async (account) => ({
        uid: account.uid,
        email: account.email.toLowerCase(),
        name: account.name,
        role: account.role,
        password: await hashPassword(account.password || '123456'),
        assignedPadron: account.assignedPadron ?? null,
        isActive: account.isActive,
      }))
    );
    await db.insert(users).values(hashedUsers);
    console.log(`Usuarios demo agregados: ${missingUsers.map((u) => u.email).join(', ')}`);
  }
}

/**
 * Seed de Cartelera & Anuncios y de la Agenda de eventos.
 */
export async function seedDemoPortalContent(): Promise<void> {
  // Seed de Cartelera & Anuncios del Portal de Inicio
  const existingPosts = await db.select().from(portalPosts);
  if (existingPosts.length === 0) {
    await db.insert(portalPosts).values([
      {
        title: '¡Gran 35° Aniversario Institucional de Nuestra Asociación!',
        subtitle: 'Tres décadas y media brindando transporte seguro, digno y ordenado',
        content:
          'La Junta Directiva se complace en invitar a todos los socios concesionarios, conductores titulares y sus familias a la Gran Ceremonia Central y Almuerzo de Confraternidad. Tendremos reconocimientos especiales por años de servicio, sorteos de canastas y equipos de mantenimiento vehicular.',
        type: 'image',
        mediaUrl:
          'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
        category: 'Festividades',
        badgeText: '35° ANIVERSARIO 2026',
        badgeColor: 'amber',
        startDate: '2026-10-01',
        endDate: '2026-12-31',
        isActive: true,
        isHeroCarousel: true,
        orderIndex: 0,
        authorName: 'Consejo Directivo',
      },
      {
        title: 'Convocatoria Oficial a Magna Asamblea General Ordinaria',
        subtitle:
          'Aprobación de balances financieros y plan maestro de renovación de flota 2026-2027',
        content:
          'Se convoca con carácter de URGENTE Y OBLIGATORIO a todos los miembros empadronados. Orden del Día: 1) Informe de gestión anual. 2) Balance financiero auditado. 3) Modificaciones al estatuto interno y régimen disciplinario. Tolerancia de 15 minutos.',
        type: 'notice',
        mediaUrl:
          'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
        category: 'Asambleas',
        badgeText: 'ASAMBLEA OBLIGATORIA',
        badgeColor: 'rose',
        startDate: '2026-10-15',
        endDate: '2026-11-20',
        isActive: true,
        isHeroCarousel: true,
        orderIndex: 1,
        authorName: 'Secretaría General',
      },
      {
        title: 'Campaña Navideña y Empadronamiento de Canastas Familiares',
        subtitle: 'Unión, solidaridad y reconocimiento a toda la familia transportista',
        content:
          'Ya se encuentra abierto el registro presencial y virtual para la entrega de la tradicional canasta navideña institucional y obsequios infantiles para los hijos de conductores y socios. Acercarse a secretaría con copia de DNI vigente.',
        type: 'image',
        mediaUrl:
          'https://images.unsplash.com/photo-1512389142860-9c449e58a543?auto=format&fit=crop&w=1200&q=80',
        category: 'Festividades',
        badgeText: 'NAVIDAD INSTITUCIONAL',
        badgeColor: 'emerald',
        startDate: '2026-11-01',
        endDate: '2026-12-25',
        isActive: true,
        isHeroCarousel: true,
        orderIndex: 2,
        authorName: 'Comité de Bienestar Social',
      },
      {
        title: 'Homenaje Central: Día de la Madre y del Padre Transportista',
        subtitle: 'Reconocimiento al esfuerzo y corazón de los pilares de nuestros hogares',
        content:
          'Celebración festiva con serenata criolla, sorteos de electrodomésticos y presentes conmemorativos para las madres y padres conductores y concesionarios. ¡Su esfuerzo diario sobre ruedas es el motor de nuestra institución!',
        type: 'image',
        mediaUrl:
          'https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=80',
        category: 'Festividades',
        badgeText: 'DÍA FESTIVO FAMILIAR',
        badgeColor: 'purple',
        startDate: '2026-05-01',
        endDate: '2026-06-30',
        isActive: true,
        isHeroCarousel: true,
        orderIndex: 3,
        authorName: 'Comité de Damas & Bienestar',
      },
      {
        title:
          'Directiva N° 004-2026: Actualización Obligatoria de SOAT/AFOCAT y Revisiones Técnicas',
        subtitle:
          'Disposiciones vigentes de fiscalización vehicular y cronograma de regularización',
        content:
          'Se adjunta la Directiva Oficial que establece los plazos perentorios para la presentación de certificados vigentes de AFOCAT/SOAT y CITV. Unidades sin documentación al día serán suspendidas preventivamente del despacho.',
        type: 'pdf',
        pdfUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
        pdfFileName: 'Directiva_004_2026_Inspeccion_Padron.pdf',
        pdfFileSize: '1.4 MB',
        category: 'Normativa',
        badgeText: 'DOCUMENTO OFICIAL PDF',
        badgeColor: 'blue',
        startDate: '2026-09-01',
        endDate: '2026-12-31',
        isActive: true,
        isHeroCarousel: false,
        orderIndex: 4,
        authorName: 'Gerencia de Operaciones',
      },
      {
        title: 'Video Instructivo: Pasos para Aprobar el Curso de Seguridad Vial Anual',
        subtitle: 'Capacitación audiovisual para conductores titulares y de relevo',
        content:
          'Compartimos el video explicativo con el temario oficial del curso de seguridad vial: manejo defensivo, primeros auxilios en ruta y normativas de tránsito urbano.',
        type: 'video',
        videoUrl: 'https://www.youtube.com/watch?v=M576WGiDBdQ',
        category: 'Capacitación',
        badgeText: 'VIDEO INSTRUCTIVO',
        badgeColor: 'indigo',
        startDate: '2026-10-01',
        endDate: '2027-01-31',
        isActive: true,
        isHeroCarousel: false,
        orderIndex: 5,
        authorName: 'Área de Capacitación Vial',
      },
    ]);
    console.log('Publicaciones y anuncios base inicializados en PostgreSQL');
  }

  // Seed de Agenda y Fechas Importantes
  const existingEvents = await db.select().from(portalEvents);
  if (existingEvents.length === 0) {
    await db.insert(portalEvents).values([
      {
        title: 'Magna Asamblea General Ordinaria de Socios',
        type: 'asamblea',
        eventDate: '2026-11-05',
        eventTime: '18:30',
        location: 'Auditorio Institucional Central (Jr. Los Andes 450)',
        description:
          'Asamblea presencial con quórum reglamentario. Asistencia obligatoria para todos los socios titulares.',
        agenda:
          '1. Lectura del Acta Anterior.\n2. Balance Económico 2026.\n3. Ratificación de padrón y renovación vehicular.\n4. Elección del comité electoral.',
        status: 'upcoming',
        isActive: true,
        orderIndex: 0,
      },
      {
        title: 'Jornada Masiva de Inspección Técnica Preventiva de Flota',
        type: 'operativo',
        eventDate: '2026-11-12',
        eventTime: '08:00 a 16:00',
        location: 'Terminal de Operaciones N° 1 - Patio de Maniobras',
        description:
          'Revisión ocular mecánica, estado de luces, neumáticos, extintor y botiquín obligatorio.',
        agenda:
          'Padrón 001 al 050: 08:00 - 12:00 hrs.\nPadrón 051 al 100: 12:00 - 16:00 hrs.',
        status: 'upcoming',
        isActive: true,
        orderIndex: 1,
      },
      {
        title: 'Sesión Ordinaria de Directorio & Delegados de Ruta',
        type: 'reunion',
        eventDate: '2026-10-28',
        eventTime: '19:00',
        location: 'Sala de Juntas & Enlace Virtual Zoom',
        description:
          'Evaluación de frecuencias, despachos y coordinación de operativos de fiscalización vial.',
        agenda:
          'Evaluación del reporte semanal de incidencias y cronograma de mantenimiento.',
        status: 'upcoming',
        isActive: true,
        orderIndex: 2,
      },
      {
        title: 'Celebración y Homenaje: 35° Aniversario Institucional',
        type: 'festividad',
        eventDate: '2026-12-08',
        eventTime: '12:30',
        location: 'Centro de Convenciones & Recreo Campestre El Roble',
        description:
          'Ceremonia de gala, almuerzo criollo, orquesta en vivo y sorteo anual entre los socios activos.',
        agenda:
          '12:30 Ingreso y recepción.\n13:30 Ceremonia protocolar y reconocimientos.\n14:30 Almuerzo de confraternidad y baile.',
        status: 'upcoming',
        isActive: true,
        orderIndex: 3,
      },
      {
        title: 'Taller Presencial de Primeros Auxilios y Seguridad Vial',
        type: 'capacitacion',
        eventDate: '2026-11-20',
        eventTime: '15:00',
        location: 'Auditorio de Capacitaciones - Sede Central',
        description:
          'Dictado por instructores certificados de la Cruz Roja y especialistas en seguridad en el transporte.',
        agenda:
          'Técnicas de reanimación básica, uso de extintores y protocolo de emergencia ante colisiones.',
        status: 'upcoming',
        isActive: true,
        orderIndex: 4,
      },
    ]);
    console.log('Eventos y fechas importantes base inicializados en PostgreSQL');
  }
}

/**
 * Ejecuta el seed completo.
 *
 * @param includeDemoData Si se define, fuerza (o impide) las cuentas y el
 *   contenido de demostración. Por defecto decide `SEED_DEMO_DATA` y el
 *   entorno (`NODE_ENV`).
 */
export async function seedDatabase(options?: { includeDemoData?: boolean }): Promise<void> {
  try {
    await seedSystemRoles();

    const includeDemo = options?.includeDemoData ?? shouldSeedDemoData();
    if (includeDemo) {
      await seedDemoUsers();
      await seedDemoPortalContent();
    } else {
      const flag = process.env.SEED_DEMO_DATA?.trim().toLowerCase() || 'sin definir';
      const entorno = isProduction() ? ', NODE_ENV=production' : '';
      console.log(
        `Seed de demostración omitido (SEED_DEMO_DATA=${flag}${entorno}): ` +
          'no se crean cuentas ni contenido de ejemplo.'
      );
    }
  } catch (seedErr) {
    console.error('Error al inicializar roles/usuarios/portal base:', seedErr);
    throw seedErr;
  }
}

/**
 * @deprecated Usa `seedDatabase()`. Se mantiene por compatibilidad.
 */
export const seedDefaultRolesAndUsers = (): Promise<void> => seedDatabase();
