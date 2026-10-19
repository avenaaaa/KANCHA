import { ScrollView, StyleSheet } from 'react-native';
import { Chip } from '@/components/ui/Chip';
import { SPORTS, type SportKey } from '@/theme/sports';
import { spacing } from '@/theme/spacing';

interface SportFilterProps {
  active: SportKey[];
  onToggle: (sport: SportKey) => void;
  floating?: boolean;
}

/** Los tres deportes siempre visibles, en orden Fútbol → Pádel → Básquet (DESIGN.md §4.4). */
export function SportFilter({ active, onToggle, floating }: SportFilterProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.row}>
      {SPORTS.map((sport) => (
        <Chip
          key={sport.key}
          label={sport.label}
          icon={sport.key}
          active={active.includes(sport.key)}
          onPress={() => onToggle(sport.key)}
          floating={floating}
        />
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({ row: { gap: spacing.sm } });
