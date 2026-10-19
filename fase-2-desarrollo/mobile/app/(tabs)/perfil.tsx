import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, honorColor } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { sportLabel } from '@/theme/sports';
import { useMe } from '@/api/hooks';
import { getHealth } from '@/api/client';
import { useAuth } from '@/store/authStore';
import { Avatar } from '@/components/Avatar';
import { HonorBadge } from '@/components/HonorBadge';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/icons/Icon';

/**
 * Perfil propio como carta de jugador. La carta completa y pública es HU-02
 * (Sprint 8); aquí ya se cumple lo de HU-01: honor "Sin calificaciones aún".
 */
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
      <View style={s.card}>
        <View style={s.head}>
          <Avatar name={user.name} size={72} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={s.name}>{user.name}</Text>
            <View style={s.sportRow}>
              <Icon name={user.favoriteSport} size={18} color={colors.textMuted} />
              <Text style={s.muted}>Juega más {sportLabel(user.favoriteSport).toLowerCase()}</Text>
            </View>
          </View>
        </View>

        <View style={s.statsRow}>
          <View style={s.stat}>
            <Text style={s.statValue}>{user.matchesPlayed}</Text>
            <Text style={s.caption}>{user.matchesPlayed === 1 ? 'partido jugado' : 'partidos jugados'}</Text>
          </View>
          <View style={[s.stat, s.statHonor]}>
            <HonorBadge score={user.honorScore} size={user.honorScore === null ? 'sm' : 'lg'} />
            <Text style={s.caption}>puntaje de honor</Text>
          </View>
        </View>

        <View style={{ gap: spacing.md }}>
          <Metric label="Asistencia" value={user.attendanceRate} />
          <Metric label="Puntualidad" value={user.punctualityRate} />
          <Metric label="Juego limpio" value={user.fairPlayRate} />
        </View>
      </View>

      <Button label="Cerrar sesión" variant="secondary" icon="logout" onPress={() => void signOut()} />

      <Text style={s.footer}>
        {user.email}
        {'\n'}
        {health.data ? `API conectada, versión ${health.data.version}` : health.isError ? 'API sin conexión' : ''}
      </Text>
    </ScrollView>
  );
}

/** Barra semáforo del Sistema de Honor (DESIGN.md §4.5). Sin datos, no hay barra vacía: hay texto. */
function Metric({ label, value }: { label: string; value: number | null }) {
  const color = honorColor(value);
  return (
    <View style={{ gap: 6 }}>
      <View style={s.metricHead}>
        <Text style={s.metricLabel}>{label}</Text>
        <Text style={[s.metricValue, { color }]}>{value === null ? 'Sin calificaciones aún' : `${Math.round(value)} %`}</Text>
      </View>
      <View style={s.track}>
        {value !== null && <View style={[s.fill, { width: `${Math.max(2, value)}%`, backgroundColor: color }]} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg, width: '100%', maxWidth: 560, alignSelf: 'center' },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  name: { ...type.h1, fontSize: 24, color: colors.text },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muted: { ...type.body, color: colors.textMuted },
  caption: { ...type.caption, color: colors.textMuted },
  statsRow: { flexDirection: 'row', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.hairline },
  stat: { flex: 1, paddingVertical: spacing.md, gap: 4 },
  statHonor: { borderLeftWidth: 1, borderLeftColor: colors.hairline, paddingLeft: spacing.md },
  statValue: { fontFamily: fonts.bold, fontSize: 22, color: colors.text },
  metricHead: { flexDirection: 'row', justifyContent: 'space-between' },
  metricLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  metricValue: { fontFamily: fonts.bold, fontSize: 13 },
  track: { height: 6, borderRadius: 3, backgroundColor: colors.background, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  footer: { ...type.caption, color: colors.disabledText, textAlign: 'center', lineHeight: 18 },
});
