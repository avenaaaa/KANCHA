import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Platform, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme/colors';
import { radius } from '@/theme/spacing';

interface SkeletonProps {
  height: number;
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
}

/** Estado de carga (DESIGN.md §7): fondo #2A2A2A con un brillo gris oscuro. */
export function Skeleton({ height, width = '100%', style }: SkeletonProps) {
  const pulse = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
          Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[{ height, width, borderRadius: radius.card, backgroundColor: colors.surface, opacity: pulse }, style]}
    />
  );
}
