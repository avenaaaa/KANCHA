import { ScrollView, StyleSheet, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { type } from '@/theme/typography';
import { useMe } from '@/api/hooks';
import { getHealth } from '@/api/client';
import { useAuth } from '@/store/authStore';
import { PlayerCard } from '@/components/PlayerCard';
import { Button } from '@/components/ui/Button';

/** Perfil propio: la misma carta que ven los demás (HU-02), más el correo y cerrar sesión. */
export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const cached = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const { data } = useMe();
  const health = useQuery({ queryKey: ['health'], queryFn: getHealth, staleTime: 60_000 });
  const user = data ?? cached;
  if (!user) return null;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.body, { paddingTop: insets.top + spacing.lg }]}>
      <PlayerCard user={user} />

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
});
