import { AppState, Platform } from 'react-native';
import { QueryClient, focusManager } from '@tanstack/react-query';

/**
 * Caché de datos de la app. Vive en su propio módulo para que la sesión pueda
 * vaciarla: los datos de una cuenta nunca deben verse en la siguiente.
 */
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

// En el celular no existe el evento "la ventana recuperó el foco" del navegador:
// volver a la app es lo equivalente, y con eso los datos viejos se vuelven a pedir.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
}
