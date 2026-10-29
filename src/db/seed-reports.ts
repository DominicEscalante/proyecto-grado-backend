import { and, asc, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from './index.js';
import { pool } from '../config/db.js';
import { reportes, roles, tiposEmergencias, usuarios } from './schema/index.js';

const REPORTS_PER_RUN = 40;
const TIME_ZONE = 'America/La_Paz';
const REPORTS_PER_HOTSPOT = 7;

const HOTSPOTS = [
  { nombre: 'Sopocachi', latitud: -16.5126, longitud: -68.1294 },
  { nombre: 'Centro', latitud: -16.4955, longitud: -68.1333 },
  { nombre: 'Miraflores', latitud: -16.5030, longitud: -68.1190 },
  { nombre: 'Max Paredes', latitud: -16.4971, longitud: -68.1510 },
];

const DESCRIPCIONES: Record<string, string[]> = {
  POLICIA: [
    'Colisión leve entre dos vehículos; no se reportan personas atrapadas.',
    'Persona solicita apoyo policial por alteración del orden en vía pública.',
    'Vecinos reportan un vehículo sospechoso estacionado por varias horas.',
    'Accidente de tránsito con daños materiales y congestión en la avenida.',
  ],
  BOMBEROS: [
    'Se percibe olor a gas en un inmueble; los ocupantes evacuaron preventivamente.',
    'Humo visible en un lote baldío, posiblemente por quema de residuos.',
    'Rama de árbol caída bloquea parcialmente la circulación.',
    'Acumulación de agua afecta el ingreso de varias viviendas.',
  ],
};

function getLaPazDate(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function dateSeed(dateKey: string): number {
  return Number(dateKey.replaceAll('-', ''));
}

function randomItem<T>(values: T[], random: () => number): T {
  return values[Math.floor(random() * values.length)];
}

function metersToCoordinates(
  latitud: number,
  longitud: number,
  offsetNorthMeters: number,
  offsetEastMeters: number
) {
  return {
    latitud: latitud + offsetNorthMeters / 111_320,
    longitud: longitud + offsetEastMeters / (111_320 * Math.cos((latitud * Math.PI) / 180)),
  };
}

async function seedReports() {
  const now = new Date();
  const dateKey = getLaPazDate(now);
  const random = createRandom(dateSeed(dateKey));
  const [year, month, day] = dateKey.split('-').map(Number);
  const dayStartLaPaz = new Date(Date.UTC(year, month - 1, day, 4));
  const elapsedTodayMs = Math.max(0, now.getTime() - dayStartLaPaz.getTime());

  const citizens = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .innerJoin(roles, eq(usuarios.rolId, roles.rolId))
    .where(and(eq(roles.nombre, 'CIUDADANO'), eq(usuarios.estadoCuenta, true)))
    .orderBy(asc(usuarios.id));

  const emergencyTypes = await db
    .select({ tipoEmergenciaId: tiposEmergencias.tipoEmergenciaId, institucion: tiposEmergencias.institucion })
    .from(tiposEmergencias)
    .where(eq(tiposEmergencias.activo, true));

  if (citizens.length === 0) {
    throw new Error('No hay ciudadanos activos. Ejecuta primero `npm run db:seed` para crear las cuentas de prueba.');
  }

  const policeTypes = emergencyTypes.filter((type) => type.institucion === 'POLICIA' || type.institucion === 'AMBOS');
  const fireTypes = emergencyTypes.filter((type) => type.institucion === 'BOMBEROS' || type.institucion === 'AMBOS');
  if (policeTypes.length === 0 || fireTypes.length === 0) {
    throw new Error('El catálogo debe tener tipos activos para POLICIA y BOMBEROS. Ejecuta primero `npm run db:seed`.');
  }

  const clusteredReports = REPORTS_PER_HOTSPOT * HOTSPOTS.length;
  const reports = Array.from({ length: REPORTS_PER_RUN }, (_unused, index) => {
    const isClustered = index < clusteredReports;
    const hotspot = HOTSPOTS[Math.floor(index / REPORTS_PER_HOTSPOT) % HOTSPOTS.length];
    const institution = random() < 0.56 ? 'POLICIA' : 'BOMBEROS';
    const categoryTypes = institution === 'POLICIA' ? policeTypes : fireTypes;
    const angle = ((index - clusteredReports) / (REPORTS_PER_RUN - clusteredReports)) * Math.PI * 2 +
      (random() - 0.5) * 0.12;
    const distance = 1_800 + random() * 1_200;
    const base = isClustered
      ? metersToCoordinates(
          hotspot.latitud,
          hotspot.longitud,
          (random() - 0.5) * 180,
          (random() - 0.5) * 180
        )
      : metersToCoordinates(
          -16.5000,
          -68.1450,
          Math.sin(angle) * distance,
          Math.cos(angle) * distance
        );
    const statusRoll = random();
    const estado = statusRoll < 0.68 ? 'PENDIENTE' : statusRoll < 0.88 ? 'EN_CURSO' : 'ATENDIDO';
    const elapsedMs = Math.floor(random() * Math.max(1, elapsedTodayMs));
    const fechaGeneracionLocal = new Date(now.getTime() - elapsedMs);
    const ticket = `SIM-${dateKey.replaceAll('-', '')}-${String(index + 1).padStart(3, '0')}`;
    const descriptionList = DESCRIPCIONES[institution];

    return {
      codigoTicket: ticket,
      descripcion: `[PRUEBA ${dateKey}] ${randomItem(descriptionList, random)}`,
      institucionDestino: institution,
      latitud: base.latitud.toFixed(7),
      longitud: base.longitud.toFixed(7),
      altitud: '3640',
      geom: sql`ST_SetSRID(ST_MakePoint(${base.longitud}, ${base.latitud}), 4326)`,
      referenciaDireccion: `${isClustered ? hotspot.nombre : 'Sector periférico'}, punto de prueba ${String(index + 1).padStart(2, '0')}`,
      fueraJurisdiccion: false,
      estado,
      fechaGeneracionLocal,
      actualizadoEn: fechaGeneracionLocal,
      tipoEmergenciaId: randomItem(categoryTypes, random).tipoEmergenciaId,
      resultadoAtencion: estado === 'ATENDIDO' ? 'ATENDIDO' : null,
      motivoNoAtencion: null,
      fechaAtencion: estado === 'ATENDIDO' ? fechaGeneracionLocal : null,
      ciudadanoId: randomItem(citizens, random).id,
    };
  });

  const inserted = await db
    .insert(reportes)
    .values(reports)
    .onConflictDoNothing({ target: reportes.codigoTicket })
    .returning({ codigoTicket: reportes.codigoTicket });

  console.log(`Seed diario ${dateKey}: ${inserted.length} reportes nuevos (${REPORTS_PER_RUN} previstos).`);
  console.log(`Distribución: ${HOTSPOTS.length} concentraciones de ${REPORTS_PER_HOTSPOT} reportes y ${REPORTS_PER_RUN - clusteredReports} dispersos; sin archivos multimedia.`);
  console.log('Tickets de prueba con prefijo SIM-. Ejecutar otra vez hoy no duplica reportes.');
}

seedReports()
  .catch((error) => {
    console.error('Error al cargar reportes de prueba:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
