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

## Migraciones

| Migración | Contenido |
|---|---|
| `…_init` | Extensión PostGIS, enums, las 5 tablas, índices y restricciones únicas |
| `…_indice_gist_ubicacion` | Índice GIST `idx_match_location` sobre `Match.location` (búsqueda por radio, HU-04) |

El índice GIST se escribió a mano porque Prisma no lo genera sobre una columna `Unsupported`, y además
está declarado en `schema.prisma` (`@@index([location], type: Gist)`). Sin esa declaración, el siguiente
`migrate dev` lo consideraría sobrante y generaría un `DROP INDEX`.

La imagen `postgis/postgis` instala extensiones extra al crear un volumen nuevo. Si `migrate dev`
responde *Drift detected* tras un `docker compose down -v`, ejecuta `npx prisma migrate reset`: la base
local se vacía y se recrea desde las migraciones. Nunca lo hagas contra una base de producción.
