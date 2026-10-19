import { Redirect } from 'expo-router';

/** La raíz abre el mapa; si no hay sesión, el layout de pestañas lleva a /login. */
export default function Index() {
  return <Redirect href="/mapa" />;
}
