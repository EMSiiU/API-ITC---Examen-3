# Contexto para Emilio, Rebo y sus agentes de IA

Actualizado el 6 de noviembre de 2026 contra el código integrado mediante pull. Este archivo describe decisiones y estado real; DOCUMENTACION.md explica funciones, módulos y limitaciones en detalle.

## Reglas obligatorias para la IA

- Nunca hacer commits, pushes, cambios de rama, Pull Requests, merges ni despliegues. El integrante revisa y realiza esas operaciones personalmente, también cuando usa GitHub Desktop.
- Editar archivos solo dentro de la tarea autorizada; explicar decisiones importantes y avanzar por pasos.
- Preservar cambios locales ajenos. Durante esta revisión package-lock.json ya tenía modificaciones del usuario; no se alteró ni se revirtió.
- No leer/imprimir secretos ni incorporar contraseñas, cookies, JWT o datos personales reales a documentos, fixtures o logs.
- Actualizar la sección existente de cada archivo en DOCUMENTACION.md, sin repetirla por modificación. Sincronizar este contexto si cambian contratos/estado.
- No sustituir los puntos institucionales obligatorios por respuestas simuladas. Los dobles de prueba existen solo dentro de tests.
- Distinguir implementación, pruebas aisladas, evidencia real y trabajo pospuesto. No borrar hallazgos reales para afirmar que no hay pendientes.

Ejemplo de comandos que el integrante puede ejecutar después de revisar:

~~~powershell
git status
git add <archivos-del-conjunto>
git commit -m "docs: update integrated project context"
git push -u origin <rama-elegida-por-el-integrante>
~~~

## Proyecto y reparto

- Ubicación: C:\Escuela\9no_semestre\TOPWEB\Examen3.
- Monorepo npm con frontend/ y backend/; main estable, feature/* y PR revisados.
- Producto implementado: aplicación académica SII ITC con Centro de Préstamos.
- El planificador académico fue una propuesta inicial descartada como descripción del alcance actual. El nombre npm y la cookie pta_session siguen siendo identificadores históricos; no renombrarlos automáticamente.

| Integrante | Responsabilidad y trabajo |
|---|---|
| Emilio | Backend institucional: login/perfil/Kardex/parciales/horario, sesiones/cifrado/Supabase, DTO y pruebas API; soporte a integración, seguridad y documentación del backend |
| Rebo | Frontend completo: login, rutas privadas, dashboard, Kardex, horario/parciales y recursos; Centro de Préstamos con interfaz y módulo Express; realizó el despliegue Render según lo informado por Emilio |
| Ambos | Integración, revisión de contratos, decisiones, documentación y exposición; Emilio apoya el extra y Rebo coordina cambios sobre módulos institucionales |

Dashboard y Kardex React no son tareas pendientes de Emilio. No reasignar trabajo inicial ya terminado. Rebo puede mantener el backend del extra coordinándose con Emilio; los módulos institucionales y de sesiones no deben alterarse sin acuerdo.

## Estado real

Ya están implementados:
- Auth institucional real, cookie httpOnly, UUID, JWT cifrado en app_sessions, expiración/revocación y cuatro DTO académicos.
- React Router, AuthContext, ProtectedRoute, servicios HTTP y Layout.
- Dashboard con nombre/foto/promedio/gráficas y Top 5; Kardex con búsqueda/orden; Carga Académica con agenda y tarjetas de parciales.
- Centro de Préstamos: catálogo, reservar/cancelar, Mis Préstamos, panel global, entregar/devolver, crear recurso y ajustar stock.
- Despliegue en Render realizado por Rebo y funcionamiento reportado por Emilio. No se recibieron URLs ni se verificó el panel/producción en esta revisión.

No es correcto mantener pendientes antiguos de “crear frontend”, “crear dashboard”, “elegir extra” o “comenzar deploy”. Tampoco es correcto afirmar que no hay problemas: los hallazgos de permisos/inventario y detalles académicos descritos más abajo siguen en el código.

## Arquitectura y fuente de verdad

~~~text
Navegador / React + Vite + TypeScript
                |
                v
Backend Node.js + Express + TypeScript
       |                         |
       v                         v
API SII ITC                 Supabase PostgreSQL
auth y datos oficiales     app_sessions, resources, loans
~~~

El frontend nunca llama directamente a SII. Los servicios revisados usan VITE_API_URL o http://localhost:3000 y credentials: 'include'. El JWT institucional nunca se entrega a React ni se almacena en localStorage/sessionStorage.

Rutas institucionales documentadas por el PDF:
| Método | Ruta SII |
|---|---|
| POST | /api/login |
| GET | /api/movil/estudiante |
| GET | /api/movil/estudiante/calificaciones |
| GET | /api/movil/estudiante/kardex |
| GET | /api/movil/estudiante/horarios |

El host del backend es https://sii.celaya.tecnm.mx; las rutas del cliente ya incluyen /api. SII login devuelve el JWT en message.login.token; solo el backend lo utiliza.

## Sesión implementada

1. React envía credenciales a /auth/login; el backend consulta SII.
2. Al recibir JWT válido, genera UUID e inserta app_sessions con token cifrado AES-256-GCM y fecha expires_at.
3. El navegador recibe una cookie con solo el UUID y { authenticated: true }.
4. El middleware valida UUID, existencia, expiración y revoked_at, descifra token solo dentro del backend y actualiza last_seen_at.
5. El controlador consulta SII con Bearer interno, valida DTO y devuelve datos.
6. Logout elimina cookie y revoca la fila; si falla la revocación, devuelve 500 sin afirmar cierre remoto.

Duración local: ocho horas fijas; actividad no prolonga expires_at. Una nueva autenticación exitosa crea otra fila. Las filas vencidas/revocadas no se eliminan automáticamente. Si SII invalida su JWT antes, el siguiente recurso académico lo detecta. /auth/session comprueba la sesión local, no consulta SII en cada llamada.

httpOnly impide lectura por JavaScript de página, no por el propietario en DevTools. El UUID también es una credencial y no se debe compartir. En producción se requiere HTTPS/Secure y configuración de SameSite/CORS acorde con los dominios.

## Contratos institucionales propios

| Método/ruta | Resultado de éxito |
|---|---|
| GET /health | { status: 'ok' } |
| POST /auth/login | Cookie y { authenticated: true } |
| GET /auth/session | { authenticated: true } |
| POST /auth/logout | 204 sin cuerpo |
| GET /student/profile | { profile: StudentProfile } |
| GET /student/kardex | { kardex: StudentKardex } |
| GET /student/grades | { grades: StudentGrades } |
| GET /student/schedule | { schedule: StudentSchedule } |

Los cuatro recursos y /auth/session requieren cookie válida; sin ella responden 401. Cookie malformada se rechaza antes de Supabase; logout sin cookie/formato válido devuelve 204 idempotente. Los errores institucionales usan { message }, con 401/502/503/500 según causa. JSON entrante inválido/grande produce 400/413 y ruta inexistente 404 JSON.

### Perfil

profile contiene controlNumber, name, email, semester, photoUrl, academicProgress, averages y subjects.
- academicProgress: accumulatedCredits, complementaryCredits, progressPercentage, progressWhileEnrolledPercentage.
- averages: weighted, arithmetic.
- subjects: taken, passed, failed, failedNotAccredited, failedFirstAttempt, failedSecondAttempt.
- name se obtiene del texto institucional persona, conservando acentos/capitalización y quitando espacios exteriores. Ausencia/null produce null; objeto o texto vacío es incompatible.
- El parser exige envoltura de éxito e identidad institucional mínima; campos opcionales pueden ser null. No buscar profile.data.
- Dashboard ya usa name y Resources utiliza controlNumber, aunque aún debe dejar de confiar en studentId suministrado por cliente.

### Kardex

kardex contiene progressPercentage y subjects. Cada registro tiene name, code, period, credits, grade, gradeLabel, evaluationDescription y semester. Backend devuelve credits/semester numéricos, grade number|null y gradeLabel textual. AC se conserva como etiqueta con grade=null; no equivale a cero. Se conservan orden/intentos y períodos como 26/V sin interpretarlos.

El servicio frontend devuelve únicamente subjects. Su interfaz semester declara string|null aunque backend entrega número: discrepancia real documentada, todavía sin corregir.

### Parciales y horario

grades.periods contiene code/year/description/subjects. Materias: groupId/name/code/group/assessments; evaluación: id/number/grade/gradeLabel. La propiedad original SII calificaiones se traduce a assessments.

schedule.periods contiene code/year/description/subjects. Materias: groupId/group/name/code/shiftCode/programName/levelCode/sessions. Sesión: day (1=lunes a 6=sábado), startTime/endTime locales HH:mm y classroom string|null. Sin horario no genera sesión; un bloque de dos horas sigue siendo una sesión. El DTO no detecta traslapes.

Los servicios frontend de grades/schedule solo exponen subjects del primer período; Schedule los cruza por groupId. La vista está en /horario, no /schedule. No hay página /calificaciones independiente.

## Criterio académico acordado

Según Emilio y las capturas del SII, el semestre actual tiene cuatro parciales independientes; cada uno se aprueba con 70 o más y la regularización corresponde a los reprobados. El resultado final se refleja al cierre en Kardex. El backend no calcula aprobación, regularización ni final propia.

- Calificaciones actuales: mostrar notas por parcial disponibles, manteniendo la cantidad/numeración recibida; no imponer cuatro como límite universal del DTO.
- Ausencia de nota: null, no cero. Mostrar “Pendiente” o “—”; si no hay ninguna, “Calificaciones aún no disponibles”. Un cero real se conserva.
- Kardex: resultado final institucional por registro de materia/período/intento; no usar promedio de parciales incompletos ni llamar final al cuarto parcial.
- No se cruza automáticamente grades con Kardex para inventar una final.
- La vista actual muestra parciales en tarjetas dentro de Carga Académica; tiene diferencias pendientes con esta presentación acordada, descritas abajo.

## Frontend actual

| Archivo/vista | Comportamiento |
|---|---|
| main.tsx / index.css | StrictMode, App y estilos globales |
| App.tsx | AuthProvider, BrowserRouter, /login, privadas /dashboard,/kardex,/horario,/recursos; fallback al login |
| services/auth.ts | login, checkSession, logout con cookie y base API configurable |
| context/AuthContext.tsx | isAuthenticated/isLoading, checkAuth y logout; comprobación al montar |
| components/ProtectedRoute.tsx | Carga, redirección o Outlet según contexto |
| components/Layout/ | Menú Panel/Kardex/Horario/Recursos y logout |
| services/student.ts | Extrae profile |
| services/kardex.ts | Extrae kardex.subjects |
| services/grades.ts y schedule.ts | Extraen subjects del primer período |
| pages/Dashboard/ | Perfil, promedio aritmético, gráficos y Top 5; base de créditos fija en 260 |
| pages/Kardex/ | Búsqueda nombre/período, orden de columnas, badges numéricos y AC |
| pages/Schedule/ | Agenda y tarjetas con parciales; hoy agenda solo lunes-viernes |
| services/resources.ts y pages/Resources/ | API y paneles del Centro de Préstamos |

Los estilos de componentes usan CSS Modules, iconos lucide-react y gráficas Recharts. AuthContext no tiene un interceptor global de 401 en cada servicio ni comprobación periódica; la caducidad con la app abierta puede dejar un error de datos hasta revalidar sesión.

## Funcionalidad adicional elegida: Centro de Préstamos

Persistencia propia en resources y loans; no inventar que usa datos del catálogo oficial universitario.

Flujo funcional:
- Catálogo y reservas: verifica stock, resta uno y crea pending_pickup con due_date tres días desde la reserva.
- Mis Préstamos: consulta historial y permite cancelar si pending_pickup.
- Administración: lista global, entrega pending_pickup→active, devolución→returned y devolución de stock.
- Inventario: alta de recursos y ajuste de total_stock/available_stock con delta.

| Método/ruta | Datos del cliente y respuesta actual |
|---|---|
| GET /resources | Lista de recursos |
| POST /resources/reserve/:id | Body studentId; { message, loan } |
| GET /resources/loans/:studentId | Lista del ID de ruta |
| POST /resources/loans/:id/cancel | Body studentId; mensaje |
| GET /resources/admin/loans | Lista global |
| POST /resources/admin/loans/:id/activate | Mensaje |
| POST /resources/admin/loans/:id/return | Mensaje |
| POST /resources/admin/catalog | Formulario de recurso; fila creada |
| PATCH /resources/admin/catalog/:id/stock | Body delta; recurso actualizado |

**Importante: esa tabla describe el código actual, no un contrato seguro ya aprobado.**
- resources.routes.ts no aplica middleware de sesión ni rol, incluidas las rutas admin.
- El backend acepta studentId del cliente y aún tiene ALUMNO_MOCK_123 como fallback de reserva. La identidad debe derivarse de sesión en servidor.
- VITE_ADMIN_CONTROL_NUMBER compara controlNumber en React para mostrar la variante administrativa; es configuración pública y no acredita permisos.
- La protección de origen global no reemplaza autenticación/autorización.
- resources.service.ts usa peticiones separadas y compensaciones manuales, no transacciones atómicas. Hay riesgo de carreras, actualización perdida de stock y errores de compensación ignorados.
- markLoanAsReturned solo bloquea returned, no restringe a active/overdue; overdue está en el tipo/etiquetas de UI, pero no se encontró proceso que lo asigne automáticamente.
- Se necesita validación servidor de formulario/delta; el HTML no la sustituye.
- Los errores de recursos son { error }, a diferencia de { message } del API institucional; no prometer homogeneidad total.

No ejecutar operaciones reales de préstamo/inventario para comprobar esos defectos sin una tarea autorizada. En esta revisión se comprobó solo lectura con base ficticia: /resources/admin/loans devolvió 200 sin cookie y /student/profile 401. No se consultaron datos reales.

## Configuración local y Render

Node admitido por el proyecto: 22 a 24; npm 10 o superior. Después de pull:

~~~powershell
npm install
npm run check
npm test --workspace=backend
npm run build
~~~

Ejecutar frontend/backend en terminales distintas:
~~~powershell
npm run dev:backend
~~~
~~~powershell
npm run dev:frontend
~~~

Direcciones locales: backend http://localhost:3000, frontend http://localhost:5173, salud /health. Si Vite usa otro puerto, FRONTEND_ORIGIN debe ajustarse por el integrante, no desactivar controles.

- backend/.env parte de backend/.env.example y contiene variables Supabase/cifrado/SII; no se comparte en Git. Mismo app_sessions implica misma llave SII_TOKEN_ENCRYPTION_KEY entre backends.
- frontend/.env.example define VITE_API_URL y VITE_ADMIN_CONTROL_NUMBER. API_URL ausente usa localhost:3000; la variable admin ausente no muestra la variante correspondiente.
- VITE_* es público; nunca poner claves de servidor allí. Reiniciar Vite o reconstruir tras cambiar variables.
- En local: NODE_ENV=development, COOKIE_SECURE=false, COOKIE_SAME_SITE=lax y FRONTEND_ORIGIN local.
- En Render: usar el backend publicado como VITE_API_URL, el frontend publicado como FRONTEND_ORIGIN, HTTPS/Secure y SameSite acorde con la separación real. El panel y sus valores concretos no se inspeccionaron en esta revisión.
- Render ya fue desplegado por Rebo según Emilio; no hay render.yaml ni URLs públicas registradas en los archivos revisados. No inventarlas ni presentar configuración inferida como verificada.

## Verificaciones y cierre

Revisión del 6 de noviembre de 2026:
- Dependencias nuevas lucide-react/react-router-dom/recharts instaladas después del diagnóstico local.
- npm run check: éxito con cuatro advertencias de lint.
- npm run build: éxito, advertencia por bundle frontend de unos 700 KB minificado.
- npm test --workspace=backend: 107/107 pruebas aisladas institucionales; no cubren extra, UI ni Render.
- Prueba adicional aislada de lectura: acceso admin de recursos sin cookie confirmado; no servicios reales.
- Pruebas reales de SII/Supabase realizadas antes del pull: login/sesión/cuatro recursos 200, logout 204 y reutilización 401; nombre no vacío comprobado sin registrar su valor. No equivalen a una nueva validación de préstamos ni producción.

Trabajo implementado: frontend académico, Centro de Préstamos y despliegue informado. No hay que recrearlos. Hallazgos reales:
1. Prioridad alta: sesión/propiedad/rol de recursos y eliminación del fallback ficticio.
2. Integridad/validación de inventario y estados; no se garantiza atomicidad.
3. Calificaciones actuales sin búsqueda/filtro materia/período, agenda sin sábado, notas null rojas y sin mensaje global de notas ausentes.
4. Tipos de semester/classroom desalineados, base fija de 260 créditos y tratamiento global de 401.
5. Evidencias de producción, pruebas visuales/capturas y exposición no certificadas en esta revisión. README raíz aún conserva texto antiguo; su actualización no se incluyó porque se solicitaron solo estos dos documentos.

**Pospuesto por Emilio:** script SQL reproducible y rate limiting. No son tareas nuevas obligatorias, no se implementaron y no se deben reactivar automáticamente.

## Documentación y exposición

DOCUMENTACION.md debe explicar problema, motivo, entradas/salidas, conexiones y estado/límites de cada módulo sin duplicar secciones. CONTEXTO.md resume decisiones y contratos para la continuidad. README debe describir lo existente, instalación y tecnologías; las capturas reales se incorporan según acuerdo, sin simularlas.

Emilio presenta arquitectura, backend institucional, sesiones, cifrado, DTO y pruebas; Rebo presenta frontend y Centro de Préstamos/despliegue. Ambos deben explicar las limitaciones reales y no llamar autorización al ocultamiento de botones. Las correcciones de código requieren una solicitud posterior; esta tarea modifica solo documentación.
