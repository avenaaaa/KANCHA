/**
 * Seed de demostración — La Florida, Región Metropolitana.
 *
 * Deja la demo lista en frío: jugadores con distintos niveles de honor, partidos
 * repartidos en un radio de ~5 km y reseñas previas para que el Sistema de Honor
 * se vea funcionando desde el primer segundo.
 *
 * Los nombres de recinto son ficticios y se apoyan en sectores reales de la
 * comuna. No representan establecimientos existentes.
 */
import { PrismaClient, Sport, SkillLevel, MatchStatus, PartStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Centro aproximado de La Florida
const CENTRO = { lat: -33.5228, lng: -70.5983 };

/** Desplaza un punto en kilómetros. Suficiente para datos de demostración. */
function offset(lat: number, lng: number, dxKm: number, dyKm: number) {
  return { lat: lat + dyKm / 111, lng: lng + dxKm / (111 * Math.cos((lat * Math.PI) / 180)) };
}

/** Fecha relativa a ahora, en horas. */
const enHoras = (h: number) => new Date(Date.now() + h * 3_600_000);

const USUARIOS = [
  { name: 'Lukas Guerrero',   email: 'lukas@kancha.cl',    sport: Sport.FUTBOL },
  { name: 'Camila Rojas',     email: 'camila@kancha.cl',   sport: Sport.PADEL },
  { name: 'Matías Fuentes',   email: 'matias@kancha.cl',   sport: Sport.BASQUETBOL },
  { name: 'Valentina Soto',   email: 'valentina@kancha.cl',sport: Sport.FUTBOL },
  { name: 'Diego Cáceres',    email: 'diego@kancha.cl',    sport: Sport.PADEL },
  { name: 'Fernanda Muñoz',   email: 'fernanda@kancha.cl', sport: Sport.BASQUETBOL },
  { name: 'Ignacio Vera',     email: 'ignacio@kancha.cl',  sport: Sport.FUTBOL },
  { name: 'Antonia Pizarro',  email: 'antonia@kancha.cl',  sport: Sport.PADEL },
];

// Los tres deportes con la misma presencia: 4 partidos cada uno (DESIGN.md).
const PARTIDOS = [
  { title: 'Fútbol 7 · Pichanga del jueves', sport: Sport.FUTBOL, level: SkillLevel.MEDIO,        venue: 'Complejo Walker Martínez', dx: 1.2,  dy: 0.8,  slots: 14, filled: 12, cost: 42000, inicio: 20 },
  { title: 'Fútbol 5 · Falta uno',           sport: Sport.FUTBOL, level: SkillLevel.PRINCIPIANTE, venue: 'Cancha Los Quillayes',     dx: -2.1, dy: 1.4,  slots: 10, filled: 9,  cost: 30000, inicio: 27 },
  { title: 'Fútbol 7 · Clásico del barrio',  sport: Sport.FUTBOL, level: SkillLevel.AVANZADO,     venue: 'Club Rojas Magallanes',    dx: 0.6,  dy: -2.3, slots: 14, filled: 10, cost: 49000, inicio: 44 },
  { title: 'Fútbol 5 · After office',        sport: Sport.FUTBOL, level: SkillLevel.MEDIO,        venue: 'Complejo Vicuña Mackenna', dx: -1.5, dy: -0.9, slots: 10, filled: 6,  cost: 35000, inicio: 51 },

  { title: 'Pádel dobles · Falta uno',       sport: Sport.PADEL,  level: SkillLevel.MEDIO,        venue: 'Pádel Bellavista',         dx: 2.4,  dy: 0.3,  slots: 4,  filled: 3,  cost: 24000, inicio: 18 },
  { title: 'Pádel · Nivel inicial',          sport: Sport.PADEL,  level: SkillLevel.PRINCIPIANTE, venue: 'Club Trinidad',            dx: -0.8, dy: 2.6,  slots: 4,  filled: 2,  cost: 20000, inicio: 26 },
  { title: 'Pádel competitivo',              sport: Sport.PADEL,  level: SkillLevel.AVANZADO,     venue: 'Pádel Walker',             dx: 1.9,  dy: -1.7, slots: 4,  filled: 3,  cost: 28000, inicio: 42 },
  { title: 'Pádel · Sábado por la mañana',   sport: Sport.PADEL,  level: SkillLevel.MEDIO,        venue: 'Centro Deportivo Sur',     dx: -2.7, dy: -1.1, slots: 4,  filled: 1,  cost: 22000, inicio: 60 },

  { title: 'Básquet 3x3 · Falta uno',        sport: Sport.BASQUETBOL, level: SkillLevel.MEDIO,        venue: 'Gimnasio Los Quillayes', dx: 0.9,  dy: 1.9,  slots: 6,  filled: 5,  cost: 18000, inicio: 22 },
  { title: 'Básquet 5x5 · Liga amateur',     sport: Sport.BASQUETBOL, level: SkillLevel.AVANZADO,     venue: 'Polideportivo La Florida', dx: -1.3, dy: 0.5, slots: 10, filled: 8,  cost: 32000, inicio: 30 },
  { title: 'Básquet 3x3 · Principiantes',    sport: Sport.BASQUETBOL, level: SkillLevel.PRINCIPIANTE, venue: 'Multicancha Trinidad',   dx: 2.2,  dy: 2.1,  slots: 6,  filled: 2,  cost: 0,     inicio: 36 },
  { title: 'Básquet · Domingo por la tarde', sport: Sport.BASQUETBOL, level: SkillLevel.MEDIO,        venue: 'Gimnasio Bellavista',    dx: -0.4, dy: -2.8, slots: 10, filled: 7,  cost: 28000, inicio: 55 },
];

async function main() {
  console.log('🟠 Sembrando datos de demostración de Kancha…');

  await prisma.rating.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.participation.deleteMany();
  await prisma.match.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash('kancha2026', 12);

  const usuarios = [];
  for (const u of USUARIOS) {
    usuarios.push(
      await prisma.user.create({
        data: { email: u.email, name: u.name, favoriteSport: u.sport, passwordHash },
      }),
    );
  }
  console.log(`   ${usuarios.length} usuarios creados`);

  const partidos = [];
  for (const [i, p] of PARTIDOS.entries()) {
    const organizer = usuarios[i % usuarios.length]!;
    const { lat, lng } = offset(CENTRO.lat, CENTRO.lng, p.dx, p.dy);

    const [row] = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "Match"
        ("id","organizerId","title","sport","level","venueName","address","location",
         "startsAt","durationMin","totalSlots","filledSlots","totalCost","status","createdAt","updatedAt")
      VALUES
        (gen_random_uuid(), ${organizer.id}, ${p.title}, ${p.sport}::"Sport", ${p.level}::"SkillLevel",
         ${p.venue}, ${`${p.venue}, La Florida, Región Metropolitana`},
         ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
         ${enHoras(p.inicio)}, 60, ${p.slots}, ${p.filled}, ${p.cost},
         ${p.filled >= p.slots ? MatchStatus.FULL : MatchStatus.OPEN}::"MatchStatus", NOW(), NOW())
      RETURNING "id";
    `;
    partidos.push({ ...p, id: row!.id, organizerId: organizer.id });
  }
  console.log(`   ${partidos.length} partidos creados (4 por deporte)`);

  // Historial: un partido ya terminado con reseñas, para que el honor no salga vacío.
  const [historico] = await prisma.$queryRaw<{ id: string }[]>`
    INSERT INTO "Match"
      ("id","organizerId","title","sport","level","venueName","address","location",
       "startsAt","durationMin","totalSlots","filledSlots","totalCost","status","createdAt","updatedAt")
    VALUES
      (gen_random_uuid(), ${usuarios[0]!.id}, 'Fútbol 7 · Partido de la semana pasada',
       ${Sport.FUTBOL}::"Sport", ${SkillLevel.MEDIO}::"SkillLevel",
       'Complejo Walker Martínez', 'Complejo Walker Martínez, La Florida, Región Metropolitana',
       ST_SetSRID(ST_MakePoint(${CENTRO.lng}, ${CENTRO.lat}), 4326)::geography,
       ${enHoras(-72)}, 60, 14, 14, 42000, ${MatchStatus.FINISHED}::"MatchStatus", NOW(), NOW())
    RETURNING "id";
  `;

  const asistentes = usuarios.slice(0, 6);
  for (const u of asistentes) {
    await prisma.participation.create({
      data: {
        matchId: historico!.id,
        userId: u.id,
        status: PartStatus.PAID,
        amountDue: 3000,
      },
    });
  }

  // Cada asistente califica a los demás, con notas variadas para que los
  // puntajes de honor no salgan todos iguales.
  let reseñas = 0;
  for (const [i, rater] of asistentes.entries()) {
    for (const [j, rated] of asistentes.entries()) {
      if (i === j) continue;
      await prisma.rating.create({
        data: {
          matchId: historico!.id,
          raterId: rater.id,
          ratedId: rated.id,
          punctuality: 3 + ((i + j) % 3),
          conduct: 3 + ((i + j + 1) % 3),
        },
      });
      reseñas++;
    }
  }
  console.log(`   1 partido histórico con ${reseñas} reseñas`);

  // Recalcula el honor de quienes tienen reseñas.
  const { calculateHonor } = await import('../src/services/honor.service.js');
  for (const u of asistentes) {
    const ratings = await prisma.rating.findMany({
      where: { ratedId: u.id },
      orderBy: { createdAt: 'desc' },
      select: { punctuality: true, conduct: true },
    });
    const attended = await prisma.participation.count({
      where: { userId: u.id, status: PartStatus.PAID },
    });
    const noShow = await prisma.participation.count({
      where: { userId: u.id, status: PartStatus.NO_SHOW },
    });
    const h = calculateHonor(ratings, { attended, noShow });
    await prisma.user.update({
      where: { id: u.id },
      data: {
        honorScore: h.honorScore,
        attendanceRate: h.attendanceRate,
        punctualityRate: h.punctualityRate,
        fairPlayRate: h.fairPlayRate,
        matchesPlayed: attended,
      },
    });
  }

  console.log('✅ Seed completo. Todas las cuentas usan la contraseña: kancha2026');
  console.log('   Dos usuarios quedan sin reseñas a propósito, para ver "Sin calificaciones aún".');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => void prisma.$disconnect());
