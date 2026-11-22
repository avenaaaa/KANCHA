# Auditoría de cierre — Kancha

> Fase 2 · Evidencia de la competencia **C1** (pruebas de certificación) · Issue **KAN-31**
> Auditoría del 14 de noviembre de 2026. Correcciones del 15 de noviembre de 2026.

Antes de la defensa se revisó todo el sistema en busca de defectos que las pruebas automáticas no
habían detectado. Este documento registra qué se encontró, cómo se comprobó y cómo quedó cada punto.

---

## 1. Cómo se hizo

1. **Seis revisiones independientes**, cada una con un foco: lógica de negocio y dinero, seguridad de la
   API (OWASP API Top 10), interfaz frente a `DESIGN.md`, integración entre la app y la API, calidad de las
   pruebas y preparación para el despliegue. Cada revisor leyó el código y entregó hasta 12 hallazgos, cada
   uno con archivo, línea y un escenario concreto de falla.
2. **Verificación adversarial.** Cada hallazgo de severidad media o alta pasó por uno o dos escépticos, cuya
   tarea era refutarlo leyendo el código. Un hallazgo que todos sus escépticos refutaron se descartó.
3. **Revisión manual.** La verificación de las dimensiones de interfaz e integración quedó incompleta
   (la sesión se interrumpió); esos hallazgos se comprobaron a mano contra el código y en la app real.
4. **Corrección con prueba.** Cada defecto corregido lleva una prueba que falla si el defecto vuelve.

## 2. Resultado

**71 hallazgos.** Tras la verificación y las correcciones:

| Estado | Cantidad | Qué significa |
|---|---|---|
| Corregido | 45 | El defecto se corrigió y quedó cubierto por una prueba o por verificación en la app real |
| Parcial | 8 | Se corrigió lo que afecta al MVP; el resto está identificado |
| Aceptado | 5 | Es una decisión de negocio o un límite conocido del MVP, documentado |
| Etapa 2 | 4 | Mejora visual que se resuelve en el rediseño de la interfaz |
| Pendiente | 6 | Trabajo identificado para el Sprint 8 o para la documentación final |
| Refutado | 3 | Los escépticos demostraron que no era un defecto |

Estado de las pruebas después de las correcciones: **167 del backend** (84 unitarias y 83 de integración
contra PostGIS real) y **26 de la app**, todas pasan. Cobertura de `services/` y `utils/`: 98,91 % de líneas.

### Defectos registrados

Los defectos confirmados que afectaban el comportamiento se numeraron a continuación de DEF-07 en el
plan de pruebas ([04-plan-pruebas.md](04-plan-pruebas.md) §11): **DEF-08 a DEF-19**.

---

## 3. Hallazgos por dimensión

La columna *Verificación* indica qué dijeron los escépticos. *Revisado a mano* significa que el hallazgo
se comprobó leyendo el código, sin escéptico automático.

### 3.1 Lógica de negocio y dinero

| # | Hallazgo | Severidad | Verificación | Estado | Cómo quedó |
|---|---|---|---|---|---|
| 1 | Un pago aprobado en Webpay deja PAID un cupo que el jugador ya canceló (cupo liberado, dinero cobrado) · `backend/src/repositories/payment.repository.ts` | Media | Confirmado | **Corregido** | DEF-08. Cancelar cierra el pago iniciado, y un pago aprobado se registra con el partido bloqueado o se devuelve completo. Pruebas I-12 e I-13 |
| 2 | Reembolso Transbank dentro de la transacción de BD: si la transacción falla o vence después, el dinero ya salió (doble reembolso en el reintento) · `backend/src/services/payment.service.ts` | Media | Confirmado | **Corregido** | DEF-09. El reembolso es el último paso de la transacción y Transbank tiene 8 s por llamada |
| 3 | Commit aprobado por Transbank pero no registrado: queda INITIATED, la vuelta responde 502 y el jugador puede pagar dos veces · `backend/src/services/payment.service.ts` | Media | Confirmado | **Corregido** | DEF-10. Se consulta el estado real en Transbank; reintentar un pago aprobado da 409. Pruebas I-14 e I-15 |
| 4 | Cancelación lee el estado del pago antes del bloqueo y decide con un dato viejo: pierde el reembolso si el pago se confirma en paralelo · `backend/src/services/payment.service.ts` | Baja | Confirmado | **Corregido** | DEF-11. La cancelación relee el pago después del bloqueo |
| 5 | /payments/return es público y cancela el cupo de otro jugador con solo conocer el buyOrder · `backend/src/services/payment.service.ts` | Baja | Confirmado | **Corregido** | DEF-12. La vuelta "tiempo agotado" exige el id de sesión, ahora aleatorio. Prueba S-16 |
| 6 | Máquina de estados incompleta: el organizador no puede cancelar el partido ni rechazar o sacar jugadores, y un cupo APPROVED sin pagar nunca caduca · `backend/src/routes/participations.routes.ts` | Media | Confirmado | **Parcial** | KAN-32 agrega rechazar una postulación. Cancelar el partido completo queda fuera del MVP: exige reembolsar a todos |
| 7 | Marcar NO_SHOW no toca el pago: dinero cobrado sin retención ni reembolso, y un APPROVED sin pagar suma partidos jugados · `backend/src/services/honor.service.ts` | Baja | Confirmado | **Aceptado** | Decisión de negocio: quien no se presenta no recupera su cuota, porque el recinto ya cobró el arriendo |
| 8 | upsertInitiated sobrescribe el registro de pago: se pierde la retención y el token de un pago anterior · `backend/src/repositories/payment.repository.ts` | Media | Confirmado | **Corregido** | DEF-13. Quien canceló un cupo pagado no vuelve a postular a ese partido. Pruebas CN-33 y U-72 |
| 9 | Fórmula de honor del código no coincide con la regla de CLAUDE.md, y CLAUDE.md se contradice a sí mismo · `backend/src/services/honor.service.ts` | Baja | Confirmado | **Corregido** | Decisión del 15-nov: valen las tres señales del código. Se corrigió el texto de CLAUDE.md |
| 10 | reopen() y join() reabren la participación sin comprobar que sigue CANCELLED · `backend/src/repositories/participation.repository.ts` | Baja | Sin escéptico (baja) | **Corregido** | KAN-32: volver a postular solo reabre una participación que sigue cancelada o rechazada |
| 11 | El invariante de cupos y dinero descansa solo en la aplicación: no hay CHECK sobre filledSlots ni montos, y decideRelease oculta descuadres · `backend/prisma/schema.prisma` | Baja | Sin escéptico (baja) | **Corregido** | Migración 20261115120000 con CHECK de cupos y montos. Pruebas CN-35 y CN-36 |

### 3.2 Seguridad de la API

| # | Hallazgo | Severidad | Verificación | Estado | Cómo quedó |
|---|---|---|---|---|---|
| 1 | El seed destructivo corre en cada arranque del contenedor y deja cuentas con clave publicada · `docker-compose.yml` | Alta | Refutado | **Corregido** | Los escépticos lo bajaron de alto (es el diseño de la demo). Igual se protegió: el seed solo borra con DEMO_MODE=true |
| 2 | Ningún rate limiting: fuerza bruta en login, DoS por bcrypt y registro masivo · `backend/src/app.ts` | Media | Confirmado | **Corregido** | S-12. Límite de intentos en login y registro, con TRUST_PROXY para la IP real |
| 3 | JWT_SECRET público por defecto y credenciales de Transbank vacías se aceptan en producción · `docker-compose.yml` | Media | Disputado | **Corregido** | La API no arranca en producción real con la clave de ejemplo, y Transbank de producción exige credenciales. Pruebas U-73 y U-74 |
| 4 | Cualquiera puede abortar el pago de otro jugador por /payments/return con un buyOrder predecible · `backend/src/services/payment.service.ts` | Baja | Confirmado | **Corregido** | DEF-12. Prueba S-16 |
| 5 | El Sistema de Honor se puede inflar con cuentas propias y un organizador puede hundir a un jugador sin apelación · `backend/src/services/honor.service.ts` | Media | Confirmado | **Aceptado** | Límite conocido del MVP. Contar solo partidos pagados o verificar el correo queda como trabajo futuro |
| 6 | PostgreSQL publicado en 0.0.0.0:5432 con usuario superusuario y clave por defecto 'kancha' · `docker-compose.yml` | Media | Confirmado | **Corregido** | La base de la demo solo escucha en el propio equipo (127.0.0.1 y ::1) |
| 7 | returnUrl de Webpay se arma con las cabeceras Host y protocolo, sin trust proxy ni TBK_RETURN_URL obligatoria · `backend/src/controllers/payments.controller.ts` | Baja | Sin escéptico (baja) | **Parcial** | TRUST_PROXY agregado. En la nube hay que definir TBK_RETURN_URL (guía de despliegue) |
| 8 | token_ws viaja por URL (GET) y la página de checkout sin autenticación no lleva Cache-Control: no-store · `backend/src/controllers/payments.controller.ts` | Baja | Sin escéptico (baja) | **Parcial** | Las páginas de pago responden Cache-Control: no-store. Que token_ws llegue por GET lo define Transbank |
| 9 | JSON malformado o cuerpo de más de 1 MB responde 500 con traza en el log, y el 502 de Webpay filtra mensajes internos · `backend/src/middlewares/errorHandler.ts` | Baja | Sin escéptico (baja) | **Corregido** | JSON mal formado responde 400, y el detalle del fallo de Transbank va al log. Pruebas I-16 y U-78 |
| 10 | JWT sin algoritmo fijado, sin validar el payload ni la existencia del usuario, de 7 días y sin revocación · `backend/src/middlewares/auth.ts` | Baja | Sin escéptico (baja) | **Parcial** | El token se verifica solo con HS256. La vigencia de 7 días sin revocación queda como límite del MVP |
| 11 | CORS comodín y Swagger UI público con persistAuthorization también en producción · `backend/src/app.ts` | Baja | Sin escéptico (baja) | **Parcial** | CORS_ORIGINS limita los orígenes en la nube. Swagger público se mantiene: es parte de la demo |
| 12 | El registro revela qué correos ya existen (409 EMAIL_TAKEN) · `backend/src/services/auth.service.ts` | Baja | Sin escéptico (baja) | **Aceptado** | El registro debe avisar que el correo ya existe (criterio CN-02). Lo mitiga el límite de registros |

### 3.3 Integración entre la app y la API

| # | Hallazgo | Severidad | Verificación | Estado | Cómo quedó |
|---|---|---|---|---|---|
| 1 | Pagar en otra pestaña tras cancelar deja el cupo PAID sin cupo real (sobreventa y cobro) · `backend/src/services/payment.service.ts` | Alta | Revisado a mano | **Corregido** | Es el mismo defecto DEF-08 |
| 2 | El organizador no puede llegar a los botones 'Asistió / No vino' una vez que el partido terminó · `mobile/app/(tabs)/partidos.tsx` | Alta | Revisado a mano | **Corregido** | DEF-14. El partido terminado del organizador abre el detalle, donde está la asistencia. Verificado en la app real |
| 3 | La caché de React Query no se limpia al cambiar de cuenta: el usuario B ve datos del usuario A · `mobile/src/store/authStore.ts` | Alta | Revisado a mano | **Corregido** | DEF-15. La caché se vacía al entrar y al salir. Prueba M-25 |
| 4 | Al re-postular y volver a pagar tras una cancelación con retención se borra el registro de lo retenido · `backend/src/repositories/payment.repository.ts` | Media | Revisado a mano | **Corregido** | Es el mismo defecto DEF-13 |
| 5 | Mis partidos muestra 'Esperando al organizador' para cupos CANCELLED y NO_SHOW · `mobile/app/(tabs)/partidos.tsx` | Media | Revisado a mano | **Corregido** | Es el mismo defecto DEF-17 |
| 6 | La app no se actualiza sola en nativo: la aprobación del organizador no llega al jugador ni se refresca el perfil · `mobile/app/_layout.tsx` | Media | Revisado a mano | **Corregido** | DEF-16. El detalle se refresca solo mientras hay algo que esperar; perfil y Mis partidos, al volver a la pestaña. Pruebas M-23 y M-24 |
| 7 | Checkout web: la pestaña de Webpay puede abrirse en la misma pestaña, no hay camino de vuelta y la app se refresca antes de pagar · `mobile/src/api/hooks.ts` | Media | Revisado a mano | **Pendiente** | El comprobante web no trae un botón de vuelta a la app. Lo mitiga el refresco al volver. Etapa 2 |
| 8 | El nivel del partido no se puede filtrar en el mapa aunque la API y CLAUDE.md lo exigen · `mobile/src/api/hooks.ts` | Baja | Sin escéptico (baja) | **Corregido** | Filtro de nivel en el mapa. Pruebas CN-34 y M-26 |
| 9 | Publicar: un costo entre $1.000.001 y $9.999.999 falla en silencio · `mobile/app/publicar.tsx` | Baja | Sin escéptico (baja) | **Corregido** | Es el mismo defecto DEF-19 |
| 10 | El cuadro de confirmación de cancelación usa un reembolso cacheado y puede decir 'completos' cuando el servidor retiene el 50% · `mobile/app/partido/[id].tsx` | Baja | Sin escéptico (baja) | **Corregido** | La app vuelve a pedir el partido antes de confirmar la cancelación |
| 11 | Reglas de negocio duplicadas y escritas a mano en componentes (12 h, 10 %, cuota) · `mobile/app/publicar.tsx` | Baja | Sin escéptico (baja) | **Aceptado** | Son textos informativos; el monto real siempre lo calcula la API |
| 12 | OpenAPI incompleto: faltan esquemas de respuesta de varios endpoints del recorrido · `backend/src/docs/openapi.ts` | Baja | Sin escéptico (baja) | **Pendiente** | Completar los esquemas de respuesta de OpenAPI. Etapa 3 (documentación) |

### 3.4 Interfaz y accesibilidad

| # | Hallazgo | Severidad | Verificación | Estado | Cómo quedó |
|---|---|---|---|---|---|
| 1 | Mis partidos muestra "Esperando al organizador" en un cupo ya cancelado · `mobile/app/(tabs)/partidos.tsx` | Media | Confirmado | **Corregido** | DEF-17. Cada estado tiene su rótulo. Prueba M-22 |
| 2 | Asistencia irreversible sin confirmación, botones de 40 px pegados y fila apretada a 360 px · `mobile/app/partido/[id].tsx` | Media | Confirmado | **Corregido** | DEF-18. "No vino" pide confirmación, "Asistió" queda marcado y los botones miden 44 px |
| 3 | Publicar: un 422 en el costo no se muestra y el botón parece no hacer nada · `mobile/app/publicar.tsx` | Baja | Confirmado | **Corregido** | DEF-19. El error del costo se muestra y hay un aviso general |
| 4 | Tab bar con altura fija de 64 px: en iPhone con barra inferior se recortan ícono y etiqueta · `mobile/app/(tabs)/_layout.tsx` | Media | Revisado a mano | **Corregido** | El alto de la barra incluye la zona segura. Falta verlo en un iPhone real (KAN-29) |
| 5 | Mapa en 360 px: los chips de radio quedan fuera de pantalla y el mapa se reduce a una franja · `mobile/app/(tabs)/mapa.tsx` | Media | Revisado a mano | **Etapa 2** | Rediseño de los filtros del mapa |
| 6 | Zonas táctiles por debajo de 44 px en chips, botones de la lista, pines web y enlaces · `mobile/src/components/ui/Chip.tsx` | Media | Revisado a mano | **Parcial** | Chips con 44 px de zona táctil y botones de lista de 44 px. Pines web y enlaces, en la etapa 2 |
| 7 | Teclado en Android: KeyboardAvoidingView sin comportamiento fuera de iOS · `mobile/app/(auth)/registro.tsx` | Media | Revisado a mano | **Pendiente** | Hay que probarlo en un Android real antes de cambiar el comportamiento del teclado (KAN-29) |
| 8 | Accesibilidad: la carta de partido oculta su contenido a los lectores de pantalla y los errores no se anuncian · `mobile/src/components/MatchCard.tsx` | Media | Revisado a mano | **Parcial** | La carta de partido anuncia deporte y lugar. Avisos de error y títulos, en la etapa 2 |
| 9 | Errores de español: pluralización, 'hasta el hoy' y plazo fijo de 48 horas · `mobile/app/calificar/[id].tsx` | Media | Revisado a mano | **Corregido** | "hasta hoy a las…", singular y plural, y el plazo de 48 h bien descrito. Pruebas M-20 y M-21 |
| 10 | Texto técnico de desarrollo visible para el usuario final · `mobile/app/(tabs)/perfil.tsx` | Baja | Sin escéptico (baja) | **Etapa 2** | Texto de estado de la API en el perfil |
| 11 | La app no tiene logo, ícono, splash ni favicon: la identidad de DESIGN.md §1 y §6 no existe · `mobile/app.json` | Media | Revisado a mano | **Etapa 2** | Identidad: logo, ícono, splash y favicon |
| 12 | Tamaños de fuente fuera de la escala de DESIGN.md §3 · `mobile/src/components/MatchCard.tsx` | Baja | Sin escéptico (baja) | **Etapa 2** | Escala tipográfica frente a DESIGN.md |

### 3.5 Calidad de las pruebas

| # | Hallazgo | Severidad | Verificación | Estado | Cómo quedó |
|---|---|---|---|---|---|
| 1 | El CI nunca ejecuta las 19 pruebas Jest de la app · `.github/workflows/ci.yml` | Media | Confirmado | **Corregido** | El CI corre las pruebas Jest de la app |
| 2 | La cobertura no se mide ni se exige en CI, y la dependencia necesaria no está instalada · `.github/workflows/ci.yml` | Media | Confirmado | **Corregido** | El CI mide cobertura, el umbral hace fallar el job y el informe se sube como artefacto |
| 3 | webpay.repository.ts no ejecuta ninguna prueba y el test del 502 fabrica su propio error · `backend/tests/integration/cancellations.int.test.ts` | Baja | Confirmado | **Aceptado** | El adaptador de Transbank se verifica a mano en Integración (evidencias/sprint-07); en las pruebas se simula |
| 4 | S-07 figura 'Verificado' con costo 12 pero la prueba no puede comprobar el costo · `backend/tests/integration/auth.int.test.ts` | Media | Refutado | **Refutado** | Los escépticos lo descartaron: el costo 12 es el valor por defecto y la prueba cubre que se guarda un hash bcrypt |
| 5 | I-01 promete 503 sin base de datos pero solo se prueba el caso conectado · `backend/tests/integration/auth.int.test.ts` | Baja | Confirmado | **Corregido** | health.int.test.ts prueba el 503 con la base caída |
| 6 | Las rutas de error 404, ruta inexistente y 500 no tienen ninguna prueba · `backend/src/app.ts` | Media | Confirmado | **Corregido** | Pruebas I-16 y U-76 a U-78 |
| 7 | I-02b no prueba lo que dice: nunca usa un correo existente con contraseña incorrecta · `backend/tests/integration/auth.int.test.ts` | Baja | Confirmado | **Corregido** | I-02b compara un correo existente con contraseña errada contra un correo inexistente |
| 8 | M-10 afirma el orden Fútbol, Pádel y Básquet y los chips activos al inicio, pero no los comprueba · `mobile/src/__tests__/components.test.tsx` | Baja | Confirmado | **Corregido** | M-10 comprueba el orden real de los chips |
| 9 | La prueba que cierra DEF-04 (zona horaria) no puede fallar en el CI · `backend/tests/integration/matches.int.test.ts` | Media | Confirmado | **Corregido** | El PostgreSQL del CI corre en hora de Chile, así I-03b puede fallar |
| 10 | Las pruebas del backend no se verifican con tipos: tsconfig las excluye y ESLint no usa tipos · `backend/tsconfig.json` | Baja | Sin escéptico (baja) | **Pendiente** | Verificar con tipos las pruebas del backend. Severidad baja |
| 11 | La lógica de cliente de la app sin pruebas y plan que subestima el hueco · `mobile/src/api/client.ts` | Baja | Confirmado | **Parcial** | Pruebas M-22 a M-26 para la lógica de cliente. Las pantallas completas, tras el rediseño de la etapa 2 |
| 12 | Varias afirmaciones del plan van más allá de lo que sus pruebas verifican · `docs/04-plan-pruebas.md` | Baja | Sin escéptico (baja) | **Corregido** | Las afirmaciones del plan de pruebas se ajustaron a lo que las pruebas verifican |

### 3.6 Despliegue

| # | Hallazgo | Severidad | Verificación | Estado | Cómo quedó |
|---|---|---|---|---|---|
| 1 | El seed borra TODA la base en cada arranque de la API (y el mensaje de error miente) · `docker-compose.yml` | Media | Confirmado | **Corregido** | El seed solo borra y recarga con DEMO_MODE=true, que define únicamente docker-compose.yml |
| 2 | El Dockerfile de la API no aplica migraciones: en Render la base queda sin tablas · `backend/Dockerfile` | Media | Confirmado | **Corregido** | El Dockerfile aplica las migraciones al arrancar |
| 3 | JWT_SECRET por defecto es público y pasa la validación en producción · `backend/src/config/env.ts` | Baja | Confirmado | **Corregido** | Prueba U-73 |
| 4 | Prisma sin `directUrl`: migrate deploy y la app no pueden convivir con el pooler de Supabase · `backend/prisma/schema.prisma` | Alta | Refutado | **Refutado** | No es un defecto del código. La configuración del pooler de Supabase se documenta al desplegar |
| 5 | Sin `trust proxy`: detrás de Render la URL de retorno de Transbank sale como http y la IP real se pierde · `backend/src/app.ts` | Baja | Confirmado | **Corregido** | TRUST_PROXY |
| 6 | Variables de la nube mal cableadas: URL de la API fija en compose y CORS abierto sin configuración · `docker-compose.yml` | Media | Refutado | **Refutado** | El flujo previsto no falla. Aun así se agregó CORS_ORIGINS |
| 7 | PostgreSQL expuesto en todas las interfaces con kancha/kancha · `docker-compose.yml` | Baja | Confirmado | **Corregido** | La base solo escucha en el propio equipo |
| 8 | La API corre como root y la imagen de producción lleva devDependencies y código fuente · `backend/Dockerfile` | Baja | Confirmado | **Pendiente** | Contenedor sin root e imagen sin dependencias de desarrollo. Sprint 8, junto con el despliegue |
| 9 | El CI nunca prueba `docker compose up`: el requisito principal no tiene evidencia automática · `.github/workflows/ci.yml` | Media | Confirmado | **Corregido** | El CI levanta el stack, consulta /health, entra con una cuenta de demo y pide la web |
| 10 | Supabase: PostGIS en el schema equivocado y tablas sin RLS no verificados · `backend/prisma/migrations/20260927193802_init/migration.sql` | Baja | Confirmado | **RLS cerrado** el 22-nov | Migración `20261122120000_rls_supabase` y S-22 (DEF-25). Falta verificar el schema de PostGIS en Supabase |
| 11 | Apagado sin esperar peticiones en curso: puede dejar un pago cobrado sin registrar · `backend/src/server.ts` | Baja | Confirmado | **Corregido** | La API espera las peticiones en curso antes de apagarse |
| 12 | DESARROLLO.md §6, §8 y §12 no coinciden con el compose, el Dockerfile ni el .env.example reales · `DESARROLLO.md` | Baja | Sin escéptico (baja) | **Corregido** | DESARROLLO.md §6, §7.4, §8 y §12 actualizados con el compose, el CI y las variables reales |

---

## 4. Reglas de negocio de `CLAUDE.md`, una por una

| Regla | Estado en la auditoría | Estado después de las correcciones |
|---|---|---|
| Honor inicial (honorScore NULL, nunca 0) | Cumple | Cumple |
| Cálculo de honor (promedio ponderado de las últimas 20 calificaciones, (puntualidad+conducta)/2, 1 decimal) | Parcial | Cumple. El texto de `CLAUDE.md` se corrigió para describir las tres señales que usa el código |
| Ventana de reseña (48 h tras finalizar, luego se archiva) | Parcial | Cumple. El partido se archiva la primera vez que alguien lo consulta después de las 48 h |
| Doble calificación (UNIQUE en base de datos) | Cumple | Cumple |
| Pago fraccionado (amountDue = ceil(totalCost/totalSlots), comisión 10 % de amountDue, CLP enteros, nunca flotante) | Cumple | Cumple |
| Retención (<12 h retiene el 50 %, ≥12 h reembolsa el 100 %) | Parcial | Cumple. Se cerraron los casos de carrera del pago y la cancelación (DEF-08 a DEF-11) |
| Sobreventa (aprobar incrementa filledSlots en transacción con bloqueo de fila) | Cumple | Cumple |
| Un solo puntaje (honorScore 0–10 es el único número de reputación) | Cumple | Cumple |
| Nivel del partido (level obligatorio, visible y filtrable) | Cumple | Cumple. Ahora también se puede filtrar por nivel en el mapa |
| Partidos jugados (matchesPlayed al cerrar como asistida; cierre una sola vez) | Cumple | Cumple |

---

## 5. Backlog visual para la etapa 2

> **Nota del 17 de noviembre.** El rediseño visual (KAN-33) se hizo entre el 16 y el 17 de noviembre.
> De esta lista cubrió: el isotipo en el encabezado y en la entrada, el "Falta 1" visible en la carta
> de partido, la fotografía de la entrada y el alto de chips (40 px) y botones (56 px). Lo demás sigue
> pendiente. Esos días se agregaron además el botón "Falta uno" (KAN-37) y el límite real de la comuna
> con canchas existentes (KAN-38).

La revisión de la interfaz entregó además esta lista priorizada. No son defectos: son mejoras para
el rediseño visual. Las marcadas **Hecho** se resolvieron al corregir un defecto.

| Prioridad | Esfuerzo | Pantalla | Cambio propuesto | Por qué |
|---|---|---|---|---|
| Alta | S | Mis partidos | Mostrar el cierre de cada cupo: pills de color (Confirmado y pagado, Falta pagar, Cancelado, No asististe) y una sección 'Historial' separada de 'Juegas' y 'Organizas'. | Es la pantalla del recorrido de HU-08, HU-09 y KAN-30 y hoy mezcla estados. Con estados visibles la demo se entiende sin explicación. |
| Alta | M | Carta de partido (MatchCard) | Agregar el CTA naranja visible 'Falta 1 >>' (o 'Faltan N') dentro de la carta, como pide DESIGN.md §4.2/§4.3, y enriquecer el label accesible. | Hoy toda la carta es un botón sin llamada a la acción: el 'Falta 1', que es la marca del producto, solo aparece en el detalle. En la lista es lo que la comisión va a ver más. |
| Alta | M | Mapa (móvil) | **Hecho en parte el 20-nov (KAN-39):** las cartas pasaron a un panel deslizable y cerrado al inicio, así que el mapa recupera casi toda la pantalla. Pendiente: dejar visibles los 3 chips de deporte y mover Cuándo y Radio a un panel 'Filtros'. Mostrar un contador de filtros activos y un indicador sutil de recarga al cambiar filtros. | A 360 px el radio queda fuera de pantalla y el mapa se reduce a unos 150 px. Al cambiar de filtro hoy no hay ningún feedback mientras carga (placeholderData conserva la lista anterior). |
| Alta | M | Identidad (app.json, AuthHero, header del mapa) | Crear el ícono, splash, favicon y logo (figura + '>>') y usarlos en el hero de login y en el header. Usar la versión reducida del logo en el header de las pestañas. | Es lo primero que se ve (ícono en el teléfono, splash) y hoy es el de Expo. Cierra la brecha con DESIGN.md §1. |
| Alta | S | Detalle de partido (asistencia y calificación) | **Hecho en parte.** Agregar confirmación para 'No vino', botones de 44 px, check verde 'Asistió', y apilar la fila a 360 px. Hacer lo mismo con 'Aprobar'. | Es una acción irreversible que afecta el honor de otra persona y hoy se puede disparar con un toque accidental. |
| Alta | S | Tab bar y navegación | **Hecho en parte.** Calcular la altura con useSafeAreaInsets y probar en un iPhone con barra inferior y en un Android con navegación de 3 botones. Verificar también el teclado en Android (KeyboardAvoidingView). | Riesgos reales de los que la prueba en dispositivo del Sprint 8 debe dar fe antes de la defensa. |
| Alta | S | Todas (touch targets) | Subir los chips a 44 px (o hitSlop), los botones de lista a 44 y los pines web a 44 px de área táctil. Subir el alto de los enlaces de Login y Registro. | La demo se hace con el dedo o con un mouse sobre un proyector. Los blancos de 36 px y 38 px fallan con facilidad. |
| Media | S | Perfil | Quitar el texto 'API conectada, versión' y 'API sin conexión'. Dar a las barras de honor etiquetas 'Alto', 'Medio' y 'Bajo' junto al color, e incluir el escudo con el puntaje global como badge en el encabezado. | Elimina texto técnico y hace que el Sistema de Honor, uno de los diferenciadores, se lea de un vistazo y no dependa solo del color. |
| Media | M | Login y Registro (hero) | Agregar fotografía B/N con overlay rgba(0,0,0,0.6) que rote entre fútbol, pádel y básquet, según DESIGN.md §6. Evaluar si el SlotBar naranja del hero, que es decorativo, se mantiene. | Le da carácter a la primera pantalla. DESIGN.md §9.3 dice que el naranja no decora, así que conviene decidir de forma explícita si la excepción del hero se queda. |
| Media | S | Mapa (chips secundarios) | Dar un estilo activo neutro (borde y texto blanco) a los chips Cuándo y Radio, y reservar el naranja relleno para los deportes y el CTA. | Al abrir el mapa hay unos 7 elementos naranjas (chips, FAB y todos los pines) compitiendo. 'El naranja mueve, no decora' queda más fuerte si solo lo toca lo principal. |
| Media | M | Detalle de partido | Agregar un mini mapa oscuro con el pin del partido y un botón 'Cómo llegar'. Mostrar el nivel del partido. | La propuesta de valor es geolocalizada y el detalle solo muestra el nombre y la dirección en texto. |
| Media | M | Todas las acciones (feedback) | Crear un componente Toast con color de éxito (#2ECC71) para 'Postulación enviada', 'Jugador aprobado', 'Calificación enviada' y 'Partido publicado'. Después de publicar, mostrar una pantalla de transición con Anton a pantalla completa y '>>' antes del detalle. | Hoy las acciones exitosas no tienen confirmación visual (calificar hace desaparecer la tarjeta; publicar redirige de inmediato). La transición Anton cumple DESIGN.md §8 y luce en una demo. |
| Media | S | Textos y pluralización | **Hecho en parte.** Crear plural() en lib/format.ts con pruebas, revisar todos los textos con cantidades, corregir 'hasta el hoy' y mostrar el tiempo restante real de la ventana de calificación. | Los errores de español son lo más barato de corregir y lo que más resta credibilidad ante una comisión. |
| Media | M | Publicar partido | Mostrar errores del 422 en todos los campos (costo incluido), usar placeholders neutros mientras no hay deporte elegido (hoy es 'Pichanga del jueves', publicar.tsx:144) y no precargar 10 cupos y 9 presentes (publicar.tsx:58-59). Agregar una vista previa de la MatchCard antes de publicar. | El placeholder y los valores por defecto de fútbol contradicen 'ningún deporte es el por defecto' (DESIGN.md §9.2). La vista previa le muestra al organizador lo que verán los demás. |
| Baja | S | Estados de carga | Hacer que el skeleton de mapa y Mis partidos tenga la forma de una MatchCard (círculo, dos líneas y barra). Marcar los skeletons con accessibilityState busy. | Hoy mapa usa tres barras genéricas. Una carga con forma de carta se siente más rápida y completa. |
| Baja | S | Rutas inexistentes | Agregar app/+not-found.tsx con la marca de Kancha y un ErrorBoundary global. | No existe ninguno: la pantalla por defecto de Expo Router es negra, está en inglés y lleva branding de Expo. Es un detalle menor pero fácil. |
| Baja | S | Detalle de partido (barra inferior) | Reemplazar el paddingBottom fijo de 220 px del ScrollView por la altura real de la barra de CTA medida con onLayout. | Con estado aprobado, pago, error y botón de cancelar a la vez, la barra puede superar 220 px y tapar la última línea del contenido. |
| Baja | S | Web ancho (login y registro) | Medir el hero a 900-1000 px de ancho y bajar el tamaño de Anton o ajustar el breakpoint si el titular se superpone al formulario. | A 900 px el hero (flexShrink 1) queda con unos 290-310 px, y 'CAMISETA.' en Anton 128 px mide probablemente más. Es una estimación sin medir, pero conviene mirarlo en el proyector. |
| Media | S | Chips y botón "Falta uno" en la web | **Hecho el 17-nov.** Publicar el estado activo con `aria-selected` o `aria-pressed`, además de `accessibilityState`. | Encontrado el 16-nov al verificar KAN-37 en el navegador: los chips y el botón no exponen ningún atributo `aria-*` de estado, así que en la web un lector de pantalla no distingue un filtro activo de uno inactivo. No se probó con lector de pantalla en el teléfono. |

---

## 6. Lo que queda abierto

| Tema | Dónde se resuelve |
|---|---|
| Probar la app en un iPhone y en un Android reales: barra inferior y teclado | KAN-29, Sprint 8: letras arregladas en PR #34; falta revisarlo en un iPhone |
| Contenedor de la API sin root ni devDependencies (hallazgo 8, sección 3.6). PostGIS y RLS en Supabase: hecho | Pendiente. RLS en `develop` desde el 22-nov (DEF-25, PR #38) |
| Moderación de reportes (HU-11, KAN-17) | Hecho el 22-nov (PR #41), adelantada del Sprint 9 |
| Pruebas de rendimiento con k6 (R-01 a R-05) | **Hecho el 20-nov:** las cinco cumplen sus metas (KAN-35) |
| Cancelar un partido completo desde el organizador | Fuera del MVP |
| Reputación resistente a cuentas falsas | Fuera del MVP |
| Rediseño visual y pruebas de pantallas completas | KAN-33, etapa 2 del plan de cierre |
| Esquemas de respuesta completos en OpenAPI | **Hecho el 20-nov:** todas las respuestas exitosas tienen esquema o ejemplo, y "Mis partidos" usa el esquema `MyMatch` |

---

*Kancha · Portafolio de Título · Lukas Guerrero · Sprint 8, noviembre 2026*
