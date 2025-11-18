# Frontend - Planificador de hospitales

Aplicación Next.js (App Router) que permite lanzar simulaciones de K-means, visualizar una cuadrícula m × m y revisar métricas clave.

## Objetivos
- Formular parámetros para el backend y monitorear el estado de cada simulación.
- Mostrar la cuadrícula con vecindarios coloreados por cluster y hospitales destacados.
- Compartir métricas de distancia, tabla resumen y explicación didáctica.

## Tecnologías
- Next.js 15 + React 18 (TypeScript)
- CSS Modules globales con una paleta inspirada en We Peep / Beauty Bush / Viridian / Norway / Tacha.

## Variables de entorno
Crea un archivo `.env.local` basado en `.env.example`:
```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

En Vercel agrega la misma variable desde el panel (Environment Variables > NEXT_PUBLIC_API_BASE_URL).

## Scripts disponibles
- `npm run dev`: servidor de desarrollo en `http://localhost:3000`.
- `npm run build`: build de producción.
- `npm start`: sirve la build generada.
- `npm run lint`: ejecuta ESLint.

## Ejecución local
```bash
cd frontend
cp .env.example .env.local # ajusta la URL si es necesario
npm install
npm run dev
```
Asegúrate de que el backend esté activo para que la llamada a `/simular` funcione.

## Despliegue en Vercel
1. Crea un nuevo proyecto y selecciona el repositorio del frontend.
2. Dentro de “Environment Variables” agrega `NEXT_PUBLIC_API_BASE_URL` apuntando al backend en Render.
3. Usa los comandos por defecto (`npm install`, `npm run build`, `npm start`).
4. Tras el deploy podrás compartir la URL pública para las demostraciones.

## Estructura clave
```
src/
├── app/
│   ├── globals.css   # Estilos globales y paleta
│   ├── layout.tsx    # Shell y metadata
│   └── page.tsx      # Interfaz principal, lógica de fetch y gráficos SVG
```

Sugerencias futuras: incluir almacenamiento de simulaciones anteriores o descargas de capturas para documentar escenarios.
