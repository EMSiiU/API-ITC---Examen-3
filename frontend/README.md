# Frontend — React + Vite + TypeScript

Aplicación frontend del monorepo del Examen 3. El estado local documentado contiene la plantilla inicial de Vite.

- React proporciona los componentes de interfaz.
- Vite ejecuta el servidor de desarrollo y genera la compilación.
- TypeScript comprueba los tipos.
- Oxlint realiza el análisis estático configurado.

Desde la raíz del repositorio:

```powershell
npm run dev:frontend
```

El servidor de desarrollo usa normalmente `http://localhost:5173`. El backend se inicia en otra terminal con `npm run dev:backend`.

El navegador consume únicamente la API propia de Express; las solicitudes autenticadas incluyen `credentials: 'include'`. Las claves de Supabase y el JWT institucional pertenecen exclusivamente al backend.

El responsable del frontend completo es Rebo, incluidos login, dashboard, Kardex, calificaciones, horario, navegación y estados de interfaz.

Las instrucciones de instalación y ejecución están en el [README principal](../README.md); los contratos y el reparto del equipo, en [CONTEXTO.md](../CONTEXTO.md).
