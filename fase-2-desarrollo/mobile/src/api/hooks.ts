import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import { openCheckout } from '@/lib/checkout';
import type { MatchDetail, MatchSummary, MyMatch, NewMatch, PendingRatings, Session, User } from './types';
import type { SportKey } from '@/theme/sports';

/** Hooks de datos. Las pantallas nunca llaman a fetch directamente. */

export const keys = {
  me: ['me'] as const,
  nearby: (p: NearbyParams) => ['matches', 'nearby', p] as const,
  match: (id: string) => ['matches', id] as const,
  mine: ['matches', 'mine'] as const,
  user: (id: string) => ['users', id] as const,
  pending: (matchId: string) => ['matches', matchId, 'ratings', 'pending'] as const,
};

export const login = (body: { email: string; password: string }) =>
  api<Session>('/auth/login', { method: 'POST', body: JSON.stringify(body) });

export const register = (body: { email: string; password: string; name: string; favoriteSport: SportKey }) =>
  api<Session>('/auth/register', { method: 'POST', body: JSON.stringify(body) });

export function useMe(enabled = true) {
  return useQuery({ queryKey: keys.me, queryFn: () => api<User>('/users/me'), enabled });
}

/** HU-02: carta pública de un jugador. La API omite el correo si no es el propio. */
export function usePlayer(id: string) {
  return useQuery({ queryKey: keys.user(id), queryFn: () => api<User>(`/users/${id}`) });
}

export interface NearbyParams {
  lat: number;
  lng: number;
  radius: number;
  sports: SportKey[];
  from?: string;
  to?: string;
}

export function useNearbyMatches(p: NearbyParams | null) {
  return useQuery({
    queryKey: keys.nearby(p ?? { lat: 0, lng: 0, radius: 0, sports: [] }),
    enabled: p !== null,
    queryFn: () => {
      const q = new URLSearchParams({
        lat: String(p!.lat),
        lng: String(p!.lng),
        radius: String(p!.radius),
      });
      // Con los tres deportes activos no se filtra: así entran deportes futuros sin tocar la app.
      if (p!.sports.length > 0 && p!.sports.length < 3) q.set('sport', p!.sports.join(','));
      if (p!.from) q.set('from', p!.from);
      if (p!.to) q.set('to', p!.to);
      return api<{ matches: MatchSummary[]; count: number }>(`/matches/nearby?${q.toString()}`);
    },
    placeholderData: (prev) => prev,
  });
}

export function useMatch(id: string) {
  return useQuery({ queryKey: keys.match(id), queryFn: () => api<MatchDetail>(`/matches/${id}`) });
}

export function useMyMatches() {
  return useQuery({ queryKey: keys.mine, queryFn: () => api<{ matches: MyMatch[] }>('/users/me/matches') });
}

export function usePublishMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: NewMatch) => api<MatchDetail>('/matches', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: (match) => {
      qc.setQueryData(keys.match(match.id), match);
      void qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useJoinMatch(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ participationId: string; status: string }>(`/matches/${matchId}/join`, { method: 'POST' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['matches'] }),
  });
}

/** HU-08: inicia el pago y abre Webpay. Al volver, el partido muestra el nuevo estado. */
export function useStartPayment(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (participationId: string) => {
      const started = await api<{ paymentId: string; amount: number; checkoutPath: string }>(
        `/payments/${participationId}/init`,
        { method: 'POST' },
      );
      await openCheckout(started.checkoutPath);
      return started;
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.match(matchId) });
      void qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

/** HU-09: cancelar mi cupo. Si estaba pagado, la respuesta trae el reembolso y la retención. */
export function useCancelParticipation(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (participationId: string) =>
      api<{ status: string; refund: { refunded: number; retained: number } | null }>(`/participations/${participationId}`, {
        method: 'DELETE',
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.match(matchId) });
      void qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

export function useApproveParticipation(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (participationId: string) =>
      api<{ participationId: string; status: string }>(`/participations/${participationId}/approve`, {
        method: 'PATCH',
      }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: keys.match(matchId) });
      void qc.invalidateQueries({ queryKey: ['matches'] });
    },
  });
}

/** HU-06: compañeros que aún no califico en este partido. */
export function usePendingRatings(matchId: string) {
  return useQuery({
    queryKey: keys.pending(matchId),
    queryFn: () => api<PendingRatings>(`/matches/${matchId}/ratings/pending`),
  });
}

/** HU-06 + HU-07: califica a un compañero. La respuesta trae su honor ya recalculado. */
export function useRateTeammate(matchId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { ratedId: string; punctuality: number; conduct: number }) =>
      api<{ ratedId: string; honor: { honorScore: number | null } }>(`/matches/${matchId}/ratings`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSettled: (_data, _err, body) => {
      void qc.invalidateQueries({ queryKey: keys.pending(matchId) });
      void qc.invalidateQueries({ queryKey: keys.match(matchId) });
      void qc.invalidateQueries({ queryKey: keys.user(body.ratedId) });
    },
  });
}
