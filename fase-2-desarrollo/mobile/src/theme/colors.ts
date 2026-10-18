/**
 * Tokens de color de Kancha. Fuente de verdad: DESIGN.md §2.
 * Nunca escribas un color literal en un componente: impórtalo desde aquí.
 */
export const colors = {
  // Primarios
  accent: '#F0A500',      // naranja acción — SOLO para lo que el usuario debe tocar
  bronze: '#C47A3A',      // bronce del logo — hero y portadas
  background: '#1A1A1A',  // fondo primario de toda la app

  // Secundarios
  surface: '#2A2A2A',     // cards, paneles, modales, bottom sheets
  border: '#3A3A3A',      // divisores y bordes sutiles
  text: '#FFFFFF',        // texto principal
  textMuted: '#B0B0B0',   // texto secundario, metadata, labels

  // Estado
  success: '#2ECC71',
  error: '#E74C3C',
  warning: '#F39C12',
  disabled: '#555555',
  disabledText: '#888888',

  // Derivados: el mismo color base con transparencia, nunca un tono nuevo.
  onAccent: '#1A1A1A',                    // texto sobre naranja (DESIGN.md §4.3)
  surfaceFloating: 'rgba(42,42,42,0.94)', // chips y paneles flotando sobre el mapa
  scrim: 'rgba(0,0,0,0.6)',               // overlay oscuro (DESIGN.md §6)
  accentGlow: 'rgba(240,165,0,0.18)',     // el cupo libre que "respira" en la barra de jugadores
  hairline: 'rgba(255,255,255,0.08)',
  radiusFill: 'rgba(255,255,255,0.035)',  // relleno del radio de búsqueda en el mapa
} as const;

/** Semáforo del Sistema de Honor (DESIGN.md §4.5). */
export function honorColor(percent: number | null): string {
  if (percent === null) return colors.textMuted; // "Sin calificaciones aún"
  if (percent >= 80) return colors.success;
  if (percent >= 50) return colors.warning;
  return colors.error;
}
