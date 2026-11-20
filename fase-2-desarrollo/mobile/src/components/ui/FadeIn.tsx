import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

const native = Platform.OS !== 'web';
const easeOut = Easing.out(Easing.cubic);

/** Corre la animación, o salta al final si el usuario pidió "reducir movimiento". */
function play(t: Animated.Value, config: { duration: number; delay?: number }) {
  let cancelled = false;
  void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
    if (cancelled) return;
    if (reduce) return t.setValue(1);
    Animated.timing(t, { toValue: 1, easing: easeOut, useNativeDriver: native, ...config }).start();
  });
  return () => {
    cancelled = true;
  };
}

/** Entrada suave: aparece subiendo 14 px. `index` escalona una lista. */
export function FadeIn({ children, index = 0, style }: { children: React.ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => play(t, { duration: 420, delay: Math.min(index, 6) * 70 }), [t, index]);
  return (
    <Animated.View style={[style, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}

/**
 * Transición de pantalla en la web: la pantalla nueva entra desde la derecha.
 * En el teléfono la hace la navegación nativa (animation del Stack), así que aquí no se anima.
 */
export function ScreenEnter({ children }: { children: React.ReactNode }) {
  const t = useRef(new Animated.Value(native ? 1 : 0)).current;
  useEffect(() => (native ? undefined : play(t, { duration: 320 })), [t]);
  if (native) return <>{children}</>;
  return (
    <Animated.View style={{ flex: 1, opacity: t, transform: [{ translateX: t.interpolate({ inputRange: [0, 1], outputRange: [36, 0] }) }] }}>
      {children}
    </Animated.View>
  );
}
