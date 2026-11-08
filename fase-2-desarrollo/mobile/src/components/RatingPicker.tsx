import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { Chip } from '@/components/ui/Chip';

const NOTAS = [1, 2, 3, 4, 5] as const;

/** Nota de 1 a 5 para una dimensión de la reseña (HU-06). */
export function RatingPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (nota: number) => void;
}) {
  return (
    <View style={s.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={s.label}>{label}</Text>
      <View style={s.chips}>
        {NOTAS.map((n) => (
          <Chip key={n} label={String(n)} active={value === n} onPress={() => onChange(n)} />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { gap: spacing.xs + 2 },
  label: { fontFamily: fonts.medium, fontSize: 14, color: colors.text },
  chips: { flexDirection: 'row', gap: spacing.sm },
});
