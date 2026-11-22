import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { useAdminReports } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import type { Report, ReportStatus } from '@/api/types';
import { formatWhen } from '@/lib/format';
import { reasonLabel, STATUS_LABEL } from '@/lib/moderation';
import { RequireAuth } from '@/components/RequireAuth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

const TABS: ReportStatus[] = ['PENDING', 'SANCTIONED', 'DISMISSED'];
const TAB_LABEL: Record<ReportStatus, string> = { PENDING: 'Pendientes', SANCTIONED: 'Suspendidos', DISMISSED: 'Descartados' };

/** HU-11: panel de reportes del administrador. La API exige el rol: a otro usuario le responde 403. */
export default function ModerationScreen() {
  return (
    <RequireAuth>
      <ModerationView />
    </RequireAuth>
  );
}

function ModerationView() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<ReportStatus>('PENDING');
  const { data, isLoading, isError, error, refetch, isRefetching } = useAdminReports(status);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Moderar reportes" />
      <ScrollView
        contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing.xxl }]}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.accent} />}
      >
        <View style={s.tabs}>
          {TABS.map((t) => (
            <Chip
              key={t}
              label={t === 'PENDING' && data ? `${TAB_LABEL[t]} (${data.pending})` : TAB_LABEL[t]}
              active={status === t}
              onPress={() => setStatus(t)}
            />
          ))}
        </View>
        {isLoading ? (
          <Skeleton height={120} />
        ) : isError || !data ? (
          <>
            <Text style={s.h2}>No pudimos abrir el panel</Text>
            <Text style={s.muted}>{errorMessage(error)}</Text>
            <Button label="Reintentar" variant="secondary" onPress={() => void refetch()} />
          </>
        ) : data.reports.length === 0 ? (
          <Text style={s.muted}>
            {status === 'PENDING' ? 'No hay reportes por revisar.' : `No hay reportes ${TAB_LABEL[status].toLowerCase()}.`}
          </Text>
        ) : (
          data.reports.map((r) => <ReportRow key={r.id} report={r} />)
        )}
      </ScrollView>
    </View>
  );
}

function ReportRow({ report: r }: { report: Report }) {
  return (
    <Pressable
      onPress={() => router.push(`/moderacion/${r.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Reporte a ${r.reported.name} por ${reasonLabel(r.reason)}`}
      style={({ pressed }) => [s.row, pressed && { opacity: 0.85 }]}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={s.name}>{r.reported.name}</Text>
        <Text style={s.caption}>
          {reasonLabel(r.reason)} · {r.match.title}
        </Text>
        <Text style={s.caption}>
          Reportó {r.reporter.name} · {formatWhen(r.createdAt)}
        </Text>
      </View>
      {r.status !== 'PENDING' ? <Text style={s.caption}>{STATUS_LABEL[r.status]}</Text> : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.lg, gap: spacing.md, width: '100%', maxWidth: 560, alignSelf: 'center' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  h2: { ...type.h2, color: colors.text },
  muted: { ...type.body, color: colors.textMuted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.tile, padding: spacing.md },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.text },
  caption: { ...type.caption, color: colors.textMuted },
});
