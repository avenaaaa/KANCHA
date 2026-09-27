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
} as const;

/** Semáforo del Sistema de Honor (DESIGN.md §4.5). */
export function honorColor(percent: number | null): string {
  if (percent === null) return colors.textMuted; // "Sin calificaciones aún"
  if (percent >= 80) return colors.success;
  if (percent >= 50) return colors.warning;
  return colors.error;
}
