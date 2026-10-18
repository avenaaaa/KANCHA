import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { SKILL_LEVELS, type SkillLevelKey, type SportKey } from '@/theme/sports';
import { LA_FLORIDA } from '@/theme/geo';
import { formatCLP, formatDay } from '@/lib/format';
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
import type { LatLng } from '@/components/KanchaMap/types';

/** Cupos sugeridos por deporte; el organizador los ajusta. */
const DEFAULT_SLOTS: Record<SportKey, number> = { FUTBOL: 10, PADEL: 4, BASQUETBOL: 6 };
const DURATIONS = [60, 90, 120] as const;
const TIMES = Array.from({ length: 34 }, (_, i) => {
  const minutes = 7 * 60 + i * 30;
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${minutes % 60 === 0 ? '00' : '30'}`;
});

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
          <TextField label="Cancha o recinto" value={venueName} onChangeText={(v) => (setVenueName(v), fix('venueName'))} error={errors['venueName']} placeholder="Ej.: Complejo Walker Martínez" maxLength={80} />
          <TextField label="Dirección" value={address} onChangeText={(v) => (setAddress(v), fix('address'))} error={errors['address']} placeholder="Calle, número y comuna" maxLength={160} />
          <View style={[s.mapBox, !!errors['location'] && !picked && { borderColor: colors.error }]}>
            <KanchaMap center={LA_FLORIDA} zoom={13} picked={picked} onPick={(p) => (setPicked(p), fix('location'))} />
            {!picked && (
              <View style={s.mapHint} pointerEvents="none">
                <Text style={s.mapHintText}>Toca el mapa para marcar la cancha</Text>
              </View>
            )}
          </View>
          {errors['location'] && !picked ? <Text style={s.error}>{errors['location']}</Text> : null}
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
    height: 240,
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
