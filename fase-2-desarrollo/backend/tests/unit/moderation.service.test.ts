import { describe, expect, it } from 'vitest';
import { checkCanReport, isSuspended, suspensionEnd, SUSPENSION_DAYS } from '../../src/services/moderation.service.js';
import { sanctionMessage } from '../../src/services/notification.service.js';
import { createReportSchema, resolveReportSchema } from '../../src/schemas/moderation.schema.js';

const ahora = new Date('2026-11-22T15:00:00Z');
const DIA = 86_400_000;
const jugado = { startsAt: new Date(ahora.getTime() - 3 * 3_600_000), memberIds: new Set(['organizador', 'ana', 'beto']) };

describe('checkCanReport · solo se reporta a un compañero de partido (HU-11)', () => {
  it('U-103 · un compañero reporta a otro una vez empezado el partido', () => {
    expect(checkCanReport(jugado, 'ana', 'beto', ahora)).toBeNull();
    expect(checkCanReport(jugado, 'organizador', 'ana', ahora)).toBeNull();
  });

  it('U-104 · no reporta quien no jugó, ni a sí mismo, ni a quien no jugó, ni antes de empezar', () => {
    expect(checkCanReport(jugado, 'intruso', 'ana', ahora)).toBe('NOT_IN_MATCH');
    expect(checkCanReport(jugado, 'ana', 'ana', ahora)).toBe('SELF_REPORT');
    expect(checkCanReport(jugado, 'ana', 'desconocido', ahora)).toBe('REPORTED_NOT_IN_MATCH');
    const futuro = { ...jugado, startsAt: new Date(ahora.getTime() + 60_000) };
    expect(checkCanReport(futuro, 'ana', 'beto', ahora)).toBe('MATCH_NOT_STARTED');
  });
});

describe('suspensión de 7 días (HU-11)', () => {
  it('U-105 · suspendido hasta una fecha futura; NULL o una fecha pasada, no', () => {
    expect(isSuspended(null, ahora)).toBe(false);
    expect(isSuspended(new Date(ahora.getTime() - 1), ahora)).toBe(false);
    expect(isSuspended(new Date(ahora.getTime() + 1), ahora)).toBe(true);
  });

  it('U-106 · cada sanción suma 7 días: desde ahora, o a lo que quedaba si seguía suspendido', () => {
    expect(SUSPENSION_DAYS).toBe(7);
    expect(suspensionEnd(null, ahora)).toEqual(new Date(ahora.getTime() + 7 * DIA));
    expect(suspensionEnd(new Date(ahora.getTime() - DIA), ahora)).toEqual(new Date(ahora.getTime() + 7 * DIA));
    const quedanDos = new Date(ahora.getTime() + 2 * DIA);
    expect(suspensionEnd(quedanDos, ahora)).toEqual(new Date(ahora.getTime() + 9 * DIA));
  });
});

describe('sanctionMessage · aviso al sancionado (HU-11)', () => {
  it('U-107 · dice el motivo, el partido y hasta cuándo, en hora de Chile', () => {
    // 22:30 Z del 29-nov son las 19:30 en Chile (UTC−3 en noviembre).
    const m = sanctionMessage({ reason: 'LENGUAJE', matchTitle: 'Fútbol 7 · Jueves', until: new Date('2026-11-29T22:30:00Z') });
    expect(m.title).toBe('Tu cuenta está suspendida');
    expect(m.body).toContain('lenguaje ofensivo en Fútbol 7 · Jueves');
    expect(m.body).toContain('29 de noviembre a las 19:30');
    expect(m.body).toContain('no puedes publicar, postular ni destacar partidos');
  });
});

describe('esquemas de moderación (HU-11)', () => {
  const id = '9b1c2d3e-4f50-4a6b-8c7d-9e0f1a2b3c4d';

  it('U-108 · el reporte exige un jugador válido y un motivo de la lista; el comentario, hasta 280', () => {
    expect(createReportSchema.safeParse({ reportedId: id, reason: 'AGRESION' }).success).toBe(true);
    expect(createReportSchema.safeParse({ reportedId: id, reason: 'MAL_PERDEDOR' }).success).toBe(false);
    expect(createReportSchema.safeParse({ reportedId: 'no-es-uuid', reason: 'OTRO' }).success).toBe(false);
    expect(createReportSchema.safeParse({ reportedId: id, reason: 'OTRO', comment: 'x'.repeat(281) }).success).toBe(false);
    expect(createReportSchema.safeParse({ reportedId: id, reason: 'OTRO', extra: 1 }).success).toBe(false);
  });

  it('U-109 · la resolución es suspender o descartar, nada más', () => {
    expect(resolveReportSchema.safeParse({ action: 'SANCTION' }).success).toBe(true);
    expect(resolveReportSchema.safeParse({ action: 'DISMISS', note: 'Sin pruebas' }).success).toBe(true);
    expect(resolveReportSchema.safeParse({ action: 'BAN' }).success).toBe(false);
  });
});
