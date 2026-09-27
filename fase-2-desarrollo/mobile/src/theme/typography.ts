/**
 * Escala tipográfica de Kancha. Fuente de verdad: DESIGN.md §3.
 *
 * Anton solo en momentos de alto impacto (splash, transiciones, hero).
 * Nunca en cards, botones, formularios, listas ni navegación.
 */
export const fonts = {
  display: 'Anton_400Regular',
  bold: 'Roboto_700Bold',
  medium: 'Roboto_500Medium',
  regular: 'Roboto_400Regular',
} as const;

export const type = {
  hero:    { fontFamily: fonts.display, fontSize: 48 },
  h1:      { fontFamily: fonts.bold,    fontSize: 28 },
  h2:      { fontFamily: fonts.bold,    fontSize: 22 },
  h3:      { fontFamily: fonts.medium,  fontSize: 18 },
  body:    { fontFamily: fonts.medium,  fontSize: 15 },
  label:   { fontFamily: fonts.bold,    fontSize: 13 },
  caption: { fontFamily: fonts.regular, fontSize: 12 },
  button:  { fontFamily: fonts.bold,    fontSize: 15 },
} as const;
