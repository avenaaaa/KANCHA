import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { initials } from '@/lib/format';

export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <View style={[s.circle, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[s.text, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  circle: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontFamily: fonts.bold, color: colors.text },
});
