import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getHealth } from '@/api/client';
import { colors } from '@/theme/colors';
import { spacing, radius } from '@/theme/spacing';
import { SPORTS } from '@/theme/sports';

/**
 * Pantalla puente del Sprint 3.
 *
 * Existe para una sola cosa: demostrar que la app habla con la API dentro de
 * Docker. El mapa real llega en el Sprint 6 (HU-04).
 */
export default function Home() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
  });

  return (
    <ScrollView style={s.screen} contentContainerStyle={s.content}>
      <Text style={s.brand}>KANCHA</Text>
      <Text style={s.tagline}>Juega. Conecta. Vive Mejor.</Text>

      <View style={s.card}>
        <Text style={s.cardTitle}>Estado del sistema</Text>

        {isLoading && <ActivityIndicator color={colors.accent} />}

        {isError && (
          <>
            <Text style={[s.status, { color: colors.error }]}>API no disponible</Text>
            <Text style={s.muted}>{(error as Error).message}</Text>
            <Text style={s.muted}>¿Levantaste el backend con docker compose up?</Text>
          </>
        )}

        {data && (
          <>
            <Text style={[s.status, { color: colors.success }]}>API conectada</Text>
            <Text style={s.muted}>Base de datos: {data.db}</Text>
            <Text style={s.muted}>Versión: {data.version}</Text>
          </>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.cardTitle}>Deportes</Text>
        <View style={s.chips}>
          {SPORTS.map((sport) => (
            <View key={sport.key} style={s.chip}>
              <Text style={s.chipText}>
                {sport.emoji} {sport.label}
              </Text>
            </View>
          ))}
        </View>
        <Text style={s.muted}>Los tres con el mismo peso. Ninguno por defecto.</Text>
      </View>

      <Text style={s.footer}>Sprint 3 · esqueleto verificado</Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md },
  brand: { color: colors.bronze, fontSize: 48, fontWeight: '700', letterSpacing: 2 },
  tagline: { color: colors.textMuted, fontSize: 15, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  status: { fontSize: 15, fontWeight: '700' },
  muted: { color: colors.textMuted, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: { color: colors.textMuted, fontSize: 13, fontWeight: '700' },
  footer: { color: colors.textMuted, fontSize: 12, textAlign: 'center', marginTop: spacing.lg },
});
