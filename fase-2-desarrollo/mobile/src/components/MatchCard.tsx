import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { levelLabel, sportLabel } from '@/theme/sports';
import { formatCLP, formatDistance, formatWhen, plural, slotsCta } from '@/lib/format';
import type { MatchSummary } from '@/api/types';
import { Icon } from '@/components/icons/Icon';
import { SportBadge } from './SportBadge';
import { SlotBar } from './SlotBar';
import { HonorBadge } from './HonorBadge';

interface MatchCardProps {
  match: MatchSummary;
  onPress: () => void;
  selected?: boolean;
  /** Línea extra bajo la barra (por ejemplo, el estado en "Mis partidos"). */
  footer?: React.ReactNode;
}

/**
 * Carta de partido. La hora va en Anton arriba a la derecha: es lo segundo que se
 * mira después del deporte. Abajo, cuánto falta para completar el partido.
 */
export function MatchCard({ match, onPress, selected = false, footer }: MatchCardProps) {
  const when = formatWhen(match.startsAt);
  const cut = when.lastIndexOf(' ');
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${match.title}, ${sportLabel(match.sport)}, ${formatWhen(match.startsAt)}, ${match.venueName}, ${plural(match.slotsLeft, 'cupo libre', 'cupos libres')}`}
      style={({ pressed }) => [s.card, selected && s.selected, pressed && { opacity: 0.85 }]}
    >
      <View style={s.top}>
        <SportBadge sport={match.sport} />
        <View style={s.titleBlock}>
          <View style={s.titleRow}>
            <Text style={s.title} numberOfLines={2}>
              {match.title}
            </Text>
            <View style={s.when}>
              <Text style={s.day}>{when.slice(0, cut)}</Text>
              <Text style={s.time}>{when.slice(cut + 1)}</Text>
            </View>
          </View>
          <View style={s.metaRow}>
            <Icon name="pin" size={14} color={colors.textMuted} />
            <Text style={s.meta} numberOfLines={1}>
              {match.venueName}
              {match.distanceM !== undefined ? `, a ${formatDistance(match.distanceM)}` : ''}
            </Text>
          </View>
        </View>
      </View>

      <View style={s.slots}>
        <SlotBar filled={match.filledSlots} total={match.totalSlots} />
        <View style={s.slotsRow}>
          <Text style={s.slotsText}>
            <Text style={s.slotsStrong}>
              {match.filledSlots}/{match.totalSlots}
            </Text>{' '}
            jugadores · {levelLabel(match.level)}
          </Text>
          <Text style={s.price}>
            {formatCLP(match.pricePerPlayer)}
            {match.pricePerPlayer > 0 && <Text style={s.priceUnit}> c/u</Text>}
          </Text>
        </View>
      </View>

      <View style={s.bottom}>
        <HonorBadge score={match.organizer.honorScore} />
        <Text style={s.organizer} numberOfLines={1}>
          Organiza {match.organizer.name.split(' ')[0]}
        </Text>
        <View style={[s.cta, match.slotsLeft <= 0 && s.ctaFull]}>
          <Text style={[s.ctaText, match.slotsLeft <= 0 && s.ctaTextFull]}>{slotsCta(match.slotsLeft)}</Text>
          {match.slotsLeft > 0 && <Icon name="forward" size={13} color={colors.onAccent} strokeWidth={2.6} />}
        </View>
      </View>
      {footer}
    </Pressable>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.md - 4,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  selected: { borderColor: colors.accent },
  top: { flexDirection: 'row', gap: spacing.md - 4, alignItems: 'center' },
  titleBlock: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { ...type.h3, fontFamily: fonts.bold, color: colors.text, flex: 1, fontSize: 16, lineHeight: 20 },
  when: { alignItems: 'flex-end' },
  day: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.8, color: colors.textMuted, textTransform: 'uppercase' },
  time: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: colors.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { ...type.caption, fontSize: 13, color: colors.textMuted, flex: 1 },
  slots: { gap: 8 },
  slotsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  slotsText: { ...type.caption, fontSize: 13, color: colors.textMuted },
  slotsStrong: { fontFamily: fonts.bold, color: colors.text },
  price: { fontFamily: fonts.bold, fontSize: 15, color: colors.text },
  priceUnit: { fontFamily: fonts.regular, fontSize: 12, color: colors.textMuted },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingTop: spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: colors.hairline,
  },
  organizer: { ...type.caption, color: colors.textMuted, flex: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 30,
    paddingHorizontal: 12,
    borderRadius: radius.chip,
    backgroundColor: colors.accent,
  },
  ctaFull: { backgroundColor: colors.disabled },
  ctaText: { fontFamily: fonts.display, fontSize: 14, letterSpacing: 0.6, color: colors.onAccent, textTransform: 'uppercase' },
  ctaTextFull: { color: colors.text },
});
