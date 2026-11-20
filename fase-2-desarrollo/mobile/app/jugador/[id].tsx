import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { type } from '@/theme/typography';
import { usePlayer } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import { RequireAuth } from '@/components/RequireAuth';
import { ScreenHeader } from '@/components/ScreenHeader';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

/** Carta pública de otro jugador (HU-02): solo su información pública, nunca el correo. */
export default function PlayerScreen() {
  return (
    <RequireAuth>
      <PlayerView />
    </RequireAuth>
  );
}

function PlayerView() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
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
          <PlayerCard user={data} />
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  h2: { ...type.h2, color: colors.text },
  muted: { ...type.body, color: colors.textMuted },
});
