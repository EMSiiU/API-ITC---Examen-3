# Planificador Inteligente de Trayectoria Académica

Aplicación web del Examen 3 para consultar información académica institucional mediante un backend propio y ofrecer un planificador académico con valor para estudiantes.

## Arquitectura

- `frontend/`: SPA creada con React, Vite y TypeScript.
- `backend/`: API creada con Node.js, Express y TypeScript. Será el único componente que se comunique con la API del SII ITC.
- Supabase PostgreSQL: persistencia futura para las funciones propias del planificador.

El navegador nunca se comunica directamente con SII ITC. Las credenciales institucionales, los tokens y las variables de servicio no se incluyen en este repositorio ni en el frontend.

## Requisitos locales

- Node.js 22 LTS (el proyecto admite versiones 22 a 24).
- npm 10 o superior.

## Instalación y ejecución

```bash
npm install
npm run dev:frontend
npm run dev:backend
```

El frontend se abrirá normalmente en `http://localhost:5173` y el backend responderá en `http://localhost:3000/health`.

## Trabajo en equipo

`main` se mantiene estable. Cada cambio se desarrolla en una rama con el formato `feature/<descripcion>` y se integra mediante Pull Request revisado por la otra persona.

Ejemplo:

```bash
git switch -c feature/login-ui
```

## Despliegue previsto

Se desplegarán dos servicios independientes en Render: un Static Site para `frontend/` y un Web Service para `backend/`.
