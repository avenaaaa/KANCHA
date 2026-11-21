import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polygon, type Region } from 'react-native-maps';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { Icon } from '@/components/icons/Icon';
import { COMUNA } from '@/lib/places';
import type { KanchaMapProps, MapMatch, MapVenue } from './types';

const COMUNA_COORDS = COMUNA.map(([longitude, latitude]) => ({ latitude, longitude }));

export * from './types';

/**
 * Mapa nativo con react-native-maps. En iOS usa Apple Maps en modo oscuro; en
 * Android, Google Maps con un estilo oscuro (DESIGN.md §4.1: nunca mapa claro).
 */

const DARK_GOOGLE_STYLE = [
  { elementType: 'geometry', stylers: [{ color: colors.background }] },
  { elementType: 'labels.text.fill', stylers: [{ color: colors.textMuted }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: colors.background }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: colors.border }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: colors.disabled }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: colors.surface }] },
];

/** Región visible equivalente al zoom de MapLibre (teselas de 512 px) en el ancho de la pantalla. */
const regionFor = (lat: number, lng: number, zoom: number): Region => {
  const { width, height } = Dimensions.get('window');
  const lngDelta = (360 * width) / (512 * Math.pow(2, zoom));
  const latDelta = lngDelta * (height / width) * Math.cos((lat * Math.PI) / 180);
  return { latitude: lat, longitude: lng, latitudeDelta: latDelta, longitudeDelta: lngDelta };
};

function NativePin({ match, selected }: { match: MapMatch; selected: boolean }) {
  return (
    <View style={[s.pinWrap, selected && { transform: [{ scale: 1.3 }] }]}>
      <View style={[s.pin, match.priority && s.pinPriority]}>
        <Icon name={match.sport} size={20} color={colors.onAccent} strokeWidth={2} />
      </View>
      <View style={s.gap}>
        <Text style={s.gapText}>{`−${match.slotsLeft}`}</Text>
      </View>
    </View>
  );
}

/** Pin de cancha (Publicar): ícono del deporte y "$" si se arrienda. Elegida, se rellena de amarillo. */
function VenuePin({ venue, selected }: { venue: MapVenue; selected: boolean }) {
  return (
    <View style={[s.venueWrap, selected && { transform: [{ scale: 1.3 }] }]}>
      <View style={[s.venue, selected && s.venueOn]}>
        <Icon name={venue.sport ?? 'pin'} size={16} color={selected ? colors.onAccent : colors.accent} strokeWidth={2} />
      </View>
      {venue.paid && (
        <View style={s.fee}>
          <Text style={s.feeText}>$</Text>
        </View>
      )}
    </View>
  );
}

export default function KanchaMap({
  center,
  zoom = 12.5,
  matches = [],
  venues = [],
  selectedId = null,
  onSelect,
  userLocation = null,
  picked = null,
  onPick,
  style,
}: KanchaMapProps) {
  const ref = useRef<MapView>(null);
  // Los marcadores con vistas propias se congelan (tracksViewChanges=false) para
  // no redibujar en cada cuadro; se descongelan un instante cuando cambian.
  const [tracking, setTracking] = useState(true);

  useEffect(() => {
    setTracking(true);
    const t = setTimeout(() => setTracking(false), 600);
    return () => clearTimeout(t);
  }, [matches, venues, selectedId]);

  useEffect(() => {
    ref.current?.animateToRegion(regionFor(center.lat, center.lng, zoom), 500);
  }, [center.lat, center.lng, zoom]);

  return (
    <MapView
      ref={ref}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={regionFor(center.lat, center.lng, zoom)}
      customMapStyle={DARK_GOOGLE_STYLE}
      userInterfaceStyle="dark"
      showsPointsOfInterests={false}
      toolbarEnabled={false}
      rotateEnabled={false}
      pitchEnabled={false}
      onPress={(e) => {
        if ((e.nativeEvent as { action?: string }).action === 'marker-press') return;
        const { latitude, longitude } = e.nativeEvent.coordinate;
        if (onPick) onPick({ lat: latitude, lng: longitude });
        else onSelect?.(null);
      }}
    >
      {/* El piloto es La Florida: se dibuja su límite real, no un círculo. */}
      <Polygon coordinates={COMUNA_COORDS} strokeColor={colors.accent} strokeWidth={2} fillColor={colors.radiusFill} />

      {matches.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.lat, longitude: m.lng }}
          onPress={() => onSelect?.(m.id)}
          tracksViewChanges={tracking}
          zIndex={m.id === selectedId ? 2 : 1}
          accessibilityLabel={`Partido con ${m.slotsLeft} ${m.slotsLeft === 1 ? 'cupo libre' : 'cupos libres'}`}
        >
          <NativePin match={m} selected={m.id === selectedId} />
        </Marker>
      ))}

      {venues.map((v) => (
        <Marker
          key={`cancha-${v.id}`}
          coordinate={{ latitude: v.lat, longitude: v.lng }}
          onPress={() => onSelect?.(v.id)}
          tracksViewChanges={tracking}
          zIndex={v.id === selectedId ? 2 : 1}
          accessibilityLabel={`${v.name}, ${v.paid ? 'se arrienda' : 'abierta al público'}`}
        >
          <VenuePin venue={v} selected={v.id === selectedId} />
        </Marker>
      ))}

      {userLocation && (
        <Marker coordinate={{ latitude: userLocation.lat, longitude: userLocation.lng }} tracksViewChanges={false}>
          <View style={s.me} />
        </Marker>
      )}

      {picked && (
        <Marker coordinate={{ latitude: picked.lat, longitude: picked.lng }} anchor={{ x: 0.5, y: 1 }} tracksViewChanges={tracking}>
          <Icon name="pin" size={44} color={colors.accent} strokeWidth={2} />
        </Marker>
      )}
    </MapView>
  );
}

const s = StyleSheet.create({
  pinWrap: { paddingTop: 10, paddingRight: 12 },
  pin: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // KAN-41: el destacado se distingue con un borde claro (en la web además late).
  pinPriority: { borderColor: colors.text, borderWidth: 3 },
  gap: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 24,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gapText: { fontFamily: fonts.bold, fontSize: 12, color: colors.text },
  venueWrap: { paddingTop: 8, paddingRight: 10 },
  venue: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  venueOn: { backgroundColor: colors.accent },
  fee: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    borderWidth: 1.5,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feeText: { fontFamily: fonts.bold, fontSize: 11, color: colors.onAccent },
  me: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.text,
    borderWidth: 3,
    borderColor: colors.background,
  },
});
