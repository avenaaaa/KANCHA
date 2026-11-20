import type { StyleProp, ViewStyle } from 'react-native';
import type { SportKey } from '@/theme/sports';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface MapMatch extends LatLng {
  id: string;
  sport: SportKey;
  slotsLeft: number;
}

/** Cancha para elegir al publicar: pin propio, distinto del de los partidos. */
export interface MapVenue extends LatLng {
  id: string;
  name: string;
  /** Se arrienda: el pin lleva un "$". */
  paid: boolean;
  /** Ícono del pin; sin deporte, un pin genérico. */
  sport?: SportKey;
}

/**
 * Contrato común del mapa. index.web.tsx lo implementa con MapLibre GL y
 * index.native.tsx con react-native-maps: las pantallas no saben cuál corre.
 */
export interface KanchaMapProps {
  center: LatLng;
  zoom?: number;
  matches?: MapMatch[];
  /** Canchas para elegir (pantalla Publicar). Comparten selectedId y onSelect con los partidos. */
  venues?: MapVenue[];
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  userLocation?: LatLng | null;
  /** Modo selección: tocar el mapa marca un punto (publicar partido). */
  picked?: LatLng | null;
  onPick?: (point: LatLng) => void;
  style?: StyleProp<ViewStyle>;
  /** Margen inferior que tapa el panel de cartas, para centrar bien el pin elegido. */
  bottomInset?: number;
}

/**
 * Zoom (escala de MapLibre, teselas de 512 px) para que el diámetro del radio
 * de búsqueda quepa en `fitPx` píxeles a la latitud dada.
 */
export function zoomForRadius(radiusM: number, lat: number, fitPx: number): number {
  const metersPerPxAtZ0 = 78_271.517 * Math.cos((lat * Math.PI) / 180);
  const z = Math.log2((metersPerPxAtZ0 * fitPx) / (2 * radiusM));
  return Math.max(9, Math.min(16, z));
}
