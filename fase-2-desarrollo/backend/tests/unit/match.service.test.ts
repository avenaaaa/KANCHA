import { describe, expect, it } from 'vitest';
import { assertFutureStart, checkCanPrioritize, isPriorityActive, toMatchSummary } from '../../src/services/match.service.js';
import { createMatchSchema, nearbyQuerySchema } from '../../src/schemas/match.schema.js';
import { AppError } from '../../src/utils/errors.js';
import type { MatchRow } from '../../src/repositories/match.repository.js';

const ahora = new Date('2026-10-17T15:00:00Z');

const partidoValido = {
  title: 'Pádel dobles · Falta uno',
  sport: 'PADEL',
  venueName: 'Pádel Bellavista',
  address: 'La Florida',
  lat: -33.52,
  lng: -70.59,
  startsAt: '2026-10-18T20:00:00Z',
  totalSlots: 4,
  filledSlots: 3,
  totalCost: 24000,
};

describe('assertFutureStart (HU-03)', () => {
  it('U-23 · acepta un partido con fecha futura', () => {
    expect(() => assertFutureStart(new Date('2026-10-17T15:01:00Z'), ahora)).not.toThrow();
  });

  it('U-24 · rechaza un partido en el pasado con 422 MATCH_IN_PAST (CN-05)', () => {
    try {
      assertFutureStart(new Date('2026-10-17T14:59:00Z'), ahora);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).statusCode).toBe(422);
      expect((e as AppError).code).toBe('MATCH_IN_PAST');
    }
  });

  it('U-25 · rechaza la hora exacta de ahora: el límite es exclusivo', () => {
    expect(() => assertFutureStart(ahora, ahora)).toThrow(AppError);
  });
});

describe('createMatchSchema (HU-03)', () => {
  it('U-26 · acepta un partido válido y aplica los valores por defecto', () => {
    const r = createMatchSchema.parse(partidoValido);
    expect(r.level).toBe('MEDIO');
    expect(r.durationMin).toBe(60);
    expect(r.startsAt).toBeInstanceOf(Date);
  });

  it('U-27 · rechaza totalSlots = 0 (CN-06)', () => {
    expect(createMatchSchema.safeParse({ ...partidoValido, totalSlots: 0 }).success).toBe(false);
  });

  it('U-28 · rechaza publicar un partido sin cupos libres', () => {
    const r = createMatchSchema.safeParse({ ...partidoValido, filledSlots: 4 });
    expect(r.success).toBe(false);
  });

  it('U-29 · rechaza campos extra (S-05)', () => {
    expect(createMatchSchema.safeParse({ ...partidoValido, status: 'FULL' }).success).toBe(false);
  });

  it('U-30 · rechaza montos con decimales: el dinero es entero', () => {
    expect(createMatchSchema.safeParse({ ...partidoValido, totalCost: 24000.5 }).success).toBe(false);
  });
});

describe('nearbyQuerySchema (HU-04)', () => {
  it('U-31 · el radio por defecto es 5 km', () => {
    const q = nearbyQuerySchema.parse({ lat: '-33.52', lng: '-70.59' });
    expect(q.radius).toBe(5000);
    expect(q.sport).toBeUndefined();
  });

  it('U-32 · acepta varios deportes separados por coma', () => {
    const q = nearbyQuerySchema.parse({ lat: '-33.52', lng: '-70.59', sport: 'FUTBOL,PADEL' });
    expect(q.sport).toEqual(['FUTBOL', 'PADEL']);
  });

  it('U-33 · rechaza un deporte inexistente o un intento de inyección (S-04)', () => {
    const r = nearbyQuerySchema.safeParse({ lat: '-33.52', lng: '-70.59', sport: `'; DROP TABLE "Match"; --` });
    expect(r.success).toBe(false);
  });

  it('U-34 · rechaza coordenadas que no son números', () => {
    expect(nearbyQuerySchema.safeParse({ lat: 'abc', lng: '-70.59' }).success).toBe(false);
  });
});

describe('toMatchSummary', () => {
  const fila: MatchRow = {
    id: 'm1',
    title: 'Fútbol 7',
    sport: 'FUTBOL',
    level: 'MEDIO',
    venueName: 'Complejo',
    address: 'La Florida',
    lat: -33.5,
    lng: -70.6,
    startsAt: new Date('2026-10-18T20:00:00Z'),
    durationMin: 60,
    totalSlots: 14,
    filledSlots: 12,
    totalCost: 42000,
    status: 'OPEN',
    prioritizedAt: null,
    organizerId: 'u1',
    organizerName: 'Lukas',
    organizerHonor: null,
  };

  it('U-35 · calcula cupos libres y cuota por jugador', () => {
    const s = toMatchSummary(fila);
    expect(s.slotsLeft).toBe(2);
    expect(s.pricePerPlayer).toBe(3000);
  });

  it('U-36 · mantiene null el honor de un organizador sin reseñas', () => {
    expect(toMatchSummary(fila).organizer.honorScore).toBeNull();
  });
});

describe('checkCanPrioritize · "Falta uno" destacado (KAN-41)', () => {
  const ahora = new Date('2026-11-20T18:00:00Z');
  const enHoras = (h: number) => new Date(ahora.getTime() + h * 3_600_000);
  const partido = {
    organizerId: 'organizador',
    status: 'OPEN',
    startsAt: enHoras(1),
    totalSlots: 10,
    filledSlots: 9,
    prioritizedAt: null as Date | null,
  };
  const codigo = (e: AppError | null) => e?.code ?? null;

  it('U-83 · el organizador puede destacar si le falta 1 jugador y empieza en 2 h o menos', () => {
    expect(checkCanPrioritize(partido, 'organizador', ahora)).toBeNull();
    expect(checkCanPrioritize({ ...partido, startsAt: enHoras(2) }, 'organizador', ahora)).toBeNull();
  });

  it('U-84 · solo el organizador destaca su partido', () => {
    expect(checkCanPrioritize(partido, 'otro', ahora)?.statusCode).toBe(403);
  });

  it('U-85 · no se destaca si faltan 2 o más: quienes entran pagan su parte (KAN-44)', () => {
    expect(codigo(checkCanPrioritize({ ...partido, filledSlots: 8 }, 'organizador', ahora))).toBe('PRIORITY_NOT_AVAILABLE');
    expect(codigo(checkCanPrioritize({ ...partido, filledSlots: 7 }, 'organizador', ahora))).toBe('PRIORITY_NOT_AVAILABLE');
  });

  it('U-86 · no se destaca antes de la ventana de 2 horas', () => {
    expect(codigo(checkCanPrioritize({ ...partido, startsAt: enHoras(2.1) }, 'organizador', ahora))).toBe('PRIORITY_TOO_EARLY');
  });

  it('U-87 · no se destaca dos veces, ni un partido ya iniciado o cerrado', () => {
    expect(codigo(checkCanPrioritize({ ...partido, prioritizedAt: ahora }, 'organizador', ahora))).toBe('ALREADY_PRIORITY');
    expect(codigo(checkCanPrioritize({ ...partido, startsAt: enHoras(-0.1) }, 'organizador', ahora))).toBe('MATCH_STARTED');
    expect(codigo(checkCanPrioritize({ ...partido, status: 'FULL' }, 'organizador', ahora))).toBe('MATCH_NOT_OPEN');
  });
});

describe('isPriorityActive · el destacado rige mientras falte 1 (KAN-44)', () => {
  it('U-102 · da entrada gratis con 1 libre; con 2 libres, lleno o sin destacar, no', () => {
    const destacado = { prioritizedAt: new Date('2026-11-22T18:00:00Z'), totalSlots: 4 };
    expect(isPriorityActive({ ...destacado, filledSlots: 3 })).toBe(true);
    expect(isPriorityActive({ ...destacado, filledSlots: 2 })).toBe(false);
    expect(isPriorityActive({ ...destacado, filledSlots: 4 })).toBe(false);
    expect(isPriorityActive({ prioritizedAt: null, totalSlots: 4, filledSlots: 3 })).toBe(false);
  });
});
