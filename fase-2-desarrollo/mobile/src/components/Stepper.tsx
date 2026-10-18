import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { Icon } from '@/components/icons/Icon';

interface StepperProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

export function Stepper({ label, value, min, max, onChange }: StepperProps) {
  const btn = (delta: number, disabled: boolean) => (
    <Pressable
      onPress={() => onChange(Math.min(max, Math.max(min, value + delta)))}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${delta > 0 ? 'Sumar' : 'Restar'} uno a ${label.toLowerCase()}`}
      hitSlop={6}
      style={({ pressed }) => [s.btn, disabled && { opacity: 0.35 }, pressed && { opacity: 0.85 }]}
    >
      {delta > 0 ? (
        <Icon name="plus" size={18} color={colors.text} strokeWidth={2.2} />
      ) : (
        <View style={s.minus} />
      )}
    </Pressable>
  );

  return (
    <View style={s.row}>
      <Text style={s.label}>{label}</Text>
      <View style={s.control}>
        {btn(-1, value <= min)}
        <Text style={s.value} accessibilityLiveRegion="polite">
          {value}
        </Text>
        {btn(1, value >= max)}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  label: { ...type.body, color: colors.text, flex: 1 },
  control: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  btn: {
    width: 40,
    height: 40,
    borderRadius: radius.button,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  minus: { width: 14, height: 2.2, borderRadius: 1, backgroundColor: colors.text },
  value: { fontFamily: fonts.bold, fontSize: 18, color: colors.text, minWidth: 32, textAlign: 'center' },
});
