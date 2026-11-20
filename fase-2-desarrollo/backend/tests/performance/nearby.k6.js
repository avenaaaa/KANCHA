// R-01 y R-02 (docs/04-plan-pruebas.md §7): búsqueda por radio con 20 usuarios virtuales durante 1 minuto.
// Sin pausa entre peticiones: cada usuario repite la búsqueda apenas recibe la respuesta, más exigente que
// 20 personas reales. Umbral: P95_MS (300 ms con el seed, R-01; 500 ms con 10.000 partidos, R-02).
import http from 'k6/http';
import { check } from 'k6';

const BASE = __ENV.BASE_URL || 'http://api:3000/api/v1';
const P95 = Number(__ENV.P95_MS || 300);

export const options = {
  vus: 20,
  duration: '1m',
  thresholds: {
    'http_req_duration{name:nearby}': [`p(95)<${P95}`],
    'http_req_failed{name:nearby}': ['rate==0'],
  },
};

// Puntos dentro de La Florida: cada usuario virtual busca desde un lugar distinto.
const ORIGINS = [
  [-33.5425, -70.585],
  [-33.5228, -70.5983],
  [-33.53, -70.57],
  [-33.55, -70.59],
  [-33.515, -70.585],
];

export function setup() {
  const res = http.post(
    `${BASE}/auth/login`,
    JSON.stringify({ email: 'camila@kancha.cl', password: 'kancha2026' }),
    { headers: { 'Content-Type': 'application/json' } },
  );
  if (res.status !== 200) throw new Error(`No se pudo iniciar sesión: ${res.status}`);
  return { token: res.json('token') };
}

export default function (data) {
  const [lat, lng] = ORIGINS[(__VU + __ITER) % ORIGINS.length];
  const res = http.get(`${BASE}/matches/nearby?lat=${lat}&lng=${lng}&radius=5000`, {
    headers: { Authorization: `Bearer ${data.token}` },
    tags: { name: 'nearby' },
  });
  check(res, { 'responde 200 con partidos': (r) => r.status === 200 && Array.isArray(r.json('matches')) });
}
