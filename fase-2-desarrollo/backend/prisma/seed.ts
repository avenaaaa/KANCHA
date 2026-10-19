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

/**
 * Próximo horario "de cancha" a partir de ahora: `dias` días después, a la hora
 * indicada (hora de Chile). Si ese horario ya pasó, se corre al día siguiente.
 * Así la demo siempre muestra partidos futuros con horas reales (19:00, 20:30…).
 */
function proximo(dias: number, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const chile = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Santiago' }));
  // Diferencia entre la hora de Chile y UTC, redondeada al minuto.
  const offsetMs = Math.round((chile.getTime() - Date.now()) / 60_000) * 60_000;
  const target = new Date(chile.getFullYear(), chile.getMonth(), chile.getDate() + dias, h ?? 0, m ?? 0);
  let utc = new Date(target.getTime() - offsetMs);
  if (utc.getTime() < Date.now() + 60 * 60_000) utc = new Date(utc.getTime() + 24 * 3_600_000);
  return utc;
}

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
  { title: 'Fútbol 7 · Los de siempre', sport: Sport.FUTBOL, level: SkillLevel.MEDIO,        venue: 'Complejo Walker Martínez', calle: 'Av. Walker Martínez', dx: 1.2,  dy: 0.8,  slots: 14, filled: 12, cost: 42000, dia: 0, hora: '20:00' },
  { title: 'Fútbol 5 · Falta uno',           sport: Sport.FUTBOL, level: SkillLevel.PRINCIPIANTE, venue: 'Cancha Los Quillayes',     calle: 'Los Quillayes', dx: -2.1, dy: 1.4,  slots: 10, filled: 9,  cost: 30000, dia: 1, hora: '19:30' },
  { title: 'Fútbol 7 · Clásico del barrio',  sport: Sport.FUTBOL, level: SkillLevel.AVANZADO,     venue: 'Club Rojas Magallanes',    calle: 'Av. Rojas Magallanes', dx: 0.6,  dy: -2.3, slots: 14, filled: 10, cost: 49000, dia: 2, hora: '21:00' },
  { title: 'Fútbol 5 · After office',        sport: Sport.FUTBOL, level: SkillLevel.MEDIO,        venue: 'Complejo Vicuña Mackenna', calle: 'Av. Vicuña Mackenna', dx: -1.5, dy: -0.9, slots: 10, filled: 6,  cost: 35000, dia: 3, hora: '19:00' },

  { title: 'Pádel dobles · Falta uno',       sport: Sport.PADEL,  level: SkillLevel.MEDIO,        venue: 'Pádel Bellavista',         calle: 'Av. Bellavista', dx: 2.4,  dy: 0.3,  slots: 4,  filled: 3,  cost: 24000, dia: 0, hora: '21:00' },
  { title: 'Pádel · Nivel inicial',          sport: Sport.PADEL,  level: SkillLevel.PRINCIPIANTE, venue: 'Club Trinidad',            calle: 'Av. Trinidad', dx: -0.8, dy: 2.6,  slots: 4,  filled: 2,  cost: 20000, dia: 1, hora: '10:00' },
  { title: 'Pádel competitivo',              sport: Sport.PADEL,  level: SkillLevel.AVANZADO,     venue: 'Pádel Walker',             calle: 'Av. Walker Martínez', dx: 1.9,  dy: -1.7, slots: 4,  filled: 3,  cost: 28000, dia: 2, hora: '18:30' },
  { title: 'Pádel · Dobles por la mañana',   sport: Sport.PADEL,  level: SkillLevel.MEDIO,        venue: 'Centro Deportivo Sur',     calle: 'Av. Departamental', dx: -2.7, dy: -1.1, slots: 4,  filled: 1,  cost: 22000, dia: 4, hora: '11:00' },

  { title: 'Básquet 3x3 · Falta uno',        sport: Sport.BASQUETBOL, level: SkillLevel.MEDIO,        venue: 'Gimnasio Los Quillayes', calle: 'Los Quillayes', dx: 0.9,  dy: 1.9,  slots: 6,  filled: 5,  cost: 18000, dia: 0, hora: '19:00' },
  { title: 'Básquet 5x5 · Liga amateur',     sport: Sport.BASQUETBOL, level: SkillLevel.AVANZADO,     venue: 'Polideportivo La Florida', calle: 'Av. La Florida', dx: -1.3, dy: 0.5, slots: 10, filled: 8,  cost: 32000, dia: 1, hora: '20:30' },
  { title: 'Básquet 3x3 · Principiantes',    sport: Sport.BASQUETBOL, level: SkillLevel.PRINCIPIANTE, venue: 'Multicancha Trinidad',   calle: 'Av. Trinidad', dx: 2.2,  dy: 2.1,  slots: 6,  filled: 2,  cost: 0,     dia: 1, hora: '17:00' },
  { title: 'Básquet 5x5 · Tarde de cancha', sport: Sport.BASQUETBOL, level: SkillLevel.MEDIO,        venue: 'Gimnasio Bellavista',    calle: 'Av. Bellavista', dx: -0.4, dy: -2.8, slots: 10, filled: 7,  cost: 28000, dia: 3, hora: '18:00' },
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
         ${p.venue}, ${`${p.calle}, La Florida`},
         ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
         ${proximo(p.dia, p.hora)}, ${p.sport === Sport.FUTBOL ? 60 : 90}, ${p.slots}, ${p.filled}, ${p.cost},
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
       'Complejo Walker Martínez', 'Av. Walker Martínez, La Florida',
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

  // Cada asistente califica a los demás. Cada jugador tiene un perfil propio
  // (puntual y correcto, impuntual, discutidor…) para que el semáforo del
  // Sistema de Honor muestre verde, amarillo y rojo en la demo.
  const PERFIL = [
    { p: 5, c: 5 }, // Lukas: ejemplar
    { p: 4, c: 5 }, // Camila
    { p: 2, c: 3 }, // Matías: llega tarde
    { p: 5, c: 4 }, // Valentina
    { p: 3, c: 2 }, // Diego: discute con el árbitro
    { p: 4, c: 4 }, // Fernanda
  ];
  let reseñas = 0;
  for (const [i, rater] of asistentes.entries()) {
    for (const [j, rated] of asistentes.entries()) {
      if (i === j) continue;
      const perfil = PERFIL[j]!;
      await prisma.rating.create({
        data: {
          matchId: historico!.id,
          raterId: rater.id,
          ratedId: rated.id,
          punctuality: Math.max(1, Math.min(5, perfil.p - (i % 3 === 2 ? 1 : 0))),
          conduct: Math.max(1, Math.min(5, perfil.c - (i % 4 === 3 ? 1 : 0))),
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
