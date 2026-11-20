# Kancha

[![CI](https://github.com/avenaaaa/KANCHA/actions/workflows/ci.yml/badge.svg)](https://github.com/avenaaaa/KANCHA/actions/workflows/ci.yml)

**Juega. Conecta. Vive Mejor.**

Plataforma web y móvil geolocalizada que conecta a jugadores sin equipo ("agentes libres") con partidos amateur a los que les falta gente, en la comuna de La Florida. Incluye un Sistema de Honor con reputación entre jugadores y pago fraccionado del arriendo con Transbank.

Proyecto de Título · Ingeniería en Informática · Duoc UC Sede Plaza Vespucio · Lukas Guerrero · 2026

## Cómo levantarlo

Requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/avenaaaa/KANCHA.git
cd KANCHA
docker compose up --build
```

En Windows basta con un doble clic en `iniciar-kancha.bat`: revisa que Docker Desktop esté abierto,
levanta los tres contenedores, espera a que la API responda y abre la app en el navegador.
`detener-kancha.bat` lo apaga.

| Dirección | Qué hay |
|---|---|
| http://localhost:8080 | La app Kancha (versión web) |
| http://localhost:3000/api/docs | Documentación de la API (Swagger UI) |
| http://localhost:3000/api/v1/health | Estado de la API y la base de datos |

### Ver la app en el celular (iPhone o Android)

1. Con la API levantada (`docker compose up -d db api`), instala **Expo Go** desde App Store o Google Play.
2. Conecta el celular a la misma red que el PC y, en `fase-2-desarrollo/mobile`, ejecuta `npx expo start --lan`.
3. Escanea el código QR: con la cámara en iPhone, con Expo Go en Android.

La app se conecta sola a la API del PC que la sirve. Si Windows pregunta por el firewall de Node.js,
permite las redes privadas.

### Cuentas de demostración

La base arranca con datos de La Florida: 8 jugadores, 15 partidos con cupo (5 de fútbol, 5 de pádel
y 5 de básquetbol; uno de cada deporte es un "falta uno" urgente que empieza en menos de 2 horas, y el
de pádel ya está destacado, así que quien se une entra gratis), un partido histórico con reseñas y un partido de pádel que terminó hace 3 horas,
listo para registrar asistencia y calificar en vivo. Todas las cuentas usan la contraseña `kancha2026`.

| Cuenta | Para qué sirve en la demo |
|---|---|
| `camila@kancha.cl` | Jugadora con honor alto; organiza el pádel que acaba de terminar: marca quién asistió |
| `lukas@kancha.cl` | Jugó ese pádel: califica a sus compañeros desde "Mis partidos" |
| `diego@kancha.cl` | Organizador con honor bajo: puntualidad y juego limpio en rojo |
| `ignacio@kancha.cl` | Jugador sin reseñas: muestra "Sin calificaciones aún" |

Los datos de demostración se regeneran en cada `docker compose up`, con horarios a partir del día
en que se levanta el sistema. Eso borra lo que se haya creado antes: es el comportamiento de la demo
local (`DEMO_MODE` en `docker-compose.yml`) y no ocurre en un despliegue real.

## Qué funciona hoy

| Historia | Qué se puede hacer |
|---|---|
| HU-01 · Registro | Crear cuenta con la disciplina favorita; el honor parte en "Sin calificaciones aún" |
| HU-03 · Publicar | Publicar un partido marcando la cancha en el mapa, con día, hora, cupos y arriendo |
| HU-04 · Mapa | Ver los partidos con cupo en un radio de 2, 5 o 10 km, filtrados por deporte, horario y nivel |
| Falta uno | Con el botón "Falta uno" del mapa, ver solo los partidos urgentes: les falta un jugador y empiezan en 2 horas o menos |
| Falta uno destacado | Si al organizador le faltan 1 o 2 jugadores y el partido empieza en 2 horas o menos, la app le ofrece destacarlo: va primero en "Falta uno" y quien se une entra gratis, como invitado: al tiro si su honor es 7 o más, y si no el organizador lo aprueba. Probarlo: entrar como `diego@kancha.cl` y abrir su "Fútbol 5 · Falta uno ya" |
| Comuna y canchas | El mapa dibuja el límite real de La Florida. Al publicar se elige una de las 36 canchas de la comuna tocando su pin (24 abiertas al público, 5 municipales y 7 privadas; un "$" marca las que se arriendan) o se marca un punto, y la dirección se completa sola |
| HU-05 · Postular | Postular con "Falta 1", que el organizador apruebe o rechace, y quedar confirmado sin sobreventa del último cupo |
| HU-08 · Pagar | Pagar la parte del arriendo más un 10 % de servicio con Webpay Plus (Transbank, ambiente de Integración) y ver el comprobante |
| HU-09 · Cancelar | Cancelar el cupo: con 12 h o más se devuelve el 100 %; con menos, se retiene el 50 % |
| HU-06 · Calificar | Terminado el partido, calificar de 1 a 5 la puntualidad y la conducta de cada compañero, durante 48 h y una sola vez |
| HU-07 · Honor | El puntaje de honor (0 a 10) se recalcula al instante con cada reseña y cada asistencia registrada |
| HU-02 · Carta | Ver la carta de jugador de cualquier participante: honor, partidos jugados y métricas, sin su correo |
| Asistencia | El organizador marca quién asistió y quién no se presentó; eso suma partidos jugados y cuenta en el honor |

La notificación de cupo disponible (HU-10) quedó fuera del alcance del MVP el 8 de noviembre de 2026.

Los datos geográficos (límite de la comuna, ubicación de las canchas y direcciones) son de © colaboradores
de [OpenStreetMap](https://www.openstreetmap.org/copyright), bajo licencia ODbL. La lista de canchas sale
además de la Municipalidad de La Florida, su Corporación de Deportes y los sitios de cada club
(`DESARROLLO.md` §1).

## Estructura del repositorio

Una carpeta por cada fase del Portafolio de Título.

| Carpeta | Contenido | Estado |
|---|---|---|
| [`fase-1-definicion/`](fase-1-definicion/) | Definición del proyecto: documento consolidado, los diez documentos ágiles, Excel y diagramas | ✅ Entregada · agosto 2026 |
| [`fase-2-desarrollo/`](fase-2-desarrollo/) | La aplicación: `backend/` (API), `mobile/` (app Expo) y [`docs/`](fase-2-desarrollo/docs/) (arquitectura, modelo de datos, UML, plan de pruebas y documentos de cada sprint) | 🔄 En curso · Sprint 8 de 9 · las 9 historias del MVP terminadas y auditadas |
| [`fase-3-implementacion/`](fase-3-implementacion/) | Despliegue, pruebas de rendimiento, cierre de pruebas y defensa | ⏳ Sprints 8 y 9 · nov–dic 2026 |

Cada fase se ordena igual: `entrega/` reúne lo que se presenta en la evaluación (guía de la asignatura,
documentos individuales y presentación) y `docs/` reúne los documentos de la fase.

## Stack

Expo (React Native) · Node.js + Express · PostgreSQL + PostGIS · Prisma · Docker · GitHub Actions · Transbank Webpay (integración)

Metodología: Scrum en sprints de 2 semanas, gestionado en Jira.
