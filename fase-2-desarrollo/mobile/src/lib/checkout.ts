import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { BASE_URL } from '@/api/client';

/**
 * Abre la página de la API que lleva a Webpay (HU-08). En el celular resuelve
 * cuando el jugador cierra el navegador; en la web abre otra pestaña y la app se
 * actualiza sola al volver a ella.
 */
export async function openCheckout(checkoutPath: string): Promise<void> {
  const url = `${BASE_URL}${checkoutPath}`;
  if (Platform.OS === 'web') {
    if (!window.open(url, '_blank')) window.location.assign(url); // si el navegador bloqueó la pestaña
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}
