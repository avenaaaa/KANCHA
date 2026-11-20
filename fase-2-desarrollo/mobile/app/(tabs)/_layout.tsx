import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme/colors';
import { fonts } from '@/theme/typography';
import { Icon } from '@/components/icons/Icon';
import type { IconName } from '@/components/icons/paths';
import { useAuth } from '@/store/authStore';
import { useInbox, useMe } from '@/api/hooks';

const tabIcon =
  (name: IconName) =>
  ({ color }: { color: ColorValue }) => <Icon name={name} size={22} color={color} />;

export default function TabsLayout() {
  const status = useAuth((s) => s.status);
  // La barra dibuja dentro de su alto el margen del indicador de inicio del iPhone:
  // con un alto fijo, ese margen se comía el ícono y la etiqueta.
  const insets = useSafeAreaInsets();
  // Valida la sesión guardada al entrar: si la API responde 401, el cliente cierra la sesión solo.
  useMe(status === 'signedIn');
  // HU-10: el contador de avisos sin leer en la pestaña.
  const unread = useInbox(status === 'signedIn').data?.unread ?? 0;
  if (status !== 'signedIn') return <Redirect href="/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        // DESIGN.md §7: el estado activo usa el naranja en el texto.
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.background, borderTopColor: colors.border, height: 64 + insets.bottom, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase', paddingBottom: 6 },
        sceneStyle: { backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="mapa" options={{ title: 'Mapa', tabBarIcon: tabIcon('map') }} />
      <Tabs.Screen name="partidos" options={{ title: 'Mis partidos', tabBarIcon: tabIcon('calendar') }} />
      <Tabs.Screen
        name="avisos"
        options={{
          title: 'Avisos',
          tabBarIcon: tabIcon('bell'),
          tabBarBadge: unread > 0 ? (unread > 9 ? '9+' : unread) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.onAccent, fontFamily: fonts.bold, fontSize: 11 },
          tabBarAccessibilityLabel: unread > 0 ? `Avisos, ${unread} sin leer` : 'Avisos',
        }}
      />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: tabIcon('user') }} />
    </Tabs>
  );
}
