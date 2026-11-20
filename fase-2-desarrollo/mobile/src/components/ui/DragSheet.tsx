import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { fonts } from '@/theme/typography';
import { Icon } from '@/components/icons/Icon';

/**
 * ¿Abierto o cerrado al soltar? Un gesto rápido manda (hacia arriba abre, hacia abajo cierra);
 * si fue lento, gana la posición más cercana. `y` es cuánto bajó el panel: 0 abierto, `range` cerrado.
 */
export function sheetSnap(y: number, velocityY: number, range: number): boolean {
  if (velocityY < -0.5) return true;
  if (velocityY > 0.5) return false;
  return y < range / 2;
}

interface DragSheetProps {
  expanded: boolean;
  onChange: (expanded: boolean) => void;
  /** Texto del asa (por ejemplo, cuántos partidos hay). */
  title: string;
  /** Siempre visible bajo el asa, aunque el panel esté cerrado. */
  peek: React.ReactNode;
  /** Lo que se esconde al cerrar. */
  children: React.ReactNode;
}

/**
 * Panel inferior que se arrastra hacia arriba o hacia abajo desde el asa o la fila de botones,
 * o se abre y cierra tocando el asa. Cerrado, deja ver solo el asa y `peek`.
 * Hecho con PanResponder y Animated de React Native: funciona igual en el teléfono y en la web.
 */
export function DragSheet({ expanded, onChange, title, peek, children }: DragSheetProps) {
  const [range, setRange] = useState<number | null>(null);
  // Parte bajo la pantalla: al medir el contenido sube hasta su lugar (entrada del panel).
  const y = useRef(new Animated.Value(1200)).current;
  const live = useRef({ y: 1200, start: 0, range: 0, expanded, onChange });
  live.current = { ...live.current, range: range ?? 0, expanded, onChange };

  useEffect(() => {
    const id = y.addListener(({ value }) => (live.current.y = value));
    return () => y.removeListener(id);
  }, [y]);

  const settle = (open: boolean) =>
    Animated.spring(y, { toValue: open ? 0 : live.current.range, useNativeDriver: false, bounciness: 4, speed: 14 }).start();

  useEffect(() => {
    if (range !== null) settle(expanded);
    // settle solo lee refs y el valor animado.
  }, [expanded, range]);

  const pan = useRef(
    PanResponder.create({
      // Solo un arrastre vertical toma el control: un toque sigue llegando a los botones.
      onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        y.stopAnimation();
        live.current.start = live.current.y;
      },
      onPanResponderMove: (_, g) => {
        y.setValue(Math.min(live.current.range, Math.max(0, live.current.start + g.dy)));
      },
      onPanResponderRelease: (_, g) => release(g.vy),
      onPanResponderTerminate: (_, g) => release(g.vy),
    }),
  ).current;

  function release(vy: number) {
    const { y: pos, range: r, expanded: was, onChange: notify } = live.current;
    const open = sheetSnap(pos, vy, r);
    if (open === was) settle(open);
    else notify(open);
  }

  const chevron = y.interpolate({ inputRange: [0, Math.max(1, range ?? 1)], outputRange: ['180deg', '0deg'], extrapolate: 'clamp' });

  return (
    <Animated.View style={[s.sheet, { transform: [{ translateY: y }] }]}>
      <View {...pan.panHandlers}>
        <Pressable
          onPress={() => onChange(!expanded)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          aria-expanded={expanded}
          accessibilityLabel={`${title}. ${expanded ? 'Ocultar' : 'Mostrar'} partidos`}
          accessibilityHint="También puedes deslizar el panel hacia arriba o hacia abajo"
          style={s.handle}
        >
          <View style={s.grabber} />
          <View style={s.handleRow}>
            <Text style={s.title} numberOfLines={1}>
              {title}
            </Text>
            <Animated.View style={{ transform: [{ rotate: chevron }] }}>
              <Icon name="up" size={20} color={colors.textMuted} strokeWidth={2.2} />
            </Animated.View>
          </View>
        </Pressable>
        <View style={s.peek}>{peek}</View>
      </View>
      {/* El margen inferior va dentro de lo que se esconde: cerrado no asoma ni un borde de las cartas. */}
      <View style={s.content} onLayout={(e) => setRange(e.nativeEvent.layout.height)}>
        {children}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  handle: { paddingTop: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm, gap: spacing.sm },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border },
  handleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 28 },
  title: { flex: 1, fontFamily: fonts.bold, fontSize: 14, color: colors.text },
  peek: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  content: { paddingBottom: spacing.md },
});
