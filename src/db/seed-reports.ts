import { and, asc, eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { db } from './index.js';
import { env } from '../config/env.js';
import { pool } from '../config/db.js';
import { reportes, roles, tiposEmergencias, usuarios } from './schema/index.js';

const DAYS = 30;
const REPORTS_PER_DAY = 50;
const DAY_MS = 86_400_000;
const TIME_ZONE = 'America/La_Paz';

// Anchors aproximados de sectores urbanos para la simulación.
const SECTORS = [
  ['Achachicala', -16.4730, -68.1438],
  ['Villa Fátima', -16.4778, -68.1212],
  ['Villa El Carmen', -16.4706, -68.1116],
  ['Periférica', -16.4832, -68.1351],
  ['Munaypata', -16.4844, -68.1664],
  ['Max Paredes', -16.4971, -68.1510],
  ['El Tejar', -16.4961, -68.1585],
  ['Gran Poder', -16.5036, -68.1408],
  ['Centro', -16.4955, -68.1333],
  ['Miraflores', -16.5030, -68.1190],
  ['Sopocachi', -16.5126, -68.1294],
  ['San Pedro', -16.5061, -68.1345],
  ['San Antonio', -16.5082, -68.1114],
  ['Villa Copacabana', -16.4983, -68.1079],
  ['Pampahasi', -16.5132, -68.0980],
  ['Tembladerani', -16.5151, -68.1445],
  ['Llojeta', -16.5288, -68.1421],
  ['Obrajes', -16.5310, -68.1125],
  ['Següencoma', -16.5457, -68.1006],
  ['Calacoto', -16.5428, -68.0857],
  ['Achumani', -16.5305, -68.0690],
  ['Irpavi', -16.5299, -68.0832],
  ['Cota Cota', -16.5380, -68.0606],
  ['Chasquipampa', -16.5490, -68.0460],
  ['Mallasa', -16.5705, -68.0898],
] as const;

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
  if (env.NODE_ENV === 'production' || !['localhost', '127.0.0.1', '::1'].includes(env.DB_HOST)) {
    throw new Error('La simulación solo puede cargarse en una base local fuera de producción.');
  }

  const now = new Date();
  const todayKey = getLaPazDate(now);
  const todayStart = new Date(`${todayKey}T00:00:00-04:00`).getTime();

  const citizens = await db
    .select({ id: usuarios.id })
    .from(usuarios)
    .innerJoin(roles, eq(usuarios.rolId, roles.rolId))
    .where(and(eq(roles.nombre, 'CIUDADANO'), eq(usuarios.estadoCuenta, true)))
    .orderBy(asc(usuarios.id));

  const emergencyTypes = await db
    .select({ tipoEmergenciaId: tiposEmergencias.tipoEmergenciaId, institucion: tiposEmergencias.institucion, nombre: tiposEmergencias.nombre })
    .from(tiposEmergencias)
    .where(eq(tiposEmergencias.activo, true))
    .orderBy(asc(tiposEmergencias.tipoEmergenciaId));

  if (citizens.length === 0) {
    throw new Error('No hay ciudadanos activos. Ejecuta primero `npm run db:seed` para crear las cuentas de prueba.');
  }

  const policeTypes = emergencyTypes.filter((type) => type.institucion === 'POLICIA' || type.institucion === 'AMBOS');
  const fireTypes = emergencyTypes.filter((type) => type.institucion === 'BOMBEROS' || type.institucion === 'AMBOS');
  if (policeTypes.length === 0 || fireTypes.length === 0) {
    throw new Error('El catálogo debe tener tipos activos para POLICIA y BOMBEROS. Ejecuta primero `npm run db:seed`.');
  }

  const reports = Array.from({ length: DAYS }, (_, daysAgo) => {
    const dayStart = todayStart - daysAgo * DAY_MS;
    const dateKey = getLaPazDate(new Date(dayStart));
    const latest = Math.min(dayStart + DAY_MS - 1, now.getTime());
    const random = createRandom(dateSeed(dateKey));
    const policeCount = 26 + Math.floor(random() * 8);

    return Array.from({ length: REPORTS_PER_DAY }, (_, index) => {
      const institution = index < policeCount ? 'POLICIA' : 'BOMBEROS';
      const category = randomItem(institution === 'POLICIA' ? policeTypes : fireTypes, random);
      const [sector, lat, lon] = SECTORS[(index + Math.floor(random() * SECTORS.length)) % SECTORS.length];
      const angle = random() * Math.PI * 2;
      const radius = Math.sqrt(random()) * (random() < 0.72 ? 145 : 410);
      const base = metersToCoordinates(lat, lon, radius * Math.sin(angle), radius * Math.cos(angle));
      const roll = random();
      const peakHours = institution === 'POLICIA' ? [7, 8, 12, 17, 18, 19, 21] : [10, 11, 13, 15, 16, 18, 19];
      const preferred = roll < 0.64 ? randomItem(peakHours, random) : Math.floor(random() * 24);
      const elapsed = latest - dayStart;
      const time = preferred * 3_600_000 + Math.floor(random() * 3_600_000);
      const reportedAt = dayStart + (time <= elapsed ? time : Math.floor(random() * elapsed));
      const ageMinutes = (now.getTime() - reportedAt) / 60_000;
      const outcome = random();
      const estado = ageMinutes < 90 && outcome < 0.6
        ? (ageMinutes < 25 ? 'PENDIENTE' : 'EN_CURSO')
        : outcome > 0.96 ? 'FALSA_ALARMA' : 'ATENDIDO';
      const closed = estado === 'ATENDIDO' || estado === 'FALSA_ALARMA';
      const updated = new Date(closed ? Math.min(now.getTime(), reportedAt + (18 + Math.floor(random() * 95)) * 60_000) : reportedAt);
      const fechaGeneracionLocal = new Date(reportedAt);

      return {
        codigoTicket: `SIMM-${dateKey.replaceAll('-', '')}-${String(index + 1).padStart(3, '0')}`,
        descripcion: `[SIMULACIÓN] ${category.nombre} en ${sector}. ${randomItem([
          'Aviso ciudadano desde la vía pública.',
          'Un vecino solicitó asistencia y compartió su ubicación.',
          'Se solicitó verificación en las inmediaciones.',
        ], random)}`,
        institucionDestino: institution,
        latitud: base.latitud.toFixed(7),
        longitud: base.longitud.toFixed(7),
        geom: sql`ST_SetSRID(ST_MakePoint(${base.longitud}, ${base.latitud}), 4326)`,
        referenciaDireccion: sector,
        fueraJurisdiccion: false,
        estado,
        fechaGeneracionLocal,
        actualizadoEn: updated,
        tipoEmergenciaId: category.tipoEmergenciaId,
        resultadoAtencion: closed ? estado : null,
        motivoNoAtencion: estado === 'FALSA_ALARMA' ? 'Incidente descartado en la verificación simulada.' : null,
        fechaAtencion: closed ? updated : null,
        ciudadanoId: randomItem(citizens, random).id,
      };
    });
  }).flat();

  const inserted = await db
    .insert(reportes)
    .values(reports)
    .onConflictDoNothing({ target: reportes.codigoTicket })
    .returning({ codigoTicket: reportes.codigoTicket });

  console.log(`Simulación hasta ${todayKey}: ${inserted.length} reportes nuevos de ${reports.length} planificados.`);
  console.log(`${REPORTS_PER_DAY} reportes por día · ${DAYS} días · ${SECTORS.length} sectores · Policía y Bomberos.`);
}

seedReports()
  .catch((error) => {
    console.error('Error al cargar reportes de prueba:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
