import { describe, expect, it } from '@jest/globals';
import { ANTON_HEIGHT, antonLine } from '@/theme/typography';

describe('tipografía', () => {
  it('M-41 · en iOS Anton toma su alto natural y ocupa lo mismo; en Android y la web no cambia (KAN-29)', () => {
    // El honor de la carta de jugador: 92 px en una línea de 98.
    const ios = antonLine(92, 98, 'ios');
    expect(ios.lineHeight).toBeGreaterThanOrEqual(92 * ANTON_HEIGHT);
    expect(ios.lineHeight + 2 * (ios.marginVertical ?? 0)).toBe(98);
    expect(antonLine(92, 98, 'android')).toEqual({ fontSize: 92, lineHeight: 98 });
    expect(antonLine(92, 98, 'web')).toEqual({ fontSize: 92, lineHeight: 98 });
    // Una línea que ya es más alta que la fuente queda igual.
    expect(antonLine(10, 20, 'ios')).toEqual({ fontSize: 10, lineHeight: 20, marginVertical: 0 });
  });
});
