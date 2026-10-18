import { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import MapView, { Circle, Marker, type Region } from 'react-native-maps';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { Icon } from '@/components/icons/Icon';
import type { KanchaMapProps, MapMatch } from './types';

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
      <View style={s.pin}>
        <Icon name={match.sport} size={20} color={colors.onAccent} strokeWidth={2} />
      </View>
      <View style={s.gap}>
        <Text style={s.gapText}>{`−${match.slotsLeft}`}</Text>
      </View>
    </View>
  );
}

export default function KanchaMap({
  center,
  zoom = 12.5,
  matches = [],
  selectedId = null,
  onSelect,
  radiusM,
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
  }, [matches, selectedId]);

  useEffect(() => {
    ref.current?.animateToRegion(regionFor(center.lat, center.lng, zoom), 500);
  }, [center.lat, center.lng, zoom]);

  const ring = userLocation ?? center;

  return (
    <MapView
      ref={ref}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={regionFor(center.lat, center.lng, zoom)}
      customMapStyle={DARK_GOOGLE_STYLE}
      userInterfaceStyle="dark"
      showsPointsOfInterest={false}
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
      {radiusM ? (
        <Circle
          center={{ latitude: ring.lat, longitude: ring.lng }}
          radius={radiusM}
          strokeColor={colors.hairline}
          strokeWidth={1.5}
          fillColor={colors.radiusFill}
        />
      ) : null}

      {matches.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.lat, longitude: m.lng }}
          onPress={() => onSelect?.(m.id)}
          tracksViewChanges={tracking}
          zIndex={m.id === selectedId ? 2 : 1}
          accessibilityLabel={`Partido con ${m.slotsLeft} cupos libres`}
        >
          <NativePin match={m} selected={m.id === selectedId} />
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
  me: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.text,
    borderWidth: 3,
    borderColor: colors.background,
  },
});
