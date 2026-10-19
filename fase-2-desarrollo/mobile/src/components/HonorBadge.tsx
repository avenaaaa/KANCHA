import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts, type } from '@/theme/typography';
import { Icon } from '@/components/icons/Icon';

interface HonorBadgeProps {
  score: number | null;
  size?: 'sm' | 'lg';
}

/**
 * Puntaje de honor (DESIGN.md §4.5): escudo con el número en naranja.
 * Sin reseñas no hay número: un jugador nuevo no es un mal jugador (HU-01).
 */
export function HonorBadge({ score, size = 'sm' }: HonorBadgeProps) {
  const big = size === 'lg';
  if (score === null) {
    return (
      <View style={s.row} accessibilityLabel="Sin calificaciones aún">
        <Icon name="shield" size={big ? 22 : 16} color={colors.textMuted} />
        <Text style={[big ? type.body : type.caption, { color: colors.textMuted }]}>Sin calificaciones aún</Text>
      </View>
    );
  }
  return (
    <View style={s.row} accessibilityLabel={`Honor ${score.toFixed(1)} de 10`}>
      <Icon name="shield" size={big ? 22 : 16} color={colors.accent} strokeWidth={2} />
      <Text style={[s.score, { fontSize: big ? 22 : 14 }]}>{score.toFixed(1)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  score: { fontFamily: fonts.bold, color: colors.accent },
});
