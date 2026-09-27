# GUIA-ARRANQUE.md — De cero a GitHub con Docker

> Guía para dejar Kancha listo antes de programar. Síguela en orden, una sola vez.
> Cada paso explica **qué** haces y **por qué**, para que al final entiendas tu propio setup
> y puedas defenderlo ante la comisión.
>
> Tiempo estimado: 1,5 a 2 horas la primera vez.

---

## Antes de empezar: tres ideas que necesitas

**Git** guarda la historia de tu proyecto en tu PC. Cada *commit* es una foto del código con un
mensaje que explica qué cambió. Las *ramas* son líneas de trabajo paralelas: `main` es lo estable,
`develop` es donde integras, y cada historia de usuario tiene su propia rama.

**GitHub** es la copia en internet de ese historial. Ahí el profesor ve tu código, tus commits
(evidencia de C2) y el CI en verde. Git vive en tu PC; GitHub es el servidor.

**Docker** empaqueta cada pieza de Kancha en un *contenedor*: una caja aislada con su propio sistema
y dependencias. `docker-compose.yml` describe las tres cajas (base de datos, API y web) y cómo se
conectan. Por eso el profesor no necesita instalar Node ni PostgreSQL: solo Docker.

| Concepto Docker | Qué es | En Kancha |
|---|---|---|
| Imagen | La receta congelada (se construye con un `Dockerfile`) | `postgis/postgis`, la imagen de tu API |
| Contenedor | Una imagen en ejecución | `kancha-db`, `kancha-api`, `kancha-web` |
| Volumen | Disco que sobrevive aunque borres el contenedor | `kancha-db-data` guarda los datos |
| Puerto | La puerta entre tu PC y el contenedor | `3000` API, `8080` web, `5432` base |

---

## Paso 1 — Verificar herramientas

Abre **PowerShell** (tecla Windows → escribe *PowerShell*) y ejecuta uno por uno:

```powershell
git --version
gh --version
docker --version
node --version
```

Instala solo lo que falte:

| Si falla... | Instálalo con |
|---|---|
| `git` | `winget install --id Git.Git -e` |
| `gh` | `winget install --id GitHub.cli -e` |
| `docker` | `winget install --id Docker.DockerDesktop -e` (luego reinicia el PC) |
| `node` o versión menor a 22.13 | `winget install --id OpenJS.NodeJS.LTS -e` |

Cierra y vuelve a abrir PowerShell después de instalar, para que reconozca los comandos nuevos.

**Docker Desktop tiene que estar abierto** (ícono de la ballena en la barra de tareas, en verde)
cada vez que uses `docker`. Si `docker --version` funciona pero `docker ps` da error, es porque
Docker Desktop está cerrado.

---

## Paso 2 — Configurar Git (una sola vez en tu vida)

```powershell
git config --global user.name "Lukas Guerrero"
git config --global user.email "TU_CORREO_DE_GITHUB"
git config --global init.defaultBranch main
git config --global core.autocrlf false
```

`core.autocrlf false` deja que el archivo `.gitattributes` del repo decida los saltos de línea.
Es importante en Windows: un script con saltos de Windows falla dentro de un contenedor Linux.

Conecta la terminal con tu cuenta de GitHub:

```powershell
gh auth login
```

Responde: **GitHub.com → HTTPS → Yes → Login with a web browser**. Copia el código que aparece,
pégalo en la página que se abre y autoriza.

---

## Paso 3 — La estructura del proyecto

```
KANCHA/
├── README.md               portada del repo
├── CLAUDE.md               contexto para Claude Code
├── DESIGN.md               identidad visual
├── DESARROLLO.md           guía técnica
├── GUIA-ARRANQUE.md        este archivo
├── docker-compose.yml      las 3 cajas de Docker
├── .env.example            variables de ejemplo
├── .gitignore / .gitattributes
├── .github/workflows/      CI de GitHub Actions
├── fase-1-definicion/      documento consolidado, excel/, diagramas/, presentacion/
├── fase-2-desarrollo/
│   ├── backend/            API
│   ├── mobile/             app Expo
│   └── docs/               modelo de datos, UML, diagramas/, evidencias/
└── fase-3-implementacion/
```

---

## Paso 4 — Instalar dependencias

Cada proyecto de Node declara sus librerías en `package.json`. `npm install` las descarga en
`node_modules/` y crea `package-lock.json`, que congela las versiones exactas. Ese lock **sí** va a
GitHub: garantiza que el CI y Docker instalen exactamente lo mismo que tú.

```powershell
cd C:\Users\guerr\Desktop\KANCHA\fase-2-desarrollo\backend
npm install

cd ..\mobile
npm install
```

La app móvil no tenía `package-lock.json`; este paso lo crea. Sin él, Docker y el CI fallan.

---

## Paso 5 — Crear la primera migración de la base de datos

Una **migración** es un archivo SQL versionado que describe un cambio en la base. Con ellas, la base
del CI, la de Docker y la de la nube siempre tienen el mismo esquema, y el historial de cambios del
modelo queda como evidencia de C3.

**5.1 Levanta solo la base de datos:**

```powershell
cd C:\Users\guerr\Desktop\KANCHA
docker compose up -d db
docker compose ps
```

`-d` la deja corriendo en segundo plano. Espera a que `kancha-db` diga `healthy`.

**5.2 Genera la migración inicial desde `schema.prisma`:**

```powershell
cd fase-2-desarrollo\backend
$env:DATABASE_URL = "postgresql://kancha:kancha@localhost:5432/kancha"
npx prisma migrate dev --name init
```

Se crea `prisma/migrations/<fecha>_init/migration.sql` con todas las tablas.

**5.3 Agrega el índice espacial (Prisma no lo genera solo):**

```powershell
npx prisma migrate dev --create-only --name indice_gist_ubicacion
```

Abre el `migration.sql` vacío que se creó en la carpeta `..._indice_gist_ubicacion`, pega el
contenido de `prisma/gist-index.sql` y guarda. Luego aplícala:

```powershell
npx prisma migrate dev
```

Desde ahora `gist-index.sql` ya no se usa; puedes moverlo a `_revisar/`.

**5.4 Comprueba el backend:**

```powershell
npm run lint
npm test
```

Si `lint` marca errores, corrígelos antes de seguir (Claude Code puede ayudarte). El CI ejecuta
exactamente estos comandos: si fallan aquí, fallarán en GitHub.

---

## Paso 6 — Levantar Kancha completo con Docker

```powershell
cd C:\Users\guerr\Desktop\KANCHA
docker compose up --build
```

La primera vez tarda varios minutos. Cuando termine, abre:

| Dirección | Qué deberías ver |
|---|---|
| http://localhost:3000/api/v1/health | `{"status":"ok","db":"connected"}` |
| http://localhost:8080 | La pantalla de Kancha |

Para detenerlo: `Ctrl + C` en esa ventana, y después `docker compose down`.

### Comandos de Docker que vas a usar todos los días

| Comando | Para qué |
|---|---|
| `docker compose up --build` | Construye y levanta todo, mostrando los logs |
| `docker compose up -d` | Levanta todo en segundo plano |
| `docker compose ps` | Qué contenedores corren y si están sanos |
| `docker compose logs -f api` | Ver en vivo los logs de la API |
| `docker compose down` | Detiene y elimina los contenedores (los datos quedan en el volumen) |
| `docker compose down -v` | Igual, pero **borra la base de datos** (útil para empezar de cero) |

---

## Paso 7 — Primer commit y subida a GitHub

```powershell
cd C:\Users\guerr\Desktop\KANCHA
git init
git add .
git status
```

**Revisa `git status` antes de seguir.** No deben aparecer `node_modules/` ni `.env`.
Si aparece alguno, avísame: el `.gitignore` no está haciendo su trabajo.

```powershell
git commit -m "chore: estructura inicial del proyecto en 3 fases (KAN-24)"
gh repo create kancha --public --source=. --remote=origin --push
```

Ese último comando crea el repositorio público en tu cuenta y sube todo. Ahora crea `develop`:

```powershell
git checkout -b develop
git push -u origin develop
```

Marca el cierre del Sprint 3 con un tag:

```powershell
git tag -a v0.3.0 -m "Sprint 3: modelo de datos, diagramas UML y esqueleto"
git push origin v0.3.0
```

---

## Paso 8 — Ajustes en la web de GitHub

1. Entra a `https://github.com/TU_USUARIO/kancha` y abre la pestaña **Actions**: el CI debería
   estar corriendo. Espera el check verde ✔.
2. **Settings → Branches → Add branch ruleset** sobre `main`: exige Pull Request y que el CI
   pase antes de mergear.
3. En `README.md`, reemplaza `USUARIO` por tu usuario de GitHub, haz commit y push.
4. Envía el link del repositorio al profesor.

---

## Paso 9 — Tu ritmo de trabajo desde mañana

Cada historia de usuario sigue el mismo ciclo:

```powershell
git checkout develop
git pull
git checkout -b feat/KAN-7-registro        # una rama por historia

# ... programas, y guardas avances pequeños:
git add .
git commit -m "feat(auth): add register endpoint (HU-01, KAN-7)"
git push -u origin feat/KAN-7-registro
```

Luego en GitHub abres un **Pull Request** de tu rama hacia `develop`, esperas el CI en verde y
haces merge. Al cerrar el sprint, mergeas `develop` a `main` y creas el tag (`v0.5.0`, etc.).

| Tipo de commit | Cuándo |
|---|---|
| `feat(...)` | Funcionalidad nueva |
| `fix(...)` | Corrección de un error |
| `test(...)` | Pruebas |
| `docs(...)` | Documentación |
| `chore(...)` | Configuración, dependencias, estructura |

Commits pequeños y diarios valen más que uno gigante el domingo: el historial es evidencia de C2.

---

## Si algo falla

| Síntoma | Causa probable | Solución |
|---|---|---|
| `docker: command not found` o error de conexión | Docker Desktop cerrado | Ábrelo y espera la ballena verde |
| `port is already allocated` | Otro programa usa el puerto 5432 o 3000 | Cierra ese programa o un PostgreSQL local |
| `npm ci` falla en Docker o en el CI | Falta `package-lock.json` | Repite el paso 4 y haz commit del lock |
| La web dice "API no disponible" | La API aún no arranca o falló | `docker compose logs api` |
| `gh: not logged in` | Falta el login | `gh auth login` |
| `migrate dev` dice *Drift detected* con `postgis_topology`, `fuzzystrmatch`… | La imagen `postgis/postgis` instala extensiones extra al crear un volumen nuevo | En la base **local**: `npx prisma migrate reset` (la vacía y la recrea desde las migraciones) |
| Docker Desktop abre pero el motor queda en `stopped` | Falta WSL 2 (Windows 11 Home) | PowerShell como administrador: `wsl --install --no-distribution` y reinicia |

---

*Kancha · Portafolio de Título · Lukas Guerrero · Sprint 5, septiembre 2026*
