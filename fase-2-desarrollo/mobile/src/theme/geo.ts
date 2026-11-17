/**
 * Piloto del MVP: La Florida, Región Metropolitana (CLAUDE.md §1). Es un punto interior de la
 * comuna (el mismo del seed), no su esquina poniente: desde aquí se busca cuando no hay GPS.
 */
export const LA_FLORIDA = { lat: -33.5425, lng: -70.585 } as const;

/** Una posición menos precisa que esto viene de la red o la IP (un PC sin GPS) y no sirve para "cerca de ti". */
export const MAX_ACCURACY_M = 1_000;

export const RADIUS_OPTIONS = [2_000, 5_000, 10_000] as const;
export type RadiusOption = (typeof RADIUS_OPTIONS)[number];

/** Estilo oscuro de MapLibre (web). Sin API key. Se puede cambiar con EXPO_PUBLIC_MAP_STYLE_URL. */
export const MAP_STYLE_URL =
  process.env.EXPO_PUBLIC_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/dark';
