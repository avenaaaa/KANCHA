import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { colors, honorColor } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { fonts, type } from '@/theme/typography';
import { sportLabel } from '@/theme/sports';
import { SPORT_PLAYER } from '@/theme/sportImages';
import type { User } from '@/api/types';
import { Icon } from '@/components/icons/Icon';
import { FadeIn } from '@/components/ui/FadeIn';

/**
 * Carta de jugador (HU-02), pensada como una carta coleccionable: arriba el honor
 * en grande sobre naranja con la foto de su deporte; abajo el nombre y cuatro
 * baldosas con sus números. Solo datos públicos: el correo nunca se muestra aquí.
 * Sin reseñas no hay número: un jugador nuevo no es un mal jugador (HU-01).
 */
export function PlayerCard({ user }: { user: User }) {
  const rated = user.honorScore !== null;
  return (
    <FadeIn style={s.card}>
      <View style={[s.top, !rated && s.topNew]}>
        <Image
          source={SPORT_PLAYER[user.favoriteSport]}
          style={[s.photo, !rated && { opacity: 0.55 }]}
          resizeMode="contain"
          accessibilityElementsHidden
          importantForAccessibility="no"
        />
        {user.honorScore !== null ? (
          <View accessible accessibilityLabel={`Honor ${user.honorScore.toFixed(1)} de 10`}>
            <Text style={s.score}>{user.honorScore.toFixed(1)}</Text>
            <Text style={s.scoreLabel}>puntaje de honor</Text>
          </View>
        ) : (
          <View>
            <Text style={s.newTitle}>Jugador nuevo</Text>
            <Text style={s.newLabel}>Sin calificaciones aún</Text>
          </View>
        )}
      </View>

      <View style={s.body}>
        <View style={{ gap: 6 }}>
          <Text style={s.name}>{user.name}</Text>
          <View style={s.sportRow}>
            <Icon name={user.favoriteSport} size={18} color={colors.accent} strokeWidth={2} />
            <Text style={s.muted}>Juega más {sportLabel(user.favoriteSport).toLowerCase()}</Text>
          </View>
        </View>

        <View style={s.grid}>
          <View style={s.tile}>
            <Text style={s.tileValue}>{user.matchesPlayed}</Text>
            <Text style={s.tileLabel}>{user.matchesPlayed === 1 ? 'partido jugado' : 'partidos jugados'}</Text>
          </View>
          <Metric label="Asistencia" value={user.attendanceRate} />
          <Metric label="Puntualidad" value={user.punctualityRate} />
          <Metric label="Juego limpio" value={user.fairPlayRate} />
        </View>
      </View>
    </FadeIn>
  );
}

/** Una métrica del Sistema de Honor con su color de semáforo. Sin datos no hay barra ni cero. */
function Metric({ label, value }: { label: string; value: number | null }) {
  const color = honorColor(value);
  return (
    <View
      style={s.tile}
      accessible
      accessibilityLabel={value === null ? `${label}: sin calificaciones aún` : `${label}: ${Math.round(value)} por ciento`}
    >
      <Text style={[s.tileValue, { color }]}>{value === null ? '—' : `${Math.round(value)} %`}</Text>
      <Text style={s.tileLabel}>{label}</Text>
      <View style={s.track}>{value !== null && <Bar value={value} color={color} />}</View>
    </View>
  );
}

/** La barra crece hasta su valor al aparecer; con "reducir movimiento" aparece ya llena. */
function Bar({ value, color }: { value: number; color: string }) {
  const w = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (reduce) return w.setValue(value);
      Animated.timing(w, { toValue: value, duration: 700, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    });
  }, [value, w]);
  return (
    <Animated.View
      style={[s.fill, { backgroundColor: color, width: w.interpolate({ inputRange: [0, 100], outputRange: ['2%', '100%'] }) }]}
    />
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: radius.card, overflow: 'hidden' },
  top: { height: 210, backgroundColor: colors.accent, padding: spacing.lg, justifyContent: 'flex-end', overflow: 'hidden' },
  topNew: { backgroundColor: colors.background, borderBottomWidth: 1, borderBottomColor: colors.border },
  photo: { position: 'absolute', right: -18, bottom: -6, width: '64%', height: '104%' },
  score: { fontFamily: fonts.display, fontSize: 92, lineHeight: 98, color: colors.onAccent, letterSpacing: -1 },
  scoreLabel: { fontFamily: fonts.bold, fontSize: 13, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.onAccent },
  newTitle: { ...type.display, fontSize: 34, lineHeight: 40, color: colors.text, maxWidth: '60%' },
  newLabel: { ...type.body, color: colors.textMuted },
  body: { padding: spacing.lg, gap: spacing.lg },
  name: { ...type.display, fontSize: 30, lineHeight: 34, color: colors.text },
  sportRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  muted: { ...type.body, color: colors.textMuted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { flexBasis: '46%', flexGrow: 1, padding: spacing.md, gap: 2, borderRadius: radius.tile, backgroundColor: colors.background },
  tileValue: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.text },
  tileLabel: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.textMuted },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden', marginTop: spacing.sm },
  fill: { height: 4, borderRadius: 2 },
});
