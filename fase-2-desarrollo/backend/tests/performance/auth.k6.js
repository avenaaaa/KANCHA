// R-04 (docs/04-plan-pruebas.md §7): registro y login con bcrypt de costo 12, 5 usuarios virtuales durante 1 minuto.
// Cada iteración registra una cuenta nueva y entra con ella. Se corre con REGISTER_RATE_LIMIT elevado
// solo en el contenedor local: lo que se mide es el costo de bcrypt, no el límite de intentos (S-12).
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE_URL || 'http://api:3000/api/v1';
const JSON_HEADERS = { headers: { 'Content-Type': 'application/json' } };

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: {
    'http_req_duration{name:register}': ['p(95)<800'],
    'http_req_duration{name:login}': ['p(95)<800'],
    http_req_failed: ['rate==0'],
  },
};

export default function () {
  const email = `k6-${__VU}-${__ITER}-${Date.now()}@carga.test`;
  const body = JSON.stringify({ email, password: 'kancha2026', name: 'Carga k6', favoriteSport: 'PADEL' });

  const reg = http.post(`${BASE}/auth/register`, body, { ...JSON_HEADERS, tags: { name: 'register' } });
  check(reg, { 'registro 201': (r) => r.status === 201 });

  const login = http.post(`${BASE}/auth/login`, JSON.stringify({ email, password: 'kancha2026' }), {
    ...JSON_HEADERS,
    tags: { name: 'login' },
  });
  check(login, { 'login 200': (r) => r.status === 200 });
}
