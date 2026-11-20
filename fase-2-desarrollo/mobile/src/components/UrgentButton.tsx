import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { Icon } from '@/components/icons/Icon';

interface UrgentButtonProps {
  active: boolean;
  onPress: () => void;
  /** Solo para el texto de ayuda: la regla real es URGENT_WINDOW_HOURS de la API. */
  hours: number;
  style?: StyleProp<ViewStyle>;
}

const native = Platform.OS !== 'web';

/**
 * "Falta uno" (KAN-37): el botón más visible del mapa. Amarillo y grande, late y suelta una onda
 * sin parar mientras está apagado, para que se vea apenas se abre la app. Encendido deja de latir
 * y muestra un visto. Con "reducir movimiento" activado no se anima.
 */
export function UrgentButton({ active, onPress, hours, style }: UrgentButtonProps) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      t.stopAnimation();
      t.setValue(0);
      return;
    }
    let loop: Animated.CompositeAnimation | null = null;
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled || reduce) return;
      loop = Animated.loop(
        Animated.timing(t, { toValue: 1, duration: 1500, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
      );
      loop.start();
    });
    return () => {
      cancelled = true;
      loop?.stop();
    };
  }, [active, t]);

  const ring = {
    opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
    transform: [
      { scaleX: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) },
      { scaleY: t.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) },
    ],
  };
  const beat = { transform: [{ scale: t.interpolate({ inputRange: [0, 0.25, 0.5, 1], outputRange: [1, 1.04, 1, 1] }) }] };

  return (
    <View style={style}>
      {!active && <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, s.ring, ring]} />}
      <Animated.View style={beat}>
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          aria-selected={active}
          accessibilityLabel="Falta uno"
          accessibilityHint={`Muestra solo los partidos a los que les falta un jugador y empiezan en ${hours} horas o menos`}
          style={({ pressed }) => [s.btn, active && s.btnOn, pressed && s.pressed]}
        >
          <Text style={s.label}>Falta uno</Text>
          <Icon name={active ? 'check' : 'forward'} size={22} color={colors.onAccent} strokeWidth={2.6} />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  ring: { borderRadius: 30, backgroundColor: colors.accent },
  btn: {
    height: 60,
    borderRadius: 30,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.accent,
  },
  // Encendido: el mismo amarillo con un borde claro, para que se lea como "marcado".
  btnOn: { borderWidth: 3, borderColor: colors.text },
  pressed: { opacity: 0.9, transform: [{ scale: 0.97 }] },
  label: { fontFamily: fonts.display, fontSize: 24, lineHeight: 30, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.onAccent },
});
