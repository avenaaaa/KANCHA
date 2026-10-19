import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { setAuthToken, setUnauthorizedHandler } from '@/api/client';
import type { Session, User } from '@/api/types';

const KEY = 'kancha.session';

interface AuthState {
  status: 'loading' | 'signedIn' | 'signedOut';
  token: string | null;
  user: User | null;
  hydrate: () => Promise<void>;
  signIn: (session: Session) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuth = create<AuthState>((set, get) => ({
  status: 'loading',
  token: null,
  user: null,

  async hydrate() {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      const session = raw ? (JSON.parse(raw) as Session) : null;
      if (session?.token) {
        setAuthToken(session.token);
        set({ status: 'signedIn', token: session.token, user: session.user });
        return;
      }
    } catch {
      // Almacenamiento no disponible (modo privado del navegador): se sigue sin sesión.
    }
    set({ status: 'signedOut' });
  },

  async signIn(session) {
    setAuthToken(session.token);
    set({ status: 'signedIn', token: session.token, user: session.user });
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(session));
    } catch {
      // La sesión vale para esta visita aunque no se pueda guardar.
    }
  },

  async signOut() {
    setAuthToken(null);
    set({ status: 'signedOut', token: null, user: null });
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {
      // Nada que limpiar.
    }
  },

  setUser(user) {
    const { token } = get();
    set({ user });
    if (token) AsyncStorage.setItem(KEY, JSON.stringify({ token, user })).catch(() => undefined);
  },
}));

setUnauthorizedHandler(() => {
  void useAuth.getState().signOut();
});
