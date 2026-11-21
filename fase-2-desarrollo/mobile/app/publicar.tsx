import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { SKILL_LEVELS, sportLabel, type SkillLevelKey, type SportKey } from '@/theme/sports';
import { formatCLP, formatDay } from '@/lib/format';
import { VENUES, VENUE_KIND_LABEL, insideComuna, reverseGeocode, venuesForSport, type Venue } from '@/lib/places';
import { usePublishMatch } from '@/api/hooks';
import { ApiRequestError, errorMessage } from '@/api/client';
import { RequireAuth } from '@/components/RequireAuth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SportPicker } from '@/components/SportPicker';
import { Stepper } from '@/components/Stepper';
import { SlotBar } from '@/components/SlotBar';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import KanchaMap from '@/components/KanchaMap';
import { zoomForRadius, type LatLng } from '@/components/KanchaMap/types';

/** Cupos sugeridos por deporte; el organizador los ajusta. */
const DEFAULT_SLOTS: Record<SportKey, number> = { FUTBOL: 10, PADEL: 4, BASQUETBOL: 6 };
const DURATIONS = [60, 90, 120] as const;
const TIMES = Array.from({ length: 34 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 === 0 ? '00' : '30'}`;
});

/** Encuadre inicial del mapa de Publicar: todas las canchas a la vista, no el centro fijo de la comuna. */
const VENUES_VIEW = (() => {
  const lats = VENUES.map((v) => v.lat);
  const lngs = VENUES.map((v) => v.lng);
  const center = { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
  const spanM = Math.max(
    (Math.max(...lats) - Math.min(...lats)) * 111_320,
    (Math.max(...lngs) - Math.min(...lngs)) * 111_320 * Math.cos((center.lat * Math.PI) / 180),
  );
  return { center, zoom: zoomForRadius(spanM / 2 + 400, center.lat, 300) };
})();

/** Comisión de la plataforma, igual que payment.service (10 %, redondeo al peso). */
const serviceFee = (amount: number) => Math.round(amount * 0.1);

export default function PublishScreen() {
  return (
    <RequireAuth>
      <PublishForm />
    </RequireAuth>
  );
}

/** HU-03 (KAN-9): publicar un partido al que le faltan jugadores. */
function PublishForm() {
  const insets = useSafeAreaInsets();
  const publish = usePublishMatch();
  const now = new Date();

  const [sport, setSport] = useState<SportKey | null>(null);
  const [title, setTitle] = useState('');
  const [level, setLevel] = useState<SkillLevelKey>('MEDIO');
  const [venueName, setVenueName] = useState('');
  const [address, setAddress] = useState('');
  const [picked, setPicked] = useState<LatLng | null>(null);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [dayOffset, setDayOffset] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(60);
  const [totalSlots, setTotalSlots] = useState(10);
  const [filledSlots, setFilledSlots] = useState(9);
  const [cost, setCost] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Un error se borra apenas el usuario corrige ese campo.
  const fix = (key: string) => setErrors(({ [key]: _gone, ...rest }) => rest);

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        return { offset: i, label: formatDay(d, now) };
      }),
    [now.getDate()],
  );

  const startsAt = (offset: number, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, h ?? 0, m ?? 0);
  };
  // Hoy no se ofrecen horarios que ya pasaron o que empiezan en menos de 30 minutos.
  const timeAvailable = (hhmm: string) => startsAt(dayOffset, hhmm).getTime() > Date.now() + 30 * 60_000;

  // Marcar un punto propone su dirección. Si llega una respuesta vieja, se descarta.
  const [locating, setLocating] = useState(false);
  const lookup = useRef(0);
  function pick(p: LatLng, knownAddress?: string) {
    if (!insideComuna(p)) {
      setErrors((e) => ({ ...e, location: 'Ese punto está fuera de La Florida. Marca uno dentro del límite naranja.' }));
      return false;
    }
    setPicked(p);
    fix('location');
    const id = ++lookup.current;
    // Las canchas investigadas traen su dirección: no hace falta preguntarle al servicio.
    if (knownAddress) {
      setLocating(false);
      setAddress(knownAddress);
      fix('address');
      return true;
    }
    setLocating(true);
    void reverseGeocode(p).then((found) => {
      if (id !== lookup.current) return;
      setLocating(false);
      if (found) {
        setAddress(found);
        fix('address');
      }
    });
    return true;
  }

  function chooseVenue(v: Venue) {
    if (!pick(v, v.address)) return;
    setVenueId(v.id);
    setVenueName(v.name);
    fix('venueName');
  }

  // Pines de las canchas donde se juega el deporte elegido; sin deporte, todas. La elegida se ve
  // siempre, aunque después se cambie a un deporte que no tiene: si no, su punto quedaría invisible.
  const mapVenues = useMemo(
    () =>
      [...venuesForSport(sport), ...VENUES.filter((v) => v.id === venueId && sport && !v.sports.includes(sport))].map((v) => ({
        id: v.id,
        lat: v.lat,
        lng: v.lng,
        name: v.name,
        paid: v.kind !== 'PUBLICA',
        sport: sport && v.sports.includes(sport) ? sport : v.sports.length === 1 ? v.sports[0] : undefined,
      })),
    [sport, venueId],
  );
  const venue = venueId ? VENUES.find((v) => v.id === venueId) : undefined;

  function chooseSport(next: SportKey) {
    setSport(next);
    fix('sport');
    setTotalSlots(DEFAULT_SLOTS[next]);
    setFilledSlots(DEFAULT_SLOTS[next] - 1);
  }

  function changeTotal(next: number) {
    setTotalSlots(next);
    setFilledSlots((f) => Math.min(f, next - 1));
  }

  const totalCost = Number(cost.replace(/\D/g, '') || '0');
  const perPlayer = totalSlots > 0 ? Math.ceil(totalCost / totalSlots) : 0;
  const missing = totalSlots - filledSlots;

  async function submit() {
    const next: Record<string, string> = {};
    if (!sport) next['sport'] = 'Elige el deporte';
    if (title.trim().length < 3) next['title'] = 'Ponle un nombre al partido';
    if (venueName.trim().length < 2) next['venueName'] = 'Indica la cancha o el recinto';
    if (address.trim().length < 3) next['address'] = 'Indica la dirección';
    if (!picked) next['location'] = 'Toca el mapa para marcar dónde se juega';
    if (!time || !timeAvailable(time)) next['startsAt'] = 'Elige un horario futuro';
    setErrors(next);
    if (Object.keys(next).length || !sport || !picked || !time) return;

    try {
      const match = await publish.mutateAsync({
        title: title.trim(),
        sport,
        level,
        venueName: venueName.trim(),
        address: address.trim(),
        lat: picked.lat,
        lng: picked.lng,
        startsAt: startsAt(dayOffset, time).toISOString(),
        durationMin: duration,
        totalSlots,
        filledSlots,
        totalCost,
      });
      router.replace(`/partido/${match.id}`);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        const fe = err.fieldErrors();
        if (fe['lat'] || fe['lng']) fe['location'] = 'La ubicación no es válida';
        setErrors(fe);
      }
    }
  }

  return (
    <KeyboardAvoidingView style={[s.screen, { paddingTop: insets.top }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScreenHeader title="Publicar partido" />
      <ScrollView contentContainerStyle={[s.body, { paddingBottom: 120 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <Section title="¿Qué se juega?">
          <SportPicker value={sport} onChange={chooseSport} error={errors['sport']} />
          <TextField
            label="Nombre del partido"
            value={title}
            onChangeText={(v) => (setTitle(v), fix('title'))}
            error={errors['title']}
            placeholder={sport === 'PADEL' ? 'Ej.: Dobles del jueves' : sport === 'BASQUETBOL' ? 'Ej.: 3x3 en la multicancha' : 'Ej.: Pichanga del jueves'}
            maxLength={80}
          />
          <View style={s.chips}>
            {SKILL_LEVELS.map((l) => (
              <Chip key={l.key} label={l.label} active={level === l.key} onPress={() => setLevel(l.key)} />
            ))}
          </View>
        </Section>

        <Section title="¿Dónde?">
          <Text style={s.lead}>
            {venuesForSport(sport).length} canchas{sport ? ` de ${sportLabel(sport).toLowerCase()}` : ''} en La Florida. Toca un pin para
            elegirla o toca el mapa para marcar otro punto.
          </Text>
          <View style={s.legend} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={s.legendItem}>
              <View style={s.legendDot} />
              <Text style={s.legendText}>Abierta al público</Text>
            </View>
            <View style={s.legendItem}>
              <View style={s.legendFee}>
                <Text style={s.legendFeeText}>$</Text>
              </View>
              <Text style={s.legendText}>Se arrienda</Text>
            </View>
          </View>
          <View style={[s.mapBox, !!errors['location'] && { borderColor: colors.error }]}>
            <KanchaMap
              center={picked ?? VENUES_VIEW.center}
              zoom={picked ? 14.5 : VENUES_VIEW.zoom}
              venues={mapVenues}
              selectedId={venueId}
              onSelect={(id) => {
                const v = VENUES.find((x) => x.id === id);
                if (v) chooseVenue(v);
              }}
              // Con una cancha elegida su propio pin ya se destaca: el marcador de punto sobra.
              picked={venueId ? null : picked}
              onPick={(p) => {
                // Marcar un punto a mano deja de ser la cancha elegida.
                if (!pick(p)) return;
                if (venueId) setVenueName('');
                setVenueId(null);
              }}
            />
            {!picked && (
              <View style={s.mapHint} pointerEvents="none">
                <Text style={s.mapHintText}>Toca un pin o marca otro punto</Text>
              </View>
            )}
          </View>
          {venue ? (
            <View style={s.venueCard}>
              <Text style={s.venueName}>{venue.name}</Text>
              <Text style={[s.venueKind, venue.kind !== 'PUBLICA' && { color: colors.accent }]}>{VENUE_KIND_LABEL[venue.kind]}</Text>
            </View>
          ) : null}
          <TextField label="Cancha o recinto" value={venueName} onChangeText={(v) => (setVenueName(v), fix('venueName'))} error={errors['venueName']} placeholder="Ej.: Complejo Walker Martínez" maxLength={80} />
          <TextField label={locating ? 'Dirección (buscando…)' : 'Dirección'} value={address} onChangeText={(v) => (setAddress(v), fix('address'))} error={errors['address']} placeholder="Calle, número y comuna" maxLength={160} />
          {errors['location'] ? <Text style={s.error}>{errors['location']}</Text> : null}
        </Section>

        <Section title="¿Cuándo?">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsScroll}>
            {days.map((d) => (
              <Chip key={d.offset} label={d.label} active={dayOffset === d.offset} onPress={() => setDayOffset(d.offset)} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chipsScroll}>
            {TIMES.map((t) => (
              <Chip key={t} label={t} active={time === t} disabled={!timeAvailable(t)} onPress={() => (setTime(t), fix('startsAt'))} />
            ))}
          </ScrollView>
          <View style={s.chips}>
            {DURATIONS.map((d) => (
              <Chip key={d} label={`${d} min`} active={duration === d} onPress={() => setDuration(d)} />
            ))}
          </View>
          {errors['startsAt'] ? <Text style={s.error}>{errors['startsAt']}</Text> : null}
        </Section>

        <Section title="Jugadores">
          <Stepper label="Cupos en total" value={totalSlots} min={2} max={30} onChange={changeTotal} />
          <Stepper label="Ya están (contándote)" value={filledSlots} min={1} max={totalSlots - 1} onChange={setFilledSlots} />
          <SlotBar filled={filledSlots} total={totalSlots} height={10} />
          <Text style={s.lead}>{missing === 1 ? 'Te falta 1 jugador.' : `Te faltan ${missing} jugadores.`}</Text>
        </Section>

        <Section title="Arriendo">
          <TextField
            label="Costo total de la cancha (CLP)"
            value={cost}
            onChangeText={(v) => setCost(v.replace(/\D/g, ''))}
            keyboardType="number-pad"
            placeholder="0 si es gratis"
            maxLength={7}
            error={errors['totalCost']}
          />
          <Text style={s.lead}>
            {totalCost === 0
              ? 'Partido gratuito: nadie paga cuota.'
              : `Cada jugador paga ${formatCLP(perPlayer)} más ${formatCLP(serviceFee(perPlayer))} de servicio Kancha. El recinto recibe el arriendo completo.`}
          </Text>
        </Section>
      </ScrollView>

      <View style={[s.ctaBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={{ width: '100%', maxWidth: 720, gap: spacing.sm }}>
          {publish.isError && !(publish.error instanceof ApiRequestError && publish.error.status === 422) ? (
            <Text style={s.error}>{errorMessage(publish.error)}</Text>
          ) : Object.keys(errors).length > 0 ? (
            <Text style={s.error}>Revisa los datos marcados antes de publicar.</Text>
          ) : null}
          <Button label="Publicar partido" onPress={submit} loading={publish.isPending} forward />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.lg, gap: spacing.xl, width: '100%', maxWidth: 720, alignSelf: 'center' },
  section: { gap: spacing.md },
  sectionTitle: { ...type.h2, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chipsScroll: { flexDirection: 'row', gap: spacing.sm },
  mapBox: {
    height: 320,
    borderRadius: radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapHint: {
    position: 'absolute',
    top: spacing.sm + 4,
    alignSelf: 'center',
    backgroundColor: colors.surfaceFloating,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md - 4,
    paddingVertical: 6,
  },
  mapHintText: { fontFamily: fonts.bold, fontSize: 13, color: colors.text },
  legend: { flexDirection: 'row', gap: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.surface },
  legendFee: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  legendFeeText: { fontFamily: fonts.bold, fontSize: 10, color: colors.onAccent },
  legendText: { ...type.caption, color: colors.textMuted },
  venueCard: { backgroundColor: colors.surface, borderRadius: radius.tile, padding: spacing.md, gap: 4 },
  venueName: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  venueKind: { ...type.label, color: colors.success },
  lead: { ...type.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  error: { ...type.caption, fontSize: 13, color: colors.error },
  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
  },
});
