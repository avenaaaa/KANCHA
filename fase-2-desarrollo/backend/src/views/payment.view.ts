import type { PaymentResult } from '../services/payment.service.js';

/**
 * Páginas que el jugador ve en el navegador durante el pago (HU-08). Las sirve la
 * API, fuera de la app, así que repiten los colores de DESIGN.md §2 a mano.
 */

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c);

const clp = (n: number) => `$${n.toLocaleString('es-CL')}`;

function page(title: string, body: string, head = ''): string {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)} · Kancha</title>${head}
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#1A1A1A;color:#FFFFFF;font:16px/1.5 system-ui,sans-serif}
  main{width:min(420px,calc(100% - 32px));background:#2A2A2A;border-radius:16px;padding:24px}
  h1{margin:0 0 4px;font-size:22px} p{margin:0;color:#B0B0B0}
  dl{display:grid;grid-template-columns:auto 1fr;gap:8px 16px;margin:20px 0 0} dt{color:#B0B0B0} dd{margin:0;text-align:right}
  .ok{color:#2ECC71} .ko{color:#E74C3C} .brand{color:#F0A500;font-weight:700;letter-spacing:.08em}
  button{margin-top:20px;width:100%;min-height:48px;border:0;border-radius:12px;background:#F0A500;color:#1A1A1A;font-weight:700;font-size:16px}
</style></head><body><main><p class="brand">KANCHA</p>${body}</main></body></html>`;
}

/** Envía el token a Webpay por POST, como exige Transbank. El botón sirve si el script no corre. */
export function checkoutPage(formUrl: string, token: string, amount: number, nonce: string): string {
  return page(
    'Pagando',
    `<h1>Te llevamos a Webpay</h1><p>Pagarás ${clp(amount)} con Transbank.</p>
<form id="webpay" method="post" action="${escape(formUrl)}">
<input type="hidden" name="token_ws" value="${escape(token)}"><button type="submit">Ir a pagar</button></form>
<script nonce="${nonce}">document.getElementById('webpay').submit()</script>`,
  );
}

/** Comprobante (HU-08): "mi cupo cambia a Confirmado y pagado y recibo un comprobante". */
export function resultPage(r: PaymentResult): string {
  const rows: [string, string][] = [
    ['Partido', r.matchTitle],
    ['Monto', clp(r.amount)],
    ['Orden de compra', r.buyOrder],
  ];
  if (r.authorizationCode) rows.push(['Código de autorización', r.authorizationCode]);
  if (r.cardLast4) rows.push(['Tarjeta', `•••• ${r.cardLast4}`]);
  if (r.at) rows.push(['Fecha', r.at.toLocaleString('es-CL', { timeZone: 'America/Santiago' })]);

  const head = r.approved
    ? `<h1 class="ok">Pago aprobado</h1><p>Tu cupo quedó confirmado y pagado. Guarda este comprobante.</p>`
    : `<h1 class="ko">El pago no se completó</h1><p>No se hizo ningún cobro y tu cupo quedó libre para otro jugador. Si aún hay lugar, puedes volver a postular desde la app.</p>`;

  return page(
    r.approved ? 'Pago aprobado' : 'Pago no completado',
    `${head}<dl>${rows.map(([k, v]) => `<dt>${escape(k)}</dt><dd>${escape(v)}</dd>`).join('')}</dl>
<p style="margin-top:20px">Ya puedes cerrar esta ventana y volver a Kancha.</p>`,
  );
}
