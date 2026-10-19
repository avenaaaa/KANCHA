import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { type } from '@/theme/typography';
import { Icon } from '@/components/icons/Icon';
import type { IconName } from '@/components/icons/paths';

interface ChipProps {
  label: string;
  active: boolean;
  onPress: () => void;
  icon?: IconName;
  /** Sobre el mapa el fondo inactivo es levemente translúcido para no tapar las calles. */
  floating?: boolean;
  disabled?: boolean;
}

/** Chip de filtro (DESIGN.md §4.4): activo naranja, inactivo gris con borde. */
export function Chip({ label, active, onPress, icon, floating = false, disabled = false }: ChipProps) {
  const fg = disabled ? colors.disabledText : active ? colors.onAccent : colors.textMuted;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      style={({ pressed }) => [
        s.chip,
        { backgroundColor: floating ? colors.surfaceFloating : colors.surface },
        active && s.active,
        disabled && s.disabled,
        pressed && { opacity: 0.85 },
      ]}
    >
      {icon && <Icon name={icon} size={16} color={fg} />}
      <Text style={[s.label, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  chip: {
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md - 2,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.border,
  },
  active: { backgroundColor: colors.accent, borderColor: colors.accent },
  disabled: { borderColor: colors.surface },
  label: { ...type.label },
});
