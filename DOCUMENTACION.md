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

El proyecto cuenta con monorepo, autenticación real contra SII ITC mediante backend propio, sesiones cifradas en Supabase y endpoints protegidos de perfil, Kardex y calificaciones con DTO propios. Aún faltan las pantallas funcionales, el endpoint de horario y confirmar la fuente de la nota final oficial de calificaciones.

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
- Compilación y validación de tipos exitosas.

### Pendiente

- Rutas y componentes de interfaz.
- Integración y prueba real de horario con SII ITC.
- Confirmar cómo obtener e identificar la calificación final oficial: el JSON de calificaciones revisado solo contiene evaluaciones numeradas, con algunas notas pendientes.
- Comprobar en HTTP el rechazo de calificaciones sin cookie.
- Comprobación manual final de la respuesta normalizada de Kardex en Postman y de su acceso sin cookie.
- Dashboard y pantallas frontend.
- Seleccionar y justificar la funcionalidad adicional de impacto; el planificador es solo una propuesta por ahora.
- Pruebas, despliegue en Render y documentación visual.

## Arquitectura

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

### Sesión propuesta

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
| `id` | Identificador aleatorio de sesión; será el único valor representado por la cookie. |
| `sii_token_ciphertext` | JWT de SII cifrado por el backend; nunca se envía al navegador. |
| `student_identifier` | Identificador no sensible necesario para asociar la sesión a un estudiante, si está disponible. |
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
│   │   └── modules/
│   │       ├── auth/            # Sesión, cifrado, controladores y middleware
│   │       ├── sii/             # Cliente exclusivo de SII ITC
│   │       └── student/         # Endpoints académicos protegidos
│   ├── .env.example           # Plantilla sin secretos
│   ├── package.json
│   └── tsconfig.json
├── .gitignore
├── .node-version              # Versión objetivo de Node para desarrollo/despliegue
├── package.json               # Scripts y workspaces del monorepo
├── package-lock.json
├── README.md                  # Guía rápida de instalación y ejecución
└── DOCUMENTACION.md           # Este documento técnico vivo
```

## Frontend

### Tecnología

- React
- Vite
- TypeScript

El frontend es una SPA. Por ahora contiene la plantilla inicial de Vite; aún no incluye rutas, autenticación, llamadas al backend ni pantallas del producto.

### Responsabilidad

El frontend presentará el login, dashboard, calificaciones, kardex, horario y la funcionalidad adicional que el equipo elija. Solo consumirá endpoints del backend propio. Cuando se implementen llamadas autenticadas, deberán incluir credenciales para que el navegador envíe la cookie de sesión:

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
- `cookie-parser` permite inspeccionar la cookie de sesión en rutas protegidas futuras.
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

**Entradas y salidas:** recibe una petición que debe incluir la cookie definida por `SESSION_COOKIE_NAME`. Si no existe, está revocada o venció, borra la cookie y responde `401`. Si es válida, adjunta un `ActiveSession` interno a `request.authSession`, actualiza `last_seen_at` y entrega el control al siguiente controlador. Ante un fallo de infraestructura responde `500` sin exponer detalles.

**Conexiones:** usa `session.repository.ts` para recuperar y tocar la sesión, `session-cookie.ts` para borrar la cookie con los mismos atributos y `env.ts` para conocer el nombre de cookie. Los controladores posteriores obtienen la sesión validada mediante `getAuthenticatedSession`.

**Pendiente y consumidor futuro:** actualmente protege `GET /auth/session`, `GET /student/profile`, `GET /student/kardex` y `GET /student/grades`. Se reutilizará en horario y las rutas privadas de la funcionalidad adicional seleccionada.

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

Define errores internos y seguros para el cliente institucional. Los códigos permiten que futuros controladores devuelvan mensajes adecuados sin filtrar detalles de SII ITC:

| Código | Significado |
|---|---|
| `invalid_credentials` | SII ITC rechazó las credenciales. |
| `invalid_session` | El JWT institucional asociado a una sesión local ya no es válido. |
| `unavailable` | No fue posible comunicarse con SII ITC o respondió con un error no recuperable. |
| `invalid_response` | SII ITC respondió exitosamente, pero el formato recibido no contiene el token esperado. |

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

`getStudentGrades(siiToken): Promise<unknown>` existe para consultar `GET /api/movil/estudiante/calificaciones` con Bearer interno y timeout. Recibe el JWT validado por la sesión y devuelve el JSON sin tipar al controlador, sin guardar notas en Supabase. Clasifica red/HTTP, sesión rechazada y JSON inválido igual que Kardex. Se conecta con `getGrades`, que aplica el DTO antes de responder; Rebo consume solo `/student/grades`. Falta integrar horarios y confirmar el origen de la nota final oficial.

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

**Pendiente y consumidor futuro:** Rebo consumirá estas rutas desde la interfaz de login usando `credentials: 'include'`. Más adelante, las rutas académicas reutilizarán la verificación de sesión antes de consultar SII ITC.

### `backend/src/modules/auth/auth.controller.ts`

**Problema que resuelve:** transforma peticiones HTTP no confiables del frontend en llamadas seguras a la lógica interna de autenticación, sin filtrar tokens institucionales, errores crudos de SII ni detalles de Supabase.

**Por qué existe:** separa responsabilidades HTTP (validación de cuerpo, códigos de estado, cookies y respuestas JSON) de las responsabilidades de negocio que pertenecen a `authentication.service.ts` y de persistencia que pertenecen a `session.repository.ts`.

**Entradas y salidas:**

| Función | Entrada | Salida HTTP | Persistencia/efecto |
|---|---|---|---|
| `login` | JSON `{ email, password }` | `200 { authenticated: true }`; `400`, `401`, `502`, `503` o `500` en error | Pide autenticación al servicio; en éxito establece la cookie con el ID de sesión. |
| `getSession` | Sesión previamente validada por middleware | `200 { authenticated: true }` | No consulta ni expone el JWT; usa la sesión interna ya adjuntada a la petición. |
| `logout` | Cookie de sesión opcional | `204` o `500` | Revoca la sesión existente y elimina la cookie en el navegador. |
| `clearSessionCookie` | Objeto `Response` | No devuelve cuerpo | Expira la cookie usando los mismos atributos de seguridad. |
| `sendSiiError` | Error interno `SiiApiError` | `401`, `502` o `503` con mensaje seguro | Oculta detalles de red y respuesta de SII ITC. |

**Conexiones:** `login` invoca `authenticateWithSii`, el cual usa `sii.client.ts` y `session.repository.ts`. `getSession` recibe una sesión ya validada por `authenticated-session.middleware.ts`; `logout` usa el repositorio para revocar. Las opciones de cookie provienen de `session-cookie.ts`; el nombre viene de `env.ts`.

**Pendiente y consumidor futuro:** el frontend de Rebo utilizará estos endpoints desde su servicio de API. Falta conectar su formulario React; el login institucional y el middleware reutilizable ya se probaron localmente.

### Montaje en `backend/src/app.ts`

**Problema que resuelve:** evita respuestas `404` al hacer que Express conozca el router de autenticación.

**Por qué existe:** importar un router no basta; `app.use('/auth', authRouter)` y `app.use('/student', studentRouter)` los incorporan al ciclo de solicitudes de Express. También se mantiene una sola ejecución de `cookieParser()`, suficiente para leer la cookie en todos los controladores.

**Entradas y salidas:** recibe las solicitudes cuyo path inicia con `/auth` o `/student` y las delega al router correspondiente. No produce respuestas propias para esas rutas; cada controlador decide su respuesta.

**Conexiones:** se ejecuta después de CORS, JSON y `cookieParser`, por lo que los routers reciben cuerpos JSON y cookies ya procesados. Conecta `app.ts` con `auth.routes.ts` y `student.routes.ts`.

**Pendiente y consumidor futuro:** es la base de todos los clientes frontend y de las pruebas manuales de API. Se montarán aquí las siguientes rutas académicas protegidas.

### `backend/src/modules/student/student.routes.ts`

**Problema que resuelve:** agrupa las rutas académicas de estudiante y garantiza que las rutas registradas tengan sesión válida antes de alcanzar el controlador.

**Por qué existe:** separa el dominio académico del dominio de autenticación y permitirá añadir perfil, kardex, calificaciones y horario sin alterar `app.ts` ni repetir la protección de sesión.

**Entradas y salidas:** registra `GET /profile`, `GET /kardex` y `GET /grades` por separado; montado bajo `/student`, expone sus tres endpoints académicos. Cada ruta requiere la cookie de sesión y delega al controlador solo después de `requireAuthenticatedSession`. Registrar `getKardex` como otro callback de `/profile` no crea una nueva ruta y ocasiona `404` en `/student/kardex`.

**Conexiones:** importa el middleware de autenticación y los controladores `getProfile`, `getKardex` y `getGrades` desde `student.controller.ts`; `app.ts` lo monta bajo `/student`.

**Pendiente y consumidor futuro:** falta horario. Emilio usará perfil y Kardex en sus pantallas; Rebo consumirá calificaciones y coordinará la futura integración de horario.

### `backend/src/modules/student/student.controller.ts`

**Problema que resuelve:** presenta el perfil, Kardex y calificaciones institucionales mediante endpoints propios, sin que React necesite conocer ni usar el JWT de SII.

**Por qué existe:** convierte la sesión interna validada en una consulta autorizada a SII y centraliza el manejo seguro de respuesta, sesión institucional vencida e indisponibilidad del servicio.

**Entradas y salidas:** recibe una petición ya autorizada por middleware. Obtiene la respuesta cruda de SII y la transforma con `parseStudentProfile`. Devuelve `200 { profile: StudentProfile }`; puede devolver `401` si el JWT SII expiró, `502` si SII envía JSON inválido o si el DTO detecta una estructura de perfil incompatible, `503` cuando SII no está disponible o `500` ante error interno. No devuelve el JWT.

**Conexiones:** obtiene `siiToken` desde `getAuthenticatedSession`, consulta `getStudentProfile` en `sii.client.ts`, normaliza los datos con `student-profile.dto.ts` y, en caso de token inválido, usa `revokeSession` y `clearSessionCookieOptions`.

`getKardex(request, response): Promise<void>` recibe una petición autorizada por middleware, obtiene `session.siiToken`, consulta `getStudentKardex` y normaliza con `parseStudentKardex`. Devuelve `200 { kardex: StudentKardex }`. Un `ZodError` o JSON inválido produce `502`; una sesión institucional rechazada limpia la cookie, intenta revocar la sesión local y produce `401` (o `500` si falla esa revocación); indisponibilidad SII produce `503` y otros errores, `500`. Envía cada respuesta y termina con `return;` cuando corresponde para respetar `Promise<void>`. No persiste el historial ni devuelve la respuesta cruda institucional.

`getGrades(request, response): Promise<void>` obtiene la sesión del middleware, consulta `getStudentGrades(session.siiToken)` y transforma el JSON mediante `parseStudentGrades`. Devuelve `200 { grades: StudentGrades }`. `ZodError` y JSON inválido producen `502`; sesión institucional rechazada limpia la cookie y revoca la sesión antes de `401` (si falla la revocación, `500`); indisponibilidad produce `503` y otros errores, `500`. No calcula promedios ni asigna una nota final.

**Pendiente y consumidor futuro:** Emilio usará perfil y Kardex para sus pantallas. Rebo consumirá calificaciones mediante el contrato de períodos y evaluaciones; faltan interfaz, horario y confirmar la nota final oficial.

### `backend/src/modules/student/student-profile.dto.ts`

**Problema que resuelve:** evita que el frontend dependa de la estructura cruda de SII, que puede usar nombres institucionales poco claros o inconsistentes, como `percentaje_avance_cursando`.

**Por qué existe:** valida la forma mínima del perfil recibido desde SII y lo adapta a un contrato interno `StudentProfile` con nombres consistentes y agrupaciones útiles para el dashboard.

**Entradas y salidas:** `parseStudentProfile(rawProfile)` recibe `unknown`, valida `rawProfile.data` con Zod y devuelve `StudentProfile`. Convierte números enviados como texto a `number` y representa datos ausentes como `null`. Si la estructura no cumple el contrato, lanza `ZodError`, que el controlador traduce a `502`.

**Conexiones:** lo invoca `student.controller.ts` inmediatamente después de `getStudentProfile`; no llama a la base de datos, no conoce cookies ni expone el JWT de SII.

**Pendiente y consumidor futuro:** Emilio reutilizará sus métricas en el dashboard. Rebo usará la respuesta normalizada mediante el cliente HTTP del frontend. El campo institucional `persona` queda fuera hasta conocer y acordar su estructura necesaria para la interfaz.

### `backend/src/modules/student/student-kardex.dto.ts`

**Problema que resuelve:** transforma el historial de SII a un contrato propio tipado, conservando calificaciones textuales como `AC` sin convertirlas a cero ni perder registros.

**Por qué existe:** separa validación y traducción de datos de la consulta HTTP y del controlador. Evita acoplar la pantalla a `data.kardex` y los nombres institucionales.

**Entradas y salidas:** `parseStudentKardex(rawKardex: unknown): StudentKardex` recibe el objeto institucional con `code: 200`, `flag: true` y `data`, sin la envoltura exterior de nuestra API. `siiKardexSchema` valida ese éxito y su lista; `requiredText` exige textos no vacíos. `nonNegativeNumber` convierte textos numéricos y exige números finitos no negativos; el semestre además debe ser entero. `gradeLabelSchema` conserva la calificación como texto y `toNumericGrade` devuelve su número finito o `null` si es textual. Una estructura incompatible lanza `ZodError`; una lista vacía es válida.

`StudentKardex` devuelve `progressPercentage` y `subjects: KardexSubject[]`. Cada registro contiene `name`, `code`, `period`, `credits`, `grade`, `gradeLabel`, `evaluationDescription` y `semester`. El avance procede de SII sin recalcularse. `.map()` conserva orden y cantidad, incluidos intentos repetidos. `period` conserva valores como `26/V` sin atribuirles un significado no confirmado; `gradeLabel: 'AC'` produce `grade: null`, nunca cero. Las cadenas vacías de créditos se rechazan.

**Conexiones:** `getKardex` lo invoca después de `getStudentKardex`; no accede a cookies, JWT ni Supabase. El JSON propio es `{ kardex: { progressPercentage, subjects } }`, sin `kardex.data` ni la envoltura `code/message/flag` institucional.

**Pendiente y consumidor futuro:** Emilio usará este contrato para la pantalla estructurada del historial. El frontend debe mostrar `gradeLabel` y distinguir notas numéricas de textuales al calcular o colorear; no se ha definido una equivalencia numérica para `AC`. Falta comprobar manualmente el endpoint normalizado y su acceso sin cookie.

**Validación de este conjunto:** `npm run check` pasó. Se ejecutó el DTO real contra el JSON adjunto sin guardar datos personales en el repositorio: conservó los 50 registros, códigos, períodos y créditos, y convirtió `AC` a etiqueta con número `null`. También se verificó el rechazo de envoltura inválida, `flag: false` y créditos vacíos, y la aceptación de un historial vacío. Emilio confirmó previamente `200` de la consulta institucional en Postman; esa prueba fue anterior a la normalización.

### `backend/src/modules/student/student-grades.dto.ts`

**Problema que resuelve:** normaliza las calificaciones de SII por período, materia y evaluación, conservando las notas pendientes sin convertirlas a cero y aislando el nombre institucional `calificaiones`.

**Por qué existe:** separa validación y traducción de datos externos de la consulta HTTP, el controlador y la pantalla de Rebo. Un nombre erróneo en SII no se propaga al contrato propio.

**Entradas y salidas:** `parseStudentGrades(rawGrades: unknown): StudentGrades` recibe la envoltura institucional con `code: 200`, `flag: true` y `data` como lista. `siiGradesSchema` valida períodos, materias y sus `calificaiones`. `requiredText` rechaza texto vacío; `nonNegativeNumber` acepta números o texto numérico y exige un resultado finito no negativo; `integerValue` exige además enteros para año e identificadores. `gradeLabelSchema` conserva números como texto, etiquetas textuales o `null`. `toNumericGrade` devuelve un número finito para una etiqueta numérica o `null` para una nota ausente o textual. Una forma incompatible lanza `ZodError`; listas vacías son válidas.

`StudentGrades` contiene `periods: StudentGradesPeriod[]`. Cada período tiene `code`, `year`, `description` y `subjects: StudentGradesSubject[]`. Cada materia tiene `groupId`, `name`, `code`, `group` y `assessments: StudentAssessment[]`. Cada evaluación tiene `id`, `number`, `grade: number | null` y `gradeLabel: string | null`. Los identificadores permiten distinguir grupos y evaluaciones; el número de evaluación se conserva sin inferir que alguna sea la final. Los `.map()` conservan orden y cantidad. Una nota pendiente queda con ambos campos en `null`; una textual conserva su etiqueta y deja `grade: null`.

**Conexiones:** lo usa `getGrades` después de `getStudentGrades`. El cliente React recibe `{ grades: { periods: [...] } }` y no conoce `data`, `calificaiones` ni tokens institucionales. No accede a Supabase ni persiste notas.

**Pendiente y consumidor futuro:** Rebo usará este contrato para búsqueda/filtro por materia y período, carga, errores y estados de notas pendientes. Debe mostrar “Pendiente” cuando `gradeLabel` sea `null`; si existe etiqueta textual, mostrarla sin tratarla como cero. Falta confirmar la nota final oficial exigida por el examen: no calcular una media ni llamar “final” a una evaluación sin evidencia institucional. Los colores de desempeño deben distinguir notas pendientes de notas numéricas.

**Validaciones de este conjunto:** `npm run check` pasó. La ejecución del DTO sobre el JSON institucional adjunto coincidió exactamente con el JSON normalizado enviado después por Emilio: un período, cuatro materias, 16 evaluaciones y ocho notas pendientes conservadas. También se verificaron rechazo de envoltura inválida, `flag: false` y nota vacía, aceptación de períodos vacíos y conservación de una etiqueta textual de prueba. Las pruebas fueron locales; no se guardaron respuestas personales en el repositorio ni se realizaron nuevas consultas autenticadas a SII por el agente.

### `backend/src/lib/supabase.ts`

Crea un cliente de Supabase para uso exclusivo del backend. Se inicializa con `SUPABASE_URL` y `SUPABASE_SECRET_KEY`; la renovación y persistencia de sesión de Supabase Auth están deshabilitadas porque las sesiones de esta aplicación son propias y se relacionarán con SII ITC, no con Supabase Auth.

La llave de servidor puede evitar RLS, por lo que este cliente no puede llegar al frontend ni recibir tokens o encabezados controlados por el usuario.

## Variables de entorno

Todas las variables reales se configuran en `backend/.env` local o en el panel de Render. Ese archivo no se debe confirmar. `backend/.env.example` solo contiene valores seguros de ejemplo.

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

Rama sugerida para el módulo en curso:

```text
feature/student-profile-endpoint
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
- Se confirmó contra SII real que el perfil institucional llega bajo `profile.data`, con indicadores útiles para dashboard como semestre, promedios, créditos y avance.
- Se validaron localmente las rutas públicas y protegidas; sin cookie, perfil devuelve `401` sin contactar SII.

## Próximo cambio previsto

Perfil, Kardex y calificaciones ya disponen de DTO. Antes del commit de calificaciones, comprobar su rechazo sin cookie; la respuesta autenticada normalizada ya fue compartida por Emilio y validada contra el DTO. La siguiente integración prevista es `GET /api/movil/estudiante/horarios`, a través del endpoint propio protegido `/student/schedule`. Sigue pendiente confirmar la nota final oficial de calificaciones, coordinar las pantallas y elegir la funcionalidad adicional; no se da por cerrado el requisito académico completo.
