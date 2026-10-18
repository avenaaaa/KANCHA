/**
 * Íconos de Kancha, dibujados para esta app en una grilla de 24 × 24.
 *
 * Regla de paridad (DESIGN.md §5): los tres íconos de deporte comparten el
 * mismo grosor de trazo, el mismo círculo envolvente de 18 px y el mismo nivel
 * de detalle. Ninguno pesa más que otro.
 *
 * La misma definición alimenta los componentes de react-native-svg y los pines
 * HTML del mapa web, para que el ícono sea idéntico en todas partes.
 */

export interface IconShape {
  d?: string;
  circle?: { cx: number; cy: number; r: number };
  /** Relleno con el color del ícono en vez de trazo. */
  fill?: boolean;
  /** Regla par-impar: los subtrazos internos quedan calados (las perforaciones de la pala). */
  evenodd?: boolean;
}

export const ICONS = {
  // ---- Deportes ----
  FUTBOL: [
    { circle: { cx: 12, cy: 12, r: 9 } },
    { d: 'M12 8.6L15.23 10.95L14 14.75H10L8.77 10.95Z', fill: true },
    { d: 'M12 8.6V3M15.23 10.95L20.56 9.22M14 14.75L17.29 19.28M10 14.75L6.71 19.28M8.77 10.95L3.44 9.22' },
  ],
  // Pala de pádel: cabeza ovalada sólida con perforaciones y mango corto (DESIGN.md §5).
  PADEL: [
    {
      d: 'M12 1.8C15.42 1.8 18.2 4.93 18.2 8.8C18.2 12.67 15.42 15.8 12 15.8C8.58 15.8 5.8 12.67 5.8 8.8C5.8 4.93 8.58 1.8 12 1.8ZM9.15 6.3a0.95 0.95 0 1 0 1.90 0a0.95 0.95 0 1 0 -1.90 0ZM12.95 6.3a0.95 0.95 0 1 0 1.90 0a0.95 0.95 0 1 0 -1.90 0ZM11.05 9a0.95 0.95 0 1 0 1.90 0a0.95 0.95 0 1 0 -1.90 0ZM9.15 11.7a0.95 0.95 0 1 0 1.90 0a0.95 0.95 0 1 0 -1.90 0ZM12.95 11.7a0.95 0.95 0 1 0 1.90 0a0.95 0.95 0 1 0 -1.90 0Z',
      fill: true,
      evenodd: true,
    },
    { d: 'M10.8 15.2H13.2V20.6A1.2 1.2 0 0 1 10.8 20.6Z', fill: true },
  ],
  BASQUETBOL: [
    { circle: { cx: 12, cy: 12, r: 9 } },
    { d: 'M12 3V21M3 12H21' },
    { d: 'M5.64 5.64C8.6 8.6 8.6 15.4 5.64 18.36M18.36 5.64C15.4 8.6 15.4 15.4 18.36 18.36' },
  ],

  // ---- Interfaz ----
  /** Las flechas dobles de la marca (DESIGN.md §8). Nunca una flecha simple. */
  forward: [{ d: 'M5 6L11 12L5 18M12 6L18 12L12 18' }],
  back: [{ d: 'M15 5L8 12L15 19' }],
  pin: [
    { d: 'M12 21C12 21 18.5 14.8 18.5 10A6.5 6.5 0 0 0 5.5 10C5.5 14.8 12 21 12 21Z' },
    { circle: { cx: 12, cy: 10, r: 2.3 } },
  ],
  clock: [{ circle: { cx: 12, cy: 12, r: 9 } }, { d: 'M12 7.5V12L15 14' }],
  shield: [{ d: 'M12 3L19 6V11.5C19 15.9 16 19.6 12 21C8 19.6 5 15.9 5 11.5V6Z' }],
  plus: [{ d: 'M12 5V19M5 12H19' }],
  check: [{ d: 'M5 12.5L10 17.5L19 7' }],
  close: [{ d: 'M6 6L18 18M18 6L6 18' }],
  locate: [
    { circle: { cx: 12, cy: 12, r: 6.5 } },
    { circle: { cx: 12, cy: 12, r: 2 }, fill: true },
    { d: 'M12 2.5V5.5M12 18.5V21.5M2.5 12H5.5M18.5 12H21.5' },
  ],
  map: [{ d: 'M3 6.5L9 4L15 6.5L21 4V17.5L15 20L9 17.5L3 20ZM9 4V17.5M15 6.5V20' }],
  calendar: [{ d: 'M5.5 5H18.5A2 2 0 0 1 20.5 7V18A2 2 0 0 1 18.5 20H5.5A2 2 0 0 1 3.5 18V7A2 2 0 0 1 5.5 5ZM3.5 9.5H20.5M8 3V6.5M16 3V6.5' }],
  user: [
    { circle: { cx: 12, cy: 8.5, r: 3.5 } },
    { d: 'M5 20C5.8 16.4 8.6 14.5 12 14.5C15.4 14.5 18.2 16.4 19 20' },
  ],
  wallet: [{ d: 'M4 7.5H18.5A1.5 1.5 0 0 1 20 9V18A1.5 1.5 0 0 1 18.5 19.5H5.5A1.5 1.5 0 0 1 4 18V6A1.5 1.5 0 0 1 5.5 4.5H16.5M16 14H17' }],
  logout: [{ d: 'M14 4.5H18.5A1.5 1.5 0 0 1 20 6V18A1.5 1.5 0 0 1 18.5 19.5H14M10 8L6 12L10 16M6 12H15.5' }],
} satisfies Record<string, IconShape[]>;

export type IconName = keyof typeof ICONS;

/** SVG como texto, para los marcadores HTML de MapLibre en la web. */
export function iconSvg(name: IconName, color: string, size = 20, strokeWidth = 1.75): string {
  const shapes = (ICONS[name] as IconShape[])
    .map((s) => {
      const paint = s.fill
        ? `fill="${color}" stroke="none"${s.evenodd ? ' fill-rule="evenodd"' : ''}`
        : `fill="none" stroke="${color}"`;
      if (s.circle) return `<circle cx="${s.circle.cx}" cy="${s.circle.cy}" r="${s.circle.r}" ${paint}/>`;
      return `<path d="${s.d}" ${paint}/>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes}</svg>`;
}
