# Contexto para Rebo y su agente de IA

Este archivo permite que Rebo entregue a un agente de IA el contexto suficiente para desarrollar sus tareas sin alterar decisiones ya tomadas. Debe leerse por completo antes de realizar cambios.

## Identidad del equipo y reparto de trabajo

| Integrante | Identificador en este documento | Responsabilidades |
|---|---|---|
| Emilio | `Emilio` | Fundamentos, integración backend SII y sesiones, dashboard y kardex, seguridad/pruebas API/despliegue, arquitectura/backend en exposición y colaboración en la funcionalidad adicional que el equipo elija. |
| Rebo | `Rebo` | Revisión de diseño/dependencias/requisitos, login y protección de rutas frontend, calificaciones y horario, interfaz/persistencia de la funcionalidad adicional que el equipo elija, pruebas UI/responsive/documentación y frontend en exposición. |

## Regla crítica para el agente de IA

La IA **nunca debe realizar commits, pushes, Pull Requests, merges, cambios de rama ni publicar despliegues**. Puede modificar archivos locales si Rebo lo solicita, verificar el proyecto y, al finalizar un conjunto coherente de cambios, debe mostrar los comandos exactos para que Rebo cree su propio commit.

Ejemplo de cierre que la IA debe proporcionar:

```powershell
git status
git add <archivos-correspondientes>
git commit -m "feat(frontend): descripcion-corta"
git push -u origin feature/nombre-de-la-rama
```

Rebo ejecuta esos comandos personalmente, revisa los cambios y abre el Pull Request hacia `main`.

## Proyecto

- Nombre provisional: **Aplicación Académica SII ITC (Examen 3)**. La funcionalidad adicional y el nombre final siguen pendientes de decisión.
- Ubicación local: `C:\Escuela\9no_semestre\TOPWEB\Examen3`.
- Repositorio: monorepo npm con `frontend/` y `backend/`.
- Rama estable: `main`.
- Flujo de colaboración: ramas `feature/<descripcion>` y Pull Requests. No se desarrolla directamente sobre `main`.

Antes de iniciar una tarea, Rebo debe crear su rama:

```powershell
git switch main
git pull origin main
git switch -c feature/nombre-de-la-tarea
```

Si existen cambios locales no confirmados de Emilio, Rebo no debe mezclarlos ni sobrescribirlos. Debe esperar a que Emilio cree su commit o usar una copia/branch limpia del repositorio.

## Requisito académico principal

La aplicación debe usar datos reales de la API institucional SII ITC para login, perfil, calificaciones, kardex y horario. No se pueden simular las respuestas de esos puntos obligatorios.

**El frontend nunca debe comunicarse directamente con la API del SII ITC.** Solo puede llamar al backend propio. El backend será el único componente autorizado para consultar SII ITC.

La funcionalidad adicional sí puede incluir datos simulados si no existen datos suficientes. El equipo todavía no ha seleccionado esa funcionalidad; el Planificador Inteligente de Trayectoria Académica es solamente una propuesta y no debe implementarse ni presentarse como decisión final.

## Arquitectura acordada

```text
Navegador
  │
  ▼
Frontend React + Vite + TypeScript (Render Static Site)
  │ solicitudes HTTPS solo al backend propio
  ▼
Backend Node.js + Express + TypeScript (Render Web Service)
  ├── API SII ITC: autenticación y datos académicos oficiales
  └── Supabase PostgreSQL: sesiones y datos propios de la funcionalidad adicional elegida
```

### Sesiones

La sesión usa una cookie `httpOnly`.

- El navegador no puede leerla mediante JavaScript.
- El JWT institucional de SII nunca se entrega al frontend ni se guarda en `localStorage` o `sessionStorage`.
- La cookie tendrá solo un identificador de sesión aleatorio.
- El backend asocia ese identificador con el JWT institucional cifrado y guardado del lado servidor, mediante Supabase.
- El frontend deberá incluir `credentials: 'include'` al consumir el backend.
- El backend configura CORS con origen explícito y `credentials: true`.

Para producción, la cookie debe usar `Secure=true`. Si frontend y backend se mantienen en dominios Render distintos, puede requerirse `SameSite=None` y siempre `Secure=true`. La opción más estable es configurar subdominios propios, por ejemplo `app.dominio.com` y `api.dominio.com`.

## Estado real actual

### Confirmado previamente en GitHub

- Monorepo inicial.
- `frontend/` creado con React, Vite y TypeScript.
- `backend/` creado con Node.js, Express y TypeScript.
- Endpoint de salud `GET /health`.
- Scripts npm de desarrollo, build y check.
- README, `.gitignore`, `.node-version` y configuración TypeScript.

### Backend implementado por Emilio

- Autenticación real contra SII ITC mediante `POST /auth/login`.
- Sesión local con cookie `httpOnly`; el JWT de SII se cifra y persiste solo en Supabase.
- `GET /auth/session`, `POST /auth/logout` y middleware reutilizable de sesión.
- `GET /student/profile`, protegido por sesión y conectado al endpoint real de perfil SII.
- CORS restringido a `FRONTEND_ORIGIN`, con credenciales habilitadas.

Detalles de integración confirmados que Rebo no debe sustituir ni exponer:

- El JWT de login SII existe en `message.login.token`, pero solo lo procesa el backend.
- El endpoint propio de perfil responde `200 { profile: ... }`; los datos académicos útiles están bajo `profile.data`.
- El frontend debe enviar `credentials: 'include'` y nunca administrar tokens institucionales.

Rebo debe partir de `main` actualizado y verificar que los Pull Requests de Emilio estén fusionados antes de conectar el frontend. No debe editar módulos backend de Emilio sin coordinación.

## Estructura actual

```text
.
├── frontend/                         # Responsabilidad principal inicial de Rebo
│   ├── src/
│   │   ├── App.tsx                   # Plantilla inicial de Vite, pendiente de reemplazar
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
├── backend/                          # Responsabilidad principal inicial de Emilio
│   ├── src/
│   │   ├── app.ts
│   │   ├── server.ts
│   │   ├── config/env.ts
│   │   └── modules/
│   │       ├── auth/                 # Login, sesión, cookie y middleware
│   │       ├── sii/                  # Cliente institucional exclusivo de backend
│   │       └── student/              # Perfil protegido
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
├── DOCUMENTACION.md                  # Documentación técnica viva
├── CONTEXTO.md                       # Esta guía para Rebo y su IA
├── package.json
└── package-lock.json
```

## Herramientas y comandos

Requisitos:

- Node.js 22 LTS como versión objetivo (se aceptan versiones 22 a 24).
- npm 10 o superior.

Desde la raíz del repositorio:

```powershell
npm install
npm run dev:frontend
npm run dev:backend
npm run build
npm run check
```

Direcciones locales esperadas:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Salud del backend: `http://localhost:3000/health`, con respuesta `{ "status": "ok" }`

## Contratos de API previstos

Los endpoints de autenticación y perfil están implementados; calificaciones, kardex, horario y funcionalidad adicional siguen pendientes. Rebo debe coordinar cualquier cambio de contrato con Emilio.

| Método y ruta | Solicitud | Respuesta esperada | Responsable |
|---|---|---|---|
| `POST /auth/login` | `{ email, password }` | Cookie de sesión y `{ authenticated: true }` | Emilio |
| `GET /auth/session` | Cookie enviada automáticamente | Estado de autenticación y datos mínimos seguros | Emilio |
| `POST /auth/logout` | Cookie de sesión | Limpia/invalida sesión | Emilio |
| `GET /student/profile` | Cookie de sesión | `200 { profile: ... }` desde SII | Emilio |
| `GET /student/grades` | Cookie de sesión | Calificaciones desde SII | Emilio |
| `GET /student/kardex` | Cookie de sesión | Kardex desde SII | Emilio |
| `GET /student/schedule` | Cookie de sesión | Horario desde SII | Emilio |
| Rutas de funcionalidad adicional | Por definir | Por definir tras seleccionar propuesta | Ambos |

El formato final de las respuestas debe acordarse antes de conectar el frontend. Rebo no debe inventar campos institucionales ni exponer tokens en la interfaz.

## Tareas de Rebo en orden sugerido

### 1. Login y protección de rutas frontend

Rama sugerida: `feature/login-route-protection`.

Objetivo:

- Instalar y configurar React Router.
- Crear rutas públicas y privadas.
- Construir interfaz de login accesible, validando campos vacíos y formato básico de correo.
- Crear una capa o servicio de API que apunte solo al backend propio.
- Implementar estados de carga y mensajes de error preparados para el contrato real.
- Proteger rutas privadas consultando `GET /auth/session` cuando esté disponible.

Restricciones:

- No llamar SII ITC desde React.
- No guardar JWT institucional ni credenciales en el navegador.
- Usar `credentials: 'include'` en las solicitudes futuras al backend.
- No presentar una simulación como si fuera integración real; el login debe consumir el backend disponible mediante `credentials: 'include'`.

### 2. Calificaciones y horario

Rama sugerida: `feature/grades-schedule-ui`.

Objetivo:

- Pantalla de calificaciones con tabla o tarjetas, filtro por materia/período e indicadores visuales de desempeño.
- Pantalla de horario organizada por día y hora, en formato de agenda o tabla.
- Estados de carga, error y sin datos.
- Consumir únicamente `GET /student/grades` y `GET /student/schedule` cuando Emilio los entregue.

### 3. Funcionalidad adicional de impacto: pendiente de decisión

No iniciar esta fase hasta que Emilio y Rebo seleccionen y justifiquen una propuesta. Cuando exista decisión, se definirá rama, modelo de datos, API propia e interfaz sin mezclar datos propios con datos institucionales.

### 4. Pruebas de UI, responsive y documentación

Rama sugerida: `feature/ui-quality-documentation`.

Objetivo:

- Revisar interfaz en móvil, tablet y escritorio.
- Validar carga, errores, navegación y accesibilidad básica.
- Preparar capturas reales para README cuando existan funcionalidades conectadas.
- Actualizar README y `DOCUMENTACION.md` con los cambios del commit correspondiente.

## Regla de documentación

`DOCUMENTACION.md` es el registro técnico vivo del proyecto. Antes de cada commit, Rebo o su IA debe actualizarlo con:

1. Cambios implementados.
2. Archivos, rutas, componentes, variables o servicios afectados.
3. Lógica, flujo y consideraciones de seguridad.
4. Pruebas realizadas.
5. Pendientes reales.

Este archivo no sustituye al README: el README se orienta a instalar y ejecutar; `DOCUMENTACION.md` explica la arquitectura y lógica interna.

## Reglas de seguridad y calidad

- No subir `.env`, claves de Supabase, contraseñas, tokens JWT ni credenciales institucionales.
- No colocar `SUPABASE_SECRET_KEY` en frontend ni variables con prefijo `VITE_`.
- No registrar contraseñas ni tokens en consola, respuestas HTTP o archivos de log.
- Usar TypeScript estricto y validar datos externos antes de procesarlos.
- Mostrar errores claros al usuario, sin revelar detalles internos del servidor.
- Mantener cargas, errores y estados vacíos en las pantallas que consuman APIs.
- Agregar dependencias solo cuando estén justificadas y documentarlas.

## Información para exposición

Rebo explicará el frontend y la funcionalidad adicional. Debe poder explicar:

- Por qué se eligió React + Vite + TypeScript.
- Cómo las rutas protegidas impiden mostrar datos académicos sin sesión.
- Por qué el navegador solo habla con el backend propio.
- La funcionalidad adicional finalmente elegida y su valor concreto para el estudiante.

Emilio explicará arquitectura general, backend, seguridad e integración con SII.

## Instrucciones para trabajar con un agente de IA

Al iniciar una tarea, Rebo puede entregar al agente este archivo y una solicitud precisa. El agente debe:

1. Explicar las decisiones importantes antes de realizar una configuración significativa.
2. Limitarse a la fase/tarea solicitada; no avanzar automáticamente a otras fases.
3. Inspeccionar el estado actual antes de modificar archivos.
4. Preservar cambios ajenos y evitar modificar archivos de Emilio salvo coordinación explícita.
5. Actualizar `DOCUMENTACION.md` como parte del conjunto de cambios.
6. Ejecutar verificaciones proporcionales, como `npm run check` o `npm run build`.
7. No hacer commits, pushes, Pull Requests, merges ni despliegues.
8. Entregar al final los comandos para que Rebo revise, agregue, confirme y publique su propia rama.
