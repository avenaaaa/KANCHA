import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useCallback } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { useMyMatches } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import { playerStatus } from '@/lib/status';
import type { MyMatch } from '@/api/types';
import { MatchCard } from '@/components/MatchCard';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/icons/Icon';

/** Partidos que organizo y a los que postulé, con su estado. */
export default function MyMatchesScreen() {
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, error, refetch, isRefetching } = useMyMatches();
  // Las pestañas no se desmontan: al volver a esta se piden los datos de nuevo.
  useFocusEffect(useCallback(() => void refetch(), [refetch]));
  const now = Date.now();
  const upcoming = (data?.matches ?? []).filter((m) => new Date(m.startsAt).getTime() > now - m.durationMin * 60_000);
  const organizing = upcoming.filter((m) => m.role === 'ORGANIZER');
  const playing = upcoming.filter((m) => m.role === 'PLAYER');
  // HU-06: partidos jugados con la ventana de 48 h abierta.
  const toRate = (data?.matches ?? []).filter(
    (m) => m.ratingWindow === 'OPEN' && (m.role === 'ORGANIZER' || m.myStatus === 'APPROVED' || m.myStatus === 'PAID'),
  );

  return (
    <ScrollView
      style={s.screen}
      contentContainerStyle={[s.body, { paddingTop: insets.top + spacing.lg }]}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => void refetch()} tintColor={colors.accent} />}
    >
      <Text style={s.h1}>Mis partidos</Text>

      {isLoading ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={150} />
          <Skeleton height={150} />
        </View>
      ) : isError ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>No pudimos cargar tus partidos</Text>
          <Text style={s.emptyText}>{errorMessage(error)}</Text>
          <Button label="Reintentar" variant="secondary" onPress={() => void refetch()} />
        </View>
      ) : upcoming.length === 0 && toRate.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>Todavía no tienes partidos</Text>
          <Text style={s.emptyText}>Busca uno con cupo en el mapa o publica el tuyo si te falta gente.</Text>
          <View style={s.emptyActions}>
            <Button label="Ver el mapa" variant="secondary" icon="map" onPress={() => router.navigate('/mapa')} />
            <Button label="Publicar partido" icon="plus" onPress={() => router.push('/publicar')} />
          </View>
        </View>
      ) : (
        <>
          <Section title="Partidos jugados" matches={toRate} rate />
          <Section title="Organizas" matches={organizing} />
          <Section title="Juegas" matches={playing} />
        </>
      )}
    </ScrollView>
  );
}

function Section({ title, matches, rate = false }: { title: string; matches: MyMatch[]; rate?: boolean }) {
  if (matches.length === 0) return null;
  return (
    <View style={{ gap: spacing.sm + 4 }}>
      <Text style={s.h2}>{title}</Text>
      {matches.map((m) => (
        <MatchCard
          key={m.id}
          match={m}
          // El organizador va al detalle: ahí registra la asistencia y también califica.
          onPress={() => router.push(rate && m.role !== 'ORGANIZER' ? `/calificar/${m.id}` : `/partido/${m.id}`)}
          footer={rate ? <RateFooter organizer={m.role === 'ORGANIZER'} /> : <Footer m={m} />}
        />
      ))}
    </View>
  );
}

function RateFooter({ organizer }: { organizer: boolean }) {
  return (
    <View style={s.footer}>
      <Text style={[s.footerText, { color: colors.accent }]}>
        {organizer ? 'Registra la asistencia y califica' : 'Califica a tus compañeros'}
      </Text>
      <Icon name="forward" size={14} color={colors.accent} strokeWidth={2.4} />
    </View>
  );
}

function Footer({ m }: { m: MyMatch }) {
  if (m.role === 'ORGANIZER') {
    if (m.pendingCount === 0) return null;
    return (
      <View style={s.footer}>
        <Text style={[s.footerText, { color: colors.accent }]}>
          {m.pendingCount === 1 ? '1 postulación por revisar' : `${m.pendingCount} postulaciones por revisar`}
        </Text>
        <Icon name="forward" size={14} color={colors.accent} strokeWidth={2.4} />
      </View>
    );
  }
  const st = playerStatus(m.myStatus, m.pricePerPlayer > 0);
  const color = st.tone === 'success' ? colors.success : st.tone === 'warning' ? colors.warning : colors.textMuted;
  return (
    <View style={s.footer}>
      <Icon name={st.icon} size={16} color={color} strokeWidth={2} />
      <Text style={[s.footerText, { color }]}>{st.label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg, width: '100%', maxWidth: 720, alignSelf: 'center' },
  h1: { ...type.h1, color: colors.text },
  h2: { ...type.h2, fontSize: 18, color: colors.textMuted },
  empty: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing.lg, gap: spacing.md - 4 },
  emptyTitle: { ...type.h3, fontFamily: fonts.bold, color: colors.text },
  emptyText: { ...type.body, fontSize: 14, lineHeight: 20, color: colors.textMuted },
  emptyActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { fontFamily: fonts.bold, fontSize: 13 },
});
