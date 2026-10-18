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

  /** Errores de validación por campo: { password: ['…'] } → { password: '…' }. */
  fieldErrors(): Record<string, string> {
    const details = this.apiError.details;
    if (!details || typeof details !== 'object') return {};
    const out: Record<string, string> = {};
    for (const [field, msgs] of Object.entries(details as Record<string, unknown>)) {
      if (Array.isArray(msgs) && typeof msgs[0] === 'string') out[field] = msgs[0];
    }
    return out;
  }
}

let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;

export const setAuthToken = (token: string | null): void => {
  authToken = token;
};

/** El store de sesión se registra aquí para cerrar sesión si el token venció. */
export const setUnauthorizedHandler = (handler: (() => void) | null): void => {
  onUnauthorized = handler;
};

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) ?? {}),
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiRequestError(0, {
      code: 'NETWORK',
      message: 'No hay conexión con Kancha. Revisa que la API esté levantada.',
      details: null,
    });
  }

  const text = await res.text();
  const body = text ? JSON.parse(text) : null;

  if (!res.ok) {
    if (res.status === 401 && authToken) onUnauthorized?.();
    throw new ApiRequestError(
      res.status,
      body?.error ?? { code: 'UNKNOWN', message: 'Algo falló. Inténtalo de nuevo.', details: null },
    );
  }
  return body as T;
}

export const errorMessage = (err: unknown): string =>
  err instanceof ApiRequestError ? err.message : 'Algo falló. Inténtalo de nuevo.';

export interface HealthResponse {
  status: string;
  db: string;
  version: string;
  timestamp: string;
}

export const getHealth = (): Promise<HealthResponse> => api<HealthResponse>('/health');
