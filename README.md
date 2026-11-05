# Aplicación Académica SII ITC — Examen 3

Proyecto en desarrollo para consultar información académica real del SII ITC mediante un backend propio. El nombre es provisional. La funcionalidad adicional todavía no se ha elegido: el Planificador Inteligente de Trayectoria Académica es únicamente una propuesta.

Este README describe lo implementado hasta ahora. Las capturas de funcionamiento y la versión final se prepararán al terminar la práctica.

## Arquitectura

- `frontend/`: SPA creada con React, Vite y TypeScript.
- `backend/`: API creada con Node.js, Express y TypeScript. Será el único componente que se comunique con la API del SII ITC.
- Supabase PostgreSQL: persistencia actual de sesiones y futura persistencia de los datos propios de la funcionalidad adicional elegida.

El navegador solo consulta nuestro backend. Las credenciales se envían al backend para iniciar sesión y este las remite a SII; no se guardan en el repositorio ni se persisten en la aplicación. El JWT institucional se cifra en servidor antes de almacenarse en Supabase y nunca se entrega al frontend. El navegador recibe un identificador aleatorio de sesión en una cookie `httpOnly`; las solicitudes autenticadas deben usar `credentials: 'include'`.

## Estado actual

- Monorepo npm con dos aplicaciones independientes: `frontend/` y `backend/`.
- Login real contra SII, validación de entradas y manejo de errores institucionales.
- Sesiones persistidas, consulta de sesión, cierre de sesión y middleware de protección.
- Perfil académico protegido, validado con Zod y normalizado a un DTO propio para el dashboard.
- Kardex protegido conectado a SII y normalizado a un DTO que conserva períodos e intentos, incluidas notas textuales como `AC`.
- Calificaciones protegidas, conectadas a SII y normalizadas por período, materia y evaluación, conservando notas pendientes como `null`.
- Horario con consulta real y DTO por períodos, materias y sesiones de lunes a sábado; respuesta duplicada corregida y funcionamiento autenticado confirmado por Emilio.
- Las cuatro rutas académicas responden `401` sin cookie, comprobado por HTTP local.
- CORS con origen explícito y credenciales habilitadas.
- Frontend todavía con la plantilla inicial de Vite; las pantallas e integración visual siguen pendientes.

El flujo local de salud, login, perfil normalizado y logout se probó con SII real: `200`, `200`, `200` y `204`, respectivamente. También pasó `npm run check`. Esto no sustituye las pruebas pendientes de interfaz y despliegue.

## API propia disponible

| Método y ruta | Uso |
|---|---|
| `GET /health` | Salud del backend: `{ "status": "ok" }` |
| `POST /auth/login` | Recibe `{ email, password }`; crea la cookie y devuelve `{ authenticated: true }` |
| `GET /auth/session` | Requiere cookie válida; devuelve `{ authenticated: true }` o `401` |
| `POST /auth/logout` | Revoca la sesión local y elimina la cookie; devuelve `204` |
| `GET /student/profile` | Requiere cookie válida; devuelve `{ profile: StudentProfile }` |
| `GET /student/kardex` | Requiere cookie válida; devuelve `{ kardex: StudentKardex }` |
| `GET /student/grades` | Requiere cookie válida; devuelve `{ grades: StudentGrades }` |
| `GET /student/schedule` | Requiere cookie válida; devuelve `{ schedule: StudentSchedule }` |

`StudentProfile` contiene `controlNumber`, `email`, `semester`, `photoUrl`, `academicProgress`, `averages` y `subjects`. Los campos ausentes se representan con `null`; el frontend no debe buscar `profile.data` ni recibir el JWT institucional.

`StudentKardex` contiene `progressPercentage` y `subjects`. Sus registros incluyen materia, clave, período, créditos, semestre, descripción de evaluación y calificación. `gradeLabel` conserva el texto para mostrar; `grade` es número o `null` para etiquetas como `AC`. La consulta real se comprobó en Postman y el DTO pasó pruebas con la respuesta completa; queda pendiente la comprobación manual final del endpoint normalizado y del rechazo sin cookie.

## Endpoints institucionales del examen

El backend es el único consumidor de estas rutas. El host configurado es `https://sii.celaya.tecnm.mx`; las rutas ya incluyen `/api`.

| Método y ruta SII | Estado de integración |
|---|---|
| `POST /api/login` | Implementado y probado |
| `GET /api/movil/estudiante` | Implementado y probado |
| `GET /api/movil/estudiante/calificaciones` | Integrado y respuesta normalizada comprobada; nota final oficial por confirmar |
| `GET /api/movil/estudiante/kardex` | Integrado; DTO validado, comprobación HTTP final pendiente |
| `GET /api/movil/estudiante/horarios` | Integrado, DTO probado y funcionamiento autenticado confirmado por Emilio |

Las consultas protegidas usan `Authorization: Bearer <token>` exclusivamente desde el backend. La autenticación y los datos académicos obligatorios deben proceder de SII real.

## Requisitos locales

- Node.js 22 LTS (el proyecto admite versiones 22 a 24).
- npm 10 o superior.

## Instalación y ejecución

```bash
npm install
```

Copia `backend/.env.example` a `backend/.env` y configura localmente `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `SII_TOKEN_ENCRYPTION_KEY` y `SII_API_BASE_URL`. La llave de cifrado debe ser Base64 de 32 bytes y permanecer privada. En desarrollo, conserva `COOKIE_SECURE=false` y `COOKIE_SAME_SITE=lax`.

La base de datos debe disponer de la tabla `app_sessions` usada por el repositorio de sesiones. Su estructura y configuración están explicadas en [DOCUMENTACION.md](DOCUMENTACION.md); instalar dependencias no crea la tabla ni configura Supabase automáticamente.

Ejecuta cada aplicación en una terminal distinta, desde la raíz:

```bash
npm run dev:backend
```

```bash
npm run dev:frontend
```

El frontend estará normalmente en `http://localhost:5173` y el backend en `http://localhost:3000`. La ruta pública de comprobación es `http://localhost:3000/health`. El frontend actual todavía no incluye una pantalla de login.

Para comprobar tipos y lint o generar las compilaciones:

```bash
npm run check
npm run build
```

Nunca subas `.env`, contraseñas, cookies, tokens ni claves de Supabase al repositorio.

## Trabajo en equipo

`main` se mantiene estable. Cada cambio se desarrolla en una rama con el formato `feature/<descripcion>` y se integra mediante Pull Request revisado por la otra persona.

Emilio lleva integración backend SII, sesiones, dashboard y Kardex. Rebo lleva login y protección de rutas frontend, calificaciones y horario. El reparto completo y los contratos para coordinarse están en [CONTEXTO.md](CONTEXTO.md). La IA no realiza commits, pushes, Pull Requests, merges ni cambios de rama; los integrantes revisan y ejecutan esas operaciones personalmente.

Ejemplo:

```bash
git switch -c feature/login-ui
```

## Despliegue previsto

Se prevén dos servicios independientes en Render: un Static Site para `frontend/` y un Web Service para `backend/`. El despliegue aún está pendiente; las cookies, CORS y variables de producción deben configurarse y comprobarse allí.

## Pendientes de la práctica

- Login visual, redirección al dashboard y protección de rutas frontend.
- Dashboard personalizado con indicadores, carga y errores; confirmar la estructura de `persona` para incorporar el nombre si corresponde.
- Pantalla de calificaciones con búsqueda/filtro y colores de desempeño; confirmar la fuente de la nota final oficial, que no está identificada en las evaluaciones numeradas recibidas.
- Kardex completo estructurado y horario por día y hora en secciones independientes.
- Elegir y justificar una funcionalidad adicional de impacto, con administración en el backend propio y persistencia según su diseño.
- Pruebas de integración, interfaz y producción; publicación en Render.
- Capturas y README final al terminar la práctica; exposición y demostración en vivo con ambos integrantes.

La explicación técnica de módulos, funciones, entradas, salidas y conexiones se mantiene en [DOCUMENTACION.md](DOCUMENTACION.md).
