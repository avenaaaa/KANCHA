import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { Icon } from '@/components/icons/Icon';
import { useInbox, useMarkRead } from '@/api/hooks';
import { firstUrgent } from '@/lib/notifications';

/**
 * HU-10: el "Falta uno" sin leer, sobre el mapa y por encima de cualquier otro aviso (DESIGN.md §4.10).
 * Tocarlo abre el partido; la X lo descarta. Los dos lo marcan como leído.
 */
export function FaltaUnoBanner() {
  const { data } = useInbox();
  const markRead = useMarkRead();
  const n = firstUrgent(data?.notifications);
  if (!n) return null;

  const open = () => {
    markRead.mutate(n.id);
    router.push(`/partido/${n.matchId}`);
  };

  return (
    <View style={s.card} accessibilityLiveRegion="polite">
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${n.title}. ${n.body}`}
        accessibilityHint="Abre el partido"
        style={({ pressed }) => [s.main, pressed && { opacity: 0.9 }]}
      >
        <Icon name="clock" size={24} color={colors.onAccent} strokeWidth={2.2} />
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            {n.title}
          </Text>
          <Text style={s.body} numberOfLines={2}>
            {n.body}
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => markRead.mutate(n.id)}
        accessibilityRole="button"
        accessibilityLabel="Descartar este aviso"
        hitSlop={8}
        style={({ pressed }) => [s.close, pressed && { opacity: 0.7 }]}
      >
        <Icon name="close" size={18} color={colors.onAccent} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: radius.tile,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    minHeight: 64,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  title: { fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.onAccent },
  body: { ...type.caption, fontFamily: fonts.medium, fontSize: 13, lineHeight: 17, color: colors.onAccent },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
