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

### Cuentas de demostración

La base arranca con datos de La Florida: 8 jugadores y 12 partidos con cupo (4 de fútbol, 4 de pádel
y 4 de básquetbol). Todas las cuentas usan la contraseña `kancha2026`.

| Cuenta | Para qué sirve en la demo |
|---|---|
| `camila@kancha.cl` | Jugadora con honor alto; organiza partidos |
| `diego@kancha.cl` | Organizador con honor bajo: puntualidad y juego limpio en rojo |
| `ignacio@kancha.cl` | Jugador sin reseñas: muestra "Sin calificaciones aún" |

Los datos de demostración se regeneran en cada `docker compose up`, con horarios a partir del día
en que se levanta el sistema.

## Qué funciona hoy

| Historia | Qué se puede hacer |
|---|---|
| HU-01 · Registro | Crear cuenta con la disciplina favorita; el honor parte en "Sin calificaciones aún" |
| HU-03 · Publicar | Publicar un partido marcando la cancha en el mapa, con día, hora, cupos y arriendo |
| HU-04 · Mapa | Ver los partidos con cupo en un radio de 2, 5 o 10 km, filtrados por deporte y horario |
| HU-05 · Postular | Postular con "Falta 1", que el organizador apruebe y quedar confirmado, sin sobreventa del último cupo |

## Estructura del repositorio

Una carpeta por cada fase del Portafolio de Título.

| Carpeta | Contenido | Estado |
|---|---|---|
| [`fase-1-definicion/`](fase-1-definicion/) | Definición del proyecto: documento consolidado, los diez documentos ágiles, Excel y diagramas | ✅ Entregada · agosto 2026 |
| [`fase-2-desarrollo/`](fase-2-desarrollo/) | La aplicación: `backend/` (API), `mobile/` (app Expo) y [`docs/`](fase-2-desarrollo/docs/) (arquitectura, modelo de datos, UML, plan de pruebas y documentos de cada sprint) | 🔄 En curso · Sprint 6 de 9 |
| [`fase-3-implementacion/`](fase-3-implementacion/) | Últimas historias, despliegue, pruebas finales y cierre | ⏳ Sprints 8 y 9 · nov–dic 2026 |

Cada fase se ordena igual: `entrega/` reúne lo que se presenta en la evaluación (guía de la asignatura,
documentos individuales y presentación) y `docs/` reúne los documentos de la fase.

## Stack

Expo (React Native) · Node.js + Express · PostgreSQL + PostGIS · Prisma · Docker · GitHub Actions · Transbank Webpay (integración)

Metodología: Scrum en sprints de 2 semanas, gestionado en Jira.
