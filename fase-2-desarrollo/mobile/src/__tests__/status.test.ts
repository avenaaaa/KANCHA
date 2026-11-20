import { formatAddress, insideComuna, reverseGeocode, VENUE_KIND_LABEL, VENUES, venuesForSport } from '@/lib/places';
import { describe, expect, it, jest } from '@jest/globals';
import { LA_FLORIDA } from '@/theme/geo';
import { matchPollInterval, playerStatus } from '@/lib/status';
import { useFilters } from '@/store/filterStore';
import type { MatchDetail, RatingWindow } from '@/api/types';

describe('playerStatus · rótulo del cupo en Mis partidos (DEF-17)', () => {
  it('M-22 · cada estado tiene su texto; un cupo cancelado nunca "espera al organizador"', () => {
    expect(playerStatus('PENDING', true).label).toBe('Esperando al organizador');
    expect(playerStatus('APPROVED', true)).toMatchObject({ label: 'Confirmado · falta pagar tu parte', tone: 'warning' });
    expect(playerStatus('APPROVED', false)).toMatchObject({ label: 'Confirmado', tone: 'success' });
    expect(playerStatus('PAID', true)).toMatchObject({ label: 'Confirmado y pagado', tone: 'success' });
    expect(playerStatus('CANCELLED', true)).toMatchObject({ label: 'Ya no tienes cupo en este partido', tone: 'muted' });
    expect(playerStatus('NO_SHOW', true)).toMatchObject({ label: 'No te presentaste', tone: 'muted' });
    expect(playerStatus('REJECTED', true)).toMatchObject({ label: 'El organizador no aceptó tu postulación', tone: 'muted' });
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

describe('filtro de nivel del mapa (regla "Nivel del partido")', () => {
  it('M-26 · parte sin nivel elegido; tocar uno lo activa y tocarlo de nuevo vuelve a todos', () => {
    expect(useFilters.getState().level).toBeNull();
    useFilters.getState().toggleLevel('AVANZADO');
    expect(useFilters.getState().level).toBe('AVANZADO');
    useFilters.getState().toggleLevel('MEDIO');
    expect(useFilters.getState().level).toBe('MEDIO');
    useFilters.getState().toggleLevel('MEDIO');
    expect(useFilters.getState().level).toBeNull();
  });
});

describe('filtro "Falta uno" del mapa (KAN-37)', () => {
  it('M-27 · se activa y se apaga; activarlo limpia el día elegido y elegir un día lo apaga', () => {
    const f = () => useFilters.getState();
    expect(f().urgent).toBe(false);

    f().setWhen('tomorrow');
    f().toggleUrgent();
    expect(f()).toMatchObject({ urgent: true, when: 'all' });

    f().setWhen('weekend');
    expect(f()).toMatchObject({ urgent: false, when: 'weekend' });

    f().setWhen('all');
    f().toggleUrgent();
    f().setWhen('all');
    expect(f().urgent).toBe(true);
    f().toggleUrgent();
    expect(f().urgent).toBe(false);
  });
});


describe('La Florida: límite real y direcciones (KAN-38)', () => {
  it('M-28 · el centro de la comuna está dentro y Ñuñoa o el centro de Santiago, fuera', () => {
    expect(insideComuna(LA_FLORIDA)).toBe(true);
    expect(insideComuna({ lat: -33.5228, lng: -70.5983 })).toBe(true);
    expect(insideComuna({ lat: -33.4569, lng: -70.5975 })).toBe(false);
    expect(insideComuna({ lat: -33.4489, lng: -70.6693 })).toBe(false);
  });

  it('M-29 · todas las canchas ofrecidas existen dentro de la comuna', () => {
    expect(VENUES.length).toBeGreaterThan(10);
    expect(VENUES.filter((v) => !insideComuna(v))).toEqual([]);
  });

  it('M-34 · las canchas se filtran por deporte y cada una dice si es pública o se arrienda (KAN-40)', () => {
    const padel = venuesForSport('PADEL');
    expect(padel.length).toBeGreaterThan(0);
    expect(padel.every((v) => v.sports.includes('PADEL'))).toBe(true);
    expect(venuesForSport(null)).toHaveLength(VENUES.length);
    expect(VENUES.every((v) => v.kind in VENUE_KIND_LABEL && v.sports.length > 0)).toBe(true);
    expect(new Set(VENUES.map((v) => v.id)).size).toBe(VENUES.length);
    expect(VENUES.some((v) => v.kind === 'PUBLICA')).toBe(true);
    expect(VENUES.some((v) => v.kind !== 'PUBLICA')).toBe(true);
  });

  it('M-30 · la dirección se arma con calle y número; sin calle no se propone nada', () => {
    expect(formatAddress({ road: 'Avenida Vicuña Mackenna', house_number: '7110' })).toBe('Avenida Vicuña Mackenna 7110, La Florida');
    expect(formatAddress({ road: 'Walker Martínez' })).toBe('Walker Martínez, La Florida');
    expect(formatAddress({ suburb: 'La Florida' })).toBeNull();
  });

  it('M-31 · la dirección sale del servicio; si el servicio falla o responde mal, no se inventa nada', async () => {
    const punto = { lat: -33.5228, lng: -70.5983 };
    const red = jest.spyOn(globalThis, 'fetch');
    red.mockResolvedValueOnce({ ok: true, json: async () => ({ address: { road: 'Enrique Olivares', house_number: '857' } }) } as Response);
    expect(await reverseGeocode(punto)).toBe('Enrique Olivares 857, La Florida');
    red.mockResolvedValueOnce({ ok: false } as Response);
    expect(await reverseGeocode(punto)).toBeNull();
    red.mockRejectedValueOnce(new Error('sin conexión'));
    expect(await reverseGeocode(punto)).toBeNull();
    red.mockRestore();
  });
});
