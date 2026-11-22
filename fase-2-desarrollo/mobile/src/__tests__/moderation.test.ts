import { describe, expect, it } from '@jest/globals';
import { reasonLabel, REPORT_REASONS, suspendedUntil, suspensionText } from '@/lib/moderation';

describe('Moderación en la app (HU-11)', () => {
  it('M-42 · los cuatro motivos de reporte con su texto, en orden', () => {
    expect(REPORT_REASONS.map((r) => r.value)).toEqual(['AGRESION', 'LENGUAJE', 'JUEGO_SUCIO', 'OTRO']);
    expect(reasonLabel('JUEGO_SUCIO')).toBe('Juego sucio');
  });

  it('M-43 · la suspensión se muestra solo mientras dura, con su fecha de término', () => {
    const ahora = new Date(2026, 10, 22, 15, 0);
    const hasta = new Date(2026, 10, 29, 19, 30);
    expect(suspendedUntil({ suspendedUntil: hasta.toISOString() }, ahora)).toEqual(hasta);
    expect(suspendedUntil({ suspendedUntil: null }, ahora)).toBeNull();
    expect(suspendedUntil({ suspendedUntil: new Date(2026, 10, 21).toISOString() }, ahora)).toBeNull();
    expect(suspensionText(hasta, ahora)).toBe('Hasta el dom 29 nov a las 19:30 no puedes publicar, postular ni destacar partidos.');
  });
});
