import { Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { spacing } from '@/theme/spacing';
import { SlotBar } from './SlotBar';
import { Brand } from './Logo';
import { FadeIn } from './ui/FadeIn';

interface AuthHeroProps {
  lines: string[];
  size: number;
  caption?: string;
  /** Recorte en blanco y negro detrás del titular. Es decorativo: los lectores de pantalla lo saltan. */
  photo?: ImageSourcePropType;
}

/**
 * Portada de las pantallas de entrada: la tipografía Anton como elemento
 * gráfico (DESIGN.md §8) y, debajo, una alineación con el último cupo vacío.
 * Es la premisa del proyecto dibujada: nos falta uno.
 */
export function AuthHero({ lines, size, caption, photo }: AuthHeroProps) {
  return (
    <View style={s.wrap}>
      {photo ? (
        <Image source={photo} style={s.photo} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no" />
      ) : null}
      <View style={s.brand}>
        <Brand size={26} />
      </View>
      <View accessible accessibilityLabel={lines.join(' ')}>
        {lines.map((line, i) => (
          <FadeIn key={line} index={i * 2}>
            <Text style={[s.line, { fontSize: size, lineHeight: size * 1.02 }]}>{line}</Text>
          </FadeIn>
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
  photo: { position: 'absolute', right: -spacing.lg, top: 0, width: '72%', height: '82%', opacity: 0.5 },
  brand: { marginBottom: spacing.lg },
  line: { fontFamily: fonts.display, color: colors.text, textTransform: 'uppercase' },
  lineup: { width: '100%', marginTop: spacing.sm },
  caption: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 23, color: colors.textMuted, maxWidth: 420 },
});
