/**
 * Cliente HTTP de la API de Kancha.
 * La URL viene de EXPO_PUBLIC_API_URL: Expo solo expone al bundle las
 * variables con ese prefijo.
 */
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';

export interface ApiError {
  code: string;
  message: string;
  details: unknown;
}

export class ApiRequestError extends Error {
  constructor(
    public readonly status: number,
    public readonly apiError: ApiError,
  ) {
    super(apiError.message);
    this.name = 'ApiRequestError';
  }
}

let authToken: string | null = null;
export const setAuthToken = (token: string | null): void => {
  authToken = token;
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new ApiRequestError(
      res.status,
      body?.error ?? { code: 'UNKNOWN', message: 'Error desconocido', details: null },
    );
  }
  return body as T;
}

export interface HealthResponse {
  status: string;
  db: string;
  version: string;
  timestamp: string;
}

export const getHealth = (): Promise<HealthResponse> => api<HealthResponse>('/health');
