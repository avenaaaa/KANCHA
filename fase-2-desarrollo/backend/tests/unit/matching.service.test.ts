import { describe, expect, it } from 'vitest';
import {
  canRejoin,
  checkCanJoin,
  decideApproval,
  decideRejection,
  urgentWindow,
} from '../../src/services/matching.service.js';
import type { LockedMatch } from '../../src/repositories/participation.repository.js';

const ahora = new Date('2026-10-17T15:00:00Z');
const manana = new Date('2026-10-18T20:00:00Z');

const partido = {
  status: 'OPEN',
  startsAt: manana,
  filledSlots: 3,
  totalSlots: 4,
  organizerId: 'organizador',
};

describe('checkCanJoin (HU-05)', () => {
  it('U-37 · permite postular a un partido abierto, futuro y con cupo', () => {
    expect(checkCanJoin(partido, 'jugador', ahora)).toBeNull();
  });

  it('U-38 · el organizador no puede postular a su propio partido', () => {
    expect(checkCanJoin(partido, 'organizador', ahora)).toBe('OWN_MATCH');
  });

  it('U-39 · un partido lleno no admite postulaciones', () => {
    expect(checkCanJoin({ ...partido, filledSlots: 4 }, 'jugador', ahora)).toBe('MATCH_FULL');
  });

  it('U-40 · un partido que ya comenzó no admite postulaciones', () => {
    expect(checkCanJoin({ ...partido, startsAt: ahora }, 'jugador', ahora)).toBe('MATCH_STARTED');
  });

  it('U-41 · un partido cancelado no admite postulaciones', () => {
    expect(checkCanJoin({ ...partido, status: 'CANCELLED' }, 'jugador', ahora)).toBe('MATCH_NOT_OPEN');
  });
});

describe('decideApproval (HU-05)', () => {
  const bloqueado: LockedMatch = {
    id: 'm1',
    organizerId: 'organizador',
    totalSlots: 4,
    filledSlots: 2,
    totalCost: 24000,
    status: 'OPEN',
    startsAt: manana,
  };

  it('U-42 · aprueba, suma un cupo y congela la cuota individual', () => {
    const d = decideApproval({ status: 'PENDING' }, bloqueado, 'organizador', ahora);
    expect(d).toEqual({ ok: true, filledSlots: 3, status: 'OPEN', amountDue: 6000 });
  });

  it('U-43 · aprobar el último cupo deja el partido en FULL', () => {
    const d = decideApproval({ status: 'PENDING' }, { ...bloqueado, filledSlots: 3 }, 'organizador', ahora);
    expect(d.ok && d.status).toBe('FULL');
  });

  it('U-44 · con el partido ya lleno la aprobación se rechaza con 409 (CN-12)', () => {
    const d = decideApproval({ status: 'PENDING' }, { ...bloqueado, filledSlots: 4, status: 'FULL' }, 'organizador', ahora);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.error.code).toBe('MATCH_FULL');
  });

  it('U-45 · solo el organizador puede aprobar (S-02)', () => {
    const d = decideApproval({ status: 'PENDING' }, bloqueado, 'otro-jugador', ahora);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.error.statusCode).toBe(403);
  });

  it('U-46 · una postulación ya aprobada no se aprueba dos veces', () => {
    const d = decideApproval({ status: 'APPROVED' }, bloqueado, 'organizador', ahora);
    expect(d.ok).toBe(false);
    if (!d.ok) expect(d.error.code).toBe('PARTICIPATION_NOT_PENDING');
  });
});

describe('canRejoin (DEF-13)', () => {
  it('U-72 · vuelve a postular quien no llegó a pagar; quien canceló un cupo pagado, no', () => {
    expect(canRejoin(null)).toBe(true);
    expect(canRejoin('FAILED')).toBe(true);
    expect(canRejoin('INITIATED')).toBe(true);
    expect(canRejoin('RETAINED')).toBe(false);
    expect(canRejoin('REFUNDED')).toBe(false);
    expect(canRejoin('AUTHORIZED')).toBe(false);
  });
});

describe('decideRejection (KAN-32)', () => {
  const partido = { organizerId: 'organizador' };

  it('U-79 · solo el organizador rechaza, y solo una postulación pendiente', () => {
    expect(decideRejection({ status: 'PENDING' }, partido, 'organizador')).toBeNull();
    expect(decideRejection({ status: 'PENDING' }, partido, 'otro-jugador')?.statusCode).toBe(403);
    for (const status of ['APPROVED', 'PAID', 'CANCELLED', 'REJECTED', 'NO_SHOW'] as const) {
      expect(decideRejection({ status }, partido, 'organizador')?.code).toBe('PARTICIPATION_NOT_PENDING');
    }
  });
});

describe('urgentWindow · filtro "Falta uno" (KAN-37)', () => {
  const ahora = new Date('2026-11-16T18:00:00Z');
  const enDosHoras = new Date('2026-11-16T20:00:00Z');

  it('U-80 · sin el filtro no cambia nada: respeta el horario pedido y no mira los cupos', () => {
    expect(urgentWindow({ urgent: false }, ahora)).toEqual({ to: null, slotsLeft: null });
    const to = new Date('2026-11-20T00:00:00Z');
    expect(urgentWindow({ urgent: false, to }, ahora)).toEqual({ to, slotsLeft: null });
  });

  it('U-81 · urgente = falta exactamente 1 jugador y empieza dentro de las próximas 2 horas', () => {
    expect(urgentWindow({ urgent: true }, ahora)).toEqual({ to: enDosHoras, slotsLeft: 1 });
  });

  it('U-82 · con un rango de horario además, manda el límite que termina antes', () => {
    const antes = new Date('2026-11-16T19:00:00Z');
    const despues = new Date('2026-11-17T00:00:00Z');
    expect(urgentWindow({ urgent: true, to: antes }, ahora).to).toEqual(antes);
    expect(urgentWindow({ urgent: true, to: despues }, ahora).to).toEqual(enDosHoras);
  });
});
