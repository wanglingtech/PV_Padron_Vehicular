/**
 * Genera datos de demostración realistas para capturar los prototipos de UI.
 *
 * IMPORTANTE: este script escribe SOLO en la base de prototipos
 * (`padron_vehicular_proto`), nunca en `padron_vehicular`.
 * Si la base destino no termina en `_proto`, aborta.
 */
import 'dotenv/config';
import { Pool } from 'pg';

const TARGET_DB = process.env.PROTO_DB_NAME ?? 'padron_vehicular_proto';

if (!TARGET_DB.endsWith('_proto')) {
  console.error(`ABORTA: "${TARGET_DB}" no termina en _proto.`);
  process.exit(1);
}

const pool = new Pool({
  host: process.env.SQL_HOST,
  port: Number(process.env.SQL_PORT || 5432),
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: TARGET_DB,
});

const NOMBRES = [
  'Juan Carlos Quispe Mamani', 'María Elena Rojas Vargas', 'Pedro Antonio Salazar Ramírez',
  'Ana Lucía Fernández Torres', 'Jorge Luis Paredes Huamán', 'Rosa Isabel Yupanqui Ccahuana',
  'Luis Alberto Chávez Villanueva', 'Carmen Rosa Ataucuchi Guerrero', 'Jorge Enrique Palomino Soto',
  'Silvia Marlene Condori Apaza', 'Fredy Rolando Ticona Nina', 'Gladys Beatriz Ccahuana Mamani',
  'Héctor Hugo Nina Quispe', 'Norma Luz Huamán Ramirez', 'Wilson Armando Gonzales Peña',
  'Miriam Amparo Zevallos Ramos', 'Óscar Raúl Anyarín Maximiliano', 'Katherine Pilar Meza Salazar',
  'Édgar Luis Núñez Oblitas', 'Rocío del Carmen Huamaní Ayala',
];

const APELLIDOS = ['Quispe', 'Rojas', 'Salazar', 'Fernández', 'Paredes', 'Yupanqui', 'Chávez', 'Ataucuchi', 'Palomino', 'Condori'];
const MARCAS = ['Honda', 'Yamaha', 'Toyota', 'Suzuki', 'Kawasaki', 'BMW', 'Harley-Davidson', 'Honda'];
const MODELOS = ['CB 190R', 'NMAX 155', 'Yaris', 'Address 125', 'Ninja 300', 'G 310 R', 'Sportster 883', 'XR150L'];
const COLOR = ['Negro', 'Blanco', 'Azul', 'Rojo', 'Gris', 'Verde'];

const rnd = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const dni = (i: number) => `4${String(10000000 + i * 137).slice(0, 7)}${i % 10}`;

/** Fecha ISO desplazada ±días respecto de hoy. */
const fecha = (offsetDays: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

async function main() {
  // Limpiar en orden inverso de dependencias
  await pool.query(`
    TRUNCATE TABLE
      audit_logs, padron_change_requests, vehicle_padron_history, driver_licenses,
      road_safety_courses, technical_inspections, insurances, vehicle_drivers,
      vehicle_owners, vehicles, persons, portal_events, portal_posts
    RESTART IDENTITY CASCADE
  `);

  // ---------- Personas ----------
  const personRows = NOMBRES.map((fullName, i) => ({
    dni: dni(i),
    full_name: fullName,
    address: `${['Av.', 'Jr.', 'Mz.', 'Calle'][i % 4]} ${rnd(APELLIDOS)} ${100 + i * 7}, San Juan de Lurigancho`,
    phone: `9${String(10000000 + i * 4211).slice(0, 8)}`,
    status: i % 17 === 0 ? 'INACTIVO' : 'ACTIVO',
    created_at: new Date(Date.now() - (400 - i * 10) * 86400000),
  }));
  const pRes = await pool.query(
    `INSERT INTO persons (dni, full_name, address, phone, status, created_at)
     SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::timestamptz[])
     RETURNING id`,
    [
      personRows.map((p) => p.dni),
      personRows.map((p) => p.full_name),
      personRows.map((p) => p.address),
      personRows.map((p) => p.phone),
      personRows.map((p) => p.status),
      personRows.map((p) => p.created_at),
    ]
  );
  const personIds: number[] = pRes.rows.map((r) => r.id);
  console.log(`personas: ${personIds.length}`);

  // ---------- Vehículos ----------
  const vehicleRows = Array.from({ length: 24 }, (_, i) => ({
    padron_number: `PAD-${String(i + 1).padStart(3, '0')}`,
    plate: `${['ABC', 'DEF', 'GHI', 'JKL', 'MNO', 'PQR'][i % 6]}-${100 + i * 3}${i % 10}`,
    brand: MARCAS[i % MARCAS.length],
    model_year: 2018 + (i % 8),
    engine_number: `1${String(20000000 + i * 5431).slice(0, 7)}`,
    driver_id: i % 3 === 0 ? null : personIds[i % personIds.length],
    status: i === 20 ? 'RETIRADO' : i % 13 === 0 ? 'INACTIVO' : 'ACTIVO',
    requires_review: i === 7 || i === 15,
    created_at: new Date(Date.now() - (380 - i * 12) * 86400000),
  }));
  const vRes = await pool.query(
    `INSERT INTO vehicles (padron_number, plate, brand, model_year, engine_number, driver_id, status, requires_review, created_at)
     SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::int[], $5::text[], $6::int[], $7::text[], $8::bool[], $9::timestamptz[])
     RETURNING id`,
    [
      vehicleRows.map((v) => v.padron_number),
      vehicleRows.map((v) => v.plate),
      vehicleRows.map((v) => v.brand),
      vehicleRows.map((v) => v.model_year),
      vehicleRows.map((v) => v.engine_number),
      vehicleRows.map((v) => v.driver_id),
      vehicleRows.map((v) => v.status),
      vehicleRows.map((v) => v.requires_review),
      vehicleRows.map((v) => v.created_at),
    ]
  );
  const vehicleIds: number[] = vRes.rows.map((r) => r.id);
  console.log(`vehiculos: ${vehicleIds.length}`);

  // ---------- Propietarios ----------
  const ownerRows = vehicleIds.map((vid, i) => ({
    vehicle_id: vid,
    person_id: personIds[i % personIds.length],
    is_primary: true,
    is_current: true,
    valid_from: fecha(-400 + i * 10),
  }));
  await pool.query(
    `INSERT INTO vehicle_owners (vehicle_id, person_id, is_primary, is_current, valid_from)
     SELECT * FROM UNNEST($1::int[], $2::int[], $3::bool[], $4::bool[], $5::text[])`,
    [
      ownerRows.map((o) => o.vehicle_id),
      ownerRows.map((o) => o.person_id),
      ownerRows.map(() => true),
      ownerRows.map(() => true),
      ownerRows.map((o) => o.valid_from),
    ]
  );

  // ---------- Conductores históricos ----------
  await pool.query(
    `INSERT INTO vehicle_drivers (vehicle_id, person_id, is_current, valid_from, valid_until)
     SELECT * FROM UNNEST($1::int[], $2::int[], $3::bool[], $4::text[], $5::text[])`,
    [
      vehicleIds.slice(0, 10),
      personIds.slice(10, 20),
      vehicleIds.slice(0, 10).map(() => false),
      vehicleIds.slice(0, 10).map((_, i) => fecha(-500 + i * 20)),
      vehicleIds.slice(0, 10).map((_, i) => fecha(-300 + i * 20)),
    ]
  );

  // ---------- Documentos (mezcla de vigentes, por vencer y vencidos) ----------
  const docRows: any[] = [];
  vehicleIds.forEach((vid, i) => {
    const expired = i % 6 === 0;
    const soon = i % 6 === 1;
    const from = expired ? -400 : soon ? -40 : -120;
    const to = expired ? -30 : soon ? 25 : 200;
    docRows.push(
      { vid, entity: expired ? 'SOAT Pacifico' : soon ? 'SOAT Rimac' : 'SOAT Rimac', policy: `AF-${2025000 + i}`, issue: fecha(from), exp: fecha(to) },
      { vid, entity: 'MTC - Inspectores', policy: `CITV-${202600 + i}`, issue: fecha(from), exp: fecha(to) },
    );  });
  await pool.query(
    `INSERT INTO insurances (vehicle_id, entity_name, policy_number, issue_date, expiration_date, is_current)
     SELECT * FROM UNNEST($1::int[], $2::text[], $3::text[], $4::text[], $5::text[], $6::bool[])`,
    [
      docRows.map((d) => d.vid),
      docRows.map((d) => d.entity),
      docRows.map((d) => d.policy),
      docRows.map((d) => d.issue),
      docRows.map((d) => d.exp),
      docRows.map(() => true),
    ]
  );
  await pool.query(
    `INSERT INTO technical_inspections (vehicle_id, center_name, certificate_number, issue_date, expiration_date, is_current)
     SELECT * FROM UNNEST($1::int[], $2::text[], $3::text[], $4::text[], $5::text[], $6::bool[])`,
    [
      docRows.map((d) => d.vid),
      docRows.map((d) => 'Inspectorio Autorizado San Juan'),
      docRows.map((d) => `CITV-${202600 + d.vid}`),
      docRows.map((d) => d.issue),
      docRows.map((d) => d.exp),
      docRows.map(() => true),
    ]
  );
  await pool.query(
    `INSERT INTO road_safety_courses (vehicle_id, person_id, certificate_number, issue_date, expiration_date, is_current)
     SELECT * FROM UNNEST($1::int[], $2::int[], $3::text[], $4::text[], $5::text[], $6::bool[])`,
    [
      docRows.map((d) => d.vid),
      docRows.map((d) => personIds[d.vid % personIds.length]),
      docRows.map((d) => `CSV-${2026 + (d.vid % 3)}-${1000 + d.vid}`),
      docRows.map((d) => d.issue),
      docRows.map((d) => d.exp),
      docRows.map(() => true),
    ]
  );
  await pool.query(
    `INSERT INTO driver_licenses (vehicle_id, person_id, license_number, origin_authority, issue_date, expiration_date, is_current)
     SELECT * FROM UNNEST($1::int[], $2::int[], $3::text[], $4::text[], $5::text[], $6::text[], $7::bool[])`,
    [
      docRows.map((d) => d.vid),
      docRows.map((d) => personIds[d.vid % personIds.length]),
      docRows.map((d) => `L-${d.vid}-${rnd(['BII', 'BIII', 'C'])}`),
      docRows.map(() => 'Municipalidad de San Juan de Lurigancho'),
      docRows.map((d) => d.issue),
      docRows.map((d) => d.exp),
      docRows.map(() => true),
    ]
  );

  // ---------- Historial de padrón ----------
  await pool.query(
    `INSERT INTO vehicle_padron_history (vehicle_id, previous_padron, new_padron, change_type, reason, authorized_by, changed_by_user_name, effective_date, created_at)
     SELECT * FROM UNNEST($1::int[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::timestamptz[])`,
    [
      vehicleIds.slice(0, 6),
      vehicleIds.slice(0, 6).map((_, i) => `PAD-1${String(i).padStart(2, '0')}`),
      vehicleIds.slice(0, 6).map((_, i) => `PAD-${String(i + 1).padStart(3, '0')}`),
      ['CHANGE', 'SWAP', 'CHANGE', 'REASSIGNMENT', 'CHANGE', 'SWAP'].slice(0, 6),
      [
        'Renovación de padrón por cambio de propietario',
        'Intercambio de unidades por inoperatividad',
        'Corrección de datos de ownership',
        'Reasignación por retiro de unidad anterior',
        'Actualización de titular',
        'Intercambio por decisión de gerencia',
      ].slice(0, 6),
      vehicleIds.slice(0, 6).map(() => 'Lucía Torres (Gerente General)'),
      vehicleIds.slice(0, 6).map(() => 'Carlos Mendoza (Administrador)'),
      vehicleIds.slice(0, 6).map((_, i) => fecha(-200 + i * 15)),
      vehicleIds.slice(0, 6).map((_, i) => new Date(Date.now() - (200 - i * 15) * 86400000)),
    ]
  );

  // ---------- Solicitudes de cambio de padrón ----------
  await pool.query(
    `INSERT INTO padron_change_requests (source_vehicle_id, target_vehicle_id, requested_padron, request_type, status, reason, requested_by_name, requested_by_email, reviewed_by_name, created_at)
     SELECT * FROM UNNEST($1::int[], $2::int[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::timestamptz[])`,
    [
      [vehicleIds[1], vehicleIds[2], vehicleIds[3]],
      [vehicleIds[4], null, vehicleIds[5]],
      [vehicleIds[6], vehicleIds[7], vehicleIds[8]],
      ['CHANGE', 'SWAP', 'CHANGE'],
      ['PENDIENTE', 'APROBADA', 'RECHAZADA'],
      [
        'Solicitud de cambio de titular por venta de la unidad',
        'Intercambio de unidad por inoperatividad',
        'Corrección de número de padrón en documento oficial',
      ],
      ['Juan Quispe (Operario Padrón 04)', 'Jorge Paredes (Registrador)', 'Pedro Salazar (Fiscalizador)'],
      ['operador@transporte.pe', 'registro@transporte.pe', 'fiscalizacion@transporte.pe'],
      [null, 'Lucía Torres (Gerente General)', 'Carlos Mendoza (Administrador)'],
      [new Date(Date.now() - 3 * 86400000), new Date(Date.now() - 12 * 86400000), new Date(Date.now() - 25 * 86400000)],
    ]
  );

  // ---------- Auditoría ----------
  const audEntities = ['VEHICLE', 'PERSON', 'DOCUMENT', 'PADRON', 'IMPORT'];
  const audActions = ['CREATE', 'UPDATE', 'DELETE', 'RETIRE', 'REACTIVATE', 'PADRON_CHANGE', 'IMPORT'];
  const audFields = ['plate', 'brand', 'modelYear', 'status', 'engineNumber', 'phone', 'expirationDate', 'padronNumber'];
  const audRows = Array.from({ length: 40 }, (_, i) => ({
    vehicle_id: vehicleIds[i % vehicleIds.length],
    padron_number: vehicleRows[i % vehicleRows.length].padron_number,
    entity: audEntities[i % audEntities.length],
    entity_id: String(i + 1),
    action: audActions[i % audActions.length],
    field_name: audFields[i % audFields.length],
    old_value: `Valor anterior ${i}`,
    new_value: `Valor nuevo ${i}`,
    reason: i % 4 === 0 ? 'Corrección solicitada por el asociado' : null,
    ip_address: `192.168.1.${20 + (i % 60)}`,
    user_email: 'admin@transporte.pe',
    user_name: 'Carlos Mendoza (Administrador)',
    created_at: new Date(Date.now() - i * 7 * 3600000),
  }));
  await pool.query(
    `INSERT INTO audit_logs (vehicle_id, padron_number, entity, entity_id, action, field_name, old_value, new_value, reason, ip_address, user_email, user_name, created_at)
     SELECT * FROM UNNEST($1::int[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::text[], $11::text[], $12::text[], $13::timestamptz[])`,
    [
      audRows.map((a) => a.vehicle_id),
      audRows.map((a) => a.padron_number),
      audRows.map((a) => a.entity),
      audRows.map((a) => a.entity_id),
      audRows.map((a) => a.action),
      audRows.map((a) => a.field_name),
      audRows.map((a) => a.old_value),
      audRows.map((a) => a.new_value),
      audRows.map((a) => a.reason),
      audRows.map((a) => a.ip_address),
      audRows.map((a) => a.user_email),
      audRows.map((a) => a.user_name),
      audRows.map((a) => a.created_at),
    ]
  );

  // ---------- Portal (cartelera + agenda) ----------
  const posts = [
    ['¡Gran 35° Aniversario Institucional!', 'Festividades', 'amber', '35° ANIVERSARIO 2026', true, 0],
    ['Convocatoria a Magna Asamblea General Ordinaria', 'Asambleas', 'rose', 'ASAMBLEA OBLIGATORIA', true, 1],
    ['Campaña Navideña y Empadronamiento de Canastas', 'Festividades', 'emerald', 'NAVIDAD INSTITUCIONAL', true, 2],
    ['Directiva N° 004-2026: Actualización de SOAT/AFOCAT', 'Normativa', 'blue', 'DIRECTIVA OFICIAL', false, 3],
    ['Video Instructivo: Curso de Seguridad Vial Anual', 'Capacitación', 'indigo', 'VIDEO INSTRUCTIVO', false, 4],
    ['Nuevo Horario de atención en Secretaría General', 'Comunicado', 'purple', 'NUEVO HORARIO', false, 5],
  ];
  await pool.query(
    `INSERT INTO portal_posts (title, subtitle, content, type, category, badge_text, badge_color, start_date, end_date, is_active, is_hero_carousel, order_index, author_name, created_at)
     SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[], $10::bool[], $11::bool[], $12::int[], $13::text[], $14::timestamptz[])`,
    [
      posts.map((p) => p[0] as string),
      posts.map((p) => `Detalle oficial del comunicado institucional`),
      posts.map((p) => `Contenido institucional detallado. La Junta Directiva informa a todos los asociados sobre las disposiciones adoptadas y los plazos correspondientes. Documento disponible en Secretaría General con copia de DNI vigente.`),
      ['image', 'notice', 'image', 'pdf', 'video', 'notice'].slice(0, 6),
      posts.map((p) => p[1] as string),
      posts.map((p) => p[3] as string),
      posts.map((p) => p[2] as string),
      posts.map(() => fecha(-60)),
      posts.map(() => fecha(90)),
      posts.map(() => true),
      posts.map((p) => p[4] as boolean),
      posts.map((p) => p[5] as number),
      posts.map(() => 'Administración Central'),
      posts.map(() => new Date(Date.now() - 20 * 86400000)),
    ]
  );

  const events = [
    ['Magna Asamblea General Ordinaria', 'asamblea', 12, '18:00', 'Auditorio Principal ACTEM'],
    ['Reunión de Junta Directiva', 'reunion', 5, '17:30', 'Sala de Offices'],
    ['Capacitación: Manejo Defensivo', 'capacitacion', 21, '09:00', 'Aula de la Escuela de Curso Vial'],
    ['Operativo de fiscalización vehicular', 'operativo', 3, '08:00', 'Puesto de control - Av. Los Ollivos'],
    ['Día del Transportista', 'festividad', 30, '12:00', 'Plaza Central del Sector'],
    ['Entrega de canastas navideñas', 'asamblea', 45, '10:00', 'Local de Secretaría General'],
  ];
  await pool.query(
    `INSERT INTO portal_events (title, type, event_date, event_time, location, description, status, is_active, order_index, created_at)
     SELECT * FROM UNNEST($1::text[], $2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::bool[], $9::int[], $10::timestamptz[])`,
    [
      events.map((e) => e[0] as string),
      events.map((e) => e[1] as string),
      events.map((e) => fecha(e[2] as number)),
      events.map((e) => e[3] as string),
      events.map((e) => e[4] as string),
      events.map((e) => `Detalle de la actividad programada: ${e[0]}. Se solicita la asistencia de todos los asociados empadronados.`),
      ['upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming', 'upcoming'],
      events.map(() => true),
      events.map((_, i) => i),
      events.map(() => new Date()),
    ]
  );

  console.log('OK: datos de prototipo generados.');
  await pool.end();
}

main().catch(async (e) => {
  console.error('ERROR:', e.message);
  await pool.end();
  process.exit(1);
});
