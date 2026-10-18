import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { type } from '@/theme/typography';
import { Icon } from '@/components/icons/Icon';
import { SPORTS, type SportKey } from '@/theme/sports';

interface SportPickerProps {
  value: SportKey | null;
  onChange: (sport: SportKey) => void;
  error?: string;
}

/**
 * Selección de un deporte con tres tarjetas del mismo tamaño. Ninguna viene
 * marcada: el deporte lo elige el usuario, no la app (DESIGN.md §9).
 */
export function SportPicker({ value, onChange, error }: SportPickerProps) {
  return (
    <View style={{ gap: 6 }}>
      <View style={s.row} accessibilityRole="radiogroup">
        {SPORTS.map((sport) => {
          const active = value === sport.key;
          const fg = active ? colors.onAccent : colors.text;
          return (
            <Pressable
              key={sport.key}
              onPress={() => onChange(sport.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              accessibilityLabel={sport.label}
              style={({ pressed }) => [
                s.tile,
                active && s.active,
                !!error && !value && s.invalid,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Icon name={sport.key} size={28} color={fg} />
              <Text style={[s.label, { color: fg }]}>{sport.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error && !value ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm },
  tile: {
    flex: 1,
    height: 84,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  active: { backgroundColor: colors.accent, borderColor: colors.accent },
  invalid: { borderColor: colors.error },
  label: { ...type.label },
  error: { ...type.caption, color: colors.error },
});
