# Documentación técnica - Planificador Inteligente de Trayectoria Académica

Este documento describe el estado técnico completo del proyecto. Es el punto de referencia para entender su arquitectura, estructura, decisiones, variables, funciones y flujo de datos.

## Regla de mantenimiento

Cada conjunto de cambios que vaya a confirmarse en un commit debe actualizar este archivo **antes del commit**. La actualización debe indicar:

1. Qué se implementó o modificó.
2. Qué archivos, rutas, variables o servicios fueron afectados.
3. Cómo funciona el cambio y sus consideraciones de seguridad.
4. Qué continúa pendiente, si aplica.

No deben documentarse como terminadas funciones que solamente estén propuestas o en desarrollo.

## Estado actual

El proyecto ya cuenta con la estructura inicial del monorepo, la base de seguridad para la autenticación y la conexión de servidor a Supabase. Aún no se conecta a la API del SII ITC, no persiste sesiones desde endpoints y no se han implementado las pantallas funcionales.

### Implementado

- Monorepo con frontend y backend independientes.
- Frontend creado con React, Vite y TypeScript.
- Backend creado con Node.js, Express y TypeScript.
- Endpoint de salud `GET /health`.
- CORS restringido a un origen configurado.
- Base para sesiones mediante cookie `httpOnly`.
- Validación de variables de entorno del backend.
- Cliente de Supabase exclusivo de backend.
- Tabla `public.app_sessions` disponible en Supabase para persistir sesiones futuras.
- Compilación y validación de tipos exitosas.

### Pendiente

- Rutas y componentes de interfaz.
- Autenticación real mediante el backend y SII ITC.
- Repositorio interno de sesiones en Supabase PostgreSQL, con cifrado del token institucional.
- Integración y prueba real de login, perfil, calificaciones, kardex y horario con SII ITC.
- Planificador Inteligente de Trayectoria Académica.
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
4. El backend devolverá una cookie con un identificador de sesión aleatorio. La cookie no contendrá el JWT institucional.
5. En peticiones posteriores, el navegador enviará la cookie al backend y este recuperará la sesión antes de consultar SII ITC.
6. Al cerrar sesión, el backend invalida la sesión y elimina la cookie.

La tabla de sesiones, el cliente de Supabase y el repositorio interno ya están preparados. El repositorio cifra el JWT institucional antes de guardarlo. Todavía falta integrar este repositorio con el cliente SII, los controladores HTTP y la cookie emitida al navegador.

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
│   │   └── modules/auth/
│   │       └── session-cookie.ts # Opciones seguras para la cookie de sesión
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

El frontend presentará el login, dashboard, calificaciones, kardex, horario y planificador. Solo consumirá endpoints del backend propio. Cuando se implementen llamadas autenticadas, deberán incluir credenciales para que el navegador envíe la cookie de sesión:

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

Este módulo todavía no emite cookies porque aún no existe el login real ni el repositorio de sesiones.

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
| `unavailable` | No fue posible comunicarse con SII ITC o respondió con un error no recuperable. |
| `invalid_response` | SII ITC respondió exitosamente, pero el formato recibido no contiene el token esperado. |

### `backend/src/modules/sii/sii.client.ts`

Es el cliente exclusivo del backend para iniciar sesión en SII ITC. Su función `loginWithSii`:

- Envía correo y contraseña a `POST /api/login` usando la URL configurada en `SII_API_BASE_URL`.
- Establece `Accept` y `Content-Type` como `application/json`.
- Limita la espera con `SII_REQUEST_TIMEOUT_MS` para impedir solicitudes bloqueadas indefinidamente.
- Reconoce respuestas `401` y `422` como credenciales inválidas.
- Clasifica errores de red, timeout u otros códigos no exitosos como servicio no disponible.
- Valida la respuesta exitosa con Zod y requiere un campo `token` no vacío.
- Devuelve el token solamente al servicio interno de autenticación.

El cliente no registra ni reenvía credenciales, tokens ni respuestas institucionales al navegador. El campo exacto del token deberá corroborarse en una demostración real autorizada; si SII ITC utiliza otra propiedad, el esquema de Zod debe actualizarse a partir de esa respuesta real, no inventarse.

### `backend/src/modules/auth/authentication.service.ts`

Orquesta el flujo de inicio de sesión del lado servidor:

1. Envía las credenciales al cliente SII interno.
2. Recibe el JWT institucional solo dentro del backend.
3. Genera un UUID aleatorio para la nueva sesión local.
4. Calcula la expiración según `SESSION_TTL_HOURS`.
5. Crea la sesión mediante `createSession`, que cifra el JWT antes de persistirlo en Supabase.

No existe todavía un controlador HTTP que invoque este servicio; por lo tanto, ninguna cookie se emite todavía y el frontend no puede autenticarse aún.

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

Rama actual sugerida para el módulo en curso:

```text
feature/auth-backend-sii-sessions
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

## Próximo cambio previsto

El siguiente conjunto de cambios deberá implementar los controladores y rutas HTTP de autenticación. Antes de implementarlo se deberá documentar:

- Contrato de `POST /auth/login`, `GET /auth/session` y `POST /auth/logout`.
- Emisión y borrado de la cookie `httpOnly` mediante los controladores HTTP.
- Conversión segura de errores internos a respuestas HTTP sin revelar detalles institucionales.
