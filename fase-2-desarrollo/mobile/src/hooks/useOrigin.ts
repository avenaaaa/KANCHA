import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';
import { LA_FLORIDA, MAX_ACCURACY_M, PILOT_RADIUS_M } from '@/theme/geo';
import { distanceMeters } from '@/lib/format';
import type { LatLng } from '@/components/KanchaMap/types';

export type OriginSource = 'locating' | 'gps' | 'pilot' | 'imprecise' | 'denied';

/** Decide desde dónde buscar con la posición que entregó el dispositivo (DEF-05). */
export function resolveOrigin(here: LatLng, accuracyM: number | null): { origin: LatLng; source: OriginSource } {
  if (accuracyM !== null && accuracyM > MAX_ACCURACY_M) return { origin: LA_FLORIDA, source: 'imprecise' };
  if (distanceMeters(here, LA_FLORIDA) > PILOT_RADIUS_M) return { origin: LA_FLORIDA, source: 'pilot' };
  return { origin: here, source: 'gps' };
}

/**
 * Punto desde donde se buscan partidos (HU-04).
 *
 * Con la geolocalización activa se usa la ubicación real. Si el permiso se
 * niega, la posición es imprecisa (un PC que se ubica por la red) o el usuario
 * está fuera de la comuna del piloto, se usa el centro de La Florida y la
 * pantalla lo dice: nunca se muestra un mapa vacío sin explicar.
 */
export function useOrigin() {
  const [origin, setOrigin] = useState<LatLng>(LA_FLORIDA);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [source, setSource] = useState<OriginSource>('locating');

  const locate = useCallback(async () => {
    setSource('locating');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setOrigin(LA_FLORIDA);
        setSource('denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserLocation(here);
      const next = resolveOrigin(here, pos.coords.accuracy);
      setOrigin(next.origin);
      setSource(next.source);
    } catch {
      setOrigin(LA_FLORIDA);
      setSource('denied');
    }
  }, []);

  useEffect(() => {
    void locate();
  }, [locate]);

  return { origin, userLocation: source === 'gps' ? userLocation : null, source, locate };
}
