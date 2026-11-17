import { StyleSheet, Text, View } from 'react-native';
import type { ColorValue } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';

/** Isotipo de Kancha: el jugador que entra a completar el partido. Trazado desde la presentación de Fase 1. */
export function Logo({ size = 28, color = colors.accent }: { size?: number; color?: ColorValue }) {
  return (
    <Svg width={size * 1.21} height={size} viewBox="755 185 315 260" accessibilityElementsHidden importantForAccessibility="no">
      <Polygon points="787,197 895,197 1060,350 1060,440 927,440 987,384" fill={color} />
      <Polygon points="871,340 927,387 871,440 760,440" fill={color} />
      <Circle cx={1026} cy={229} r={40} fill={color} />
    </Svg>
  );
}

/** Isotipo + nombre: encabezado del mapa y de las pantallas de entrada. */
export function Brand({ size = 24 }: { size?: number }) {
  return (
    <View style={s.row} accessible accessibilityRole="header" accessibilityLabel="Kancha">
      <Logo size={size} />
      <Text style={[s.word, { fontSize: size, lineHeight: size * 1.25 }]}>KANCHA</Text>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  word: { fontFamily: fonts.display, letterSpacing: 2, color: colors.text },
});
