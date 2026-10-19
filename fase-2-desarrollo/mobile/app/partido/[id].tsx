import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { levelLabel, sportLabel } from '@/theme/sports';
import { formatCLP, formatTime, formatDay, slotsCta } from '@/lib/format';
import { useApproveParticipation, useJoinMatch, useMatch } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import type { MatchDetail, Participant } from '@/api/types';
import { RequireAuth } from '@/components/RequireAuth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SportBadge } from '@/components/SportBadge';
import { SlotBar } from '@/components/SlotBar';
import { HonorBadge } from '@/components/HonorBadge';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/icons/Icon';

/** Detalle del partido, postulación (HU-05) y aprobación por el organizador. */
export default function MatchScreen() {
  return (
    <RequireAuth>
      <MatchDetailView />
    </RequireAuth>
  );
}

function MatchDetailView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { data: m, isLoading, isError, error, refetch } = useMatch(id);
  const join = useJoinMatch(id);
  const approve = useApproveParticipation(id);

  if (isLoading || !m) {
    return (
      <View style={[s.screen, { paddingTop: insets.top }]}>
        <ScreenHeader />
        <View style={[s.body, { gap: spacing.md }]}>
          {isError ? (
            <>
              <Text style={s.h1}>No pudimos abrir el partido</Text>
              <Text style={s.muted}>{errorMessage(error)}</Text>
              <Button label="Reintentar" variant="secondary" onPress={() => void refetch()} />
            </>
          ) : (
            <>
              <Skeleton height={40} width="70%" />
              <Skeleton height={16} width="50%" />
              <Skeleton height={120} />
            </>
          )}
        </View>
      </View>
    );
  }

  const start = new Date(m.startsAt);
  const confirmed = m.participants.filter((p) => p.status === 'APPROVED' || p.status === 'PAID');
  const pending = m.participants.filter((p) => p.status === 'PENDING');
  const narrow = width < 640;

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader />
      <ScrollView contentContainerStyle={[s.body, { paddingBottom: 140 + insets.bottom }]}>
        <View style={s.hero}>
          <SportBadge sport={m.sport} size={56} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.h1}>{m.title}</Text>
            <Text style={s.muted}>
              {sportLabel(m.sport)} · {levelLabel(m.level)}
            </Text>
          </View>
        </View>

        <View style={[s.facts, narrow && { flexDirection: 'column' }]}>
          <Fact icon="clock" title={`${formatDay(start)}, ${formatTime(start)}`} text={`${m.durationMin} minutos`} />
          <Fact icon="pin" title={m.venueName} text={m.address} />
          <Fact
            icon="wallet"
            title={m.pricePerPlayer === 0 ? 'Gratis' : `${formatCLP(m.pricePerPlayer)} por jugador`}
            text={m.pricePerPlayer === 0 ? 'Sin arriendo que dividir' : `Más ${formatCLP(m.serviceFee)} de servicio Kancha`}
          />
        </View>

        <View style={s.block}>
          <View style={s.blockHead}>
            <Text style={s.h2}>{m.slotsLeft > 0 ? (m.slotsLeft === 1 ? 'Falta 1 jugador' : `Faltan ${m.slotsLeft} jugadores`) : 'Partido completo'}</Text>
            <Text style={s.count}>
              {m.filledSlots}/{m.totalSlots}
            </Text>
          </View>
          <SlotBar filled={m.filledSlots} total={m.totalSlots} breathe={m.slotsLeft > 0} height={12} />
        </View>

        <View style={s.block}>
          <Text style={s.sectionLabel}>Organiza</Text>
          <View style={s.personRow}>
            <Avatar name={m.organizer.name} />
            <Text style={s.personName}>{m.organizer.name}</Text>
            <HonorBadge score={m.organizer.honorScore} />
          </View>
        </View>

        {m.viewer.isOrganizer && (
          <View style={s.block}>
            <Text style={s.sectionLabel}>
              {pending.length === 0 ? 'Sin postulaciones por revisar' : `Postulaciones por revisar (${pending.length})`}
            </Text>
            {pending.map((p) => (
              <PersonRow key={p.participationId} p={p}>
                <Button
                  label="Aprobar"
                  onPress={() => approve.mutate(p.participationId)}
                  loading={approve.isPending && approve.variables === p.participationId}
                  disabled={m.slotsLeft === 0}
                  style={s.approveBtn}
                />
              </PersonRow>
            ))}
            {approve.isError && <Text style={s.error}>{errorMessage(approve.error)}</Text>}
          </View>
        )}

        <View style={s.block}>
          <Text style={s.sectionLabel}>
            {confirmed.length === 0 ? 'Aún no hay confirmados por Kancha' : `Confirmados por Kancha (${confirmed.length})`}
          </Text>
          {confirmed.map((p) => (
            <PersonRow key={p.participationId} p={p} />
          ))}
          <Text style={s.caption}>
            Los otros {Math.max(0, m.filledSlots - confirmed.length)} cupos ocupados son jugadores que el organizador ya tenía.
          </Text>
        </View>
      </ScrollView>

      <View style={[s.ctaBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <View style={{ width: '100%', maxWidth: 720 }}>
          <JoinCta m={m} onJoin={() => join.mutate()} joining={join.isPending} error={join.isError ? errorMessage(join.error) : null} />
        </View>
      </View>
    </View>
  );
}

function Fact({ icon, title, text }: { icon: 'clock' | 'pin' | 'wallet'; title: string; text: string }) {
  return (
    <View style={s.fact}>
      <Icon name={icon} size={20} color={colors.textMuted} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.factTitle}>{title}</Text>
        <Text style={s.caption}>{text}</Text>
      </View>
    </View>
  );
}

function PersonRow({ p, children }: { p: Participant; children?: React.ReactNode }) {
  return (
    <View style={s.personRow}>
      <Avatar name={p.user.name} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.personName}>{p.user.name}</Text>
        <Text style={s.caption}>
          {p.user.matchesPlayed === 1 ? '1 partido jugado' : `${p.user.matchesPlayed} partidos jugados`}
        </Text>
      </View>
      {children ?? <HonorBadge score={p.user.honorScore} />}
    </View>
  );
}

/**
 * El CTA "Falta 1" (DESIGN.md §4.3) cambia según el estado del jugador:
 * postular → pendiente → confirmado. Con el partido lleno queda deshabilitado (HU-05).
 */
function JoinCta({ m, onJoin, joining, error }: { m: MatchDetail; onJoin: () => void; joining: boolean; error: string | null }) {
  if (m.viewer.isOrganizer) {
    return <StatusLine tone="muted" text="Organizas este partido. Aprueba las postulaciones desde aquí." />;
  }
  if (m.viewer.status === 'PENDING') {
    return <StatusLine tone="warning" text="Postulación enviada. Te confirmamos cuando el organizador la apruebe." />;
  }
  if (m.viewer.status === 'APPROVED' || m.viewer.status === 'PAID') {
    return <StatusLine tone="success" text="Estás confirmado. Nos vemos en la cancha." />;
  }
  return (
    <View style={{ gap: spacing.sm }}>
      {error ? <Text style={s.error}>{error}</Text> : null}
      <Button
        label={m.slotsLeft > 0 ? slotsCta(m.slotsLeft) : 'Partido completo'}
        onPress={onJoin}
        loading={joining}
        disabled={m.slotsLeft === 0}
        forward={m.slotsLeft > 0}
        accessibilityHint="Envía tu postulación al organizador"
      />
    </View>
  );
}

function StatusLine({ tone, text }: { tone: 'muted' | 'warning' | 'success'; text: string }) {
  const color = tone === 'success' ? colors.success : tone === 'warning' ? colors.warning : colors.textMuted;
  return (
    <View style={[s.statusLine, { borderColor: tone === 'muted' ? colors.border : color }]} accessibilityLiveRegion="polite">
      <Icon name={tone === 'success' ? 'check' : tone === 'warning' ? 'clock' : 'user'} size={20} color={color} strokeWidth={2} />
      <Text style={[s.statusText, { color: tone === 'muted' ? colors.textMuted : colors.text }]}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
  hero: { flexDirection: 'row', gap: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  h1: { ...type.h1, color: colors.text, lineHeight: 34 },
  h2: { ...type.h2, color: colors.text },
  muted: { ...type.body, color: colors.textMuted },
  caption: { ...type.caption, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  facts: { flexDirection: 'row', gap: spacing.sm },
  fact: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  factTitle: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  block: { gap: spacing.md - 4 },
  blockHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  count: { fontFamily: fonts.bold, fontSize: 18, color: colors.textMuted },
  sectionLabel: { fontFamily: fonts.bold, fontSize: 15, color: colors.textMuted },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4, minHeight: 48 },
  personName: { fontFamily: fonts.medium, fontSize: 15, color: colors.text, flexShrink: 1 },
  approveBtn: { minHeight: 40, paddingHorizontal: spacing.md },
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
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    borderWidth: 1,
    borderRadius: radius.button,
    padding: spacing.md - 2,
    width: '100%',
    maxWidth: 720,
  },
  statusText: { ...type.body, flex: 1 },
});
