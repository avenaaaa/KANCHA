import { Platform } from 'react-native';

/**
 * Escala tipográfica de Kancha. Fuente de verdad: DESIGN.md §3.
 *
 * Rediseño del 16-nov-2026 (KAN-33): Anton es la voz de la marca. Va en títulos
 * de pantalla y en los números que importan (hora, honor, partidos jugados).
 * El texto que se lee de corrido sigue en Roboto.
 */
export const fonts = {
  display: 'Anton_400Regular',
  bold: 'Roboto_700Bold',
  medium: 'Roboto_500Medium',
  regular: 'Roboto_400Regular',
} as const;

/** Alto natural de Anton: ascendente 2409 + descendente 674 de 2048 unidades (tabla hhea), 1,505 em. */
export const ANTON_HEIGHT = (2409 + 674) / 2048;

/**
 * Tamaño y alto de línea de un texto en Anton (KAN-29). Si la línea es más baja que la fuente, iOS
 * apoya la letra abajo y le corta la parte de arriba; Android y la web la centran. En iOS la línea
 * toma el alto natural y los márgenes negativos descuentan la diferencia: ocupa lo mismo y no se corta.
 */
export function antonLine(
  fontSize: number,
  lineHeight: number,
  os: string = Platform.OS,
): { fontSize: number; lineHeight: number; marginVertical?: number } {
  if (os !== 'ios') return { fontSize, lineHeight };
  const natural = Math.ceil(fontSize * ANTON_HEIGHT);
  return { fontSize, lineHeight: Math.max(natural, lineHeight), marginVertical: Math.min(0, (lineHeight - natural) / 2) };
}

export const type = {
  hero:    { fontFamily: fonts.display, fontSize: 48 },
  display: { fontFamily: fonts.display, ...antonLine(30, 36), letterSpacing: 0.4, textTransform: 'uppercase' },
  numeral: { fontFamily: fonts.display, ...antonLine(44, 50) },
  h1:      { fontFamily: fonts.bold,    fontSize: 28 },
  h2:      { fontFamily: fonts.bold,    fontSize: 22 },
  h3:      { fontFamily: fonts.medium,  fontSize: 18 },
  body:    { fontFamily: fonts.medium,  fontSize: 15 },
  label:   { fontFamily: fonts.bold,    fontSize: 13 },
  caption: { fontFamily: fonts.regular, fontSize: 12 },
  button:  { fontFamily: fonts.bold,    fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase' },
} as const;
