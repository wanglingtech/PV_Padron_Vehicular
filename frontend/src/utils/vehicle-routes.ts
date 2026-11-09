export interface RouteStop {
  id: string;
  name: string;
  type: 'terminal_origen' | 'checkpoint' | 'paradero' | 'terminal_destino';
  coordinates: [number, number]; // [lat, lng]
  description: string;
  address: string;
  avgDwellSeconds?: number;
}

export interface AssignedRoute {
  id: string;
  code: string;
  name: string;
  shortName: string;
  sector: string;
  color: string;
  badgeBg: string;
  resolution: string;
  description: string;
  distanceKm: number;
  avgDurationMinutes: number;
  frequencyMinutes: string;
  schedule: string;
  quotaUnits: number;
  coordinates: [number, number][]; // Polyline points [lat, lng]
  geofence: [number, number][]; // Sector polygon points [lat, lng]
  stops: RouteStop[];
}

export const OFFICIAL_ROUTES: AssignedRoute[] = [
  {
    id: 'R-01',
    code: 'R-01',
    name: 'Troncal Central: Terminal Maniobras N° 1 ↔ Mercado Mayorista ↔ Plaza Central',
    shortName: 'Ruta Troncal Central',
    sector: 'Sector 1 - Casco Urbano y Zona Comercial',
    color: '#2563eb', // Blue
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300',
    resolution: 'R.D. N° 045-2024-MTC/GTT & Ord. Mun. 218-MD',
    description: 'Corredor prioritario de alta demanda que conecta el patio de maniobras de la asociación con el mercado mayorista, zona bancaria y plaza de armas.',
    distanceKm: 6.8,
    avgDurationMinutes: 24,
    frequencyMinutes: '3 - 5 min',
    schedule: '05:30 a 22:30 hrs',
    quotaUnits: 45,
    coordinates: [
      [-12.0465, -77.0425],
      [-12.0482, -77.0410],
      [-12.0505, -77.0392],
      [-12.0530, -77.0375],
      [-12.0565, -77.0345],
      [-12.0590, -77.0330],
      [-12.0620, -77.0310],
      [-12.0655, -77.0290],
      [-12.0688, -77.0272],
    ],
    geofence: [
      [-12.0430, -77.0460],
      [-12.0450, -77.0370],
      [-12.0580, -77.0290],
      [-12.0720, -77.0240],
      [-12.0735, -77.0310],
      [-12.0600, -77.0410],
      [-12.0480, -77.0480],
    ],
    stops: [
      {
        id: 'stop-1-1',
        name: 'Terminal de Maniobras N° 1',
        type: 'terminal_origen',
        coordinates: [-12.0465, -77.0425],
        description: 'Patio de estacionamiento, despacho oficial y control de salida de flota.',
        address: 'Av. Los Próceres 1240 - Patio Central',
        avgDwellSeconds: 120,
      },
      {
        id: 'stop-1-2',
        name: 'Paradero Mercado Mayorista',
        type: 'paradero',
        coordinates: [-12.0505, -77.0392],
        description: 'Zona de alto flujo comercial, embarque de pasajeros con compras.',
        address: 'Jr. Comercio con Jr. Huancavelica',
        avgDwellSeconds: 45,
      },
      {
        id: 'stop-1-3',
        name: 'Punto de Control Jr. Los Andes',
        type: 'checkpoint',
        coordinates: [-12.0565, -77.0345],
        description: 'Posta de fiscalización interna y control de intervalo de frecuencias.',
        address: 'Jr. Los Andes N° 450 (Frente a la Sede Central)',
        avgDwellSeconds: 30,
      },
      {
        id: 'stop-1-4',
        name: 'Paradero Plaza Cívica / Municipio',
        type: 'paradero',
        coordinates: [-12.0620, -77.0310],
        description: 'Acceso a entidades públicas, bancos y servicios comunales.',
        address: 'Plaza de Armas - Costado Oeste',
        avgDwellSeconds: 40,
      },
      {
        id: 'stop-1-5',
        name: 'Terminal Retorno Sur - Óvalo Grau',
        type: 'terminal_destino',
        coordinates: [-12.0688, -77.0272],
        description: 'Zona de giro, desembarque final y retorno hacia el terminal norte.',
        address: 'Óvalo Miguel Grau - Enlace Vía Expresa',
        avgDwellSeconds: 120,
      },
    ],
  },
  {
    id: 'R-02',
    code: 'R-02',
    name: 'Circuito Norte: Terminal El Roble ↔ Hospital Regional ↔ Campus Universitario',
    shortName: 'Ruta Hospital / Universitaria',
    sector: 'Sector 2 - Eje Asistencial y Educativo Norte',
    color: '#059669', // Emerald
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300',
    resolution: 'R.D. N° 088-2024-MTC/GTT & Ord. Mun. 235-MD',
    description: 'Servicio vecinal preferencial para transporte de pacientes, personal médico, docentes y estudiantes universitarios.',
    distanceKm: 5.4,
    avgDurationMinutes: 19,
    frequencyMinutes: '4 - 6 min',
    schedule: '06:00 a 22:00 hrs',
    quotaUnits: 35,
    coordinates: [
      [-12.0380, -77.0480],
      [-12.0405, -77.0460],
      [-12.0435, -77.0435],
      [-12.0470, -77.0400],
      [-12.0515, -77.0365],
      [-12.0550, -77.0340],
      [-12.0585, -77.0315],
    ],
    geofence: [
      [-12.0350, -77.0510],
      [-12.0370, -77.0430],
      [-12.0490, -77.0360],
      [-12.0620, -77.0280],
      [-12.0640, -77.0350],
      [-12.0520, -77.0450],
      [-12.0390, -77.0520],
    ],
    stops: [
      {
        id: 'stop-2-1',
        name: 'Terminal Norte El Roble',
        type: 'terminal_origen',
        coordinates: [-12.0380, -77.0480],
        description: 'Paradero principal del sector norte y zona de mantenimiento menor.',
        address: 'Av. Las Palmas 310',
        avgDwellSeconds: 90,
      },
      {
        id: 'stop-2-2',
        name: 'Paradero Hospital Regional',
        type: 'checkpoint',
        coordinates: [-12.0435, -77.0435],
        description: 'Puerta 1 de Emergencias y Consultorios Externos. Prioridad de acceso.',
        address: 'Av. San Martín Frente al Hospital Central',
        avgDwellSeconds: 60,
      },
      {
        id: 'stop-2-3',
        name: 'Paradero Av. Las Palmeras',
        type: 'paradero',
        coordinates: [-12.0470, -77.0400],
        description: 'Conexión con urbanizaciones residenciales y colegios primarios.',
        address: 'Intersección Las Palmeras con Jr. Ica',
        avgDwellSeconds: 30,
      },
      {
        id: 'stop-2-4',
        name: 'Paradero Óvalo Bolognesi',
        type: 'paradero',
        coordinates: [-12.0515, -77.0365],
        description: 'Punto de trasbordo con líneas de transporte urbano mayor.',
        address: 'Óvalo Bolognesi - Sector Este',
        avgDwellSeconds: 45,
      },
      {
        id: 'stop-2-5',
        name: 'Estación Terminal Campus Universitario',
        type: 'terminal_destino',
        coordinates: [-12.0585, -77.0315],
        description: 'Puerta Principal del Campus Universitario y Pabellón Central.',
        address: 'Av. Universitaria s/n - Puerta 2',
        avgDwellSeconds: 120,
      },
    ],
  },
  {
    id: 'R-03',
    code: 'R-03',
    name: 'Eje Periférico: Urb. Las Praderas ↔ Complejo Deportivo ↔ Terminal Terrestre',
    shortName: 'Ruta Periférica Las Praderas',
    sector: 'Sector 3 - Zona Residencial Alta y Recreacional',
    color: '#d97706', // Amber
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300',
    resolution: 'R.D. N° 112-2024-MTC/GTT & Ord. Mun. 240-MD',
    description: 'Circuito periférico que brinda integración a asentamientos humanos y sectores periféricos con el terminal de buses interprovinciales.',
    distanceKm: 7.6,
    avgDurationMinutes: 26,
    frequencyMinutes: '5 - 7 min',
    schedule: '05:00 a 23:00 hrs',
    quotaUnits: 40,
    coordinates: [
      [-12.0410, -77.0350],
      [-12.0440, -77.0330],
      [-12.0485, -77.0305],
      [-12.0535, -77.0280],
      [-12.0590, -77.0255],
      [-12.0645, -77.0230],
      [-12.0700, -77.0205],
    ],
    geofence: [
      [-12.0380, -77.0380],
      [-12.0420, -77.0300],
      [-12.0540, -77.0230],
      [-12.0730, -77.0170],
      [-12.0750, -77.0240],
      [-12.0620, -77.0310],
      [-12.0450, -77.0390],
    ],
    stops: [
      {
        id: 'stop-3-1',
        name: 'Terminal Las Praderas (Paradero Alto)',
        type: 'terminal_origen',
        coordinates: [-12.0410, -77.0350],
        description: 'Base de operaciones sector alto y paradero de salida.',
        address: 'Av. Las Colinas Mz. B Lote 1',
        avgDwellSeconds: 100,
      },
      {
        id: 'stop-3-2',
        name: 'Paradero Complejo Deportivo Municipal',
        type: 'paradero',
        coordinates: [-12.0485, -77.0305],
        description: 'Estadio comunal, polideportivo y complejo recreativo.',
        address: 'Av. Circunvalación s/n',
        avgDwellSeconds: 40,
      },
      {
        id: 'stop-3-3',
        name: 'Punto de Control Mercado Modelo',
        type: 'checkpoint',
        coordinates: [-12.0535, -77.0280],
        description: 'Posta de control de velocidad y sello de hoja de ruta.',
        address: 'Jr. Junín con Av. Progreso',
        avgDwellSeconds: 30,
      },
      {
        id: 'stop-3-4',
        name: 'Paradero Parque Recreacional El Pinar',
        type: 'paradero',
        coordinates: [-12.0645, -77.0230],
        description: 'Área residencial con paraderos techados autorizados.',
        address: 'Calle Los Sauces 512',
        avgDwellSeconds: 35,
      },
      {
        id: 'stop-3-5',
        name: 'Terminal Terrestre Interprovincial',
        type: 'terminal_destino',
        coordinates: [-12.0700, -77.0205],
        description: 'Andén exclusivo para mototaxis asociadas y conexión intermodal.',
        address: 'Av. Panamericana Sur Km 14 - Terminal Andén 3',
        avgDwellSeconds: 150,
      },
    ],
  },
  {
    id: 'R-04',
    code: 'R-04',
    name: 'Circuito Industrial: Parque Industrial ↔ Centro de Abastos ↔ Terminal N° 2',
    shortName: 'Ruta Industrial & Talleres',
    sector: 'Sector 4 - Parque Industrial y Factorías',
    color: '#7c3aed', // Purple
    badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300',
    resolution: 'R.D. N° 130-2024-MTC/GTT & Ord. Mun. 248-MD',
    description: 'Ruta estratégica para traslado de técnicos, obreros y transportistas del eje fabril e industrial de la jurisdicción.',
    distanceKm: 6.2,
    avgDurationMinutes: 22,
    frequencyMinutes: '4 - 6 min',
    schedule: '05:30 a 21:30 hrs',
    quotaUnits: 30,
    coordinates: [
      [-12.0520, -77.0490],
      [-12.0550, -77.0460],
      [-12.0585, -77.0430],
      [-12.0630, -77.0400],
      [-12.0675, -77.0370],
      [-12.0710, -77.0340],
    ],
    geofence: [
      [-12.0490, -77.0520],
      [-12.0530, -77.0420],
      [-12.0650, -77.0340],
      [-12.0750, -77.0310],
      [-12.0760, -77.0390],
      [-12.0660, -77.0490],
      [-12.0530, -77.0540],
    ],
    stops: [
      {
        id: 'stop-4-1',
        name: 'Terminal Parque Industrial',
        type: 'terminal_origen',
        coordinates: [-12.0520, -77.0490],
        description: 'Patio sur de maniobras y control de acceso industrial.',
        address: 'Av. Fábricas 1050',
        avgDwellSeconds: 90,
      },
      {
        id: 'stop-4-2',
        name: 'Paradero Metalmecánica & Muebles',
        type: 'paradero',
        coordinates: [-12.0585, -77.0430],
        description: 'Zona de talleres y conglomerado productivo.',
        address: 'Calle Productores Mz. E',
        avgDwellSeconds: 40,
      },
      {
        id: 'stop-4-3',
        name: 'Control Centro de Abastos Sur',
        type: 'checkpoint',
        coordinates: [-12.0630, -77.0400],
        description: 'Punto de pesaje e inspección preventiva.',
        address: 'Av. Los Artesanos con Jr. Huari',
        avgDwellSeconds: 30,
      },
      {
        id: 'stop-4-4',
        name: 'Terminal de Retorno N° 2',
        type: 'terminal_destino',
        coordinates: [-12.0710, -77.0340],
        description: 'Desembarque de personal y zona de descanso de operadores.',
        address: 'Av. Circunvalación Industrial 480',
        avgDwellSeconds: 120,
      },
    ],
  },
];

/**
 * Determina de forma determinista la ruta asignada a una unidad basándose en los datos del padrón.
 * Prioriza el número de padrón numérico, distribuyendo equitativamente en los circuitos oficiales.
 */
export function getVehicleAssignedRoute(padronNumber: string | undefined | null, vehicleId?: number): AssignedRoute {
  if (!padronNumber) {
    return OFFICIAL_ROUTES[0];
  }

  // Extraer el valor numérico del padrón (ej. "024" -> 24, "PAD-005" -> 5)
  const numericMatch = padronNumber.match(/\d+/);
  const padronNum = numericMatch ? parseInt(numericMatch[0], 10) : (vehicleId || 1);

  // Mapeo por rangos oficiales del padrón o distribución uniforme por cuadrante:
  // Padrón 001 - 035 => R-01 (Troncal Central)
  // Padrón 036 - 070 => R-02 (Circuito Norte / Hospital)
  // Padrón 071 - 105 => R-03 (Eje Periférico / Praderas)
  // Padrón 106 en adelante o módulo => R-04 (Circuito Industrial)
  if (padronNum <= 35) {
    return OFFICIAL_ROUTES[0];
  } else if (padronNum <= 70) {
    return OFFICIAL_ROUTES[1];
  } else if (padronNum <= 105) {
    return OFFICIAL_ROUTES[2];
  } else if (padronNum <= 140) {
    return OFFICIAL_ROUTES[3];
  } else {
    // Si excede 140, distribuir cíclicamente
    const routeIndex = (padronNum - 1) % OFFICIAL_ROUTES.length;
    return OFFICIAL_ROUTES[routeIndex];
  }
}
