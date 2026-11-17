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

export const type = {
  hero:    { fontFamily: fonts.display, fontSize: 48 },
  display: { fontFamily: fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: 0.4, textTransform: 'uppercase' },
  numeral: { fontFamily: fonts.display, fontSize: 44, lineHeight: 50 },
  h1:      { fontFamily: fonts.bold,    fontSize: 28 },
  h2:      { fontFamily: fonts.bold,    fontSize: 22 },
  h3:      { fontFamily: fonts.medium,  fontSize: 18 },
  body:    { fontFamily: fonts.medium,  fontSize: 15 },
  label:   { fontFamily: fonts.bold,    fontSize: 13 },
  caption: { fontFamily: fonts.regular, fontSize: 12 },
  button:  { fontFamily: fonts.bold,    fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase' },
} as const;
