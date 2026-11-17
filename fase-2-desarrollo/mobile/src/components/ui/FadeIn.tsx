import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Platform, type StyleProp, type ViewStyle } from 'react-native';

/** Entrada suave: aparece subiendo 12 px. `index` escalona una lista. Respeta "reducir movimiento". */
export function FadeIn({ children, index = 0, style }: { children: React.ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const t = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) return t.setValue(1);
      Animated.timing(t, { toValue: 1, duration: 380, delay: Math.min(index, 6) * 70, useNativeDriver: Platform.OS !== 'web' }).start();
    });
    return () => {
      cancelled = true;
    };
  }, [t, index]);

  return (
    <Animated.View style={[style, { opacity: t, transform: [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      {children}
    </Animated.View>
  );
}
