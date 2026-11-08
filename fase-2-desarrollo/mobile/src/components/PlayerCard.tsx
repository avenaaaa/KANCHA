import { StyleSheet, Text, View } from 'react-native';
import { colors, honorColor } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { sportLabel } from '@/theme/sports';
import type { User } from '@/api/types';
import { Avatar } from '@/components/Avatar';
import { HonorBadge } from '@/components/HonorBadge';
import { Icon } from '@/components/icons/Icon';

/**
 * Carta de jugador (HU-02): honor, partidos jugados y las tres métricas del
 * Sistema de Honor. Solo datos públicos: el correo nunca se muestra aquí.
 */
export function PlayerCard({ user }: { user: User }) {
  return (
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
});
