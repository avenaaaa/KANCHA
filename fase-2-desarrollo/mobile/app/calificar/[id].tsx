import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { formatDay, formatTime } from '@/lib/format';
import { usePendingRatings, useRateTeammate } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import type { PendingRatings } from '@/api/types';
import { RequireAuth } from '@/components/RequireAuth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { Avatar } from '@/components/Avatar';
import { HonorBadge } from '@/components/HonorBadge';
import { RatingPicker } from '@/components/RatingPicker';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

/** Calificar a los compañeros tras el partido (HU-06). El honor se recalcula en la API (HU-07). */
export default function RateScreen() {
  return (
    <RequireAuth>
      <RateView />
    </RequireAuth>
  );
}

function RateView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch } = usePendingRatings(id);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>
      <ScreenHeader title="Calificar compañeros" />
      <ScrollView contentContainerStyle={[s.body, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {isLoading ? (
          <>
            <Skeleton height={20} width="60%" />
            <Skeleton height={180} />
          </>
        ) : isError || !data ? (
          <>
            <Text style={s.h2}>No pudimos cargar a tus compañeros</Text>
            <Text style={s.muted}>{errorMessage(error)}</Text>
            <Button label="Reintentar" variant="secondary" onPress={() => void refetch()} />
          </>
        ) : (
          <Pending matchId={id} data={data} />
        )}
      </ScrollView>
    </View>
  );
}

function Pending({ matchId, data }: { matchId: string; data: PendingRatings }) {
  if (data.window === 'NOT_FINISHED') {
    return <Text style={s.muted}>Podrás calificar a tus compañeros cuando termine el partido.</Text>;
  }
  if (data.window === 'CLOSED') {
    return <Text style={s.muted}>Pasaron las 48 horas para calificar este partido.</Text>;
  }
  if (data.pending.length === 0) {
    return (
      <>
        <Text style={s.h2}>Ya calificaste a todos</Text>
        <Text style={s.muted}>Gracias: tus reseñas ya cuentan en el honor de cada jugador.</Text>
        <Button label="Volver al partido" variant="secondary" onPress={() => router.back()} />
      </>
    );
  }
  const closes = new Date(data.closesAt);
  return (
    <>
      <Text style={s.muted}>
        Califica de 1 a 5 cómo llegó y cómo jugó cada uno. Tienes hasta el {formatDay(closes).toLowerCase()} a las{' '}
        {formatTime(closes)}.
      </Text>
      {data.pending.map((p) => (
        <TeammateCard key={p.userId} matchId={matchId} teammate={p} />
      ))}
    </>
  );
}

function TeammateCard({ matchId, teammate }: { matchId: string; teammate: PendingRatings['pending'][number] }) {
  const [punctuality, setPunctuality] = useState<number | null>(null);
  const [conduct, setConduct] = useState<number | null>(null);
  const rate = useRateTeammate(matchId);

  return (
    <View style={s.card}>
      <View style={s.head}>
        <Avatar name={teammate.name} />
        <Text style={s.name}>{teammate.name}</Text>
        <HonorBadge score={teammate.honorScore} />
      </View>
      <RatingPicker label="Puntualidad" value={punctuality} onChange={setPunctuality} />
      <RatingPicker label="Conducta" value={conduct} onChange={setConduct} />
      {rate.isError && <Text style={s.error}>{errorMessage(rate.error)}</Text>}
      <Button
        label="Enviar calificación"
        disabled={punctuality === null || conduct === null}
        loading={rate.isPending}
        onPress={() =>
          punctuality !== null && conduct !== null && rate.mutate({ ratedId: teammate.userId, punctuality, conduct })
        }
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  h2: { ...type.h2, color: colors.text },
  muted: { ...type.body, color: colors.textMuted },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md - 4 },
  name: { fontFamily: fonts.bold, fontSize: 16, color: colors.text, flex: 1 },
  error: { ...type.caption, fontSize: 13, color: colors.error },
});
