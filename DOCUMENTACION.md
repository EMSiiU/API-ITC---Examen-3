# Documentación técnica - Aplicación Académica SII ITC (Examen 3)

Este documento describe el estado técnico completo del proyecto. Es el punto de referencia para entender su arquitectura, estructura, decisiones, variables, funciones y flujo de datos.

## Regla de mantenimiento

Cada conjunto de cambios que vaya a confirmarse en un commit debe actualizar este archivo **antes del commit**. La actualización debe indicar:

1. Qué se implementó o modificó.
2. Qué archivos, rutas, variables o servicios fueron afectados.
3. Cómo funciona el cambio y sus consideraciones de seguridad.
4. Qué continúa pendiente, si aplica.

No deben documentarse como terminadas funciones que solamente estén propuestas o en desarrollo.

### Ficha obligatoria por módulo o archivo nuevo

Para cada código que se agregue o cambie de forma relevante, esta documentación debe incluir una ficha con estos cinco puntos:

1. **Problema que resuelve:** necesidad técnica o de usuario que atiende.
2. **Por qué existe:** razón de separar ese archivo, función o módulo.
3. **Entradas y salidas:** datos que recibe, devuelve, persiste o rechaza.
4. **Conexiones:** módulos anteriores y posteriores con los que interactúa.
5. **Pendiente y consumidor futuro:** qué falta para completar el flujo y qué componente o integrante lo usará después.

## Estado actual

El proyecto cuenta con monorepo, autenticación real contra SII ITC mediante backend propio, sesiones cifradas en Supabase y endpoints protegidos de perfil, Kardex, calificaciones y horario con DTO propios. El doble envío de horario está corregido y Emilio confirmó que la consulta sigue funcionando. Las pantallas funcionales siguen pendientes en el frontend local revisado. El criterio de presentación está acordado: parciales disponibles del período actual en Calificaciones y resultados finales institucionales por materia/período en Kardex, sin calcular una final propia.

### Implementado

- Monorepo con frontend y backend independientes.
- Frontend creado con React, Vite y TypeScript.
- Backend creado con Node.js, Express y TypeScript.
- Endpoint de salud `GET /health`.
- CORS restringido a un origen configurado.
- Base para sesiones mediante cookie `httpOnly`.
- Validación de variables de entorno del backend.
- Cliente de Supabase exclusivo de backend.
- Tabla `public.app_sessions` utilizada en Supabase para persistir sesiones.
- Login real SII ITC, cookie `httpOnly`, revocación y middleware reutilizable de sesión.
- Endpoint protegido `GET /student/profile` conectado a SII ITC.
- Endpoint protegido `GET /student/kardex`, con consulta institucional real y normalización a `StudentKardex`.
- Endpoint protegido `GET /student/grades`, con consulta real de calificaciones y normalización a `StudentGrades` por períodos, materias y evaluaciones.
- Ruta `GET /student/schedule`, consulta institucional de horario y DTO `StudentSchedule`; respuesta duplicada corregida y funcionamiento autenticado confirmado por Emilio.
- Prueba HTTP local: las cuatro rutas académicas devuelven `401` sin cookie.
- Validación UUID de cookies, logout que borra cookie aun si falla la revocación, protección de origen en mutaciones y errores JSON uniformes.
- Batería versionada de regresión: 107/107 comprobaciones; `check` y `build` correctos.
- Prueba real posterior a las correcciones: login, sesión y los cuatro recursos `200`; logout `204`; reutilización de sesión `401`. Solo se creó y revocó la sesión de esa prueba, sin eliminar historial ni registrar secretos.
- Compilación y validación de tipos exitosas.

### Pendiente

- Rutas y componentes de interfaz.
- Implementar en la interfaz el criterio acordado de parciales actuales y finales históricos, distinguiendo notas ausentes de cero.
- Dashboard y pantallas frontend.
- Seleccionar y justificar la funcionalidad adicional de impacto; el planificador es solo una propuesta por ahora.
- Pruebas, despliegue en Render y documentación visual.

## Arquitectura

### Reparto vigente

| Integrante | Responsabilidad |
|---|---|
| Emilio | Backend institucional completo, sesiones/cifrado/Supabase, DTO/contratos, seguridad y pruebas API, despliegue backend, documentación y exposición de su parte. Apoya la función extra y revisa su integración. |
| Rebo | Frontend completo, incluidos login, dashboard, Kardex, calificaciones, horario, navegación, responsive, pruebas y despliegue frontend. Lidera la función adicional con su interfaz, lógica, persistencia y módulo backend necesarios, con apoyo de Emilio; documenta y expone su parte. |

Este acuerdo sustituye el reparto inicial por módulos mixtos. Dashboard y Kardex React pertenecen a Rebo. Ambos seleccionan y justifican la función extra, coordinan contratos y participan en la demostración. Rebo acuerda con Emilio los cambios backend de la función extra sin alterar unilateralmente los módulos institucionales o de sesiones.

```text
Navegador
  │
  │ HTTPS: solicitudes con credenciales incluidas
  ▼
Frontend React + Vite (Render Static Site)
  │
  │ HTTPS: API propia
  ▼
Backend Node.js + Express (Render Web Service)
  ├── API institucional SII ITC
  └── Supabase PostgreSQL
```

### Regla principal de integración

El frontend nunca se comunica directamente con la API institucional SII ITC. Todas las solicitudes institucionales pasan por el backend propio. Por lo tanto, el token JWT institucional nunca debe exponerse al código JavaScript del navegador, al almacenamiento local ni al almacenamiento de sesión del navegador.

### Sesión implementada

1. El usuario envía correo y contraseña al endpoint propio `POST /auth/login` mediante HTTPS.
2. El backend consulta el login de SII ITC.
3. El backend guarda el JWT institucional únicamente del lado servidor, asociado a una sesión propia.
4. El backend devuelve una cookie con un identificador de sesión aleatorio. La cookie no contiene el JWT institucional.
5. En peticiones posteriores, el navegador envía la cookie al backend y este recupera la sesión antes de consultar SII ITC.
6. Al cerrar sesión, el backend invalida la sesión y elimina la cookie.

La tabla de sesiones, el cliente de Supabase, el repositorio interno, los controladores HTTP y la cookie ya están integrados. El repositorio cifra el JWT institucional antes de guardarlo.

### Tabla `public.app_sessions`

La tabla existe en Supabase y su estructura fue validada sin leer datos. Sus columnas son:

| Columna | Propósito |
|---|---|
| `id` | Identificador aleatorio de sesión; es el único valor representado por la cookie. |
| `sii_token_ciphertext` | JWT de SII cifrado por el backend; nunca se envía al navegador. |
| `student_identifier` | Identificador opcional del estudiante; el flujo actual no lo completa. Tratarlo como dato personal si se utiliza. |
| `created_at` | Fecha de creación de la sesión. |
| `expires_at` | Fecha de expiración; las sesiones vencidas no deben aceptarse. |
| `revoked_at` | Fecha de revocación para logout o invalidación manual. |
| `last_seen_at` | Última actividad útil para auditoría y políticas de expiración. |

La tabla tiene RLS habilitado. Los roles `anon` y `authenticated` no tienen permisos; solo el backend usa una credencial de servidor. Esto impide que el navegador consulte la tabla de forma directa.

## Estructura del repositorio

```text
.
├── frontend/                  # Aplicación React + Vite + TypeScript
├── backend/                   # API propia Node.js + Express + TypeScript
│   ├── src/
│   │   ├── app.ts             # Configuración de Express, CORS y middleware
│   │   ├── server.ts          # Inicio del servidor HTTP
│   │   ├── config/env.ts      # Validación y lectura de variables de entorno
│   │   ├── middleware/       # Origen de mutaciones y errores JSON
│   │   └── modules/
│   │       ├── auth/            # Sesión, cifrado, controladores y middleware
│   │       ├── sii/             # Cliente exclusivo de SII ITC
│   │       └── student/         # Endpoints académicos protegidos
│   ├── .env.example           # Plantilla sin secretos
│   ├── tests/backend.regression.mjs # HTTP real local con dependencias aisladas
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
├── .node-version              # Versión objetivo de Node para desarrollo/despliegue
├── package.json               # Scripts y workspaces del monorepo
├── package-lock.json
├── README.md                  # Guía rápida de instalación y ejecución
├── CONTEXTO.md                # Reparto, contratos y guía para Rebo y su IA
└── DOCUMENTACION.md           # Este documento técnico vivo
```

## Frontend

### Tecnología

- React
- Vite
- TypeScript

El frontend es una SPA. Por ahora contiene la plantilla inicial de Vite; aún no incluye rutas, autenticación, llamadas al backend ni pantallas del producto.

### Responsabilidad

Rebo es responsable de todo el frontend: login, dashboard, calificaciones, Kardex, horario y la interfaz de la funcionalidad adicional que el equipo elija. Solo consumirá endpoints del backend propio. Cuando se implementen llamadas autenticadas, deberán incluir credenciales para que el navegador envíe la cookie de sesión:

```ts
fetch('http://localhost:3000/endpoint', {
  credentials: 'include',
});
```

La URL final deberá provenir de una variable pública de Vite, nunca de una URL institucional ni de una llave secreta.

## Backend

### Tecnología y dependencias

- Node.js 22 LTS como versión objetivo (el proyecto admite 22 a 24).
- Express: servidor HTTP y rutas.
- TypeScript: tipado y compilación.
- `cors`: política de origen cruzado.
- `cookie-parser`: lectura de cookies enviadas al backend.
- `dotenv`: carga de variables locales desde `.env`.
- `zod`: validación de configuración y, posteriormente, de peticiones.
- `@supabase/supabase-js`: cliente para acceder a Supabase desde el backend.
- `tsx`: ejecución de TypeScript durante desarrollo.

### `backend/src/server.ts`

Importa la aplicación Express y la inicia en el puerto configurado. El puerto se obtiene de la configuración validada; si no se define, usa `3000`.

### `backend/src/app.ts`

Configura el comportamiento común del servidor:

- `trust proxy` se establece en `1` para operar correctamente detrás del proxy de Render.
- CORS permite únicamente `FRONTEND_ORIGIN` y habilita credenciales.
- El cuerpo JSON se limita a `16kb`, suficiente para credenciales y peticiones normales, reduciendo peticiones excesivas.
- `cookie-parser` permite inspeccionar la cookie de sesión en las rutas protegidas implementadas.
- Monta `authRouter` bajo `/auth` y `studentRouter` bajo `/student`.
- `GET /health` responde `200` con `{ "status": "ok" }`; sirve para validar que el backend está disponible localmente y en Render.

### `backend/src/config/env.ts`

Lee y valida las variables de entorno al iniciar el backend. Si una variable tiene un tipo o valor inválido, el proceso falla tempranamente con un error claro en vez de arrancar con una configuración insegura.

También prohíbe dos configuraciones peligrosas:

- `COOKIE_SAME_SITE=none` sin `COOKIE_SECURE=true`.
- Producción con `COOKIE_SECURE=false`.

### `backend/src/modules/auth/session-cookie.ts`

Centraliza las opciones que se aplicarán al crear la cookie de sesión:

- `httpOnly: true`: JavaScript del navegador no puede leerla.
- `secure`: se determina desde la configuración; debe ser verdadero en producción.
- `sameSite`: controla en qué contextos el navegador manda la cookie.
- `maxAge`: se calcula a partir de `SESSION_TTL_HOURS`.
- `path: '/'`: permite usar la sesión en todos los endpoints del backend.

Este módulo define las opciones que `auth.controller.ts` aplica al emitir la cookie después de un login exitoso. No contiene lógica de autenticación ni persiste sesiones por sí mismo.

`clearSessionCookieOptions` conserva los atributos relevantes de la cookie, pero omite su duración. Lo utilizan el middleware y logout para expirar la misma cookie que se creó durante el login.

### `backend/src/modules/auth/authenticated-session.middleware.ts`

**Problema que resuelve:** evita que cada endpoint protegido repita la lectura de cookie, consulta de Supabase, validación de expiración/revocación, descifrado interno del JWT SII y actualización de actividad.

**Por qué existe:** concentra la política de acceso en una sola función reutilizable. Esto reduce el riesgo de que una ruta académica futura olvide validar sesión antes de consultar datos institucionales.

**Entradas y salidas:** recibe una petición que debe incluir la cookie definida por `SESSION_COOKIE_NAME`. Si falta, no es un UUID válido, está revocada o venció, borra la cookie y responde `401`. Un formato malformado se rechaza antes de consultar Supabase o SII. Si es válida, adjunta un `ActiveSession` interno a `request.authSession`, actualiza `last_seen_at` y entrega el control al siguiente controlador. Ante un fallo de infraestructura responde `500` sin exponer detalles.

**Conexiones:** usa `isSessionId` de `session-id.ts` antes del repositorio, `session.repository.ts` para recuperar y tocar la sesión, `session-cookie.ts` para borrar la cookie con los mismos atributos y `env.ts` para conocer el nombre de cookie. Los controladores posteriores obtienen la sesión validada mediante `getAuthenticatedSession`.

**Pendiente y consumidor futuro:** actualmente protege `GET /auth/session`, `GET /student/profile`, `GET /student/kardex`, `GET /student/grades` y `GET /student/schedule`. Se reutilizará en las rutas privadas de la funcionalidad adicional seleccionada.

### `backend/src/modules/auth/session-id.ts`

**Problema que resuelve:** impide que una cookie manipulada con valor no UUID llegue a una columna PostgreSQL UUID y provoque un error de infraestructura en vez de rechazo de sesión.

**Por qué existe:** comparte una sola validación Zod entre el middleware de acceso y logout.

**Entradas y salidas:** `isSessionId(value: unknown): value is string` devuelve un booleano con estrechamiento de tipo usando `z.uuid().safeParse`; no lanza un error por entrada inválida ni concede autenticación por sí sola.

**Conexiones:** lo usan `requireAuthenticatedSession` y `logout` antes de consultar o revocar. Una cookie UUID válida todavía requiere la comprobación de existencia, expiración y revocación en el repositorio.

**Pendiente y consumidor futuro:** los futuros consumidores de cookies de sesión deben reutilizarlo; Rebo recibe los mismos contratos HTTP existentes.

### `backend/src/modules/auth/token-crypto.ts`

Protege el JWT institucional antes de guardarlo en Supabase mediante AES-256-GCM:

- Usa una llave de 32 bytes decodificada desde `SII_TOKEN_ENCRYPTION_KEY`.
- Genera un IV aleatorio de 12 bytes para cada cifrado.
- Genera y valida un tag de autenticación de 16 bytes.
- Usa el identificador de sesión como AAD (Additional Authenticated Data), por lo que un token cifrado no puede reasociarse con otra sesión.
- Almacena el resultado como `v1.iv.authTag.ciphertext`, usando Base64URL.
- Al descifrar, los datos modificados o asociados a otra sesión producen un error y deben descartarse.

El módulo no registra ni expone el token original ni el valor cifrado.

### `backend/src/modules/auth/session.repository.ts`

Centraliza el acceso interno a `public.app_sessions`. Sus funciones no son endpoints HTTP y su tipo `ActiveSession`, que incluye `siiToken`, no debe enviarse nunca como respuesta al frontend.

| Función | Responsabilidad |
|---|---|
| `createSession` | Cifra el JWT SII y crea una fila de sesión con expiración. |
| `findActiveSession` | Recupera solo sesiones no revocadas y no vencidas; descifra el token únicamente dentro del backend. |
| `touchSession` | Actualiza la hora de última actividad de una sesión activa. |
| `revokeSession` | Marca una sesión como revocada para logout o invalidación. |

### `backend/src/modules/sii/sii-api.error.ts`

Define errores internos y seguros para el cliente institucional. Los códigos permiten que los controladores devuelvan mensajes adecuados sin filtrar detalles de SII ITC:

| Código | Significado |
|---|---|
| `invalid_credentials` | SII ITC rechazó las credenciales. |
| `invalid_session` | El JWT institucional asociado a una sesión local ya no es válido. |
| `unavailable` | No fue posible comunicarse con SII ITC o respondió con un error no recuperable. |
| `invalid_response` | SII ITC respondió, pero el JSON es inválido o el login no contiene el token con el formato esperado. Los DTO detectan además estructuras académicas incompatibles mediante `ZodError`. |

### `backend/src/modules/sii/sii.client.ts`

Es el cliente exclusivo del backend para comunicarse con SII ITC. La función `loginWithSii`:

- Envía correo y contraseña a `POST /api/login` usando la URL configurada en `SII_API_BASE_URL`.
- Establece `Accept` y `Content-Type` como `application/json`.
- Limita la espera con `SII_REQUEST_TIMEOUT_MS` para impedir solicitudes bloqueadas indefinidamente.
- Reconoce respuestas `401` y `422` como credenciales inválidas.
- Clasifica errores de red, timeout u otros códigos no exitosos como servicio no disponible.
- Valida la respuesta exitosa con Zod y requiere un campo `token` no vacío.
- Devuelve el token solamente al servicio interno de autenticación.

El formato real confirmado del login institucional contiene el JWT en `message.login.token`. Por ello, el esquema del cliente valida `status: 200`, `flag: 'success'` y la ruta anidada `message.login.token` antes de devolver exclusivamente el token al servicio interno.

El cliente no registra ni reenvía credenciales, tokens ni respuestas institucionales al navegador.

La función `getStudentProfile` recibe el JWT SII exclusivamente desde una sesión interna y lo adjunta al header `Authorization: Bearer <token>` para consultar `GET /api/movil/estudiante`. Si SII responde `401` o `403`, genera `invalid_session`; el controlador revoca entonces la sesión local y borra su cookie.

La función `getStudentKardex(siiToken): Promise<unknown>` aplica el mismo patrón a `GET /api/movil/estudiante/kardex`. Resuelve la consulta real del historial sin que el frontend conozca el JWT. Recibe el token de la sesión validada y devuelve el JSON institucional exclusivamente al controlador; este lo valida con el DTO. Red o timeout y HTTP no exitosos generan `unavailable`, `401/403` generan `invalid_session` y un JSON ilegible o `null` genera `invalid_response`.

`getStudentGrades(siiToken): Promise<unknown>` existe para consultar `GET /api/movil/estudiante/calificaciones` con Bearer interno y timeout. Recibe el JWT validado por la sesión y devuelve el JSON sin tipar al controlador, sin guardar notas en Supabase. Clasifica red/HTTP, sesión rechazada y JSON inválido igual que Kardex. Se conecta con `getGrades`, que aplica el DTO antes de responder; Rebo consume solo `/student/grades`. Las evaluaciones recibidas son los parciales del período actual; las finales registradas pertenecen a Kardex.

`getStudentSchedule(siiToken): Promise<unknown>` consulta `GET /api/movil/estudiante/horarios` con JWT interno y timeout. Separa la comunicación institucional de la pantalla de horario. Devuelve el JSON al controlador `getSchedule`; no persiste el horario ni entrega tokens. Red/timeout y HTTP no exitosos generan `unavailable`, `401/403` generan `invalid_session` y JSON ilegible o `null` genera `invalid_response`. Rebo consumirá el DTO desde `/student/schedule`; Emilio confirmó su funcionamiento autenticado y se verificó por HTTP el rechazo sin cookie.

### `backend/src/modules/auth/authentication.service.ts`

Orquesta el flujo de inicio de sesión del lado servidor:

1. Envía las credenciales al cliente SII interno.
2. Recibe el JWT institucional solo dentro del backend.
3. Genera un UUID aleatorio para la nueva sesión local.
4. Calcula la expiración según `SESSION_TTL_HOURS`.
5. Crea la sesión mediante `createSession`, que cifra el JWT antes de persistirlo en Supabase.

`auth.controller.ts` invoca este servicio desde `POST /auth/login` y emite una cookie `httpOnly` si el proceso termina correctamente.

### `backend/src/modules/auth/auth.routes.ts`

**Problema que resuelve:** organiza los endpoints de autenticación en un único punto en vez de mezclar rutas de login, sesión y logout con la configuración general de Express.

**Por qué existe:** un `Router` de Express permite agrupar funcionalidades relacionadas y montarlas con un prefijo. Esto facilita agregar middleware específico de autenticación en el futuro sin afectar rutas académicas u otros módulos.

**Entradas y salidas:** no procesa datos por sí mismo; enruta `POST /login`, `GET /session` y `POST /logout` a sus controladores. `GET /session` pasa antes por `requireAuthenticatedSession`. Al montarse con el prefijo `/auth`, las rutas públicas finales son `POST /auth/login`, `GET /auth/session` y `POST /auth/logout`.

**Conexiones:** importa los controladores de `auth.controller.ts` y es montado desde `app.ts` mediante `app.use('/auth', authRouter)`.

**Pendiente y consumidor futuro:** Rebo consumirá estas rutas desde la interfaz de login usando `credentials: 'include'`. Las cuatro rutas académicas ya reutilizan el middleware de sesión antes de consultar SII ITC.

### `backend/src/modules/auth/auth.controller.ts`

**Problema que resuelve:** transforma peticiones HTTP no confiables del frontend en llamadas seguras a la lógica interna de autenticación, sin filtrar tokens institucionales, errores crudos de SII ni detalles de Supabase.

**Por qué existe:** separa responsabilidades HTTP (validación de cuerpo, códigos de estado, cookies y respuestas JSON) de las responsabilidades de negocio que pertenecen a `authentication.service.ts` y de persistencia que pertenecen a `session.repository.ts`.

**Entradas y salidas:**

| Función | Entrada | Salida HTTP | Persistencia/efecto |
|---|---|---|---|
| `login` | JSON `{ email, password }` | `200 { authenticated: true }`; `400`, `401`, `502`, `503` o `500` en error | Pide autenticación al servicio; en éxito establece la cookie con el ID de sesión. |
| `getSession` | Sesión previamente validada por middleware | `200 { authenticated: true }` | No consulta ni expone el JWT; usa la sesión interna ya adjuntada a la petición. |
| `logout` | Cookie de sesión opcional | `204` o `500` | Siempre elimina la cookie; solo intenta revocar un ID UUID válido. Si falla Supabase mantiene `500`, sin afirmar que la sesión de servidor fue revocada. Sin cookie o con formato inválido devuelve `204` sin consultar la base. |
| `clearSessionCookie` | Objeto `Response` | No devuelve cuerpo | Expira la cookie usando los mismos atributos de seguridad. |
| `sendSiiError` | Error interno `SiiApiError` | `401`, `502` o `503` con mensaje seguro | Oculta detalles de red y respuesta de SII ITC. |

**Conexiones:** `login` invoca `authenticateWithSii`, el cual usa `sii.client.ts` y `session.repository.ts`. `getSession` recibe una sesión ya validada por `authenticated-session.middleware.ts`; `logout` usa el repositorio para revocar. Las opciones de cookie provienen de `session-cookie.ts`; el nombre viene de `env.ts`.

**Pendiente y consumidor futuro:** el frontend de Rebo utilizará estos endpoints desde su servicio de API. Falta conectar su formulario React; el login institucional y el middleware reutilizable ya se probaron localmente.

### Montaje en `backend/src/app.ts`

**Problema que resuelve:** evita respuestas `404` al hacer que Express conozca el router de autenticación.

**Por qué existe:** importar un router no basta; `app.use('/auth', authRouter)` y `app.use('/student', studentRouter)` los incorporan al ciclo de solicitudes de Express. También se mantiene una sola ejecución de `cookieParser()`, suficiente para leer la cookie en todos los controladores.

**Entradas y salidas:** recibe las solicitudes cuyo path inicia con `/auth` o `/student` y las delega al router correspondiente. No produce respuestas propias para esas rutas; cada controlador decide su respuesta.

**Conexiones:** el orden es CORS, `requireTrustedMutationOrigin`, JSON limitado a 16 KB, `cookieParser`, routers y salud, fallback JSON `404`, y `apiErrorHandler` al final. La protección de mutaciones se aplica antes de parsear cuerpos o ejecutar acciones; los routers reciben cookies y JSON ya procesados.

**Pendiente y consumidor futuro:** es la base de todos los clientes frontend y de las pruebas manuales de API. Los routers de autenticación y los cuatro recursos académicos ya están montados; el módulo de la función adicional se integrará cuando sea elegido y diseñado.

### `backend/src/middleware/request-origin.middleware.ts`

**Problema que resuelve:** CORS limita lectura en navegador pero no impide por sí mismo que una solicitud altere una sesión. Este middleware rechaza mutaciones con origen ajeno antes de login/logout u otras acciones.

**Por qué existe:** concentra la política de origen, independiente de cada controlador. Se basa en comparación exacta de origen, conforme a [OWASP sobre verificación de origen](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

**Entradas y salidas:** `requireTrustedMutationOrigin` recibe una petición Express. `safeMethods` permite `GET`, `HEAD` y `OPTIONS`; para otros métodos compara `Origin` con `new URL(FRONTEND_ORIGIN).origin`, rechazando también `null` y dominios parecidos. Sin Origin verifica Referer si existe; sin ambos rechaza `Sec-Fetch-Site: cross-site`. Origen ajeno o Referer inválido produce `403` JSON; el permitido llama a `next()`.

**Conexiones:** `app.ts` lo monta antes del parser y routers; CORS usa el mismo origen normalizado. Las herramientas sin encabezados de navegador, como Postman y comandos locales, siguen admitidas. Rebo no necesita inventar un token CSRF ni enviar una cabecera adicional para el flujo actual: su navegador envía Origin y su cliente debe incluir la cookie.

**Pendiente y consumidor futuro:** verificar cookies y esta política en navegador con los dominios reales de producción. No equivale a autenticación ni protección contra clientes capaces de falsificar cabeceras, ni sustituye validación de sesión, TLS o límites de intentos. No se ha realizado una prueba de navegador en Render.

### `backend/src/middleware/error-handler.middleware.ts`

**Problema que resuelve:** evita respuestas HTML/stack inesperadas en una API JSON ante cuerpos inválidos, grandes o errores no controlados.

**Por qué existe:** ofrece un cierre uniforme del pipeline de Express para que Rebo pueda procesar errores sin depender del entorno. Sigue el patrón de [middleware de errores de Express](https://expressjs.com/en/guide/error-handling/).

**Entradas y salidas:** `parserErrorType(error: unknown)` extrae de forma defensiva `type`; `apiErrorHandler` traduce `entity.parse.failed` a `400` y `entity.too.large` a `413`, con mensajes constantes. Otros errores producen `500` JSON sin serializar el error ni cuerpo recibido. Si `headersSent` ya es verdadero delega con `next(error)` sin intentar responder dos veces.

**Conexiones:** se registra después de todas las rutas y del fallback JSON `404` en `app.ts`. Complementa el manejo específico de errores SII que ya hacen los controladores.

**Pendiente y consumidor futuro:** Rebo puede tratar los errores de API como JSON `{ message }`; nuevas categorías de error deben mapearse explícitamente si se incorporan, sin devolver mensajes internos.

### `backend/src/modules/student/student.routes.ts`

**Problema que resuelve:** agrupa las rutas académicas de estudiante y garantiza que las rutas registradas tengan sesión válida antes de alcanzar el controlador.

**Por qué existe:** separa el dominio académico del dominio de autenticación y permitirá añadir perfil, kardex, calificaciones y horario sin alterar `app.ts` ni repetir la protección de sesión.

**Entradas y salidas:** registra `GET /profile`, `GET /kardex`, `GET /grades` y `GET /schedule` por separado; montado bajo `/student`, expone sus cuatro endpoints académicos. Cada ruta requiere la cookie de sesión y delega al controlador solo después de `requireAuthenticatedSession`. Registrar `getKardex` como otro callback de `/profile` no crea una nueva ruta y ocasiona `404` en `/student/kardex`.

**Conexiones:** importa el middleware de autenticación y los controladores `getProfile`, `getKardex`, `getGrades` y `getSchedule` desde `student.controller.ts`; `app.ts` lo monta bajo `/student`.

**Pendiente y consumidor futuro:** Rebo consumirá perfil, Kardex, calificaciones y horario desde sus pantallas. Las cuatro rutas están registradas y rechazan solicitudes sin cookie; las pantallas siguen pendientes en la copia local revisada. Emilio mantiene los contratos y la integración backend.

### `backend/src/modules/student/student.controller.ts`

**Problema que resuelve:** presenta el perfil, Kardex y calificaciones institucionales mediante endpoints propios, sin que React necesite conocer ni usar el JWT de SII.

**Por qué existe:** convierte la sesión interna validada en una consulta autorizada a SII y centraliza el manejo seguro de respuesta, sesión institucional vencida e indisponibilidad del servicio.

**Entradas y salidas:** recibe una petición ya autorizada por middleware. Obtiene la respuesta cruda de SII y la transforma con `parseStudentProfile`. Devuelve `200 { profile: StudentProfile }`; puede devolver `401` si el JWT SII expiró, `502` si SII envía JSON inválido o si el DTO detecta una estructura de perfil incompatible, `503` cuando SII no está disponible o `500` ante error interno. No devuelve el JWT.

**Conexiones:** obtiene `siiToken` desde `getAuthenticatedSession`, consulta `getStudentProfile` en `sii.client.ts`, normaliza los datos con `student-profile.dto.ts` y, en caso de token inválido, usa `revokeSession` y `clearSessionCookieOptions`.

En `getProfile`, la cookie se borra antes de intentar revocar una sesión institucional rechazada. Si falla la revocación se devuelve `500` JSON controlado, igual que en Kardex/calificaciones/horario; ya no se propaga ese fallo al manejador HTML predeterminado ni queda intacta la cookie del navegador.

`getKardex(request, response): Promise<void>` recibe una petición autorizada por middleware, obtiene `session.siiToken`, consulta `getStudentKardex` y normaliza con `parseStudentKardex`. Devuelve `200 { kardex: StudentKardex }`. Un `ZodError` o JSON inválido produce `502`; una sesión institucional rechazada limpia la cookie, intenta revocar la sesión local y produce `401` (o `500` si falla esa revocación); indisponibilidad SII produce `503` y otros errores, `500`. Envía cada respuesta y termina con `return;` cuando corresponde para respetar `Promise<void>`. No persiste el historial ni devuelve la respuesta cruda institucional.

`getGrades(request, response): Promise<void>` obtiene la sesión del middleware, consulta `getStudentGrades(session.siiToken)` y transforma el JSON mediante `parseStudentGrades`. Devuelve `200 { grades: StudentGrades }`. `ZodError` y JSON inválido producen `502`; sesión institucional rechazada limpia la cookie y revoca la sesión antes de `401` (si falla la revocación, `500`); indisponibilidad produce `503` y otros errores, `500`. No calcula promedios ni asigna una nota final.

`getSchedule(request, response): Promise<void>` obtiene la sesión, llama a `getStudentSchedule`, normaliza mediante `parseStudentSchedule` y envía una sola respuesta `200 { schedule: StudentSchedule }`. Maneja `ZodError` y JSON inválido con `502`, indisponibilidad con `503`, sesión institucional inválida con borrado de cookie y revocación seguida de `401` (o `500` si falla la revocación), y otros errores con `500`. Emilio eliminó una llamada duplicada a `.json()` que intentaba modificar una respuesta ya enviada; la revisión confirmó que queda un solo envío. Este error de ejecución no lo detectaba TypeScript.

**Pendiente y consumidor futuro:** Rebo implementará las cuatro pantallas con estos contratos y Emilio mantendrá el backend. Calificaciones mostrará parciales disponibles del semestre en curso; Kardex, resultados finales institucionales por materia/período. La interfaz debe conservar esa diferencia y no construir una final propia.

### `backend/src/modules/student/student-profile.dto.ts`

**Problema que resuelve:** evita que el frontend dependa de la estructura cruda de SII, que puede usar nombres institucionales poco claros o inconsistentes, como `percentaje_avance_cursando`.

**Por qué existe:** valida la forma mínima del perfil recibido desde SII y lo adapta a un contrato interno `StudentProfile` con nombres consistentes y agrupaciones útiles para el dashboard.

**Entradas y salidas:** `parseStudentProfile(rawProfile)` recibe `unknown` y exige una envoltura de éxito (`code: 200`, `flag: true` o `'success'`) y `data.numero_control` como texto no vacío. Esto evita aceptar un error institucional con `data: {}` como perfil exitoso. Valida los otros campos con Zod y devuelve `StudentProfile`; los datos opcionales ausentes siguen como `null` y los números en texto se convierten a `number`. El contrato TypeScript conserva `controlNumber: string | null` por compatibilidad, aunque el parser exige la identidad mínima no vacía. Si la estructura no cumple el contrato, lanza `ZodError`, que el controlador traduce a `502`.

El campo institucional `data.persona` fue confirmado como texto mediante una consulta real que solo registró su tipo. Se valida con `textValue` y se mapea a `profile.name: string | null`: conserva mayúsculas, minúsculas y acentos, quitando únicamente espacios exteriores. Si falta o es `null`, devuelve `name: null`. Un objeto o texto vacío es incompatible y produce `502`, como los demás textos validados; no se inventa un nombre ni se infiere a partir del correo. La respuesta añade `name` sin eliminar los campos existentes ni exponer el objeto institucional crudo.

Después del cambio, una prueba real autorizada confirmó `200` en login/sesión/perfil y que `profile.name` contiene texto no vacío, sin registrar su valor. Logout devolvió `204` y reutilización de la cookie `401`; las sesiones creadas para inspección y verificación quedaron revocadas. El conjunto completo pasó 107 regresiones y `npm run check`.

**Conexiones:** lo invoca `student.controller.ts` inmediatamente después de `getStudentProfile`; no llama a la base de datos, no conoce cookies ni expone el JWT de SII.

**Pendiente y consumidor futuro:** Rebo reutilizará las métricas y `profile.name` en el dashboard o encabezado, actualizando su tipo frontend y mostrando un texto neutral si el nombre es `null`. Emilio dará soporte al contrato. El nombre es un dato personal: no incluir valores reales en fixtures, logs ni capturas públicas sin anonimizar.

### `backend/src/modules/student/student-kardex.dto.ts`

**Problema que resuelve:** transforma el historial de SII a un contrato propio tipado, conservando calificaciones textuales como `AC` sin convertirlas a cero ni perder registros.

**Por qué existe:** separa validación y traducción de datos de la consulta HTTP y del controlador. Evita acoplar la pantalla a `data.kardex` y los nombres institucionales.

**Entradas y salidas:** `parseStudentKardex(rawKardex: unknown): StudentKardex` recibe el objeto institucional con `code: 200`, `flag: true` y `data`, sin la envoltura exterior de nuestra API. `siiKardexSchema` valida ese éxito y su lista; `requiredText` exige textos no vacíos. `nonNegativeNumber` convierte textos numéricos y exige números finitos no negativos; el semestre además debe ser entero. `gradeLabelSchema` conserva la calificación como texto y `toNumericGrade` devuelve su número finito o `null` si es textual. Una estructura incompatible lanza `ZodError`; una lista vacía es válida.

`StudentKardex` devuelve `progressPercentage` y `subjects: KardexSubject[]`. Cada registro contiene `name`, `code`, `period`, `credits`, `grade`, `gradeLabel`, `evaluationDescription` y `semester`. El avance procede de SII sin recalcularse. `.map()` conserva orden y cantidad, incluidos intentos repetidos. `period` conserva valores como `26/V` sin atribuirles un significado no confirmado; `gradeLabel: 'AC'` produce `grade: null`, nunca cero. Las cadenas vacías de créditos se rechazan.

**Conexiones:** `getKardex` lo invoca después de `getStudentKardex`; no accede a cookies, JWT ni Supabase. El JSON propio es `{ kardex: { progressPercentage, subjects } }`, sin `kardex.data` ni la envoltura `code/message/flag` institucional.

**Pendiente y consumidor futuro:** Rebo usará este contrato para la pantalla estructurada del historial, con el resultado final institucional de cada registro de materia/período e intento. Debe mostrar `gradeLabel` y distinguir notas numéricas de textuales al colorear; no se asigna una equivalencia numérica a `AC`. La consulta autenticada normalizada final ya devolvió `200` en la prueba real posterior a las correcciones y el rechazo sin cookie también está comprobado.

**Validación de este conjunto:** `npm run check` pasó. Se ejecutó el DTO real contra el JSON adjunto sin guardar datos personales en el repositorio: conservó los 50 registros, códigos, períodos y créditos, y convirtió `AC` a etiqueta con número `null`. También se verificó el rechazo de envoltura inválida, `flag: false` y créditos vacíos, y la aceptación de un historial vacío. Emilio confirmó previamente `200` de la consulta institucional en Postman; esa prueba fue anterior a la normalización.

### `backend/src/modules/student/student-grades.dto.ts`

**Problema que resuelve:** normaliza las calificaciones de SII por período, materia y evaluación, conservando las notas pendientes sin convertirlas a cero y aislando el nombre institucional `calificaiones`.

**Por qué existe:** separa validación y traducción de datos externos de la consulta HTTP, el controlador y la pantalla de Rebo. Un nombre erróneo en SII no se propaga al contrato propio.

**Entradas y salidas:** `parseStudentGrades(rawGrades: unknown): StudentGrades` recibe la envoltura institucional con `code: 200`, `flag: true` y `data` como lista. `siiGradesSchema` valida períodos, materias y sus `calificaiones`. `requiredText` rechaza texto vacío; `nonNegativeNumber` acepta números o texto numérico y exige un resultado finito no negativo; `integerValue` exige además enteros para año e identificadores. `gradeLabelSchema` conserva números como texto, etiquetas textuales o `null`. `toNumericGrade` devuelve un número finito para una etiqueta numérica o `null` para una nota ausente o textual. Una forma incompatible lanza `ZodError`; listas vacías son válidas.

`StudentGrades` contiene `periods: StudentGradesPeriod[]`. Cada período tiene `code`, `year`, `description` y `subjects: StudentGradesSubject[]`. Cada materia tiene `groupId`, `name`, `code`, `group` y `assessments: StudentAssessment[]`. Cada evaluación tiene `id`, `number`, `grade: number | null` y `gradeLabel: string | null`. Los identificadores permiten distinguir grupos y evaluaciones; el número de evaluación se conserva sin inferir que alguna sea la final. Los `.map()` conservan orden y cantidad. Una nota pendiente queda con ambos campos en `null`; una textual conserva su etiqueta y deja `grade: null`.

**Conexiones:** lo usa `getGrades` después de `getStudentGrades`. El cliente React recibe `{ grades: { periods: [...] } }` y no conoce `data`, `calificaiones` ni tokens institucionales. No accede a Supabase ni persiste notas.

**Pendiente y consumidor futuro:** Rebo usará este contrato para búsqueda/filtro por materia y período, carga, errores y notas por parcial. Mostrar “Pendiente” o `—` para un parcial con `gradeLabel: null`; si no hay notas capturadas en la materia, “Calificaciones aún no disponibles”. Conservar notas cero reales y etiquetas textuales. Según el criterio acordado a partir de la explicación y capturas de Emilio, Calificaciones muestra los parciales disponibles, no una lista etiquetada como final. Los resultados finales registrados se muestran desde Kardex. No se calcula una final propia con parciales ni se mezcla automáticamente el historial con las materias actuales. Los colores deben distinguir valores numéricos, notas pendientes y etiquetas.

**Criterio académico acordado:** Emilio explicó cuatro parciales independientes, aprobación de cada uno con 70 o más y regularización de los reprobados; el resultado final se conoce al cierre y se refleja en Kardex. Esta regla explica la UI, pero el backend no calcula aprobación, regularización ni promedios finales. El DTO conserva la cantidad de evaluaciones recibida; no impone cuatro como límite universal. El PDF solicita nota final; el equipo adopta la presentación institucional de parciales actuales y finales históricos en sus respectivas secciones, sin inventar resultados faltantes.

**Validaciones de este conjunto:** `npm run check` pasó. La ejecución del DTO sobre el JSON institucional adjunto coincidió exactamente con el JSON normalizado enviado después por Emilio: un período, cuatro materias, 16 evaluaciones y ocho notas pendientes conservadas. También se verificaron rechazo de envoltura inválida, `flag: false` y nota vacía, aceptación de períodos vacíos y conservación de una etiqueta textual de prueba. Las pruebas fueron locales; no se guardaron respuestas personales en el repositorio ni se realizaron nuevas consultas autenticadas a SII por el agente.

### `backend/src/modules/student/student-schedule.dto.ts`

**Problema que resuelve:** convierte las columnas institucionales de lunes a sábado en sesiones con día, hora inicial/final y aula, listas para una tabla o agenda.

**Por qué existe:** separa el formato del SII de la interfaz de Rebo y valida horas antes de intentar representarlas. No crea fechas ni convierte a UTC: conserva las horas locales del horario académico.

**Entradas y salidas:** `parseStudentSchedule(rawSchedule: unknown): StudentSchedule` recibe la envoltura institucional con `code: 200`, `flag: true` y períodos en `data`. `requiredText` exige textos no vacíos e `integerValue` convierte texto numérico a entero no negativo. `classroomSchema` acepta texto no vacío o `null`. `timeRangeSchema` acepta `null` o un bloque `HH:mm-HH:mm` de 00:00 a 23:59, exige final posterior al inicio y lo transforma en `{ startTime, endTime }`. Se rechazan bloques invertidos, de duración cero, mal formados y que crucen medianoche con final menor que inicio; ampliar el contrato solo si SII demuestra otro formato válido.

`siiSubjectSchema` valida metadatos y seis pares de horario/aula. `SiiScheduleSubject` infiere el tipo ya validado desde Zod. `dayFields` relaciona campos institucionales y aulas con `ScheduleDay`: 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado. `parseSessions` omite días sin horario y conserva sesiones con aula `null`; no inventa un salón.

`StudentSchedule` contiene `periods: SchedulePeriod[]`. Cada período tiene `code`, `year`, `description` y `subjects`. Cada `ScheduleSubject` tiene `groupId`, `group`, `name`, `code`, `shiftCode`, `programName`, `levelCode` y `sessions: ScheduleSession[]`. Cada sesión tiene `day`, `startTime`, `endTime` y `classroom`. Un bloque de dos horas sigue siendo una sesión; no se divide en horas. Se conservan períodos y materias incluso con listas vacías. `shiftCode` conserva `clave_turno` sin deducir un turno por el valor `C.Celaya`.

**Conexiones:** lo invoca `getSchedule` tras consultar `getStudentSchedule`; no conoce cookies, JWT ni Supabase. El frontend recibe `{ schedule: { periods: [...] } }` y agrupa sesiones por día y hora para su agenda.

**Pendiente y consumidor futuro:** Rebo implementará agenda, orden por hora, leyenda de días y estados de carga/error/vacío. No asumir ausencia de materia porque no tenga sesiones asignadas; el DTO no detecta ni resuelve traslapes. El contrato ya puede utilizarse después de integrar el PR de Emilio.

**Validaciones realizadas:** `npm run check` pasó. Se ejecutó el DTO con datos locales sintéticos que reproducen los bloques compartidos: cuatro materias y 12 sesiones, días correctos, horas separadas y omisión de días nulos. También se comprobó sábado, aula nula con sesión válida, materia sin sesiones, períodos vacíos y rechazo de horas fuera de rango, invertidas, iguales y formato inválido. Estas son pruebas aisladas del DTO, no respuestas simuladas para sustituir SII. Emilio compartió previamente el JSON institucional real; el agente no usó credenciales ni realizó una nueva consulta autenticada.

### `backend/src/lib/supabase.ts`

Crea un cliente de Supabase para uso exclusivo del backend. Se inicializa con `SUPABASE_URL` y `SUPABASE_SECRET_KEY`; la renovación y persistencia de sesión de Supabase Auth están deshabilitadas porque las sesiones de esta aplicación son propias y se relacionan con SII ITC, no con Supabase Auth.

La llave de servidor puede evitar RLS, por lo que este cliente no puede llegar al frontend ni recibir tokens o encabezados controlados por el usuario.

### `backend/tests/backend.regression.mjs`

**Problema que resuelve:** reproduce errores difíciles de provocar con cuentas reales y verifica que no reaparezcan al cambiar el backend.

**Por qué existe:** es una batería versionada y ejecutable con `npm test --workspace=backend`, sin instalar dependencias adicionales; usa `tsx` existente y `node:assert/strict`. `backend/package.json` define el script `test`.

**Entradas y salidas:** configura variables ficticias, una llave efímera y una ruta dotenv inexistente; no lee `.env` real. `reset` reinicia escenario/contadores, `seed` prepara filas cifradas en memoria, el interceptor `fetch` representa SII/PostgREST y bloquea destinos externos, `call` envía HTTP a Express en un puerto local efímero y comprueba que no haya secretos ficticios en respuestas, y `test` registra cada expectativa sin parar en la primera. El resumen final reporta 107 casos y el proceso sale con código no cero si alguno falla. Subprocesos aislados comprueban configuración de producción. Libera servidor y restaura el interceptor al terminar.

**Conexiones:** importa la aplicación real y su cifrado/DTO, sustituyendo solo conexiones salientes por dobles controlados. El caso de ciclo completo llama a login, usa la cookie recién creada, consulta sesión y los cuatro recursos, cierra sesión y verifica `401` al reutilizarla. Incluye UUID inválido, expiración/revocación, fallos SII/DB, perfil de error, JSON inválido/grande, origen/Referer/metadatos, preflight, cifrado y configuración. Cinco regresiones del nombre verifican texto recortado con acentos, valor ausente, `null`, objeto rechazado y texto vacío rechazado, sin incluir nombres reales.

**Pendiente y consumidor futuro:** Emilio y Rebo deben repetirla cuando modifiquen esos contratos. No prueba SQL/RLS real, concurrencia, carga, navegador ni Render. No sustituye los endpoints obligatorios por datos simulados en producción. El error API de base de datos inyectado es no reintentable para evitar mezclar latencia de reintentos con manejo funcional; caracterizar caídas/reintentos reales sigue pendiente.

**Resultado y prueba real complementaria:** 107/107 casos pasaron, además de `npm run check` y `npm run build`. Con autorización explícita se ejecutó por separado una prueba contra SII y Supabase reales: `/auth/login`, `/auth/session`, `/student/profile`, `/student/kardex`, `/student/grades` y `/student/schedule` devolvieron `200`; `/auth/logout` devolvió `204` y reutilizar esa cookie en `/auth/session` devolvió `401`. Se creó una nueva fila de sesión y se revocó al finalizar; no se borraron filas ni se alteraron datos académicos. Credenciales recibidas por entrada estándar con eco desactivado; solo se registraron rutas y estados, sin valores personales, token o cookie. El script puntual está fuera del repositorio; no contiene credenciales incrustadas.

## Variables de entorno

Todas las variables reales se configuran en `backend/.env` local o en el panel de Render. Ese archivo no se debe confirmar. `backend/.env.example` solo contiene valores seguros de ejemplo.

Para desarrollo compartido, ambos backends conectados a la misma tabla `app_sessions` necesitan la misma `SII_TOKEN_ENCRYPTION_KEY`; una llave distinta no puede descifrar las sesiones existentes. Compartir secretos por un canal privado seguro, no en Git ni documentos. Cada integrante usa sus propias credenciales institucionales para probar. La configuración local de Rebo no requiere regenerar la llave compartida.

| Variable | Uso | Valor local de ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto HTTP del backend | `3000` |
| `FRONTEND_ORIGIN` | Único origen permitido por CORS | `http://localhost:5173` |
| `SESSION_COOKIE_NAME` | Nombre de la cookie de sesión | `pta_session` |
| `SESSION_TTL_HOURS` | Duración de la sesión en horas | `8` |
| `COOKIE_SECURE` | Obliga HTTPS para la cookie | `false` en local; `true` en producción |
| `COOKIE_SAME_SITE` | Política de envío de cookie | `lax` en local |
| `SII_API_BASE_URL` | URL base del servicio institucional | `https://sii.celaya.tecnm.mx` en configuración local |
| `SII_REQUEST_TIMEOUT_MS` | Tiempo máximo de espera para solicitudes a SII | `10000` |
| `SUPABASE_URL` | URL del proyecto Supabase | Configurar solo fuera del repositorio |
| `SUPABASE_SECRET_KEY` | Llave exclusiva del backend para acceso administrativo | Nunca exponer al frontend |
| `SII_TOKEN_ENCRYPTION_KEY` | Llave Base64 de 32 bytes para cifrar el JWT institucional antes de persistirlo | Nunca exponer ni confirmar en Git |

### Entorno local y producción

En local, frontend y backend operan en `localhost` con puertos distintos. Para producción, la cookie debe ser segura (`COOKIE_SECURE=true`). Si Render aloja frontend y backend en dominios diferentes, podría requerirse `COOKIE_SAME_SITE=none`, lo cual exige HTTPS y la opción `Secure`. La alternativa más robusta es usar subdominios propios del mismo sitio, como `app.ejemplo.com` y `api.ejemplo.com`.

## Scripts

Desde la raíz del monorepo:

| Comando | Propósito |
|---|---|
| `npm install` | Instala dependencias de todos los workspaces. |
| `npm run dev:frontend` | Ejecuta Vite para el frontend. |
| `npm run dev:backend` | Ejecuta Express con recarga de TypeScript. |
| `npm run build` | Compila frontend y backend para producción. |
| `npm run check` | Ejecuta lint del frontend y verificación de tipos del backend. |
| `npm test --workspace=backend` | Ejecuta la batería HTTP aislada de regresión del backend. |

Prueba local actual:

```text
http://localhost:3000/health
```

Respuesta esperada:

```json
{ "status": "ok" }
```

## Convención de colaboración

- `main` debe permanecer estable.
- El trabajo se realiza en ramas `feature/<descripcion>`.
- Los cambios se revisan mediante Pull Request antes de integrarse a `main`.
- No se realizan commits automáticos por el asistente; cada integrante crea sus propios commits.

Rama sugerida para la próxima consolidación del backend de Emilio (la IA no la crea):

```text
feature/backend-validation
```

## Historial técnico

### Inicialización del monorepo

- Se creó la aplicación frontend con Vite, React y TypeScript.
- Se creó el backend Express con TypeScript y un endpoint de salud.
- Se configuraron workspaces npm, scripts raíz, `.gitignore`, versión objetivo de Node y README.

### Base de autenticación y cookies

- Se añadieron `cors`, `cookie-parser`, `dotenv` y `zod`.
- Se configuró CORS con un único origen permitido y credenciales.
- Se añadió validación de configuración de entorno.
- Se creó la configuración centralizada de una cookie de sesión `httpOnly`.
- Se documentaron las reglas que impiden configuraciones inseguras de cookies.

### Fundamento de persistencia de sesiones en Supabase

- Se añadió `@supabase/supabase-js` al backend.
- Se agregaron y validan `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y `SII_TOKEN_ENCRYPTION_KEY` en la configuración del backend.
- Se creó `backend/src/lib/supabase.ts` con un cliente exclusivo de servidor y sin persistencia de Supabase Auth.
- Se creó la tabla `public.app_sessions` con RLS y permisos exclusivos para el backend.
- Se validaron localmente el tipado, la compilación y el arranque del backend.
- Se verificaron mediante consultas de solo lectura la conectividad con Supabase y las columnas esperadas de `app_sessions`, sin leer filas ni imprimir secretos.

### Repositorio de sesiones cifradas

- Se creó `token-crypto.ts`, que cifra y descifra el JWT de SII con AES-256-GCM.
- Se usa un IV aleatorio por operación y un tag de autenticación para proteger confidencialidad e integridad.
- El identificador de sesión se usa como AAD, evitando la reasociación de contenido cifrado entre sesiones.
- Se creó `session.repository.ts` con operaciones para crear, buscar, registrar actividad y revocar sesiones.
- Se validaron el tipado y la compilación del proyecto.
- Se ejecutó una prueba local con un token ficticio: el valor cifrado no incluyó el texto original y se descifró correctamente usando la misma sesión.

### Cliente SII y servicio de autenticación

- Se añadió `SII_API_BASE_URL` y `SII_REQUEST_TIMEOUT_MS` a la configuración validada del backend.
- Se creó `sii-api.error.ts` para clasificar fallos de credenciales, disponibilidad y formato de respuesta.
- Se creó `sii.client.ts` con login interno, timeout y validación del token recibido.
- Se creó `authentication.service.ts`, que une el login institucional con la creación de una sesión local cifrada.
- Se validaron el tipado y la compilación del proyecto sin enviar solicitudes a SII ITC ni usar credenciales institucionales.

### Validación real de autenticación institucional

- Se confirmó mediante una prueba autorizada que el endpoint institucional devuelve el JWT en `message.login.token`.
- Se actualizó el cliente SII para extraer únicamente ese valor después de validar la estructura de respuesta esperada.
- Se probó el flujo completo contra el backend local: login, consulta de sesión y logout.
- El backend devolvió al cliente únicamente el estado de autenticación y mantuvo el JWT institucional fuera del navegador.
- Se verificó en Supabase que las filas de `app_sessions` guardan el token con el formato cifrado `v1.iv.authTag.ciphertext`, no como JWT legible.
- Se comprobó el ciclo de vida de sesión: una sesión cerrada queda marcada con `revoked_at`, mientras que una sesión activa conserva `revoked_at` como `NULL`.
- No se documentan ni almacenan en el repositorio identificadores de sesión, tokens, correos, contraseñas ni fechas específicas de las pruebas.

### Rutas HTTP de autenticación

- Se creó `auth.routes.ts` para agrupar `POST /auth/login`, `GET /auth/session` y `POST /auth/logout`.
- Se creó `auth.controller.ts` para validar peticiones, emitir/borrar cookies y convertir errores internos en respuestas HTTP seguras.
- Se montó `authRouter` en `app.ts` con `app.use('/auth', authRouter)`.
- Se eliminó la ejecución duplicada de `cookieParser()`.
- Se comprobó que `GET /auth/session` pasó de responder `404` a ser manejado por la capa de autenticación; sin cookie válida debe responder `401`.

### Middleware de sesión autenticada

- Se creó `authenticated-session.middleware.ts` como capa reutilizable de protección de rutas.
- Se movió la validación de sesión, expiración y revocación fuera de `getSession` para evitar lógica duplicada.
- Una sesión válida se conserva solo en memoria del backend como `request.authSession`; el frontend no recibe el JWT institucional.
- `GET /auth/session` utiliza el middleware y funciona como prueba de integración de esta capa.
- Se centralizaron las opciones de borrado de cookie para que logout y las sesiones inválidas usen los mismos atributos de seguridad.

### Perfil académico protegido

- Se añadió `invalid_session` para diferenciar un JWT institucional vencido de un fallo general de SII.
- Se amplió `sii.client.ts` con `getStudentProfile`, que usa el JWT solo en el header `Authorization` del backend.
- Se crearon `student.routes.ts` y `student.controller.ts` para exponer `GET /student/profile` detrás del middleware de sesión.
- Se confirmó contra SII real que el perfil institucional contiene los indicadores bajo `data`; inicialmente nuestra API lo envolvía en `profile.data`. El DTO actual expone directamente `profile.academicProgress`, `profile.averages` y demás campos propios, sin esa estructura cruda.
- Se validaron localmente las rutas públicas y protegidas; sin cookie, perfil devuelve `401` sin contactar SII.

## Próximo cambio previsto

Perfil, Kardex, calificaciones y horario disponen de DTO. El controlador de horario ya tiene un solo envío. Tras las correcciones de sesiones y errores se ejecutó por el agente un ciclo real autorizado contra SII y Supabase, además de las pruebas aisladas; ambos alcances están detallados en la sección de regresiones. No se conservaron credenciales ni respuestas académicas en el repositorio.

La consolidación de sesiones y errores ya se probó con 107 casos aislados y un ciclo real completo. Los ocho casos inicialmente no cumplidos están corregidos y cubiertos por regresiones. Antes de considerar producción lista, faltan configuración y prueba de navegador en Render, caracterización de fallos prolongados/reintentos de Supabase, revisión de límites de intentos y esquema SQL reproducible. Rebo puede conectar todo el frontend con los contratos existentes; debe respetar el origen configurado y `credentials: 'include'`. La función extra sigue pendiente de elección conjunta, con liderazgo de Rebo y apoyo de Emilio. No se realizan commits, cambios de rama ni despliegues por el agente.

### Mantenimiento de los documentos Markdown

`README.md` describe exclusivamente tecnología, funcionamiento, requisitos, instalación y ejecución actuales. Cumple esos dos apartados del PDF; las capturas aún no están incorporadas, por lo que ese tercer apartado no se considera completo. El README no contiene roadmap, propuestas ni despliegues futuros; las capturas reales se incorporan al terminar la práctica conforme a lo solicitado por Emilio. `frontend/README.md` remite a la guía principal y documenta la base React/Vite/TypeScript actual, en lugar de instrucciones genéricas de la plantilla. `CONTEXTO.md` concentra reparto, coordinación y guía para agentes; este archivo conserva explicaciones técnicas y pendientes. Las correcciones actuales cambian validación de sesión/perfil y manejo HTTP, sin modificar el criterio académico ni agregar dependencias.
