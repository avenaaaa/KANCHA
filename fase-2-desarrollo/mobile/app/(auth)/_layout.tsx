import { Redirect, Stack } from 'expo-router';
import { colors } from '@/theme/colors';
import { useAuth } from '@/store/authStore';

export default function AuthLayout() {
  const status = useAuth((s) => s.status);
  if (status === 'signedIn') return <Redirect href="/mapa" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
