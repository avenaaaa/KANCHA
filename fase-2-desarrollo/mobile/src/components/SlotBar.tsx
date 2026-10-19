import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Platform, StyleSheet, View } from 'react-native';
import { colors } from '@/theme/colors';

interface SlotBarProps {
  filled: number;
  total: number;
  /** Los cupos libres "respiran": son el lugar que le falta al partido. Solo en el detalle. */
  breathe?: boolean;
  height?: number;
}

/**
 * Barra de jugadores (DESIGN.md §4.2) dibujada como una alineación: un segmento
 * por cupo. Los ocupados se rellenan con naranja; los libres quedan abiertos.
 */
export function SlotBar({ filled, total, breathe = false, height = 8 }: SlotBarProps) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!breathe) return;
    let loop: Animated.CompositeAnimation | null = null;
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return;
      const native = Platform.OS !== 'web';
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: native }),
          Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: native }),
        ]),
      );
      loop.start();
    });
    return () => loop?.stop();
  }, [breathe, glow]);

  const gap = total > 16 ? 2 : 4;

  return (
    <View
      style={[s.row, { gap, height }]}
      accessibilityRole="progressbar"
      accessibilityLabel={`${filled} de ${total} jugadores`}
      accessibilityValue={{ min: 0, max: total, now: filled }}
    >
      {Array.from({ length: total }, (_, i) => {
        const isFilled = i < filled;
        return (
          <View key={i} style={[s.slot, { borderRadius: height / 2 }, isFilled ? s.filled : s.empty]}>
            {!isFilled && breathe && (
              <Animated.View style={[StyleSheet.absoluteFill, s.glow, { opacity: glow, borderRadius: height / 2 }]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', width: '100%' },
  slot: { flex: 1, overflow: 'hidden' },
  filled: { backgroundColor: colors.accent },
  empty: { borderWidth: 1, borderColor: colors.border, backgroundColor: 'transparent' },
  glow: { backgroundColor: colors.accentGlow, borderWidth: 1, borderColor: colors.accent },
});
