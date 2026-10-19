import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { type } from '@/theme/typography';
import { Icon } from '@/components/icons/Icon';

/** Encabezado de pantallas apiladas, con volver. */
export function ScreenHeader({ title, right }: { title?: string; right?: React.ReactNode }) {
  return (
    <View style={s.bar}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/mapa'))}
        accessibilityRole="button"
        accessibilityLabel="Volver"
        hitSlop={12}
        style={({ pressed }) => [s.back, pressed && { opacity: 0.85 }]}
      >
        <Icon name="back" size={22} color={colors.text} strokeWidth={2} />
      </Pressable>
      {title ? (
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {right ?? <View style={s.back} />}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.h3, color: colors.text, flex: 1, textAlign: 'center' },
});
