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

El proyecto ya cuenta con la estructura inicial del monorepo y la base de seguridad para la futura autenticación. Aún no se conecta a la API del SII ITC, a Supabase ni se han implementado las pantallas funcionales.

### Implementado

- Monorepo con frontend y backend independientes.
- Frontend creado con React, Vite y TypeScript.
- Backend creado con Node.js, Express y TypeScript.
- Endpoint de salud `GET /health`.
- CORS restringido a un origen configurado.
- Base para sesiones mediante cookie `httpOnly`.
- Validación de variables de entorno del backend.
- Compilación y validación de tipos exitosas.

### Pendiente

- Rutas y componentes de interfaz.
- Autenticación real mediante el backend y SII ITC.
- Persistencia de sesiones y funcionalidades propias en Supabase PostgreSQL.
- Consulta de perfil, calificaciones, kardex y horario.
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
4. El backend devuelve una cookie con un identificador de sesión aleatorio. La cookie no contiene el JWT institucional.
5. En peticiones posteriores, el navegador envía la cookie al backend y este recupera la sesión antes de consultar SII ITC.
6. Al cerrar sesión, el backend invalida la sesión y elimina la cookie.

La persistencia de sesiones todavía no está implementada. Se usará Supabase PostgreSQL; el diseño final debe considerar caducidad, invalidación y protección del token institucional.

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
| `SII_BASE_URL` | URL base institucional, pendiente de uso | No confirmar secretos ni datos sensibles |
| `SUPABASE_URL` | URL del proyecto Supabase, pendiente de uso | Configurar solo fuera del repositorio |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave exclusiva del backend, pendiente de uso | Nunca exponer al frontend |

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

## Próximo cambio previsto

El siguiente conjunto de cambios deberá diseñar e implementar la persistencia de sesiones en Supabase PostgreSQL. Antes de implementarlo se deberá documentar:

- Esquema de tabla de sesiones.
- Forma de asociar una sesión al token institucional sin exponerlo.
- Caducidad e invalidación.
- Variables de entorno nuevas.
- Contrato de `POST /auth/login`, `GET /auth/session` y `POST /auth/logout`.
