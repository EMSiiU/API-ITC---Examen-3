# Aplicación Académica SII ITC — Examen 3

Monorepo en desarrollo con frontend React y una API propia que consulta los datos reales del SII ITC. El backend implementa autenticación, sesiones, perfil, Kardex, calificaciones por parcial y horario. El frontend local contiene la plantilla inicial de Vite.

## Tecnologías utilizadas

| Tecnología | Uso actual |
|---|---|
| React | Biblioteca de interfaz basada en componentes; base de la aplicación frontend. |
| Vite | Servidor de desarrollo con recarga rápida y herramienta de compilación del frontend. |
| TypeScript | Tipado estático en frontend y backend. |
| Node.js + Express | Servidor HTTP, rutas de la API propia y comunicación con SII. |
| Supabase PostgreSQL | Persistencia de sesiones del backend. |
| Zod | Validación de configuración, entradas y respuestas institucionales. |

React + Vite permite trabajar con una SPA y compilarla como archivos estáticos. Express mantiene la integración institucional y las sesiones fuera del código del navegador. Ambos proyectos se administran como workspaces npm en un solo repositorio.

## Arquitectura y funcionamiento actual

```text
Frontend React → backend Express → API institucional SII ITC
                         └──────→ Supabase PostgreSQL (sesiones)
```

La API propia es el único punto de acceso a los datos institucionales para el frontend. Durante el login, el backend remite las credenciales a SII y cifra el JWT institucional antes de almacenarlo en Supabase. El cliente recibe un identificador aleatorio de sesión en una cookie `httpOnly`; las solicitudes autenticadas utilizan esa cookie y, desde React, requieren `credentials: 'include'`. El JWT no se entrega al frontend.

| Método y ruta propia | Función |
|---|---|
| `GET /health` | Salud del backend: `{ "status": "ok" }`. |
| `POST /auth/login` | Recibe `{ email, password }`, crea la sesión y devuelve `{ authenticated: true }`. |
| `GET /auth/session` | Comprueba la sesión local; devuelve `{ authenticated: true }` o `401`. |
| `POST /auth/logout` | Revoca la sesión local, elimina la cookie y devuelve `204`. |
| `GET /student/profile` | Devuelve `{ profile: StudentProfile }` con el perfil normalizado. |
| `GET /student/kardex` | Devuelve `{ kardex: StudentKardex }` con el historial académico. |
| `GET /student/grades` | Devuelve `{ grades: StudentGrades }` con períodos, materias y parciales. |
| `GET /student/schedule` | Devuelve `{ schedule: StudentSchedule }` con períodos, materias y sesiones. |

Las cuatro rutas académicas requieren una sesión válida y responden `401` sin cookie. En calificaciones se conservan las notas por parcial; un valor `null` indica una nota no disponible, no cero. Kardex conserva la calificación final institucional de cada registro de materia y período, incluidas etiquetas textuales como `AC`; no calcula una final con parciales incompletos.

## Requisitos locales

- Node.js compatible con el proyecto: versiones 22 a 24.
- npm 10 o superior.
- Proyecto Supabase con la tabla `public.app_sessions` y una clave de servidor.

## Instalación

Desde la raíz del repositorio:

```powershell
npm install
if (-not (Test-Path backend/.env)) {
    Copy-Item backend/.env.example backend/.env
}
```

La copia de la plantilla se realiza solo si todavía no existe `backend/.env`; conserva cualquier configuración local existente.

Completa `backend/.env` con la configuración del entorno de desarrollo:

| Variable | Configuración |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase del equipo. |
| `SUPABASE_SECRET_KEY` | Clave de servidor, exclusiva del backend. |
| `SII_TOKEN_ENCRYPTION_KEY` | Llave Base64 de 32 bytes para cifrar los tokens de sesión. |
| `SII_API_BASE_URL` | `https://sii.celaya.tecnm.mx` (las rutas del cliente ya incluyen `/api`). |
| `FRONTEND_ORIGIN` | `http://localhost:5173`. |
| `PORT` | `3000`. |
| `COOKIE_SECURE` | `false` para el entorno HTTP local. |
| `COOKIE_SAME_SITE` | `lax` para desarrollo local. |

Las variables de Supabase, cifrado y SII están comentadas en la plantilla: deben habilitarse y completarse en la copia local. No subas `.env` ni sus valores a Git. Si ambos backends usan la misma tabla de sesiones, necesitan la misma llave `SII_TOKEN_ENCRYPTION_KEY`, compartida mediante un canal privado seguro.

`npm install` no crea `app_sessions`. La estructura de la tabla y las variables del backend están descritas en [DOCUMENTACION.md](DOCUMENTACION.md); para conectarse al entorno del equipo se utiliza la tabla ya configurada.

## Ejecución local

Desde la raíz, abre una terminal para el backend:

```powershell
npm run dev:backend
```

En otra terminal ejecuta el frontend:

```powershell
npm run dev:frontend
```

- Frontend: `http://localhost:5173` (plantilla de Vite en el estado local documentado).
- Backend: `http://localhost:3000`.
- Comprobación pública: `http://localhost:3000/health`.

Las rutas autenticadas se pueden consultar con Postman: inicia sesión en `/auth/login` y utiliza la cookie guardada para las consultas académicas. El frontend local todavía no contiene una pantalla de login.

## Comprobaciones y compilación

```powershell
npm run check
npm run build
```

`check` ejecuta el lint del frontend y la comprobación TypeScript del backend. `build` compila las dos aplicaciones. Las pruebas y sus alcances están registrados en [DOCUMENTACION.md](DOCUMENTACION.md).

## Capturas de funcionamiento

Esta versión del README no contiene capturas de funcionamiento.

## Documentación del equipo

- [DOCUMENTACION.md](DOCUMENTACION.md): arquitectura, módulos, funciones, contratos y validaciones.
- [CONTEXTO.md](CONTEXTO.md): reparto entre Emilio y Rebo, decisiones, pendientes e instrucciones para sus agentes de IA.
