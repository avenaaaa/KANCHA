# DESIGN.md — Kancha

> Guía de identidad visual y diseño UI para Claude Design.  
> Úsala como contexto de sistema al crear componentes, pantallas o elementos visuales de la app Kancha.

---

## 1. Identidad de Marca

**Kancha** es una app mobile de deportes amateur que conecta jugadores para organizar partidos. Resuelve el problema de confianza y logística en el deporte informal.

**Tagline oficial:** _Juega. Conecta. Vive Mejor._

**Deportes principales (todos con igual peso visual):**
- ⚽ Fútbol — el más masivo, deporte número 1 de la plataforma
- 🎾 Pádel — el de mayor crecimiento, comunidad activa
- 🏀 Básquetbol — deporte de origen del proyecto, no el único

> ⚠️ La identidad visual original de la marca usa imágenes solo de basketball. Esto es un error histórico de la presentación. Al diseñar cualquier componente, los tres deportes deben representarse de manera equitativa. Nunca usar basketball como deporte "por defecto".

> ✅ **Ratificado en el Sprint 3 (13-sep-2026).** El alcance del MVP incluye los tres deportes desde el inicio, no solo fútbol. `CLAUDE.md` §1 recoge la decisión y su trazabilidad frente a lo declarado en Fase 1.

---

### Logo

**Nombre:** KANCHA (todo en mayúsculas)

**Ícono:** Figura humana estilizada en movimiento hacia adelante, integrada con flechas dobles (`>>`) que forman visualmente la letra "K". Transmite velocidad, dirección y acción deportiva.

**Tipografía del wordmark:** Anton Regular — condensada, bold, geométrica, toda en mayúsculas.

**Versión completa:** Ícono + wordmark "KANCHA". Usar en splash screens, onboarding y pantallas hero.

**Versión reducida:** Solo ícono + "ANCHA" (la K queda implícita en el ícono). Usar en headers de navegación, favicons y espacios reducidos.

**Espaciado mínimo:** El logo nunca debe tener elementos a menos de 16px de distancia en cualquier lado.

**Sobre fondos:** El logo usa el color bronce/cobre (`#C47A3A`) sobre fondo oscuro. Nunca usar el logo sobre fondos claros ni de color naranja.

---

## 2. Paleta de Colores

### Colores primarios

| Nombre | HEX | Uso |
|---|---|---|
| Naranja acción | `#F0A500` | CTAs, botones primarios, énfasis, elementos interactivos |
| Bronce logo | `#C47A3A` | Logo en versión hero, wordmark, títulos de portada |
| Negro grafito | `#1A1A1A` | Fondo primario de toda la app |

### Colores secundarios

| Nombre | HEX | Uso |
|---|---|---|
| Gris oscuro | `#2A2A2A` | Fondo de cards, paneles, modales, bottom sheets |
| Gris medio | `#3A3A3A` | Líneas divisorias, separadores, bordes sutiles |
| Blanco texto | `#FFFFFF` | Texto principal, títulos en UI, iconos activos |
| Gris claro | `#B0B0B0` | Texto secundario, metadata, timestamps, labels desactivados |

### Reglas críticas de uso del color

- El naranja `#F0A500` es el color de **acción**, nunca de fondo. Solo aparece en botones, badges de honor, íconos de énfasis y highlights de texto.
- Los fondos siempre son oscuros (`#1A1A1A` o `#2A2A2A`). Nunca usar fondos claros o blancos.
- El blanco es exclusivo para texto. Nunca usar como fondo de componentes.
- Nunca combinar el naranja sobre el bronce. Tienen valores similares y se pierden.

### Colores de estado y feedback

| Estado | HEX | Uso |
|---|---|---|
| Éxito | `#2ECC71` | Confirmación de unirse a partido, asistencia marcada |
| Error | `#E74C3C` | Partido cancelado, acción fallida, jugador reportado |
| Advertencia | `#F39C12` | Partido casi lleno, jugador con baja reputación |
| Desactivado | `#555555` | Botones no disponibles, elementos bloqueados |

---

## 3. Tipografía

### Familias

**Anton Regular** — solo para display y hero  
**Roboto** (Bold / Medium / Regular) — para toda la interfaz

### Escala tipográfica

| Rol | Familia | Peso | Tamaño | Uso |
|---|---|---|---|---|
| Hero / Splash | Anton | Regular | 48–72px | Pantallas de sección, portada, onboarding |
| H1 | Roboto | Bold | 28px | Títulos principales de pantalla |
| H2 | Roboto | Bold | 22px | Subtítulos de sección dentro de pantalla |
| H3 | Roboto | Medium | 18px | Encabezados de cards y componentes |
| Body | Roboto | Medium | 15px | Descripciones, contenido de lectura |
| Label | Roboto | Bold | 13px | Tags de deporte, estado del partido, badges |
| Caption | Roboto | Regular | 12px | Metadata, timestamps, información secundaria |
| Botón | Roboto | Bold | 15px | Texto de todos los botones, mayúsculas opcionales |

### Regla de uso Anton vs Roboto

Anton solo aparece en momentos de alto impacto visual: splash screens, pantallas de transición entre secciones y elementos hero de onboarding. **Nunca** usar Anton en componentes funcionales de la UI: cards, botones, formularios, listas ni menús de navegación.

---

## 4. Componentes Principales de la App

### 4.1 Mapa Geolocalizado

El mapa muestra partidos abiertos cerca del usuario. Cada marcador en el mapa diferencia visualmente el deporte:

- **Fútbol:** marcador circular con ícono de balón (blanco/negro) sobre fondo `#F0A500`
- **Pádel:** marcador circular con ícono de raqueta sobre fondo `#F0A500`
- **Básquetbol:** marcador circular con ícono de aro sobre fondo `#F0A500`

El marcador del partido seleccionado se agranda y muestra una card emergente con: deporte, cantidad de jugadores confirmados vs cupos totales, hora y nombre del lugar.

El fondo del mapa debe usar tema oscuro (dark map tiles). Nunca usar mapa con fondo claro o blanco.

### 4.2 Carta de Partido / Jugador

Componente de fondo `#2A2A2A`, bordes redondeados (border-radius 12px), sin sombra. Estructura:

```
[ ícono deporte ]  NOMBRE DEL PARTIDO         [ hora ]
                   📍 Lugar · Deporte · Nivel
                   ██████░░  6/8 jugadores
                   [ UNIRSE → ]
```

- El ícono de deporte en la esquina superior izquierda cambia según el deporte: balón de fútbol / raqueta de pádel / aro de básquet.
- La barra de progreso de jugadores usa `#F0A500` como color de relleno.
- El botón "UNIRSE" es el CTA principal en naranja.

### 4.3 Botón "Falta 1"

El CTA más importante de la app. Fondo `#F0A500`, texto `#1A1A1A` en Roboto Bold 15px. Ancho completo en contexto de partido. Cuando el partido ya está lleno, cambia a estado desactivado (`#555555`). El texto del botón cambia dinámicamente según el partido: "Falta 1", "Faltan 2", "Unirse al partido", etc.

### 4.4 Filtro de Deportes

Selector horizontal tipo chip, ubicado sobre el mapa o lista de partidos. Tres chips fijos:

```
[ ⚽ Fútbol ]  [ 🎾 Pádel ]  [ 🏀 Básquet ]
```

Estado activo: fondo `#F0A500`, texto `#1A1A1A`.  
Estado inactivo: fondo `#2A2A2A`, texto `#B0B0B0`, borde `#3A3A3A`.

Los tres deportes siempre visibles. Ninguno es la selección "por defecto"; el estado inicial muestra todos activos.

### 4.5 Sistema de Honor

El Sistema de Honor es el "Perfil de Confianza" del jugador. Mide tres métricas:
- Tasa de Asistencia (% de partidos a los que fue)
- Tasa de Puntualidad
- Rating de Juego Limpio

**Visualización en perfil:** tres barras o indicadores circulares con colores semáforo (`#2ECC71` alto / `#F39C12` medio / `#E74C3C` bajo). El puntaje global se muestra como badge naranja en la card del jugador.

> **Nota de origen de los datos.** Puntualidad y Juego Limpio provienen de la calificación mutua post-partido (HU-06: los campos `punctuality` y `conduct`). La Tasa de Asistencia **no se califica**: se calcula del historial de participaciones del jugador. Ver `DESARROLLO.md` §5.2. Cuando el jugador no tiene reseñas, las tres barras muestran "Sin calificaciones aún" en vez de cero.

**Visualización en card de partido:** ícono de escudo con puntaje numérico del 1–10 en naranja.

---

## 5. Iconografía Multi-deporte

Los íconos de deporte deben ser simples, reconocibles y legibles a 24px mínimo. Estilo: línea (outline) o sólido según contexto.

| Deporte | Ícono principal | Ícono secundario |
|---|---|---|
| Fútbol | Balón redondo (pentágonos) | Portería |
| Pádel | Raqueta de pádel (forma oval sólida) | Cancha cerrada vista desde arriba |
| Básquetbol | Pelota con líneas de cuero | Aro con red |

**Regla de paridad visual:** los tres íconos deben tener el mismo tamaño óptico, grosor de línea y nivel de detalle. Nunca dar más protagonismo al ícono de basketball por ser el deporte de origen del proyecto.

En contextos donde los tres deportes aparecen juntos (onboarding, selección inicial, filtros), el orden visual siempre es: Fútbol → Pádel → Básquetbol (orden por popularidad, no por origen del proyecto).

---

## 6. Fotografías y Fondos

**Estilo fotográfico:** imágenes deportivas en blanco y negro con overlay oscuro semitransparente (`rgba(0,0,0,0.6)`). El color de la app sale de la paleta, nunca de la fotografía.

**Distribución de deportes en fotografías:** los tres deportes deben representarse por igual. Al seleccionar imágenes de fondo para pantallas hero, splash o secciones, usar en rotación o en conjunto imágenes de fútbol, pádel y básquet.

**Nunca:** usar fotografías a color puro, fotografías con fondos blancos o claros, ni fotografías donde el deporte mostrado no sea relevante para la pantalla.

---

## 7. Estados de Componentes

| Estado | Visual |
|---|---|
| Normal | Colores base de la paleta |
| Pressed / Active | Naranja `#F0A500` en texto o borde; botones bajan opacidad al 85% |
| Disabled | Fondo `#555555`, texto `#888888`, sin interacción |
| Loading | Skeleton de fondo `#2A2A2A` con shimmer gris oscuro |
| Éxito | Borde o badge `#2ECC71` |
| Error | Borde o badge `#E74C3C` + texto de error en `#E74C3C` |

---

## 8. Elementos Gráficos de Marca

**Flechas dobles `>>`:** elemento de identidad visual recurrente. Aparece en el logo, en CTAs de avanzar/continuar y como decoración en pantallas de transición. Nunca usar una sola flecha `>` donde la marca usa `>>`.

**Puntos/círculos naranjas:** usados como bullets en listas de características y como conectores en líneas de tiempo (por ejemplo, en el onboarding o en el historial de partidos). Color: `#F0A500`.

**Tipografía como elemento visual:** en pantallas de sección (transiciones entre bloques de la app), el texto en Anton ocupa el full-screen como elemento gráfico, no como contenido de lectura. Ver slides de "Nuestro Problema" y "Modelo de Negocios" como referencia de tratamiento.

---

## 9. Principios de Diseño Kancha

1. **Oscuro siempre.** La app vive en fondos `#1A1A1A`. El naranja aparece solo para señalar acción.
2. **Los tres deportes son iguales.** Fútbol, pádel y básquetbol tienen el mismo peso en todos los componentes. Ninguno es el deporte "por defecto".
3. **El naranja mueve, no decora.** `#F0A500` solo aparece donde el usuario debe actuar. No es un color de fondo ni decorativo.
4. **Anton para impactar, Roboto para usar.** Las pantallas hero hablan con Anton. La interfaz funcional habla con Roboto.
5. **Las flechas `>>` son la marca.** Son parte del logo y del lenguaje visual. Usar con coherencia en transiciones y navegación hacia adelante.
