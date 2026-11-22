import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { useAdminReport, useResolveReport } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import type { Report, ReportDetail } from '@/api/types';
import { formatDeadline, formatWhen, plural } from '@/lib/format';
import { confirmAction } from '@/lib/confirm';
import { reasonLabel, STATUS_LABEL, suspendedUntil } from '@/lib/moderation';
import { RequireAuth } from '@/components/RequireAuth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Avatar } from '@/components/Avatar';
import { HonorBadge } from '@/components/HonorBadge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { TextField } from '@/components/ui/TextField';

/** HU-11: detalle de un reporte con el historial del jugador; el administrador suspende 7 días o descarta. */
export default function ReportScreen() {
  return (
    <RequireAuth>
      <ReportView />
    </RequireAuth>
  );
}

function ReportView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch } = useAdminReport(id);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Reporte" />
      <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {isLoading ? (
          <Skeleton height={240} />
        ) : isError || !data ? (
          <>
            <Text style={s.h2}>No pudimos abrir este reporte</Text>
            <Text style={s.muted}>{errorMessage(error)}</Text>
            <Button label="Reintentar" variant="secondary" onPress={() => void refetch()} />
          </>
        ) : (
          <Detail report={data} />
        )}
      </ScrollView>
    </View>
  );
}

function Detail({ report: r }: { report: ReportDetail }) {
  const until = suspendedUntil(r.reported);
  return (
    <>
      <View style={s.card}>
        <View style={s.head}>
          <Avatar name={r.reported.name} />
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{r.reported.name}</Text>
            <Text style={s.caption}>{plural(r.reported.matchesPlayed, 'partido jugado', 'partidos jugados')}</Text>
          </View>
          <HonorBadge score={r.reported.honorScore} />
        </View>
        {until ? <Text style={s.warning}>Suspendido hasta {formatDeadline(until)}</Text> : null}
      </View>

      <View style={s.card}>
        <Text style={s.label}>Motivo</Text>
        <Text style={s.value}>{reasonLabel(r.reason)}</Text>
        {r.comment ? <Text style={s.quote}>“{r.comment}”</Text> : null}
        <Text style={s.caption}>
          {r.match.title} · reportó {r.reporter.name} · {formatWhen(r.createdAt)}
        </Text>
      </View>

      {r.status === 'PENDING' ? <Resolve report={r} /> : <Resolution report={r} />}

      <Text style={s.section}>Historial de {r.reported.name}</Text>
      {r.history.length === 0 ? (
        <Text style={s.muted}>Es su primer reporte.</Text>
      ) : (
        r.history.map((h) => (
          <View key={h.id} style={s.historyRow}>
            <Text style={s.value}>
              {reasonLabel(h.reason)} · {STATUS_LABEL[h.status]}
            </Text>
            <Text style={s.caption}>
              {h.match.title} · {formatWhen(h.createdAt)}
            </Text>
          </View>
        ))
      )}
    </>
  );
}

function Resolution({ report: r }: { report: Report }) {
  return (
    <View style={s.card}>
      <Text style={s.label}>{STATUS_LABEL[r.status]}</Text>
      {r.resolution ? (
        <Text style={s.caption}>
          {r.resolution.by?.name ?? 'Un administrador'} · {formatWhen(r.resolution.at)}
          {r.resolution.note ? `\n${r.resolution.note}` : ''}
        </Text>
      ) : null}
    </View>
  );
}

function Resolve({ report: r }: { report: Report }) {
  const [note, setNote] = useState('');
  const resolve = useResolveReport(r.id);

  async function decide(action: 'SANCTION' | 'DISMISS') {
    if (action === 'SANCTION') {
      const ok = await confirmAction(
        `Suspender a ${r.reported.name}`,
        'Durante 7 días no podrá publicar, postular ni destacar partidos, y recibirá un aviso con el motivo.',
        'Suspender',
      );
      if (!ok) return;
    }
    // Resuelto, la pantalla muestra la resolución en su lugar: el panel se refresca solo.
    resolve.mutate({ action, note: note.trim() || undefined });
  }

  return (
    <View style={s.card}>
      <TextField label="Nota para el registro (opcional)" value={note} onChangeText={setNote} maxLength={280} multiline />
      {resolve.isError && <Text style={s.error}>{errorMessage(resolve.error)}</Text>}
      <Button label="Suspender 7 días" icon="shield" loading={resolve.isPending} onPress={() => void decide('SANCTION')} />
      <Button label="Descartar" variant="secondary" disabled={resolve.isPending} onPress={() => void decide('DISMISS')} />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md, width: '100%', maxWidth: 560, alignSelf: 'center' },
  h2: { ...type.h2, color: colors.text },
  muted: { ...type.body, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: spacing.sm },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  label: { ...type.caption, color: colors.textMuted },
  value: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  quote: { ...type.body, color: colors.text, fontStyle: 'italic' },
  caption: { ...type.caption, color: colors.textMuted },
  warning: { ...type.caption, fontSize: 13, color: colors.warning },
  error: { ...type.caption, fontSize: 13, color: colors.error },
  section: { ...type.h2, color: colors.text, marginTop: spacing.sm },
  historyRow: { borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: spacing.sm, gap: 2 },
});
