import { describe, expect, it } from '@jest/globals';
import { formatCLP, formatDay, formatDistance, slotsCta, whenRange } from '@/lib/format';

describe('formatos de la interfaz', () => {
  it('M-01 · muestra pesos chilenos con punto de miles y "Gratis" para 0', () => {
    expect(formatCLP(24000)).toBe('$24.000');
    expect(formatCLP(1250000)).toBe('$1.250.000');
    expect(formatCLP(0)).toBe('Gratis');
  });

  it('M-02 · el CTA dice cuántos faltan (DESIGN.md §4.3)', () => {
    expect(slotsCta(1)).toBe('Falta 1');
    expect(slotsCta(3)).toBe('Faltan 3');
    expect(slotsCta(0)).toBe('Partido completo');
  });

  it('M-03 · distancias en metros bajo 1 km y en km con coma decimal', () => {
    expect(formatDistance(640)).toBe('640 m');
    expect(formatDistance(1397)).toBe('1,4 km');
  });

  it('M-04 · hoy y mañana se nombran; el resto lleva día y fecha', () => {
    const viernes = new Date(2026, 9, 16, 18, 0);
    expect(formatDay(new Date(2026, 9, 16, 21, 0), viernes)).toBe('Hoy');
    expect(formatDay(new Date(2026, 9, 17, 10, 0), viernes)).toBe('Mañana');
    expect(formatDay(new Date(2026, 9, 18, 10, 0), viernes)).toBe('dom 18 oct');
  });

  it('M-05 · "Este finde" desde un viernes va del sábado al domingo', () => {
    const viernes = new Date(2026, 9, 16, 18, 0);
    const r = whenRange('weekend', viernes);
    expect(new Date(r.from!).getDay()).toBe(6);
    expect(new Date(r.to!).getTime()).toBe(new Date(2026, 9, 19).getTime());
  });

  it('M-06 · "Cuando sea" no limita el horario', () => {
    expect(whenRange('all')).toEqual({});
  });
});
