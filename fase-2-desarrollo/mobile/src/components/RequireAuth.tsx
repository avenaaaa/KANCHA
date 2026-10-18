import { Redirect } from 'expo-router';
import { useAuth } from '@/store/authStore';

/** Pantallas fuera de las pestañas que exigen sesión: detalle y publicar. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAuth((s) => s.status);
  if (status !== 'signedIn') return <Redirect href="/login" />;
  return <>{children}</>;
}
