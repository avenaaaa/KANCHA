import { Platform } from 'react-native';
import data from '@/data/laFlorida.json';
import type { SportKey } from '@/theme/sports';

/**
 * La Florida: el límite real de la comuna (OpenStreetMap, relación 224590) y sus canchas. Las canchas
 * salen de la Municipalidad (multicanchas recuperadas en 2024), de la Corporación de Deportes, de los
 * sitios y fichas de reserva de cada club y de OpenStreetMap; se ubicaron con OpenStreetMap el
 * 20-nov-2026. Viajan dentro de la app: el mapa no depende de un servicio externo para dibujarlas.
 */
export const COMUNA = data.boundary as [number, number][]; // [lng, lat]

/** PUBLICA: espacio público de libre uso. MUNICIPAL y PRIVADA: se arriendan. */
export type VenueKind = 'PUBLICA' | 'MUNICIPAL' | 'PRIVADA';

export interface Venue {
  id: string;
  name: string;
  lat: number;
  lng: number;
  sports: SportKey[];
  kind: VenueKind;
  /** Dirección conocida; si no hay, se propone la del punto. */
  address?: string;
}

export const VENUES = data.venues as Venue[];

export const VENUE_KIND_LABEL: Record<VenueKind, string> = {
  PUBLICA: 'Abierta al público',
  MUNICIPAL: 'Municipal · se arrienda',
  PRIVADA: 'Privada · se arrienda',
};

/** Canchas donde se juega ese deporte; sin deporte elegido, todas. */
export function venuesForSport(sport: SportKey | null): Venue[] {
  return sport ? VENUES.filter((v) => v.sports.includes(sport)) : VENUES;
}

/** ¿El punto cae dentro de la comuna? Trazado de rayos sobre el polígono. */
export function insideComuna(p: { lat: number; lng: number }): boolean {
  let inside = false;
  for (let i = 0, j = COMUNA.length - 1; i < COMUNA.length; j = i++) {
    const [xi, yi] = COMUNA[i]!;
    const [xj, yj] = COMUNA[j]!;
    if (yi > p.lat !== yj > p.lat && p.lng < ((xj - xi) * (p.lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

interface OsmAddress {
  road?: string;
  pedestrian?: string;
  house_number?: string;
  neighbourhood?: string;
  suburb?: string;
}

/** "Av. Vicuña Mackenna 7110, La Florida". Sin calle no hay dirección que proponer. */
export function formatAddress(a: OsmAddress): string | null {
  const street = a.road ?? a.pedestrian;
  if (!street) return null;
  return `${street}${a.house_number ? ` ${a.house_number}` : ''}, La Florida`;
}

/**
 * Dirección del punto marcado, con Nominatim (OpenStreetMap, gratis y sin clave).
 * Si falla o tarda, devuelve null y el usuario la escribe a mano.
 * shortcut: una consulta por toque, sin caché; Nominatim admite 1 por segundo, cambiar a un geocodificador propio si hay muchos usuarios.
 */
export async function reverseGeocode(p: { lat: number; lng: number }): Promise<string | null> {
  // AbortSignal.timeout no existe en React Native: el límite de 6 s se arma a mano.
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 6000);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&accept-language=es&lat=${p.lat}&lon=${p.lng}`,
      // Nominatim pide que la app se identifique. Solo en el teléfono: en la web el navegador ya
      // manda el suyo, y agregar el encabezado obligaría a una consulta previa que puede ser rechazada.
      { signal: abort.signal, ...(Platform.OS === 'web' ? {} : { headers: { 'User-Agent': 'KanchaApp/1.0' } }) },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { address?: OsmAddress };
    return body.address ? formatAddress(body.address) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
