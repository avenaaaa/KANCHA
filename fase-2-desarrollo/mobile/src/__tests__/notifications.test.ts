import { describe, expect, it } from '@jest/globals';
import { firstUrgent, hourLabel, timeAgo, toggleIn } from '@/lib/notifications';
import type { AppNotification } from '@/api/types';

const aviso = (over: Partial<AppNotification>): AppNotification => ({
  id: 'n',
  kind: 'NEARBY_MATCH',
  matchId: 'm',
  title: 't',
  body: 'b',
  read: false,
  urgent: false,
  createdAt: '2026-11-20T18:00:00Z',
  ...over,
});

describe('Avisos (HU-10)', () => {
  it('M-36 · sobre el mapa se destaca el primer "Falta uno" que la API marca como vigente', () => {
    const lista = [
      aviso({ id: 'a', kind: 'FALTA_UNO', read: true }),
      aviso({ id: 'b', kind: 'NEARBY_MATCH' }),
      aviso({ id: 'c', kind: 'FALTA_UNO', urgent: true }),
    ];
    expect(firstUrgent(lista)?.id).toBe('c');
    // Sin leer pero con el partido lleno: la API ya no lo marca y no se destaca.
    expect(firstUrgent([aviso({ kind: 'FALTA_UNO', urgent: false })])).toBeNull();
    expect(firstUrgent(undefined)).toBeNull();
  });

  it('M-37 · hace cuánto llegó un aviso', () => {
    const ahora = new Date('2026-11-20T18:00:00Z');
    const antes = (min: number) => new Date(ahora.getTime() - min * 60_000).toISOString();
    expect(timeAgo(antes(0.5), ahora)).toBe('ahora');
    expect(timeAgo(antes(5), ahora)).toBe('hace 5 min');
    expect(timeAgo(antes(130), ahora)).toBe('hace 2 h');
    expect(timeAgo(antes(26 * 60), ahora)).toBe('ayer');
    expect(timeAgo(antes(3 * 24 * 60), ahora)).toBe('hace 3 días');
  });

  it('M-38 · elegir días y deportes, y la hora del horario', () => {
    expect(toggleIn([1, 2], 2)).toEqual([1]);
    expect(toggleIn([1], 0)).toEqual([1, 0]);
    expect(hourLabel(8)).toBe('08:00');
    expect(hourLabel(24)).toBe('24:00');
  });
});
