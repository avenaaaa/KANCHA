# Backend — API REST de Kancha

## Capas

```
routes/        define rutas y aplica middlewares. NO toca la base de datos
controllers/   traduce HTTP a llamadas de servicio y de vuelta
services/      lógica de negocio. Testeable sin HTTP ni base de datos
repositories/  único punto de acceso a Prisma
```

Esta separación **no es negociable**: es la evidencia de la competencia C4 y la razón por la que
`honor.service` y `payment.service` se prueban sin levantar un servidor. Ver `CLAUDE.md` §8.

## Servicios ya implementados

| Servicio | Qué resuelve | Historias |
|---|---|---|
| `honor.service` | Cálculo de reputación y ventana de 48 h | HU-06, HU-07 |
| `payment.service` | Cuota individual, comisión y retención | HU-08, HU-09 |

Ambos son funciones puras: entran datos, salen datos. Sin efectos secundarios.

## Comandos

```bash
npm run dev            # desarrollo con recarga
npm test               # pruebas unitarias
npm run build          # compila a dist/
npx prisma migrate dev # crea y aplica una migración
npx prisma studio      # explorador visual de la base de datos
```

## Migración manual pendiente

Prisma no genera índices GIST. Después de la primera migración, añade a mano:

```sql
CREATE INDEX idx_match_location ON "Match" USING GIST (location);
```

Sin ese índice la búsqueda por radio funciona igual, pero recorre toda la tabla.
