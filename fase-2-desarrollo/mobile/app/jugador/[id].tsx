import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { usePlayer, useReportPlayer } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import type { ReportReason, User } from '@/api/types';
import { useAuth } from '@/store/authStore';
import { REPORT_REASONS } from '@/lib/moderation';
import { RequireAuth } from '@/components/RequireAuth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';

/**
 * Carta pública de otro jugador (HU-02): solo su información pública, nunca el correo.
 * Abierta desde un partido (`?partido=`), ofrece reportar su conducta en ese partido (HU-11).
 */
export default function PlayerScreen() {
  return (
    <RequireAuth>
      <PlayerView />
    </RequireAuth>
  );
}

function PlayerView() {
  const { id, partido } = useLocalSearchParams<{ id: string; partido?: string }>();
  const insets = useSafeAreaInsets();
  const me = useAuth((st) => st.user);
  const { data, isLoading, isError, error, refetch } = usePlayer(id);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Carta de jugador" />
      <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {isLoading ? (
          <Skeleton height={320} />
        ) : isError || !data ? (
          <>
            <Text style={s.h2}>No pudimos abrir esta carta</Text>
            <Text style={s.muted}>{errorMessage(error)}</Text>
            <Button label="Reintentar" variant="secondary" onPress={() => void refetch()} />
          </>
        ) : (
          <>
            <PlayerCard user={data} />
            {partido && me && me.id !== data.id ? <ReportSection matchId={partido} player={data} /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

/** HU-11: el reporte lo revisa un administrador. El reportado no ve quién lo hizo. */
function ReportSection({ matchId, player }: { matchId: string; player: User }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [comment, setComment] = useState('');
  const report = useReportPlayer(matchId);

  if (report.isSuccess) {
    return <Text style={s.muted}>Reporte enviado. Lo revisará un administrador.</Text>;
  }
  if (!open) {
    return <Button label="Reportar conducta" variant="ghost" icon="shield" onPress={() => setOpen(true)} />;
  }
  return (
    <View style={s.card}>
      <Text style={s.title}>¿Qué pasó con {player.name} en el partido?</Text>
      <View style={s.chips}>
        {REPORT_REASONS.map((r) => (
          <Chip key={r.value} label={r.label} active={reason === r.value} onPress={() => setReason(r.value)} />
        ))}
      </View>
      <TextField
        label="Cuéntanos más (opcional)"
        value={comment}
        onChangeText={setComment}
        maxLength={280}
        multiline
        hint={`${comment.length}/280`}
      />
      {report.isError && <Text style={s.error}>{errorMessage(report.error)}</Text>}
      <Button
        label="Enviar reporte"
        disabled={!reason}
        loading={report.isPending}
        onPress={() => reason && report.mutate({ reportedId: player.id, reason, comment: comment.trim() || undefined })}
      />
      <Button label="Cancelar" variant="ghost" onPress={() => setOpen(false)} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  h2: { ...type.h2, color: colors.text },
  muted: { ...type.body, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
  title: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  error: { ...type.caption, fontSize: 13, color: colors.error },
});
