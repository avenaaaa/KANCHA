import { describe, expect, it } from '@jest/globals';
import { resolveOrigin } from '@/hooks/useOrigin';
import { LA_FLORIDA } from '@/theme/geo';

describe('punto de búsqueda del mapa (HU-04, DEF-05)', () => {
  it('M-14 · una posición precisa dentro de La Florida se usa tal cual', () => {
    const sede = { lat: -33.5195, lng: -70.599 };
    expect(resolveOrigin(sede, 30)).toEqual({ origin: sede, source: 'gps' });
    expect(resolveOrigin(sede, null)).toEqual({ origin: sede, source: 'gps' });
  });

  it('M-15 · un PC ubicado por la red (km de error) busca en La Florida, no en un punto equivocado', () => {
    const santiagoCentro = { lat: -33.4378, lng: -70.6504 };
    expect(resolveOrigin(santiagoCentro, 12_000)).toEqual({ origin: LA_FLORIDA, source: 'imprecise' });
  });

  it('M-16 · fuera de la comuna (Ñuñoa, ~7 km) se muestran los partidos del piloto', () => {
    const nunoa = { lat: -33.4569, lng: -70.5978 };
    expect(resolveOrigin(nunoa, 20)).toEqual({ origin: LA_FLORIDA, source: 'pilot' });
  });
});
