import { describe, expect, it, jest } from '@jest/globals';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import { queryClient } from '@/api/queryClient';
import { useAuth } from '@/store/authStore';
import type { User } from '@/api/types';

const usuario = (name: string): User => ({
  id: name,
  name,
  favoriteSport: 'FUTBOL',
  matchesPlayed: 0,
  honorScore: null,
  attendanceRate: null,
  punctualityRate: null,
  fairPlayRate: null,
  createdAt: '2026-11-01T12:00:00.000Z',
});

describe('sesión y caché (DEF-15)', () => {
  it('M-25 · al cerrar sesión y al entrar con otra cuenta no queda ningún dato de la anterior', async () => {
    await useAuth.getState().signIn({ token: 'token-camila', user: usuario('Camila') });
    queryClient.setQueryData(['me'], usuario('Camila'));
    queryClient.setQueryData(['matches', 'mine'], { matches: [{ id: 'partido-de-camila' }] });

    await useAuth.getState().signOut();
    expect(queryClient.getQueryData(['me'])).toBeUndefined();
    expect(queryClient.getQueryData(['matches', 'mine'])).toBeUndefined();

    queryClient.setQueryData(['me'], usuario('Camila'));
    await useAuth.getState().signIn({ token: 'token-mateo', user: usuario('Mateo') });
    expect(queryClient.getQueryData(['me'])).toBeUndefined();
    expect(useAuth.getState().user?.name).toBe('Mateo');
  });
});
