import { StyleSheet, View } from 'react-native';
import { colors } from '@/theme/colors';
import { Icon } from '@/components/icons/Icon';
import type { SportKey } from '@/theme/sports';

interface SportBadgeProps {
  sport: SportKey;
  size?: number;
}

/** Ícono del deporte en una baldosa naranja. Mismo tamaño y trazo para los tres. */
export function SportBadge({ sport, size = 40 }: SportBadgeProps) {
  return (
    <View style={[s.circle, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <Icon name={sport} size={Math.round(size * 0.58)} color={colors.onAccent} strokeWidth={2} />
    </View>
  );
}

const s = StyleSheet.create({
  circle: {
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
