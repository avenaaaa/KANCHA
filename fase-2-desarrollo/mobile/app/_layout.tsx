import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Anton_400Regular } from '@expo-google-fonts/anton';
import { Roboto_400Regular, Roboto_500Medium, Roboto_700Bold } from '@expo-google-fonts/roboto';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/api/queryClient';
import { colors } from '@/theme/colors';
import { useAuth } from '@/store/authStore';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Anton_400Regular, Roboto_400Regular, Roboto_500Medium, Roboto_700Bold });
  const status = useAuth((s) => s.status);
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const ready = fontsLoaded && status !== 'loading';

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      {ready ? (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        />
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.background }} />
      )}
    </QueryClientProvider>
  );
}
