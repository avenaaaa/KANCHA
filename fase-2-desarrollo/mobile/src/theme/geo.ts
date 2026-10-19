/** Piloto del MVP: La Florida, Región Metropolitana (CLAUDE.md §1). */
export const LA_FLORIDA = { lat: -33.5228, lng: -70.5983 } as const;

/** Más allá de esta distancia la app asume que el usuario está fuera del piloto. */
export const PILOT_RADIUS_M = 25_000;

export const RADIUS_OPTIONS = [2_000, 5_000, 10_000] as const;
export type RadiusOption = (typeof RADIUS_OPTIONS)[number];

/** Estilo oscuro de MapLibre (web). Sin API key. Se puede cambiar con EXPO_PUBLIC_MAP_STYLE_URL. */
export const MAP_STYLE_URL =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/dark';
