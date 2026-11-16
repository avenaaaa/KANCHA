import { describe, expect, it } from '@jest/globals';
import { matchPollInterval, playerStatus } from '@/lib/status';
import type { MatchDetail, RatingWindow } from '@/api/types';

describe('playerStatus · rótulo del cupo en Mis partidos (DEF-17)', () => {
  it('M-22 · cada estado tiene su texto; un cupo cancelado nunca "espera al organizador"', () => {
    expect(playerStatus('PENDING', true).label).toBe('Esperando al organizador');
    expect(playerStatus('APPROVED', true)).toMatchObject({ label: 'Confirmado · falta pagar tu parte', tone: 'warning' });
    expect(playerStatus('APPROVED', false)).toMatchObject({ label: 'Confirmado', tone: 'success' });
    expect(playerStatus('PAID', true)).toMatchObject({ label: 'Confirmado y pagado', tone: 'success' });
    expect(playerStatus('CANCELLED', true)).toMatchObject({ label: 'Ya no tienes cupo en este partido', tone: 'muted' });
    expect(playerStatus('NO_SHOW', true)).toMatchObject({ label: 'No te presentaste', tone: 'muted' });
  });
});

describe('matchPollInterval · refresco del detalle (DEF-16)', () => {
  const viewer: MatchDetail['viewer'] = {
    isOrganizer: false,
    participationId: 'p1',
    status: null,
    payment: null,
    refundIfCancelled: null,
  };
  const partido = (v: Partial<MatchDetail['viewer']>, ratingWindow: RatingWindow = 'NOT_FINISHED') => ({
    ratingWindow,
    viewer: { ...viewer, ...v },
  });

  it('M-23 · se refresca mientras hay algo que esperar: aprobación, pago o postulaciones nuevas', () => {
    expect(matchPollInterval(partido({ status: 'PENDING' }))).toBe(8_000);
    expect(matchPollInterval(partido({ status: 'APPROVED' }))).toBe(8_000);
    expect(matchPollInterval(partido({ isOrganizer: true }))).toBe(8_000);
  });

  it('M-24 · no se refresca si no hay nada que esperar, si el partido terminó o si aún no hay datos', () => {
    expect(matchPollInterval(partido({ status: 'PAID' }))).toBe(false);
    expect(matchPollInterval(partido({ status: null }))).toBe(false);
    expect(matchPollInterval(partido({ status: 'PENDING' }, 'OPEN'))).toBe(false);
    expect(matchPollInterval(undefined)).toBe(false);
  });
});
