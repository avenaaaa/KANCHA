import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { type } from '@/theme/typography';
import { Icon } from '@/components/icons/Icon';
import type { IconName } from '@/components/icons/paths';

type Variant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  icon?: IconName;
  /** Agrega las flechas dobles de la marca al final: avanzar, unirse, publicar. */
  forward?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/**
 * Botón de Kancha. El primario es naranja porque es acción (DESIGN.md §2);
 * presionado baja la opacidad al 85 % y deshabilitado pasa a #555555 (§7).
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  forward = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const inactive = disabled || loading;
  const fg = inactive
    ? colors.disabledText
    : variant === 'primary'
      ? colors.onAccent
      : variant === 'secondary'
        ? colors.text
        : colors.accent;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityHint={accessibilityHint}
      style={({ pressed }) => [
        s.base,
        variant === 'primary' && s.primary,
        variant === 'secondary' && s.secondary,
        variant === 'ghost' && s.ghost,
        inactive && variant !== 'ghost' && s.disabled,
        pressed && !inactive && s.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={s.content}>
          {icon && <Icon name={icon} size={18} color={fg} strokeWidth={2} />}
          <Text style={[s.label, { color: fg }]}>{label}</Text>
          {forward && <Icon name="forward" size={16} color={fg} strokeWidth={2.4} />}
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.button,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colors.accent },
  secondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: 'transparent', minHeight: 44, paddingHorizontal: spacing.sm },
  disabled: { backgroundColor: colors.disabled, borderColor: colors.disabled },
  pressed: { opacity: 0.85 },
  content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  label: { ...type.button },
});
