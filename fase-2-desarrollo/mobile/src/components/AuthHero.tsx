import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { SlotBar } from './SlotBar';

interface AuthHeroProps {
  lines: string[];
  size: number;
  caption?: string;
}

/**
 * Portada de las pantallas de entrada: la tipografía Anton como elemento
 * gráfico (DESIGN.md §8) y, debajo, una alineación con el último cupo vacío.
 * Es la premisa del proyecto dibujada: nos falta uno.
 */
export function AuthHero({ lines, size, caption }: AuthHeroProps) {
  return (
    <View style={s.wrap}>
      <Text style={s.brand} accessibilityRole="header">
        KANCHA
      </Text>
      <View accessible accessibilityLabel={lines.join(' ')}>
        {lines.map((line) => (
          <Text key={line} style={[s.line, { fontSize: size, lineHeight: size * 1.02 }]}>
            {line}
          </Text>
        ))}
      </View>
      <View style={[s.lineup, { maxWidth: size * 3.4 }]}>
        <SlotBar filled={4} total={5} breathe height={10} />
      </View>
      {caption ? <Text style={s.caption}>{caption}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: spacing.md },
  brand: { fontFamily: fonts.display, fontSize: 24, letterSpacing: 2, color: colors.bronze, marginBottom: spacing.lg },
  line: { fontFamily: fonts.display, color: colors.text, textTransform: 'uppercase' },
  lineup: { width: '100%', marginTop: spacing.sm },
  caption: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 23, color: colors.textMuted, maxWidth: 420 },
});
