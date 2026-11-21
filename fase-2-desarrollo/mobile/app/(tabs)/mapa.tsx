import { useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
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
import { antonLine, fonts, type } from '@/theme/typography';
import { RADIUS_OPTIONS } from '@/theme/geo';
import KanchaMap from '@/components/KanchaMap';
import { zoomForRadius } from '@/components/KanchaMap/types';
import { MatchCard } from '@/components/MatchCard';
import { SportFilter } from '@/components/SportFilter';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/icons/Icon';
import { Brand } from '@/components/Logo';
import { UrgentButton } from '@/components/UrgentButton';
import { DragSheet } from '@/components/ui/DragSheet';
import { FaltaUnoBanner } from '@/components/FaltaUnoBanner';
import { useNearbyMatches } from '@/api/hooks';
import { SKILL_LEVELS } from '@/theme/sports';
import { errorMessage } from '@/api/client';
import type { MatchSummary } from '@/api/types';
import { useFilters } from '@/store/filterStore';
import { useOrigin } from '@/hooks/useOrigin';
import { plural, whenRange, type When } from '@/lib/format';

const WHEN_OPTIONS: { key: When; label: string }[] = [
  { key: 'all', label: 'Cuando sea' },
  { key: 'today', label: 'Hoy' },
  { key: 'tomorrow', label: 'Mañana' },
  { key: 'weekend', label: 'Este finde' },
];

const CARD_WIDTH = 300;
const PANEL_WIDTH = 420;
const MOBILE_TOP = 150;
/** Panel inferior cerrado (asa + botones) y lo que suma al abrirse (las cartas). */
const PEEK_H = 150;
const OPEN_H = PEEK_H + 250;
/** Solo para el texto: la regla real es URGENT_WINDOW_HOURS de la API. */
const URGENT_HOURS = 2;

/**
 * HU-04 (KAN-10): partidos con cupo cerca, en un mapa oscuro.
 *
 * En el celular las cartas van en un panel inferior que se desliza (cerrado al inicio, se abre al
 * tocar un pin o "Falta uno"); en pantallas anchas
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
    : Math.min(width, height - insets.top - 64 - MOBILE_TOP - PEEK_H) * 0.95;

  const { sports, when, radius: radiusM, level, urgent, toggleSport, toggleLevel, toggleUrgent, setWhen, setRadius } = useFilters();
  const { origin, userLocation, source, locate } = useOrigin();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // El rango "Hoy / Mañana / Finde" se recalcula solo cuando cambia el filtro.
  const range = useMemo(() => whenRange(when), [when]);
  const params = source === 'locating' ? null : { ...origin, radius: radiusM, sports, level, urgent, ...range };
  const { data, isLoading, isError, error, refetch, isFetching } = useNearbyMatches(params);
  const matches = useMemo(() => data?.matches ?? [], [data]);

  useEffect(() => {
    if (selectedId && !matches.some((m) => m.id === selectedId)) setSelectedId(null);
  }, [matches, selectedId]);

  const open = (m: MatchSummary) => router.push(`/partido/${m.id}`);
  const mapMatches = useMemo(
    () => matches.map((m) => ({ id: m.id, lat: m.lat, lng: m.lng, sport: m.sport, slotsLeft: m.slotsLeft, priority: m.priority })),
    [matches],
  );

  const carouselRef = useRef<FlatList<MatchSummary>>(null);
  const listRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const rowY = useRef(new Map<string, number>());

  // Al tocar un pin, la carta correspondiente aparece en el carrusel o el panel.
  function selectFromMap(id: string | null) {
    setSelectedId(id);
    // Tocar un pin abre el panel; tocar el mapa vacío lo cierra.
    setSheetOpen(id !== null);
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
      : urgent
        ? `${plural(matches.length, 'partido necesita', 'partidos necesitan')} un jugador en ${URGENT_HOURS} h o menos`
        : `${plural(matches.length, 'partido', 'partidos')} a menos de ${radiusM / 1000} km`;

  // KAN-37: el "falta uno" de última hora, la razón de ser de Kancha. Abre el panel para ver el resultado.
  const onUrgent = () => {
    toggleUrgent();
    setSheetOpen(true);
  };
  const urgentButton = <UrgentButton active={urgent} onPress={onUrgent} hours={URGENT_HOURS} style={{ flex: 1 }} />;

  const sheetTitle =
    isLoading || source === 'locating'
      ? 'Buscando partidos…'
      : isError
        ? 'No pudimos cargar los partidos'
        : (summary ?? (urgent ? 'Ahora no hay un "falta uno" cerca' : 'No hay partidos cerca con estos filtros'));

  const pilotNote =
    source === 'pilot'
      ? 'Estás fuera de La Florida, la comuna del piloto. Te mostramos sus partidos.'
      : source === 'denied'
        ? 'Sin acceso a tu ubicación. Te mostramos los partidos de La Florida.'
        : source === 'imprecise'
          ? 'No pudimos ubicarte con precisión. Te mostramos los partidos de La Florida.'
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
      <View style={s.divider} />
      {SKILL_LEVELS.map((l) => (
        <Chip key={l.key} label={l.label} active={level === l.key} onPress={() => toggleLevel(l.key)} floating={!wide} />
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
  ) : matches.length === 0 && urgent ? (
    <View style={s.stateCard}>
      <Text style={s.stateTitle}>Ahora no hay un "falta uno" cerca</Text>
      <Text style={s.stateText}>
        Ningún partido cercano necesita un jugador en las próximas {URGENT_HOURS} horas. Vuelve a mirar en un rato.
      </Text>
      <Button label="Ver todos los partidos" variant="secondary" onPress={toggleUrgent} />
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
      userLocation={userLocation}
      bottomInset={wide ? 0 : (sheetOpen ? OPEN_H : PEEK_H) - MOBILE_TOP}
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
            <Brand />
            {locateButton}
          </View>
          {pilotNote ? (
            <View style={s.wideNote} pointerEvents="none">
              <Text style={s.noteText}>{pilotNote}</Text>
            </View>
          ) : null}
        </View>

        <View style={s.panel}>
          <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
            <FaltaUnoBanner />
          </View>
          <View style={s.panelHead}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={s.panelTitle}>Partidos con cupo</Text>
              <Text style={s.panelSub}>{isFetching && !data ? 'Buscando…' : summary ?? 'Sin resultados con estos filtros'}</Text>
            </View>
            <Button label="Publicar" icon="plus" onPress={() => router.push('/publicar')} style={s.publishSmall} />
          </View>
          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}>
            {filters}
            <View style={{ flexDirection: 'row' }}>{urgentButton}</View>
          </View>
          <ScrollView ref={listRef} contentContainerStyle={s.panelList}>
            {status}
            {matches.map((m, i) => (
              <View key={m.id} onLayout={(e) => rowY.current.set(m.id, e.nativeEvent.layout.y)}>
                <MatchCard match={m} index={i} selected={m.id === selectedId} onPress={() => open(m)} />
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
          <Brand />
          {locateButton}
        </View>
        <FaltaUnoBanner />
        {filters}
        {pilotNote ? (
          <View style={s.note} pointerEvents="none">
            <Text style={s.noteText}>{pilotNote}</Text>
          </View>
        ) : null}
      </View>

      <DragSheet
        expanded={sheetOpen}
        onChange={setSheetOpen}
        title={sheetTitle}
        peek={
          <View style={s.actions}>
            {urgentButton}
            <Pressable
              onPress={() => router.push('/publicar')}
              accessibilityRole="button"
              accessibilityLabel="Publicar partido"
              style={({ pressed }) => [s.publish, pressed && { opacity: 0.85 }]}
            >
              <Icon name="plus" size={20} color={colors.accent} strokeWidth={2.4} />
              <Text style={s.publishText}>Publicar</Text>
            </Pressable>
          </View>
        }
      >
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
            renderItem={({ item, index }) => (
              <View style={{ width: CARD_WIDTH }}>
                <MatchCard match={item} index={index} selected={item.id === selectedId} onPress={() => open(item)} />
              </View>
            )}
          />
        )}
      </DragSheet>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, overflow: 'hidden' },
  top: { position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: spacing.md, gap: spacing.sm },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  publish: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 60,
    paddingHorizontal: spacing.md + 2,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.surface,
  },
  publishText: { ...type.button, color: colors.text },
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
  panelTitle: { ...type.display, ...antonLine(24, 30), color: colors.text },
  panelSub: { ...type.caption, fontSize: 13, color: colors.textMuted },
  publishSmall: { minHeight: 44, paddingHorizontal: spacing.md },
  panelList: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.sm + 4 },
});
