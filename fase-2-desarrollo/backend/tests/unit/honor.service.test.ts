import { describe, expect, it } from 'vitest';
import { calculateHonor, checkCanRate, isRatingWindowOpen, ratingWindow } from '../../src/services/honor.service.js';

describe('calculateHonor', () => {
  it('devuelve null y no 0 cuando el usuario no tiene ninguna señal (HU-01, HU-02)', () => {
    const r = calculateHonor([], { attended: 0, noShow: 0 });
    expect(r.honorScore).toBeNull();
    expect(r.punctualityRate).toBeNull();
    expect(r.fairPlayRate).toBeNull();
    expect(r.attendanceRate).toBeNull();
  });

  it('un jugador perfecto llega a 10.0', () => {
    const r = calculateHonor([{ punctuality: 5, conduct: 5 }], { attended: 10, noShow: 0 });
    expect(r.honorScore).toBe(10);
  });

  it('un jugador en el mínimo de la escala llega a 0.0, distinto de null', () => {
    const r = calculateHonor([{ punctuality: 1, conduct: 1 }], { attended: 0, noShow: 5 });
    expect(r.honorScore).toBe(0);
    expect(r.honorScore).not.toBeNull();
  });

  it('calcula la asistencia como asistidos sobre cerrados', () => {
    const r = calculateHonor([], { attended: 9, noShow: 1 });
    expect(r.attendanceRate).toBe(90);
  });

  it('promedia solo las últimas 20 reseñas', () => {
    const recientes = Array.from({ length: 20 }, () => ({ punctuality: 5, conduct: 5 }));
    const antiguas = Array.from({ length: 30 }, () => ({ punctuality: 1, conduct: 1 }));
    const r = calculateHonor([...recientes, ...antiguas], { attended: 0, noShow: 0 });
    expect(r.punctualityRate).toBe(100);
  });

  it('redondea el puntaje a un decimal', () => {
    const r = calculateHonor([{ punctuality: 4, conduct: 3 }], { attended: 2, noShow: 1 });
    expect(r.honorScore).not.toBeNull();
    expect(String(r.honorScore)).toMatch(/^\d+(\.\d)?$/);
  });
});

describe('isRatingWindowOpen', () => {
  const inicio = new Date('2026-10-01T20:00:00Z');
  const duracion = 60;
  const fin = new Date('2026-10-01T21:00:00Z');

  it('está cerrada mientras el partido no termina', () => {
    expect(isRatingWindowOpen(inicio, duracion, new Date('2026-10-01T20:30:00Z'))).toBe(false);
  });

  it('se abre apenas termina el partido', () => {
    expect(isRatingWindowOpen(inicio, duracion, fin)).toBe(true);
  });

  it('sigue abierta a las 47 h 59 min', () => {
    expect(isRatingWindowOpen(inicio, duracion, new Date('2026-10-03T20:59:00Z'))).toBe(true);
  });

  it('se cierra pasadas las 48 h (HU-06)', () => {
    expect(isRatingWindowOpen(inicio, duracion, new Date('2026-10-03T21:01:00Z'))).toBe(false);
  });
});

describe('ratingWindow (HU-06)', () => {
  const inicio = new Date('2026-11-01T20:00:00Z'); // termina a las 21:00 con 60 min
  const a = (iso: string) => ratingWindow(inicio, 60, new Date(iso));

  it('U-69 · aún no termina, abierta hasta las 48 h exactas y cerrada después', () => {
    expect(a('2026-11-01T20:59:00Z')).toBe('NOT_FINISHED');
    expect(a('2026-11-01T21:00:00Z')).toBe('OPEN');
    expect(a('2026-11-03T21:00:00Z')).toBe('OPEN');
    expect(a('2026-11-03T21:01:00Z')).toBe('CLOSED');
  });
});

describe('checkCanRate (HU-06)', () => {
  const roster = new Set(['org', 'a', 'b']);

  it('U-70 · solo califica quien jugó, nunca a sí mismo ni a alguien que no jugó, y con la ventana abierta', () => {
    expect(checkCanRate(roster, 'a', 'b', 'OPEN')).toBeNull();
    expect(checkCanRate(roster, 'org', 'a', 'OPEN')).toBeNull();
    expect(checkCanRate(roster, 'intruso', 'a', 'OPEN')).toBe('NOT_IN_MATCH');
    expect(checkCanRate(roster, 'a', 'a', 'OPEN')).toBe('SELF_RATING');
    expect(checkCanRate(roster, 'a', 'intruso', 'OPEN')).toBe('RATED_NOT_IN_MATCH');
    expect(checkCanRate(roster, 'a', 'b', 'NOT_FINISHED')).toBe('MATCH_NOT_FINISHED');
    expect(checkCanRate(roster, 'a', 'b', 'CLOSED')).toBe('RATING_WINDOW_CLOSED');
  });
});
