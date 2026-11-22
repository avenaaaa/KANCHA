import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { useMe } from '@/api/hooks';
import { getHealth } from '@/api/client';
import { useAuth } from '@/store/authStore';
import { suspendedUntil, suspensionText } from '@/lib/moderation';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/Button';

/** Perfil propio: la misma carta que ven los demás (HU-02), más el correo y cerrar sesión. */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const cached = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const { data, refetch, isRefetching } = useMe();
  // El honor y los partidos jugados cambian mientras la pestaña sigue montada.
  useFocusEffect(useCallback(() => void refetch(), [refetch]));
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth, staleTime: 60_000 });
  const user = data ?? cached;
  if (!user) return null;
  const until = suspendedUntil(user);

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.body, { paddingTop: insets.top + spacing.lg }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.accent} />}
    >
      <PlayerCard user={user} />

      {until ? (
        <View style={s.suspended} accessibilityRole="alert">
          <Text style={s.suspendedTitle}>Tu cuenta está suspendida</Text>
          <Text style={s.suspendedText}>{suspensionText(until)}</Text>
        </View>
      ) : null}

      {/* HU-11: solo el administrador ve el panel de reportes. */}
      {user.role === 'ADMIN' ? (
        <Button label="Moderar reportes" variant="secondary" icon="shield" onPress={() => router.push('/moderacion')} />
      ) : null}

      <Button label="Cerrar sesión" variant="secondary" icon="logout" onPress={() => void signOut()} />

      <Text style={s.footer}>
        {user.email}
        {'\n'}
        {health.data ? `API conectada, versión ${health.data.version}` : health.isError ? 'API sin conexión' : ''}
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  footer: { ...type.caption, color: colors.disabledText, textAlign: 'center', lineHeight: 18 },
  suspended: { backgroundColor: colors.surface, borderRadius: radius.card, borderWidth: 1, borderColor: colors.error, padding: spacing.lg, gap: spacing.xs },
  suspendedTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.error },
  suspendedText: { ...type.body, color: colors.textMuted },
});
