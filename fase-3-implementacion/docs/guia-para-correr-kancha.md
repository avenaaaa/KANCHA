# Guía para hacer correr Kancha

Kancha se puede abrir de tres formas. En una presentación se usan las tres, cada una como respaldo de la
anterior:

| Forma | Para qué | Qué necesita |
|---|---|---|
| **A. La nube** | Que la comisión la abra en su propio teléfono | Internet |
| **B. Docker en el PC** | Respaldo en el notebook, con datos recién cargados | Docker Desktop e internet (el mapa y Webpay son externos) |
| **C. Expo Go** | Mostrar la app nativa en el iPhone del autor | La cuenta de Expo `avenaaaa` en el PC y en el teléfono, y la misma red Wi-Fi |

Las cuentas de demostración y lo que muestra cada una están en el [README](../../README.md#cuentas-de-demostración):
`camila`, `lukas`, `diego` e `ignacio`, todas `@kancha.cl` y con la clave `kancha2026`. El recorrido de la demo
está en [`DESARROLLO.md` §14](../../DESARROLLO.md#14-guion-de-la-demo-ante-la-comisión).

Los comandos son de PowerShell y se ejecutan desde la carpeta del repositorio.

---

## A. La nube

![QR de la demo en la nube](qr-demo-nube.png)

El QR abre https://kancha-web.onrender.com. Va en la lámina de la demo.

1. **Tres minutos antes**, abre https://kancha-api-u3v4.onrender.com/api/v1/health y espera a que diga
   `"status":"ok"`. Render duerme la API tras 15 minutos sin uso y tarda cerca de un minuto en despertar.
2. Abre https://kancha-web.onrender.com, o pide a la comisión que escanee el QR.
3. Entra con una cuenta de demostración.

### Recargar los datos de la nube

Los partidos de demostración se crean con horarios a partir del momento en que se cargan: unas horas
después, los "Falta uno" ya vencieron. Recárgalos **menos de una hora antes** de presentar. Esto borra todo
lo creado en la nube (partidos, postulaciones y pagos de prueba) y vuelve a cargar la demo.

1. En Render, abre `kancha-api` → **Environment** y copia `DATABASE_URL` con el botón de copiar, sin mostrarla.
2. Entra a la carpeta del backend:

   ```powershell
   cd fase-2-desarrollo\backend
   ```

3. Solo la primera vez en ese PC, instala las dependencias:

   ```powershell
   npm ci
   ```

4. Carga los datos en la nube. Lee la cadena del portapapeles sin mostrarla, corre el seed y borra las dos
   variables al terminar, para que ningún comando posterior apunte a la nube por error. `JWT_SECRET` es de
   relleno: el seed lo pide al leer la configuración, pero no firma nada.

   ```powershell
   $env:DATABASE_URL = Get-Clipboard; $env:JWT_SECRET = 'relleno-solo-para-el-seed'; npx prisma db seed; Remove-Item Env:DATABASE_URL, Env:JWT_SECRET
   ```

5. Debe terminar con `The seed command has been executed.` Abre la web y comprueba que el mapa muestra
   partidos.

La versión de Git Bash y el resto del despliegue están en [`DESARROLLO.md` §8](../../DESARROLLO.md#8-despliegue-gratuito-respaldo-de-la-demo).

---

## B. Docker en el PC

1. Abre Docker Desktop y espera a que diga **Engine running**.
2. Haz doble clic en `iniciar-kancha.bat`, en la raíz del repositorio. Levanta la base, la API y la web,
   espera a que la API responda y abre http://localhost:8080.
3. Los datos de demostración se regeneran cada vez que se levanta, con horarios desde ese momento.
4. Para apagarlo: doble clic en `detener-kancha.bat`.

### Si Docker Desktop no arranca

Si aparece un error con `rename …sock …sock.stale: El sistema no tiene acceso al archivo`:

1. Cierra Docker Desktop desde su ícono junto al reloj (**Quit Docker Desktop**). No lo mates a la fuerza:
   eso vuelve a dejar los archivos rotos.
2. Renombra las dos carpetas que tienen los archivos rotos. Docker crea carpetas nuevas al abrirse. Si
   PowerShell dice que el nombre ya existe, cambia la fecha del final.

   ```powershell
   Rename-Item "$env:LOCALAPPDATA\Docker\run" "run-roto-23nov"; Rename-Item "$env:LOCALAPPDATA\docker-secrets-engine" "docker-secrets-engine-roto-23nov"
   ```

3. Abre Docker Desktop de nuevo.

**Nunca uses "Reset to factory defaults"**: borra todas las imágenes y los datos de Docker.

---

## C. Expo Go en el iPhone

Desde 2026, Expo Go solo abre proyectos de la cuenta con la que se inició sesión. Kancha está registrado como
`@avenaaaa/kancha`, así que esta forma sirve solo en el teléfono del autor. Cualquier otra persona usa la web.

1. Entra a la carpeta de la app:

   ```powershell
   cd fase-2-desarrollo\mobile
   ```

2. Solo la primera vez en ese PC, instala las dependencias:

   ```powershell
   npm ci
   ```

3. Levanta el servidor de Expo conectado a la nube. Sin la primera parte, la app usa la API de Docker del PC
   (forma B).

   ```powershell
   $env:EXPO_PUBLIC_API_URL = 'https://kancha-api-u3v4.onrender.com/api/v1'; npx expo start --clear
   ```

4. Escanea el QR de la terminal con la cámara del iPhone, conectado a la misma red Wi-Fi que el PC.

### Si algo falla

| Qué pasa | Qué hacer |
|---|---|
| Expo Go dice que no hay sesión en Expo CLI | Inicia sesión en el PC con el comando de abajo. Abre a mano el enlace que imprime, en Chrome, y aprueba con la cuenta de GitHub (no tiene contraseña) |
| El teléfono no encuentra el servidor | La red de la sala puede aislar los equipos entre sí. Activa el punto de acceso del iPhone, conecta el PC a esa red y vuelve al paso 3. Pruébalo antes del día |
| Nada funciona | Abre la web en Safari: es la misma app |

```powershell
$env:BROWSER = 'none'; npx expo login
```

---

## El día de la presentación

| Cuándo | Qué |
|---|---|
| La semana antes | Entra al panel de Supabase: pausa los proyectos gratuitos tras una semana sin uso |
| Menos de una hora antes | Recarga los datos de la nube (A) y levanta Docker en el notebook (B) |
| Tres minutos antes | Abre `/api/v1/health` y la web |
| Durante la demo | La comisión entra por el QR (A). Tú muestras la app nativa en el iPhone (C) |
| Si la nube falla | Cambia a Docker en el notebook (B) |
| Si no hay internet | El mapa y Webpay no funcionan ni en local: usa el video de respaldo |

Para pagar en Webpay (ambiente de integración de Transbank) se usan los datos de prueba que publica
Transbank: tarjeta VISA `4051 8856 0044 6623`, CVV `123`, cualquier fecha futura; en la página del banco,
RUT `11.111.111-1` y clave `123`. Si Transbank está lento, muestra un pago ya hecho en "Mis partidos".
