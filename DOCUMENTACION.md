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

Revisión del 6 de noviembre de 2026 sobre el código integrado mediante pull. Ya existen frontend académico, backend institucional y Centro de Préstamos con panel administrativo. Emilio informó que Rebo desplegó frontend y backend en Render y que funciona allí. Esta revisión no recibió URLs ni inspeccionó Render: distingue ese reporte de la evidencia local.

El frontend dejó de ser la plantilla Vite: incluye login, navegación privada, dashboard, Kardex, carga académica con parciales y recursos. El planificador fue una propuesta anterior; la función extra elegida e implementada es el Centro de Préstamos.

No quedan tareas antiguas de crear esas pantallas/elegir extra. Sí se detectaron problemas reales de autorización/inventario en recursos y diferencias de interfaz frente al contrato académico. No deben declararse resueltos por el hecho de que el despliegue funcione.

### Implementado

- Monorepo npm: React + Vite + TypeScript, Express + TypeScript y Supabase.
- React Router con /login y rutas privadas /dashboard, /kardex, /horario, /recursos.
- Contexto de autenticación, login/logout, cliente HTTP con cookies y layout de navegación.
- Backend institucional con JWT cifrado, sesión UUID en app_sessions, cookie httpOnly, expiración fija configurable de ocho horas, revocación y validación de origen.
- Perfil con name, Kardex, parciales y horario reales de SII mediante DTO; sin llamadas frontend a SII.
- Dashboard con perfil/gráficas/Top 5, Kardex con búsqueda/ordenamiento y carga académica con agenda/tarjetas de parciales.
- Centro de Préstamos: catálogo, reservas, cancelación, entrega, devolución, creación de recursos y ajuste de stock; utiliza resources y loans.
- Interceptor Centralizado de Autenticación (`frontend/src/services/api.ts`): Creación del helper `apiFetch` para envolver las peticiones `fetch`. Captura automáticamente respuestas con código `401 Unauthorized` (sesiones expiradas o cerradas en otras pestañas) y redirige al usuario de forma limpia a `/login`.
- Refactorización de Servicios Frontend: Actualización de `auth.ts`, `student.ts`, `resources.ts`, `schedule.ts`, `grades.ts` y `kardex.ts` para consumir `apiFetch`.
- Gestión Avanzada de Catálogo e Inventario (Admin): Formularios modales para creación de recursos mediante URL de imágenes de internet y botones de incremento/decremento dinámico de stock (`+`/`-`) con actualización reactiva instantánea en el estado de React.
- Validación Estricta de Stock en Backend: Garantía en base de datos de que el stock total y disponible no puedan ser negativos, impidiendo reducciones de inventario sobre artículos actualmente en préstamo.
- Configuración de Producción en Render: Despliegue del Web Service (Backend) con `npm install --include=dev && npm run build` (para resolver dependencias TypeScript), cookies seguras (`COOKIE_SECURE=true`, `SAME_SITE=none`), y Static Site (Frontend) con regla de reescritura (`/*` -> `/index.html`) para soporte completo de React Router SPA.
- Despliegue Render realizado por Rebo y funcionamiento reportado por Emilio.
- Verificación actual: check correcto con cuatro advertencias de lint; build correcto con advertencia de bundle grande; 107/107 regresiones institucionales. Esa batería no cubre autorización ni concurrencia del nuevo extra.

### Enrutamiento base del Frontend (`frontend/src/App.tsx`)

1. **Problema:** navegación SPA entre login y el producto.
2. **Motivo:** centraliza composición de proveedor, rutas y layout.
3. **Entrada/salida:** BrowserRouter resuelve /login y las privadas /dashboard, /kardex, /horario y /recursos. URLs desconocidas redirigen a /login; no existe /calificaciones independiente.
4. **Conexiones:** main.tsx monta App en StrictMode; AuthProvider envuelve el router; ProtectedRoute y Layout envuelven las páginas privadas.
5. **Estado/límites:** implementado. Protege la vista, no autoriza APIs del servidor. La regla concreta de Render para abrir rutas SPA directamente no se comprobó aquí.

### Capa de Servicios API - Autenticación (`frontend/src/services/auth.ts`)

1. **Problema:** concentra comunicación HTTP de sesión.
2. **Motivo:** separa fetch de componentes y envía credentials: 'include'.
3. **Entrada/salida:** API_URL usa VITE_API_URL o http://localhost:3000. login(email,password) devuelve { authenticated: true }; checkSession() consulta /auth/session; logout() hace POST /auth/logout sin esperar cuerpo. Ante fallo lanza Error; login interpreta message.
4. **Conexiones:** Login y AuthContext consumen el servicio; React no recibe JWT ni almacena credenciales en localStorage.
5. **Estado/límites:** conectado. No es un interceptor global de 401 de todos los servicios; FRONTEND_ORIGIN debe coincidir con la URL de React.

### Contexto Global de Autenticación (`frontend/src/context/AuthContext.tsx`)

1. **Problema:** comparte isAuthenticated/isLoading.
2. **Motivo:** AuthProvider concentra sesión visual y useAuth exige estar dentro del proveedor.
3. **Entrada/salida:** checkAuth activa carga, consulta checkSession y actualiza estado, capturando errores sin propagarlos; logout llama al servidor y siempre pone isAuthenticated=false. Un useEffect comprueba sesión al montar.
4. **Conexiones:** Login llama checkAuth; ProtectedRoute consume estados y Layout usa logout.
5. **Estado/límites:** implementado con advertencias de lint. No hay comprobación periódica ni invalidación automática desde un 401 de cualquier servicio; una sesión vencida con la app abierta puede quedar como error de datos. Cierre visual no prueba revocación remota si la red falló.

### Protección de Rutas (`frontend/src/components/ProtectedRoute.tsx`)

1. **Problema:** evita mostrar vistas privadas sin sesión confirmada.
2. **Motivo:** reutiliza una barrera visual.
3. **Entrada/salida:** muestra “Verificando sesión...” durante carga, Navigate a /login sin autenticación y Outlet con sesión.
4. **Conexiones:** useAuth y el árbol privado de App.
5. **Estado/límites:** ya cubre dashboard, Kardex, horario y recursos; no sustituye sesión/roles en rutas HTTP.

### Interfaz de Login (`frontend/src/pages/Login/`)

1. **Problema:** acceso visual mediante correo y contraseña.
2. **Motivo:** Login.tsx separa formulario de servicios y Login.module.css encapsula estilos.
3. **Entrada/salida:** email/password/error/isLoading son los estados. El formulario usa type=email, required y bloqueo durante envío; handleSubmit llama login, checkAuth y navega a /dashboard, mostrando errores.
4. **Conexiones:** authService, AuthContext y React Router; logos desde public.
5. **Estado/límites:** implementado. checkAuth captura errores, de modo que el acceso final lo decide ProtectedRoute; no se realizaron nuevos logins reales en esta revisión documental.

### Layout Principal y Navegación (`frontend/src/components/Layout/`)

1. **Problema:** navegación persistente entre páginas.
2. **Motivo:** Layout.tsx concentra sidebar/Outlet y Layout.module.css estilos.
3. **Entrada/salida:** NavLink ofrece Panel, Kardex, Horario y Recursos; handleLogout llama al contexto y navega al login incluso ante error.
4. **Conexiones:** React Router, AuthContext y lucide-react.
5. **Estado/límites:** utilizado por todas las páginas privadas. No se certificó visualmente cada tamaño de pantalla en navegador.

### Servicio de Perfil Estudiantil (`frontend/src/services/student.ts`)

1. **Problema:** obtiene el perfil normalizado.
2. **Motivo:** separa HTTP y tipo StudentProfile de vistas.
3. **Entrada/salida:** getStudentProfile consulta /student/profile con cookie y devuelve data.profile; 401 lanza “No autorizado”. El tipo incluye name, controlNumber, email, semester, photoUrl y métricas.
4. **Conexiones:** Dashboard y Resources lo consumen; URL desde VITE_API_URL o localhost:3000.
5. **Estado/límites:** conectado. TypeScript no valida el JSON en ejecución y el servicio no limpia por sí mismo AuthContext ante 401.

### Panel Principal (Dashboard) (`frontend/src/pages/Dashboard/`)

1. **Problema:** resumen del estado académico.
2. **Motivo:** Dashboard.tsx representa datos y Dashboard.module.css estilos.
3. **Entrada/salida:** carga perfil/Kardex en paralelo y maneja loading/error. getPhotoSrc acepta data:image o agrega prefijo JPEG Base64. Muestra nombre/foto/semestre/correo/avance, promedio aritmético con dos decimales, gráficas Recharts de créditos/materias y Top 5 de notas numéricas del historial.
4. **Conexiones:** student.ts, kardex.ts, Layout, lucide-react y Recharts.
5. **Estado/límites:** implementado. totalCredits=260 es fijo y no procede del plan SII; contadores/créditos ausentes se sustituyen por cero. Son hipótesis visuales que no deben presentarse como datos institucionales universales.

### Servicio de Kardex (`frontend/src/services/kardex.ts`)

1. **Problema:** obtiene el historial.
2. **Motivo:** separa fetch y tipos de las vistas.
3. **Entrada/salida:** getStudentKardex consulta /student/kardex con cookie y devuelve solo kardex.subjects, no el avance.
4. **Conexiones:** Dashboard y Kardex.
5. **Estado/límites:** conectado. El tipo frontend semester es string|null, pero el DTO backend devuelve número; el cast del JSON no corrige esa diferencia.

### Pantalla de Historial Académico (Kardex) (`frontend/src/pages/Kardex/`)

1. **Problema:** presenta finales institucionales por materia/período.
2. **Motivo:** Kardex.tsx concentra filtros/orden y su CSS Module la tabla.
3. **Entrada/salida:** kardex/loading/error/searchTerm/sortConfig controlan la vista. useMemo filtra por nombre o período y ordena name, semester, credits y grade; para ordenar notas null usa -1. Badges: >=85 verde, >=70 amarillo, menor rojo; AC conserva etiqueta.
4. **Conexiones:** getStudentKardex, Layout y /kardex.
5. **Estado/límites:** implementado con carga/error/vacío, sin recalcular finales ni eliminar intentos. Su buscador no sustituye un filtro en los parciales actuales.

### Pantalla de Horario / Carga Académica (`frontend/src/pages/Schedule/`)

1. **Problema:** agenda y parciales del período actual.
2. **Motivo:** Schedule.tsx alterna agenda/tarjetas en /horario; Schedule.module.css da presentación.
3. **Entrada/salida:** carga horario/calificaciones en paralelo; activeTab cambia vista sin nuevas consultas. agendaByDay agrupa/ordena por startTime; tarjetas relacionan por groupId y muestran C1, C2, etc., sin calcular final.
4. **Conexiones:** getStudentSchedule, getStudentGrades, Layout y lucide-react. DAYS_MAP incluye lunes-sábado.
5. **Estado/límites:** la agenda solo crea/renderiza días 1-5 y omite sábado; las tarjetas sí pueden mostrarlo. No hay búsqueda/filtro de materias o períodos en esta vista. null aparece como “-” con estilo rojo, no neutral, y no hay mensaje específico cuando todas las notas están pendientes. El tipo frontend classroom es string, pero backend admite null.

### Servicios de parciales y horario (frontend/src/services/grades.ts y schedule.ts)

1. **Problema:** obtienen notas y sesiones para Carga Académica.
2. **Motivo:** separan fetch y tipos Assessment/GradeSubject/Session/ScheduleSubject.
3. **Entrada/salida:** consultan /student/grades y /student/schedule con cookies; retornan periods[0]?.subjects || [] de cada respuesta. Lanza Error ante HTTP no exitoso.
4. **Conexiones:** Schedule cruza las listas por groupId.
5. **Estado/límites:** solo exponen el primer período; se pierden sus metadatos y otros períodos. No incluyen filtro por período ni tratamiento global de 401.

### Cliente API Centralizado e Interceptor 401 (`frontend/src/services/api.ts`)

1. **Problema que resuelve:** Evita duplicar la configuración de `credentials: 'include'` en cada servicio y resuelve el estado de "sesión huérfana" cuando una sesión expira o se cierra desde otra pestaña del navegador.
2. **Motivo:** Encapsular las peticiones HTTP globales para aplicar la política de autenticación en un único punto sin modificar cada componente React.
3. **Entrada/salida:** Recibe un `endpoint` (relativo o absoluto) y un objeto `ApiFetchOptions`. Devuelve una promesa `Response`. Si recibe un estado HTTP `401` y la opción `skipAuthRedirect` no está activa, fuerza la navegación a `/login` lanzando la excepción `'Sesión expirada'`.
4. **Conexiones:** Reemplaza a `fetch` directo dentro de `auth.ts`, `student.ts`, `resources.ts`, `schedule.ts`, `grades.ts` y `kardex.ts`.
5. **Estado/límites:** Implementado y probado. `authService.login` y `checkSession` utilizan `skipAuthRedirect: true` para permitir que sus llamadas manejen errores de credenciales sin provocar redirecciones prematuras.

## Funcionalidad EXTRA 

### Centro de Préstamos: alcance real

La función elegida ofrece catálogo de libros/equipo/espacios, reservas, recogida, devolución y administración de inventario propio. Rebo implementó interfaz y módulo Express. SII sigue siendo fuente exclusiva de autenticación y datos académicos; el catálogo no equivale a inventario oficial del instituto. Funcionalidad implementada no significa permisos/integridad ya asegurados.

### backend/src/modules/resources/resources.routes.ts

1. **Problema:** registra el API de recursos y préstamos.
2. **Motivo:** agrupa el dominio bajo /resources.
3. **Entrada/salida:** delega los endpoints siguientes. Ninguno aplica requireAuthenticatedSession ni comprobación de rol en servidor.
4. **Conexiones:** app.ts monta resourcesRouter; llama a resources.controller.ts. La protección global de origen en mutaciones no sustituye autorización.
5. **Estado/riesgo:** prueba HTTP aislada con base ficticia: GET /resources/admin/loans devolvió 200 sin cookie, frente a 401 de /student/profile. No se leyeron datos reales ni se realizaron mutaciones.

| Método/ruta | Controlador | Entrada/resultado |
|---|---|---|
| GET /resources | getAllResources | Lista de catálogo |
| POST /resources/reserve/:id | createReservation | resourceId y studentId en body; { message, loan } |
| GET /resources/loans/:studentId | getMyLoans | Historial del ID recibido |
| POST /resources/loans/:id/cancel | cancelMyReservation | loanId y studentId del body; mensaje |
| GET /resources/admin/loans | getAdminLoans | Todos los préstamos |
| POST /resources/admin/loans/:id/activate | activateResource | Mensaje de entrega |
| POST /resources/admin/loans/:id/return | returnResource | Mensaje de devolución |
| POST /resources/admin/catalog | createResourceCtrl | Recurso creado |
| PATCH /resources/admin/catalog/:id/stock | adjustStockCtrl | delta; recurso actualizado |

### backend/src/modules/resources/resources.controller.ts

1. **Problema:** adapta HTTP a operaciones del servicio.
2. **Motivo:** separa req/res de Supabase.
3. **Entrada/salida:** los nueve controladores leen params/body. createReservation acepta studentId del cliente y usa ALUMNO_MOCK_123 si falta; getMyLoans usa el ID de ruta; cancelMyReservation usa el ID del body; adjustStockCtrl aplica Number(delta). Devuelven resultados o { error: error.message } con 400/500, distinto del { message } institucional.
4. **Conexiones:** resources.service.ts; no obtiene identidad de la sesión ni valida cuerpos con Zod.
5. **Estado/riesgo:** falta enlazar identidad, propiedad y rol al backend; retirar el fallback ficticio y validar cuerpos/deltas. No confiar en el formulario ni ocultar botones como control de acceso. Algunos mensajes de base pueden propagarse.

### backend/src/modules/resources/resources.service.ts

1. **Problema:** persiste catálogo y ciclo de préstamo.
2. **Motivo:** reúne reglas fuera de controladores.
3. **Entradas/salidas y lógica:**

| Función | Entrada | Efecto/resultado |
|---|---|---|
| getAvailableResources | Ninguna | resources ordenado por category |
| reserveResource | studentId, resourceId | Exige available_stock>0, resta uno e inserta loan pending_pickup con vencimiento a tres días desde reserva; mensaje/loan |
| getStudentLoans | studentId | loans filtrado por alumno, relación resources y created_at descendente |
| cancelReservation | loanId, studentId | Exige ambos IDs y pending_pickup; cambia a cancelled y suma uno al stock |
| getAllLoansForAdmin | Ninguna | Todos los loans con nombre/categoría del recurso |
| markLoanAsActive | loanId | Exige pending_pickup, cambia a active; no reinicia due_date |
| markLoanAsReturned | loanId | Solo rechaza returned; cambia a returned y suma stock. No exige active/overdue |
| createNewResource | Datos de catálogo | Crea recurso con available_stock=total_stock y devuelve fila |
| adjustResourceStock | resourceId, delta | Suma delta a total/disponible, rechaza negativos y devuelve fila actualizada |

4. **Conexiones/datos:** usa supabase.ts. resources utiliza id/name/description/category/total_stock/available_stock/image_url; loans utiliza id/student_id/resource_id/status/borrow_date/due_date/created_at y su relación resources. Esta revisión no inspeccionó DDL, constraints, RLS ni permisos reales de esas tablas.
5. **Estado/límites:** son peticiones independientes, no una transacción SQL. La compensación manual al fallar la reserva puede fallar o sobrescribir cambios concurrentes. Cancelar/devolver modifica inventario por separado y no comprueba todos los errores. No se observó automatización que genere overdue ni venza reservas automáticamente. Puede haber pérdidas de actualización con peticiones concurrentes.

### frontend/src/services/resources.ts

1. **Problema:** conecta la vista con los nueve endpoints propios.
2. **Motivo:** concentra fetch y tipos Resource/Loan.
3. **Entrada/salida:** getResources/getMyLoans/getAdminLoans devuelven listas; reserveResource/cancelReservation reciben IDs y studentId; markAsActive/markAsReturned reciben loanId; createAdminResource recibe formulario y devuelve Resource; adjustResourceStock recibe id/delta y devuelve Resource. Todas envían cookie; cuerpos usan JSON.
4. **Conexiones:** Resources.tsx y API /resources; errores interpretados desde errorData.error. Loan admite pending_pickup, active, returned, overdue, cancelled.
5. **Estado/límites:** implementado; enviar cookies no protege una API que no las valida.

### frontend/src/pages/Resources/Resources.tsx y Resources.module.css

1. **Problema:** catálogo/Mis Préstamos para alumno y Préstamos Globales/Inventario para la variante administrativa.
2. **Motivo:** concentra presentación/acciones del extra y estilos.
3. **Entrada/salida:** initData obtiene perfil/controlNumber y lo compara con VITE_ADMIN_CONTROL_NUMBER; carga listas según isAdmin. resources/myLoans/adminLoans guardan datos; studentId/isAdmin la variante; activeTab/adminTab las pestañas; loading/error/message/reservingId el estado visual; isModalOpen/formData controlan alta de recurso.
4. **Conexiones/funciones:** handleReserve reserva y actualiza stock/historial; handleCancel confirma y recarga listas; handleActivate entrega; handleReturn confirma devolución y recarga; handleStockChange reemplaza recurso; handleCreateResource agrega fila y reinicia modal. showMsg dura cinco segundos y getStatusLabel traduce estados. El formulario recibe nombre, descripción, categoría, stock e imagen.
5. **Estado/riesgo:** implementado. La comparación VITE_ADMIN_CONTROL_NUMBER controla solo visibilidad; VITE_* es público y no se considera autorización. Los controles HTML no validan el backend.

### Hallazgos vigentes y alcance

- **Prioridad alta:** proteger rutas de recursos/admin con sesión y rol en servidor; derivar alumno de sesión; retirar el ID ficticio. La comprobación de origen no reemplaza esto. Solo se documentó; no se corrigió código.
- **Inventario:** validar cuerpos/delta y resolver atomicidad, concurrencia, errores de compensación y transiciones de estado.
- **Interfaz académica:** falta filtro/búsqueda de parciales por materia/período, la agenda omite sábado y null recibe estilo rojo; no hay invalidación global del contexto ante 401. También existen diferencias de tipos y la hipótesis fija de 260 créditos.
- **Evidencia:** Render fue reportado por Emilio; sin URLs/configuración no se certificó producción. No se consultó catálogo/préstamos reales ni se probó visualmente todo el responsive. Las 107 regresiones cubren backend institucional, no permisos/inventario del extra.
- **Pospuesto explícitamente:** SQL reproducible y límite de intentos; son mejoras diferidas, no nuevas tareas obligatorias ni autorizadas en esta revisión.
- README/capturas y exposición son entregables cuya evidencia no se comprobó aquí; no se inventan capturas ni se declaran terminados por compilar.

## Arquitectura

### Reparto vigente

| Integrante | Responsabilidad |
|---|---|
| Emilio | Backend institucional completo, sesiones/cifrado/Supabase, DTO/contratos, seguridad y pruebas API, despliegue backend, documentación y exposición de su parte. Apoya la función extra y revisa su integración. |
| Rebo | Frontend completo, incluidos login, dashboard, Kardex, calificaciones, horario, navegación, responsive, pruebas y despliegue frontend. Lidera la función adicional con su interfaz, lógica, persistencia y módulo backend necesarios, con apoyo de Emilio; documenta y expone su parte. |

Este acuerdo sustituye el reparto inicial por módulos mixtos. Rebo implementó todo el frontend y el Centro de Préstamos; también realizó el despliegue según Emilio. Ambos coordinan contratos, revisión y demostración. Los cambios del extra sobre autenticación y módulos institucionales requieren coordinación.

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
│   │       ├── student/         # Endpoints académicos protegidos
│   │       └── resources/       # Catálogo, préstamos e inventario propios
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

### Tecnología y estructura actual

React + Vite + TypeScript, React Router, lucide-react, Recharts y CSS Modules. main.tsx monta App con StrictMode; index.css define tipografía, tema claro y contenedores. vite.config.ts habilita el plugin React sin proxy del API.

Las fichas de servicios/páginas anteriores describen el frontend funcional y no se duplican aquí. API_URL usa VITE_API_URL o http://localhost:3000; las solicitudes usan credentials: 'include' y ninguna llama directamente a SII en el código revisado.

Después de pull que cambie dependencias ejecutar npm install desde la raíz. react-router-dom, recharts y lucide-react faltaban en el diagnóstico anterior y ahora están instaladas. Git no transporta node_modules ni la configuración privada de Render.

## Backend

### Tecnología y dependencias

- Node.js 22 LTS como versión objetivo (el proyecto admite 22 a 24).
- Express: servidor HTTP y rutas.
- TypeScript: tipado y compilación.
- `cors`: política de origen cruzado.
- `cookie-parser`: lectura de cookies enviadas al backend.
- `dotenv`: carga de variables locales desde `.env`.
- `zod`: validación de entorno, login, UUID y DTO institucionales; recursos aún no valida sus cuerpos mediante esquemas.
- `@supabase/supabase-js`: cliente para acceder a Supabase desde el backend.
- `tsx`: ejecución de TypeScript durante desarrollo.

### `backend/src/server.ts`

Importa la aplicación Express y la inicia en el puerto configurado. El puerto se obtiene de la configuración validada; si no se define, usa `3000`.

### `backend/src/app.ts`

1. **Problema:** compone el pipeline HTTP.
2. **Motivo:** separa configuración Express del arranque.
3. **Entrada/salida:** trust proxy=1; CORS con FRONTEND_ORIGIN normalizado y credenciales; requireTrustedMutationOrigin, JSON de 16 KB y cookieParser. Monta /auth, /student y /resources, salud pública, fallback JSON 404 y apiErrorHandler.
4. **Conexiones:** los tres routers están importados aquí. Autenticación se aplica en rutas concretas, no se hereda al montar resourcesRouter.
5. **Estado/límites:** backend local disponible. No se verificó desde Render el número real de proxies. Ver fichas de middleware para origen/errores y de recursos para la falta de sesión/roles.

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

**Estado y consumidor:** actualmente protege `GET /auth/session`, `GET /student/profile`, `GET /student/kardex`, `GET /student/grades` y `GET /student/schedule`. El módulo resources aún no lo utiliza; esa integración es un hallazgo de autorización vigente.

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

`getStudentSchedule(siiToken): Promise<unknown>` consulta `GET /api/movil/estudiante/horarios` con JWT interno y timeout. Separa la comunicación institucional de la pantalla de horario. Devuelve el JSON al controlador `getSchedule`; no persiste el horario ni entrega tokens. Red/timeout y HTTP no exitosos generan `unavailable`, `401/403` generan `invalid_session` y JSON ilegible o `null` genera `invalid_response`. Schedule consume el DTO desde `/student/schedule`; Emilio confirmó su funcionamiento autenticado y se verificó por HTTP el rechazo sin cookie.

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

**Estado y consumidor:** Login y AuthContext ya consumen estas rutas con `credentials: 'include'`; las cuatro rutas académicas reutilizan el middleware de sesión.

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

**Estado y consumidor:** authService, Login y AuthContext ya consumen los endpoints. El login institucional y middleware tienen pruebas previas reales e institucionales aisladas; las nuevas rutas resources no heredan esa protección.

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

**Estado y consumidor:** Dashboard, Kardex y Schedule ya consumen los cuatro contratos institucionales protegidos. Emilio mantiene esa integración; la protección de resources se documenta aparte.

### `backend/src/modules/student/student.controller.ts`

**Problema que resuelve:** presenta el perfil, Kardex y calificaciones institucionales mediante endpoints propios, sin que React necesite conocer ni usar el JWT de SII.

**Por qué existe:** convierte la sesión interna validada en una consulta autorizada a SII y centraliza el manejo seguro de respuesta, sesión institucional vencida e indisponibilidad del servicio.

**Entradas y salidas:** recibe una petición ya autorizada por middleware. Obtiene la respuesta cruda de SII y la transforma con `parseStudentProfile`. Devuelve `200 { profile: StudentProfile }`; puede devolver `401` si el JWT SII expiró, `502` si SII envía JSON inválido o si el DTO detecta una estructura de perfil incompatible, `503` cuando SII no está disponible o `500` ante error interno. No devuelve el JWT.

**Conexiones:** obtiene `siiToken` desde `getAuthenticatedSession`, consulta `getStudentProfile` en `sii.client.ts`, normaliza los datos con `student-profile.dto.ts` y, en caso de token inválido, usa `revokeSession` y `clearSessionCookieOptions`.

En `getProfile`, la cookie se borra antes de intentar revocar una sesión institucional rechazada. Si falla la revocación se devuelve `500` JSON controlado, igual que en Kardex/calificaciones/horario; ya no se propaga ese fallo al manejador HTML predeterminado ni queda intacta la cookie del navegador.

`getKardex(request, response): Promise<void>` recibe una petición autorizada por middleware, obtiene `session.siiToken`, consulta `getStudentKardex` y normaliza con `parseStudentKardex`. Devuelve `200 { kardex: StudentKardex }`. Un `ZodError` o JSON inválido produce `502`; una sesión institucional rechazada limpia la cookie, intenta revocar la sesión local y produce `401` (o `500` si falla esa revocación); indisponibilidad SII produce `503` y otros errores, `500`. Envía cada respuesta y termina con `return;` cuando corresponde para respetar `Promise<void>`. No persiste el historial ni devuelve la respuesta cruda institucional.

`getGrades(request, response): Promise<void>` obtiene la sesión del middleware, consulta `getStudentGrades(session.siiToken)` y transforma el JSON mediante `parseStudentGrades`. Devuelve `200 { grades: StudentGrades }`. `ZodError` y JSON inválido producen `502`; sesión institucional rechazada limpia la cookie y revoca la sesión antes de `401` (si falla la revocación, `500`); indisponibilidad produce `503` y otros errores, `500`. No calcula promedios ni asigna una nota final.

`getSchedule(request, response): Promise<void>` obtiene la sesión, llama a `getStudentSchedule`, normaliza mediante `parseStudentSchedule` y envía una sola respuesta `200 { schedule: StudentSchedule }`. Maneja `ZodError` y JSON inválido con `502`, indisponibilidad con `503`, sesión institucional inválida con borrado de cookie y revocación seguida de `401` (o `500` si falla la revocación), y otros errores con `500`. Emilio eliminó una llamada duplicada a `.json()` que intentaba modificar una respuesta ya enviada; la revisión confirmó que queda un solo envío. Este error de ejecución no lo detectaba TypeScript.

**Estado y consumidor:** las pantallas institucionales están conectadas. Schedule muestra parciales actuales y Kardex los resultados finales institucionales; los controladores no calculan una final propia. Mantener esa distinción al corregir las diferencias de UI señaladas arriba.

### `backend/src/modules/student/student-profile.dto.ts`

**Problema que resuelve:** evita que el frontend dependa de la estructura cruda de SII, que puede usar nombres institucionales poco claros o inconsistentes, como `percentaje_avance_cursando`.

**Por qué existe:** valida la forma mínima del perfil recibido desde SII y lo adapta a un contrato interno `StudentProfile` con nombres consistentes y agrupaciones útiles para el dashboard.

**Entradas y salidas:** `parseStudentProfile(rawProfile)` recibe `unknown` y exige una envoltura de éxito (`code: 200`, `flag: true` o `'success'`) y `data.numero_control` como texto no vacío. Esto evita aceptar un error institucional con `data: {}` como perfil exitoso. Valida los otros campos con Zod y devuelve `StudentProfile`; los datos opcionales ausentes siguen como `null` y los números en texto se convierten a `number`. El contrato TypeScript conserva `controlNumber: string | null` por compatibilidad, aunque el parser exige la identidad mínima no vacía. Si la estructura no cumple el contrato, lanza `ZodError`, que el controlador traduce a `502`.

El campo institucional `data.persona` fue confirmado como texto mediante una consulta real que solo registró su tipo. Se valida con `textValue` y se mapea a `profile.name: string | null`: conserva mayúsculas, minúsculas y acentos, quitando únicamente espacios exteriores. Si falta o es `null`, devuelve `name: null`. Un objeto o texto vacío es incompatible y produce `502`, como los demás textos validados; no se inventa un nombre ni se infiere a partir del correo. La respuesta añade `name` sin eliminar los campos existentes ni exponer el objeto institucional crudo.

Después del cambio, una prueba real autorizada confirmó `200` en login/sesión/perfil y que `profile.name` contiene texto no vacío, sin registrar su valor. Logout devolvió `204` y reutilización de la cookie `401`; las sesiones creadas para inspección y verificación quedaron revocadas. El conjunto completo pasó 107 regresiones y `npm run check`.

**Conexiones:** lo invoca `student.controller.ts` inmediatamente después de `getStudentProfile`; no llama a la base de datos, no conoce cookies ni expone el JWT de SII.

**Estado y consumidor:** Dashboard ya usa `profile.name` y sus métricas; Resources usa controlNumber para su flujo actual. El tipo frontend está actualizado y el nombre ausente se muestra como Estudiante. El nombre es personal: no incluir valores reales en fixtures/logs/capturas públicas. Falta derivar la identidad de préstamos desde sesión en servidor, no del body.

### `backend/src/modules/student/student-kardex.dto.ts`

**Problema que resuelve:** transforma el historial de SII a un contrato propio tipado, conservando calificaciones textuales como `AC` sin convertirlas a cero ni perder registros.

**Por qué existe:** separa validación y traducción de datos de la consulta HTTP y del controlador. Evita acoplar la pantalla a `data.kardex` y los nombres institucionales.

**Entradas y salidas:** `parseStudentKardex(rawKardex: unknown): StudentKardex` recibe el objeto institucional con `code: 200`, `flag: true` y `data`, sin la envoltura exterior de nuestra API. `siiKardexSchema` valida ese éxito y su lista; `requiredText` exige textos no vacíos. `nonNegativeNumber` convierte textos numéricos y exige números finitos no negativos; el semestre además debe ser entero. `gradeLabelSchema` conserva la calificación como texto y `toNumericGrade` devuelve su número finito o `null` si es textual. Una estructura incompatible lanza `ZodError`; una lista vacía es válida.

`StudentKardex` devuelve `progressPercentage` y `subjects: KardexSubject[]`. Cada registro contiene `name`, `code`, `period`, `credits`, `grade`, `gradeLabel`, `evaluationDescription` y `semester`. El avance procede de SII sin recalcularse. `.map()` conserva orden y cantidad, incluidos intentos repetidos. `period` conserva valores como `26/V` sin atribuirles un significado no confirmado; `gradeLabel: 'AC'` produce `grade: null`, nunca cero. Las cadenas vacías de créditos se rechazan.

**Conexiones:** `getKardex` lo invoca después de `getStudentKardex`; no accede a cookies, JWT ni Supabase. El JSON propio es `{ kardex: { progressPercentage, subjects } }`, sin `kardex.data` ni la envoltura `code/message/flag` institucional.

**Estado y consumidor:** Kardex y Dashboard ya usan este contrato para historial y Top 5, con el resultado final institucional de cada registro de materia/período e intento. Debe mostrar `gradeLabel` y distinguir notas numéricas de textuales al colorear; no se asigna una equivalencia numérica a `AC`. La consulta autenticada normalizada final ya devolvió `200` en la prueba real posterior a las correcciones y el rechazo sin cookie también está comprobado.

**Validación de este conjunto:** `npm run check` pasó. Se ejecutó el DTO real contra el JSON adjunto sin guardar datos personales en el repositorio: conservó los 50 registros, códigos, períodos y créditos, y convirtió `AC` a etiqueta con número `null`. También se verificó el rechazo de envoltura inválida, `flag: false` y créditos vacíos, y la aceptación de un historial vacío. Emilio confirmó previamente `200` de la consulta institucional en Postman; esa prueba fue anterior a la normalización.

### `backend/src/modules/student/student-grades.dto.ts`

**Problema que resuelve:** normaliza las calificaciones de SII por período, materia y evaluación, conservando las notas pendientes sin convertirlas a cero y aislando el nombre institucional `calificaiones`.

**Por qué existe:** separa validación y traducción de datos externos de la consulta HTTP, el controlador y la pantalla de Rebo. Un nombre erróneo en SII no se propaga al contrato propio.

**Entradas y salidas:** `parseStudentGrades(rawGrades: unknown): StudentGrades` recibe la envoltura institucional con `code: 200`, `flag: true` y `data` como lista. `siiGradesSchema` valida períodos, materias y sus `calificaiones`. `requiredText` rechaza texto vacío; `nonNegativeNumber` acepta números o texto numérico y exige un resultado finito no negativo; `integerValue` exige además enteros para año e identificadores. `gradeLabelSchema` conserva números como texto, etiquetas textuales o `null`. `toNumericGrade` devuelve un número finito para una etiqueta numérica o `null` para una nota ausente o textual. Una forma incompatible lanza `ZodError`; listas vacías son válidas.

`StudentGrades` contiene `periods: StudentGradesPeriod[]`. Cada período tiene `code`, `year`, `description` y `subjects: StudentGradesSubject[]`. Cada materia tiene `groupId`, `name`, `code`, `group` y `assessments: StudentAssessment[]`. Cada evaluación tiene `id`, `number`, `grade: number | null` y `gradeLabel: string | null`. Los identificadores permiten distinguir grupos y evaluaciones; el número de evaluación se conserva sin inferir que alguna sea la final. Los `.map()` conservan orden y cantidad. Una nota pendiente queda con ambos campos en `null`; una textual conserva su etiqueta y deja `grade: null`.

**Conexiones:** lo usa `getGrades` después de `getStudentGrades`. El cliente React recibe `{ grades: { periods: [...] } }` y no conoce `data`, `calificaiones` ni tokens institucionales. No accede a Supabase ni persiste notas.

**Estado y consumidor:** Schedule ya usa este contrato para las tarjetas de parciales. Búsqueda/filtro por materia y período aún no existe en esa vista. Mostrar “Pendiente” o `—` para un parcial con `gradeLabel: null`; si no hay notas capturadas en la materia, “Calificaciones aún no disponibles”. Conservar notas cero reales y etiquetas textuales. Según el criterio acordado a partir de la explicación y capturas de Emilio, Calificaciones muestra los parciales disponibles, no una lista etiquetada como final. Los resultados finales registrados se muestran desde Kardex. No se calcula una final propia con parciales ni se mezcla automáticamente el historial con las materias actuales. Los colores deben distinguir valores numéricos, notas pendientes y etiquetas.

**Criterio académico acordado:** Emilio explicó cuatro parciales independientes, aprobación de cada uno con 70 o más y regularización de los reprobados; el resultado final se conoce al cierre y se refleja en Kardex. Esta regla explica la UI, pero el backend no calcula aprobación, regularización ni promedios finales. El DTO conserva la cantidad de evaluaciones recibida; no impone cuatro como límite universal. El PDF solicita nota final; el equipo adopta la presentación institucional de parciales actuales y finales históricos en sus respectivas secciones, sin inventar resultados faltantes.

**Validaciones de este conjunto:** `npm run check` pasó. La ejecución del DTO sobre el JSON institucional adjunto coincidió exactamente con el JSON normalizado enviado después por Emilio: un período, cuatro materias, 16 evaluaciones y ocho notas pendientes conservadas. También se verificaron rechazo de envoltura inválida, `flag: false` y nota vacía, aceptación de períodos vacíos y conservación de una etiqueta textual de prueba. Las pruebas fueron locales; no se guardaron respuestas personales en el repositorio ni se realizaron nuevas consultas autenticadas a SII por el agente.

### `backend/src/modules/student/student-schedule.dto.ts`

**Problema que resuelve:** convierte las columnas institucionales de lunes a sábado en sesiones con día, hora inicial/final y aula, listas para una tabla o agenda.

**Por qué existe:** separa el formato del SII de la interfaz de Rebo y valida horas antes de intentar representarlas. No crea fechas ni convierte a UTC: conserva las horas locales del horario académico.

**Entradas y salidas:** `parseStudentSchedule(rawSchedule: unknown): StudentSchedule` recibe la envoltura institucional con `code: 200`, `flag: true` y períodos en `data`. `requiredText` exige textos no vacíos e `integerValue` convierte texto numérico a entero no negativo. `classroomSchema` acepta texto no vacío o `null`. `timeRangeSchema` acepta `null` o un bloque `HH:mm-HH:mm` de 00:00 a 23:59, exige final posterior al inicio y lo transforma en `{ startTime, endTime }`. Se rechazan bloques invertidos, de duración cero, mal formados y que crucen medianoche con final menor que inicio; ampliar el contrato solo si SII demuestra otro formato válido.

`siiSubjectSchema` valida metadatos y seis pares de horario/aula. `SiiScheduleSubject` infiere el tipo ya validado desde Zod. `dayFields` relaciona campos institucionales y aulas con `ScheduleDay`: 1=lunes, 2=martes, 3=miércoles, 4=jueves, 5=viernes, 6=sábado. `parseSessions` omite días sin horario y conserva sesiones con aula `null`; no inventa un salón.

`StudentSchedule` contiene `periods: SchedulePeriod[]`. Cada período tiene `code`, `year`, `description` y `subjects`. Cada `ScheduleSubject` tiene `groupId`, `group`, `name`, `code`, `shiftCode`, `programName`, `levelCode` y `sessions: ScheduleSession[]`. Cada sesión tiene `day`, `startTime`, `endTime` y `classroom`. Un bloque de dos horas sigue siendo una sesión; no se divide en horas. Se conservan períodos y materias incluso con listas vacías. `shiftCode` conserva `clave_turno` sin deducir un turno por el valor `C.Celaya`.

**Conexiones:** lo invoca `getSchedule` tras consultar `getStudentSchedule`; no conoce cookies, JWT ni Supabase. El frontend recibe `{ schedule: { periods: [...] } }` y agrupa sesiones por día y hora para su agenda.

**Estado y consumidor:** Schedule ya usa el DTO en agenda y tarjetas. El DTO conserva sábado y aulas null, aunque la agenda React actualmente omite sábado. No detecta traslapes; una materia sin sesiones sigue siendo válida.

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

## Variables de entorno y ejecución

### Backend

Los secretos se configuran en backend/.env local o en el entorno del servicio Render. No se versionan; backend/.env.example es la plantilla segura.

| Variable | Uso / ejemplo local |
|---|---|
| NODE_ENV | development, test o production |
| PORT | 3000 local; en Render se usa el puerto proporcionado al servicio |
| FRONTEND_ORIGIN | http://localhost:5173; origen exacto del frontend desplegado en producción |
| SESSION_COOKIE_NAME | pta_session; nombre heredado de la propuesta inicial |
| SESSION_TTL_HOURS | 8; duración fija, sin renovación por actividad |
| COOKIE_SECURE | false local HTTP; true en producción HTTPS |
| COOKIE_SAME_SITE | lax local; none solo con Secure y según despliegue |
| SII_API_BASE_URL | https://sii.celaya.tecnm.mx; cliente añade rutas con /api |
| SII_REQUEST_TIMEOUT_MS | 10000 por defecto, máximo 30000 |
| SUPABASE_URL | Proyecto compartido; no copiar valor real en documentos |
| SUPABASE_SECRET_KEY | Clave privada de servidor; nunca VITE_* |
| SII_TOKEN_ENCRYPTION_KEY | Base64 de 32 bytes, compartida entre backends que usan la misma tabla de sesiones |

La llave de cifrado no se regenera al instalar el proyecto de un compañero. Cada integrante usa sus propias credenciales institucionales para probar. La tabla app_sessions persiste sesiones; resources/loans persisten el extra. No hay script SQL reproducible en el código revisado y su creación fue pospuesta por Emilio.

### Frontend

frontend/.env.example contiene VITE_API_URL y VITE_ADMIN_CONTROL_NUMBER. La configuración real de Vite se mantiene en un archivo local ignorado o en las variables de build de Render; cambiarla requiere reiniciar Vite o reconstruir el frontend.

- VITE_API_URL: base del backend propio. Si falta usa http://localhost:3000; no apuntar a SII. No configurar una URL Render por accidente al probar ambos servicios locales.
- VITE_ADMIN_CONTROL_NUMBER: selecciona la variante visual de Resources. Es público por diseño y no acredita un rol en backend. No documentar su valor real ni considerarlo un secreto de autorización.

Después de pull ejecutar npm install para sincronizar node_modules con package-lock.json. En el diagnóstico local faltaban lucide-react, react-router-dom y recharts; ya aparecen instaladas. Las variables configuradas en Render no se descargan con Git.

### Despliegue y evidencia

Rebo realizó el despliegue en Render, según informó Emilio. La arquitectura mantiene frontend estático y API Express independientes. No hay render.yaml ni URLs públicas en los archivos revisados; no se infieren comandos exactos del panel ni se inventan enlaces. Esta revisión no verificó cookies, configuración SPA, permisos ni stock de producción. La configuración local de backend conserva origen localhost:5173, cookie no Secure y SameSite=lax. El valor trust proxy=1 está en app.ts; no se validó su topología real desde Render.

1. **Web Service (Backend):**
   - **Build Command:** `npm install --include=dev && npm run build` (fuerza la descarga de tipos TypeScript de Node, Express y CORS).
   - **Start Command:** `npm start`
   - **Variables de Entorno Clave:** `NODE_ENV=production`, `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`, `FRONTEND_ORIGIN` (coincidiendo exactamente con el dominio del Static Site sin barra final para prevenir errores CORS).

2. **Static Site (Frontend):**
   - **Build Command:** `npm install --include=dev && npm run build`
   - **Publish Directory:** `dist`
   - **Variables de Entorno Clave:** `VITE_API_URL` (URL pública del backend sin barra `/` al final) y `VITE_ADMIN_CONTROL_NUMBER`.
   - **Reglas de Redirección (Rewrite Rules):** Configurada la regla `/*` -> `/index.html` (Action: `Rewrite`) para evitar errores 404 al recargar rutas profundas gestionadas por React Router SPA.

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

Los módulos actuales ya están integrados. Cualquier corrección de los hallazgos requiere una rama elegida por el integrante; no volver a crear las antiguas tareas de inicialización ni realizar operaciones Git desde el agente.

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

## Estado de cierre y verificaciones

Las pantallas y la función extra ya existen; no se deben volver a asignar como trabajo por iniciar. El cierre depende de resolver o aceptar explícitamente los hallazgos reales del extra y las diferencias académicas descritas arriba, no de borrar la lista de pendientes. Esta tarea solo cambia DOCUMENTACION.md y CONTEXTO.md, sin modificar aplicación, dependencias o configuración.

Verificación actual: check correcto con cuatro advertencias de lint; build correcto con advertencia de bundle aproximado de 700 KB minificado; regresiones institucionales 107/107. Una prueba aislada de solo lectura confirmó GET /resources/admin/loans=200 sin cookie con base ficticia vacía, frente a /student/profile=401. No se accedió a datos reales ni se inició sesión en esta revisión.

El despliegue Render fue informado por Emilio; no se accedió a sus URLs/configuración. SQL/rate limiting permanecen pospuestos por decisión del equipo. No se ejecutan commits, cambios de rama, PR, merges ni despliegues por el agente.

### Mantenimiento de los documentos Markdown

Actualizar secciones existentes por archivo y separar implementación, pruebas y limitaciones. Esta revisión sustituyó pendientes antiguos de frontend/elección extra y fusionó las dos secciones de app.ts. Conserva el diseño institucional, DTO y pruebas.

README.md y frontend/README.md quedan fuera de esta edición solicitada: el README raíz aún menciona la plantilla y sus capturas no se comprobaron. No se afirma que todo documento del repositorio esté actualizado. El README debe describir estado actual, instalación y tecnología sin roadmap ni evidencias inventadas.
