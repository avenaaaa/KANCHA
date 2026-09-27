import type { ComponentProps } from 'react';

/**
 * Los tres deportes tienen peso idéntico. El orden es siempre
 * Fútbol → Pádel → Básquetbol, por popularidad, no por origen del proyecto.
 * Ninguno es el deporte "por defecto" (DESIGN.md §5).
 */
export const SPORTS = [
  { key: 'FUTBOL', label: 'Fútbol', emoji: '⚽' },
  { key: 'PADEL', label: 'Pádel', emoji: '🎾' },
  { key: 'BASQUETBOL', label: 'Básquet', emoji: '🏀' },
] as const;

export type SportKey = (typeof SPORTS)[number]['key'];

export const SKILL_LEVELS = [
  { key: 'PRINCIPIANTE', label: 'Principiante' },
  { key: 'MEDIO', label: 'Nivel medio' },
  { key: 'AVANZADO', label: 'Avanzado' },
] as const;

export type SkillLevelKey = (typeof SKILL_LEVELS)[number]['key'];

export const sportLabel = (key: SportKey): string =>
  SPORTS.find((s) => s.key === key)?.label ?? key;

export const levelLabel = (key: SkillLevelKey): string =>
  SKILL_LEVELS.find((l) => l.key === key)?.label ?? key;
