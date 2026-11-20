import { useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { useNotificationPrefs, useSaveNotificationPrefs } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import type { NotificationPreferences } from '@/api/types';
import { useOrigin } from '@/hooks/useOrigin';
import { hourLabel, toggleIn, WEEK_DAYS } from '@/lib/notifications';
import { RequireAuth } from '@/components/RequireAuth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SportFilter } from '@/components/SportFilter';
import { Stepper } from '@/components/Stepper';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function NotificationSettingsScreen() {
  return (
    <RequireAuth>
      <NotificationSettings />
    </RequireAuth>
  );
}

/** HU-10 (KAN-16): qué avisos acepta el usuario. Las reglas de cada aviso las aplica la API. */
function NotificationSettings() {
  const insets = useSafeAreaInsets();
  const saved = useNotificationPrefs();
  const save = useSaveNotificationPrefs();
  // "Cerca" se mide desde donde está al guardar; sin permiso de ubicación, desde el centro de La Florida.
  const { origin, source } = useOrigin();
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);
  useEffect(() => {
    if (saved.data && !draft) setDraft(saved.data);
  }, [saved.data, draft]);

  if (!draft) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <ScreenHeader title="Mis avisos" />
        <View style={s.body}>
          {saved.isError ? <Text style={s.error}>{errorMessage(saved.error)}</Text> : <Skeleton height={180} />}
        </View>
      </View>
    );
  }

  const set = (patch: Partial<NotificationPreferences>) => setDraft({ ...draft, ...patch });
  const anyOn = draft.faltaUno || draft.nearby || draft.nudges;
  const onSave = () => save.mutate({ ...draft, lat: origin.lat, lng: origin.lng }, { onSuccess: () => router.back() });

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Mis avisos" />
      <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing.xxl }]}>
        <View style={[s.card, s.cardUrgent]}>
          <Toggle
            label='Avisos "Falta uno"'
            value={draft.faltaUno}
            onChange={(faltaUno) => set({ faltaUno })}
            text="Partidos cerca a los que les falta un jugador y empiezan en 2 horas o menos, y los que su organizador destaca: ahí entras gratis. Llegan primero y destacados, antes que cualquier otro aviso."
            urgent
          />
        </View>

        <View style={s.card}>
          <Toggle
            label="Partidos cerca"
            value={draft.nearby}
            onChange={(nearby) => set({ nearby })}
            text="Cuando alguien publica un partido de tus deportes en los días y el horario en que puedes jugar."
          />
          {draft.nearby ? (
            <View style={{ gap: spacing.sm }}>
              <Text style={s.label}>Días</Text>
              <View style={s.chips}>
                {WEEK_DAYS.map((d) => (
                  <Chip key={d.day} label={d.label} active={draft.days.includes(d.day)} onPress={() => set({ days: toggleIn(draft.days, d.day) })} />
                ))}
              </View>
              <Stepper
                label={`Desde las ${hourLabel(draft.fromHour)}`}
                value={draft.fromHour}
                min={0}
                max={draft.toHour - 1}
                onChange={(fromHour) => set({ fromHour })}
              />
              <Stepper
                label={`Hasta las ${hourLabel(draft.toHour)}`}
                value={draft.toHour}
                min={draft.fromHour + 1}
                max={24}
                onChange={(toHour) => set({ toHour })}
              />
            </View>
          ) : null}
        </View>

        <View style={s.card}>
          <Toggle
            label="Ánimo para jugar"
            value={draft.nudges}
            onChange={(nudges) => set({ nudges })}
            text="Si llevas dos semanas sin jugar y hay partidos cerca, te lo recordamos. A lo más una vez por semana."
          />
        </View>

        {anyOn ? (
          <View style={s.card}>
            <Text style={s.label}>Deportes</Text>
            <SportFilter active={draft.sports} onToggle={(sport) => set({ sports: toggleIn(draft.sports, sport) })} />
            <Stepper label={`Hasta ${draft.radiusKm} km de distancia`} value={draft.radiusKm} min={1} max={20} onChange={(radiusKm) => set({ radiusKm })} />
            <Text style={s.hint}>
              {source === 'gps'
                ? 'Medimos la distancia desde donde estás ahora.'
                : 'Sin tu ubicación, medimos la distancia desde el centro de La Florida.'}
            </Text>
          </View>
        ) : null}

        {save.isError ? <Text style={s.error}>{errorMessage(save.error)}</Text> : null}
        <Button label="Guardar mis avisos" onPress={onSave} loading={save.isPending} forward />
      </ScrollView>
    </View>
  );
}

function Toggle({
  label,
  value,
  onChange,
  text,
  urgent = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  text: string;
  urgent?: boolean;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <View style={s.toggleRow}>
        <Text style={[s.toggleLabel, urgent && s.toggleUrgent]}>{label}</Text>
        <Switch
          value={value}
          onValueChange={onChange}
          accessibilityLabel={label}
          trackColor={{ true: colors.accent, false: colors.border }}
          thumbColor={colors.text}
          // react-native-web pinta el círculo encendido con su verde por defecto si no recibe activeThumbColor.
          {...(Platform.OS === 'web' ? { activeThumbColor: colors.text } : {})}
        />
      </View>
      <Text style={s.hint}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md, width: '100%', maxWidth: 560, alignSelf: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
  cardUrgent: { borderWidth: 2, borderColor: colors.accent },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  toggleLabel: { ...type.h3, fontFamily: fonts.bold, color: colors.text, flex: 1 },
  toggleUrgent: { fontFamily: fonts.display, fontSize: 20, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.accent },
  label: { ...type.label, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  hint: { ...type.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  error: { ...type.body, fontSize: 14, color: colors.error },
});
