import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { antonLine, fonts, type } from '@/theme/typography';
import { useInbox, useMarkRead, useNotificationPrefs } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import type { AppNotification } from '@/api/types';
import { KIND_ICON, timeAgo } from '@/lib/notifications';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/icons/Icon';

/** HU-10 (KAN-16): bandeja de avisos. Los "Falta uno" sin leer van primero y destacados. */
export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch, isRefetching } = useInbox();
  const prefs = useNotificationPrefs();
  const markRead = useMarkRead();
  useFocusEffect(useCallback(() => void refetch(), [refetch]));

  const open = (n: AppNotification) => {
    if (!n.read) markRead.mutate(n.id);
    if (n.matchId) router.push(`/partido/${n.matchId}`);
  };

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.body, { paddingTop: insets.top + spacing.lg }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.accent} />}
    >
      <View style={s.head}>
        <Text style={s.h1}>Avisos</Text>
        <Button label="Elegir avisos" variant="secondary" icon="bell" onPress={() => router.push('/ajustes-avisos')} />
      </View>

      {prefs.data && !prefs.data.faltaUno ? (
        <View style={s.invite}>
          <Text style={s.inviteTitle}>Activa los avisos "Falta uno"</Text>
          <Text style={s.inviteText}>
            Te avisamos cuando a un partido cerca le falta un jugador y empieza pronto. Son los avisos más importantes de Kancha y
            llegan antes que cualquier otro.
          </Text>
          <Button label="Activar" onPress={() => router.push('/ajustes-avisos')} forward />
        </View>
      ) : null}

      {isLoading ? (
        <View style={{ gap: spacing.sm }}>
          <Skeleton height={84} />
          <Skeleton height={84} />
        </View>
      ) : isError ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No pudimos cargar tus avisos</Text>
          <Text style={s.emptyText}>{errorMessage(error)}</Text>
          <Button label="Reintentar" variant="secondary" onPress={() => void refetch()} />
        </View>
      ) : data && data.notifications.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          {data.notifications.map((n) => (
            <NotificationRow key={n.id} n={n} onPress={() => open(n)} />
          ))}
        </View>
      ) : (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Aún no tienes avisos</Text>
          <Text style={s.emptyText}>
            Aquí llegan los partidos cerca de ti, quién pide entrar a tus partidos y los "Falta uno" de última hora.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function NotificationRow({ n, onPress }: { n: AppNotification; onPress: () => void }) {
  const urgent = n.urgent;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${n.read ? '' : 'Sin leer. '}${n.title}. ${n.body}`}
      accessibilityHint={n.matchId ? 'Abre el partido' : undefined}
      style={({ pressed }) => [s.row, urgent && s.rowUrgent, pressed && { opacity: 0.85 }]}
    >
      <View style={[s.iconWrap, urgent && s.iconUrgent]}>
        <Icon name={KIND_ICON[n.kind]} size={20} color={urgent ? colors.onAccent : colors.textMuted} strokeWidth={2} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={s.rowHead}>
          <Text style={[s.title, urgent && s.titleUrgent, n.read && { color: colors.textMuted }]} numberOfLines={2}>
            {n.title}
          </Text>
          {n.read ? null : <View style={s.dot} accessibilityElementsHidden />}
        </View>
        <Text style={s.text}>{n.body}</Text>
        <Text style={s.when}>{timeAgo(n.createdAt)}</Text>
      </View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' },
  h1: { ...type.display, ...antonLine(34, 40), color: colors.text },
  invite: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 2,
    borderColor: colors.accent,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  inviteTitle: { ...type.h3, fontFamily: fonts.bold, color: colors.text },
  inviteText: { ...type.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  empty: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md - 4 },
  emptyTitle: { ...type.h3, fontFamily: fonts.bold, color: colors.text },
  emptyText: { ...type.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.tile,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowUrgent: { borderWidth: 2, borderColor: colors.accent, backgroundColor: colors.accentGlow },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  iconUrgent: { backgroundColor: colors.accent },
  rowHead: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { ...type.body, fontFamily: fonts.bold, color: colors.text, flex: 1 },
  titleUrgent: { fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.6, textTransform: 'uppercase', color: colors.accent },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.accent, marginTop: 5 },
  text: { ...type.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  when: { ...type.caption, color: colors.disabledText, marginTop: 2 },
});
