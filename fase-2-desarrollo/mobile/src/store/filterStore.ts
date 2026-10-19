import { create } from 'zustand';
import { SPORTS, type SportKey } from '@/theme/sports';
import type { When } from '@/lib/format';
import type { RadiusOption } from '@/theme/geo';

const ALL: SportKey[] = SPORTS.map((s) => s.key);

interface FilterState {
  /** Estado inicial: los tres deportes activos, ninguno por defecto (DESIGN.md §4.4). */
  sports: SportKey[];
  when: When;
  radius: RadiusOption;
  toggleSport: (sport: SportKey) => void;
  setWhen: (when: When) => void;
  setRadius: (radius: RadiusOption) => void;
}

export const useFilters = create<FilterState>((set) => ({
  sports: ALL,
  when: 'all',
  radius: 5_000,

  toggleSport: (sport) =>
    set(({ sports }) => {
      const next = sports.includes(sport) ? sports.filter((s) => s !== sport) : [...sports, sport];
      // Apagar el último deporte vuelve a mostrar los tres: un mapa vacío por filtro no sirve.
      return { sports: next.length === 0 ? ALL : ALL.filter((s) => next.includes(s)) };
    }),
  setWhen: (when) => set({ when }),
  setRadius: (radius) => set({ radius }),
}));
