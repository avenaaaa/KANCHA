import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme/colors';
import { Icon } from '@/components/icons/Icon';
import type { SportKey } from '@/theme/sports';

interface SportBadgeProps {
  sport: SportKey;
  size?: number;
}

/** Ícono del deporte en su círculo. Mismo tamaño y trazo para los tres (DESIGN.md §5). */
export function SportBadge({ sport, size = 40 }: SportBadgeProps) {
  return (
    <View style={[s.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Icon name={sport} size={Math.round(size * 0.55)} color={colors.text} />
    </View>
  );
}

const s = StyleSheet.create({
  circle: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
