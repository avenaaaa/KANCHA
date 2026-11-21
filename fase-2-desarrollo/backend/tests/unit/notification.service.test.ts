import { describe, expect, it } from 'vitest';
import {
  defaultPreferences,
  faltaUnoMessage,
  isUrgent,
  joinApprovedMessage,
  joinRequestMessage,
  nearbyMessage,
  nudgeMessage,
  priorityOfferMessage,
  sortInbox,
} from '../../src/services/notification.service.js';
import { preferencesSchema } from '../../src/schemas/notification.schema.js';

/** HU-10 (KAN-16): avisos por reglas, sin IA. En noviembre Chile está en UTC-3: 22:30 Z son las 19:30. */
const ahora = new Date('2026-11-20T15:00:00Z');
const partido = {
  title: 'Pádel dobles',
  sport: 'PADEL' as const,
  venueName: 'Club Los Quillayes',
  startsAt: new Date('2026-11-20T22:30:00Z'),
  slotsLeft: 1,
  priority: false,
};

describe('Textos de los avisos (HU-10)', () => {
  it('U-91 · "Falta uno": dice cuántos faltan, la hora de Chile y, destacado, que el invitado entra gratis', () => {
    expect(faltaUnoMessage(partido)).toEqual({
      title: '¡Falta uno cerca!',
      body: 'Falta 1 jugador para Pádel dobles, a las 19:30 en Club Los Quillayes.',
    });
    const destacado = faltaUnoMessage({ ...partido, slotsLeft: 2, priority: true });
    expect(destacado.title).toBe('¡Falta uno cerca! Entras gratis');
    expect(destacado.body).toBe('Faltan 2 jugadores para Pádel dobles, a las 19:30 en Club Los Quillayes. Vas de invitado: no pagas.');
  });

  it('U-92 · partido cerca: deporte, día, hora y recinto', () => {
    const m = nearbyMessage(partido);
    expect(m.title).toBe('Partido de pádel cerca');
    expect(m.body).toMatch(/^Pádel dobles: viernes,? 20 de noviembre a las 19:30 en Club Los Quillayes\.$/);
  });

  it('U-93 · al organizador una postulación (urgente si es un destacado) y al jugador su aprobación', () => {
    expect(joinRequestMessage(partido).title).toBe('Tienes postulaciones por revisar');
    expect(joinRequestMessage({ ...partido, priority: true })).toEqual({
      title: 'Un invitado espera tu respuesta',
      body: 'Alguien pide entrar gratis a Pádel dobles, a las 19:30. Apruébalo o recházalo ahora.',
    });
    expect(joinApprovedMessage(partido, true).body).toBe('Entras a Pádel dobles sin pagar. Nos vemos a las 19:30.');
    expect(joinApprovedMessage(partido, false).body).toBe('Ya tienes cupo en Pádel dobles. Paga tu parte para asegurarlo.');
  });

  it('U-94 · "¿Lo destacas?" al organizador, con 1 o 2 faltantes (KAN-41)', () => {
    expect(priorityOfferMessage(partido).title).toBe('Todavía te falta 1 jugador');
    expect(priorityOfferMessage({ ...partido, slotsLeft: 2 }).title).toBe('Todavía te faltan 2 jugadores');
    expect(priorityOfferMessage(partido).body).toContain('¿Lo destacas?');
  });

  it('U-95 · ánimo para jugar: distinto para quien nunca jugó y para quien lleva días sin jugar', () => {
    expect(nudgeMessage({ lastActiveAt: null, nearbyCount: 1, sport: 'FUTBOL' }, ahora)).toEqual({
      title: 'Tu primer partido te espera',
      body: 'Hay 1 partido de fútbol cerca en los próximos 3 días. Únete a uno y empieza tu carta de jugador.',
    });
    const haceDias = new Date(ahora.getTime() - 16.5 * 86_400_000);
    expect(nudgeMessage({ lastActiveAt: haceDias, nearbyCount: 3, sport: 'BASQUETBOL' }, ahora)).toEqual({
      title: 'Hace 16 días que no juegas',
      body: 'Hay 3 partidos cerca en los próximos 3 días; el primero es de básquetbol. Vuelve a la cancha.',
    });
  });
});

describe('Bandeja y preferencias (HU-10)', () => {
  it('U-96 · los "Falta uno" vigentes van primero, y entre ellos los destacados; el resto, del más nuevo al más viejo', () => {
    const at = (h: number) => new Date(ahora.getTime() + h * 3_600_000);
    const abierto = (prioritizedAt: Date | null) => ({ status: 'OPEN', startsAt: at(5), prioritizedAt });
    const lista = [
      { id: 'a', kind: 'NEARBY_MATCH' as const, readAt: null, createdAt: at(3), match: abierto(null) },
      { id: 'b', kind: 'FALTA_UNO' as const, readAt: null, createdAt: at(1), match: abierto(null) },
      { id: 'c', kind: 'FALTA_UNO' as const, readAt: at(2), createdAt: at(0), match: abierto(at(0)) },
      { id: 'd', kind: 'JOIN_REQUEST' as const, readAt: null, createdAt: at(2), match: abierto(null) },
      { id: 'e', kind: 'FALTA_UNO' as const, readAt: null, createdAt: at(1), match: abierto(at(0)) },
      // Lleno o ya empezado, un "Falta uno" deja de destacarse aunque no se haya leído.
      { id: 'f', kind: 'FALTA_UNO' as const, readAt: null, createdAt: at(4), match: { ...abierto(null), status: 'FULL' } },
      { id: 'g', kind: 'FALTA_UNO' as const, readAt: null, createdAt: at(-1), match: { ...abierto(null), startsAt: at(-0.5) } },
    ];
    expect(sortInbox(lista, ahora).map((n) => n.id)).toEqual(['e', 'b', 'f', 'a', 'd', 'c', 'g']);
    expect(lista.filter((n) => isUrgent(n, ahora)).map((n) => n.id)).toEqual(['b', 'e']);
  });

  it('U-97 · sin preferencias guardadas no hay nada activado; viene marcado su deporte favorito', () => {
    expect(defaultPreferences('BASQUETBOL')).toMatchObject({
      faltaUno: false,
      nearby: false,
      nudges: false,
      sports: ['BASQUETBOL'],
      days: [0, 1, 2, 3, 4, 5, 6],
      lat: null,
    });
  });

  it('U-98 · preferencias: horario que termina después de empezar, ubicación y deporte si activa algo, y días si activa "cerca"', () => {
    const base = { ...defaultPreferences('FUTBOL'), lat: -33.52, lng: -70.59 };
    const ok = preferencesSchema.safeParse({ ...base, nearby: true, sports: ['PADEL', 'PADEL'] });
    expect(ok.success && ok.data.sports).toEqual(['PADEL']);

    const campo = (v: object) => {
      const r = preferencesSchema.safeParse({ ...base, ...v });
      return r.success ? null : r.error.issues[0]?.path[0];
    };
    expect(campo({ fromHour: 20, toHour: 20 })).toBe('toHour');
    expect(campo({ faltaUno: true, lat: null, lng: null })).toBe('lat');
    expect(campo({ faltaUno: true, sports: [] })).toBe('sports');
    expect(campo({ nearby: true, days: [] })).toBe('days');
    expect(campo({ radiusKm: 50 })).toBe('radiusKm');
    expect(campo({ days: [7] })).toBe('days');
  });
});
