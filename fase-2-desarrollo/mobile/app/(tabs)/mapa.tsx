import { useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { RADIUS_OPTIONS } from '@/theme/geo';
import KanchaMap from '@/components/KanchaMap';
import { zoomForRadius } from '@/components/KanchaMap/types';
import { MatchCard } from '@/components/MatchCard';
import { SportFilter } from '@/components/SportFilter';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/icons/Icon';
import { useNearbyMatches } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import type { MatchSummary } from '@/api/types';
import { useFilters } from '@/store/filterStore';
import { useOrigin } from '@/hooks/useOrigin';
import { whenRange, type When } from '@/lib/format';

const WHEN_OPTIONS: { key: When; label: string }[] = [
  { key: 'all', label: 'Cuando sea' },
  { key: 'today', label: 'Hoy' },
  { key: 'tomorrow', label: 'Mañana' },
  { key: 'weekend', label: 'Este finde' },
];

const CARD_WIDTH = 300;
const PANEL_WIDTH = 420;
const MOBILE_TOP = 150;
const MOBILE_BOTTOM = 250;

/**
 * HU-04 (KAN-10): partidos con cupo cerca, en un mapa oscuro.
 *
 * En el celular las cartas van en un carrusel sobre el mapa; en pantallas anchas
 * (la versión web que se proyecta ante la comisión) van en un panel lateral.
 */
export default function MapScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const wide = width >= 900;
  // Píxeles disponibles para que el radio completo quepa: en el celular el mapa
  // queda entre los filtros (arriba) y el carrusel de cartas (abajo).
  const fitPx = wide
    ? Math.min(width - PANEL_WIDTH, height - 64) * 0.9
    : Math.min(width, height - insets.top - 64 - MOBILE_TOP - MOBILE_BOTTOM) * 0.95;

  const { sports, when, radius: radiusM, toggleSport, setWhen, setRadius } = useFilters();
  const { origin, userLocation, source, locate } = useOrigin();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // El rango "Hoy / Mañana / Finde" se recalcula solo cuando cambia el filtro.
  const range = useMemo(() => whenRange(when), [when]);
  const params = source === 'locating' ? null : { ...origin, radius: radiusM, sports, ...range };
  const { data, isLoading, isError, error, refetch, isFetching } = useNearbyMatches(params);
  const matches = useMemo(() => data?.matches ?? [], [data]);

  useEffect(() => {
    if (selectedId && !matches.some((m) => m.id === selectedId)) setSelectedId(null);
  }, [matches, selectedId]);

  const open = (m: MatchSummary) => router.push(`/partido/${m.id}`);
  const mapMatches = useMemo(
    () => matches.map((m) => ({ id: m.id, lat: m.lat, lng: m.lng, sport: m.sport, slotsLeft: m.slotsLeft })),
    [matches],
  );

  const carouselRef = useRef<FlatList<MatchSummary>>(null);
  const listRef = useRef<ScrollView>(null);
  const rowY = useRef(new Map<string, number>());

  // Al tocar un pin, la carta correspondiente aparece en el carrusel o el panel.
  function selectFromMap(id: string | null) {
    setSelectedId(id);
    if (!id) return;
    const index = matches.findIndex((m) => m.id === id);
    if (index < 0) return;
    if (wide) listRef.current?.scrollTo({ y: Math.max(0, (rowY.current.get(id) ?? 0) - spacing.md), animated: true });
    else carouselRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
  }

  // Al deslizar el carrusel, el pin de la carta visible se destaca.
  function onCarouselSettle(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const index = Math.round(e.nativeEvent.contentOffset.x / (CARD_WIDTH + spacing.sm));
    const m = matches[index];
    if (m) setSelectedId(m.id);
  }

  const summary =
    matches.length === 0
      ? null
      : `${matches.length} ${matches.length === 1 ? 'partido' : 'partidos'} a menos de ${radiusM / 1000} km`;

  const pilotNote =
    source === 'pilot'
      ? 'Estás fuera de La Florida, la comuna del piloto. Te mostramos sus partidos.'
      : source === 'denied'
        ? 'Sin acceso a tu ubicación. Te mostramos los partidos de La Florida.'
        : null;

  const secondaryChips = (
    <>
      {WHEN_OPTIONS.map((o) => (
        <Chip key={o.key} label={o.label} active={when === o.key} onPress={() => setWhen(o.key)} floating={!wide} />
      ))}
      <View style={s.divider} />
      {RADIUS_OPTIONS.map((r) => (
        <Chip key={r} label={`${r / 1000} km`} active={radiusM === r} onPress={() => setRadius(r)} floating={!wide} />
      ))}
    </>
  );

  const filters = (
    <View style={s.filters}>
      <SportFilter active={sports} onToggle={toggleSport} floating={!wide} />
      {wide ? <View style={[s.chipRow, { flexWrap: 'wrap', flexDirection: 'row' }]}>{secondaryChips}</View> : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipRow}>
          {secondaryChips}
        </ScrollView>
      )}
    </View>
  );

  const status = isLoading || source === 'locating' ? (
    <View style={s.stateCard}>
      <Skeleton height={20} width="60%" />
      <Skeleton height={12} width="40%" />
      <Skeleton height={8} />
    </View>
  ) : isError ? (
    <View style={[s.stateCard, s.stateError]}>
      <Text style={s.stateTitle}>No pudimos cargar los partidos</Text>
      <Text style={s.stateText}>{errorMessage(error)}</Text>
      <Button label="Reintentar" variant="secondary" onPress={() => void refetch()} />
    </View>
  ) : matches.length === 0 ? (
    <View style={s.stateCard}>
      {/* Texto exacto del criterio de aceptación de HU-04. */}
      <Text style={s.stateTitle}>No hay partidos disponibles cerca de ti</Text>
      <Text style={s.stateText}>Amplía el radio o cambia el horario. También puedes publicar el tuyo y que te falte uno a ti.</Text>
      <Button label="Publicar partido" icon="plus" onPress={() => router.push('/publicar')} />
    </View>
  ) : null;

  const map = (
    <KanchaMap
      center={origin}
      zoom={zoomForRadius(radiusM, origin.lat, fitPx)}
      matches={mapMatches}
      selectedId={selectedId}
      onSelect={selectFromMap}
      radiusM={radiusM}
      userLocation={userLocation}
      bottomInset={wide ? 0 : MOBILE_BOTTOM - MOBILE_TOP}
    />
  );

  const locateButton = (
    <Pressable
      onPress={() => void locate()}
      accessibilityRole="button"
      accessibilityLabel="Usar mi ubicación"
      style={({ pressed }) => [s.roundBtn, pressed && { opacity: 0.85 }]}
    >
      <Icon name="locate" size={20} color={source === 'gps' ? colors.text : colors.textMuted} />
    </Pressable>
  );

  if (wide) {
    return (
      <View style={s.wideRoot}>
        <View style={{ flex: 1 }}>
          {map}
          <View style={[s.wideTop, { paddingTop: insets.top + spacing.md }]} pointerEvents="box-none">
            <Text style={s.brand}>KANCHA</Text>
            {locateButton}
          </View>
          {pilotNote ? (
            <View style={s.wideNote} pointerEvents="none">
              <Text style={s.noteText}>{pilotNote}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.panel}>
          <View style={s.panelHead}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.panelTitle}>Partidos con cupo</Text>
              <Text style={s.panelSub}>{isFetching && !data ? 'Buscando…' : summary ?? 'Sin resultados con estos filtros'}</Text>
            </View>
            <Button label="Publicar" icon="plus" onPress={() => router.push('/publicar')} style={s.publishSmall} />
          </View>
          <View style={{ paddingHorizontal: spacing.lg }}>{filters}</View>
          <ScrollView ref={listRef} contentContainerStyle={s.panelList}>
            {status}
            {matches.map((m) => (
              <View key={m.id} onLayout={(e) => rowY.current.set(m.id, e.nativeEvent.layout.y)}>
                <MatchCard match={m} selected={m.id === selectedId} onPress={() => open(m)} />
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {map}

      <View style={[s.top, { paddingTop: insets.top + spacing.sm }]} pointerEvents="box-none">
        <View style={s.topRow} pointerEvents="box-none">
          <Text style={s.brand}>KANCHA</Text>
          {locateButton}
        </View>
        {filters}
        {pilotNote ? (
          <View style={s.note} pointerEvents="none">
            <Text style={s.noteText}>{pilotNote}</Text>
          </View>
        ) : null}
      </View>

      <View style={s.bottom} pointerEvents="box-none">
        <View style={s.bottomBar} pointerEvents="box-none">
          {summary ? (
            <View style={s.countPill}>
              <Text style={s.countText}>{summary}</Text>
            </View>
          ) : (
            <View />
          )}
          <Pressable
            onPress={() => router.push('/publicar')}
            accessibilityRole="button"
            accessibilityLabel="Publicar partido"
            style={({ pressed }) => [s.fab, pressed && { opacity: 0.85 }]}
          >
            <Icon name="plus" size={20} color={colors.onAccent} strokeWidth={2.4} />
            <Text style={s.fabText}>Publicar</Text>
          </Pressable>
        </View>

        {status ? (
          <View style={{ paddingHorizontal: spacing.md }}>{status}</View>
        ) : (
          <FlatList
            ref={carouselRef}
            data={matches}
            keyExtractor={(m) => m.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_WIDTH + spacing.sm}
            decelerationRate="fast"
            contentContainerStyle={s.carousel}
            onMomentumScrollEnd={onCarouselSettle}
            getItemLayout={(_, index) => ({ length: CARD_WIDTH + spacing.sm, offset: (CARD_WIDTH + spacing.sm) * index, index })}
            renderItem={({ item }) => (
              <View style={{ width: CARD_WIDTH }}>
                <MatchCard match={item} selected={item.id === selectedId} onPress={() => open(item)} />
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: spacing.md, gap: spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 2, color: colors.bronze },
  roundBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceFloating,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filters: { gap: spacing.sm },
  chipRow: { gap: spacing.sm, alignItems: 'center' },
  divider: { width: 1, height: 20, backgroundColor: colors.border, marginHorizontal: 2 },
  note: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceFloating,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.sm,
    maxWidth: 360,
  },
  noteText: { ...type.caption, fontSize: 13, color: colors.textMuted },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: spacing.md, gap: spacing.sm },
  bottomBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md },
  countPill: {
    backgroundColor: colors.surfaceFloating,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md - 4,
    paddingVertical: 6,
  },
  countText: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: spacing.md,
    borderRadius: 22,
    backgroundColor: colors.accent,
  },
  fabText: { ...type.button, color: colors.onAccent },
  carousel: { paddingHorizontal: spacing.md, gap: spacing.sm },
  stateCard: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.md, gap: spacing.sm + 2 },
  stateError: { borderWidth: 1, borderColor: colors.error },
  stateTitle: { ...type.h3, fontFamily: fonts.bold, color: colors.text },
  stateText: { ...type.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },

  wideRoot: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  wideTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  wideNote: {
    position: 'absolute',
    left: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.surfaceFloating,
    borderRadius: radius.button,
    paddingHorizontal: spacing.md - 4,
    paddingVertical: spacing.sm,
    maxWidth: 380,
  },
  panel: {
    width: PANEL_WIDTH,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.background,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  panelHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg },
  panelTitle: { ...type.h2, color: colors.text },
  panelSub: { ...type.caption, fontSize: 13, color: colors.textMuted },
  publishSmall: { minHeight: 44, paddingHorizontal: spacing.md },
  panelList: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm + 4 },
});
