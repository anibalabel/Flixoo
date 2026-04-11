<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/ab675865-fa5b-46dc-b572-3da2606774f2

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
4. login cunata amdin Flixoo Panel 
tine que tener Flixoo – AI-Powered OTT CMS for Movies, Series & Live TV (Web + Mobile) with Monetization
(https://codecanyon.net/item/flixoo-movies-and-tv-streaming-app/59566505)
registra Url Masivas , optine los episodio de TMDB , Registrar Primero la serie y pelicula
las tempodas se pueden registrar en la plataforma de Flixoo , aqui puedes registar tambien pero para idima LAT y CAST por Tempodad
env.local , env
DB_HOST=
DB_PORT=
DB_NAME=
DB_USER=
DB_PASSWORD=
TMDB_TOKEN=( Token de acceso de lectura a la API TMDB )

## Eliminación en cascada (Integridad referencial)

### Películas

- Antes de eliminar una película, el panel consulta el conteo de videos asociados (tabla `movie_files` por `video_id`).
- La confirmación muestra explícitamente cuántos videos serán eliminados junto con la película.
- La eliminación se ejecuta en una transacción:
  - `DELETE FROM movie_files WHERE video_id = <movieId>`
  - `DELETE FROM movies WHERE id = <movieId>`
- Si ocurre un error en cualquier paso, se hace rollback y no quedan datos en estado inconsistente.

### Temporadas

- Antes de eliminar una temporada, el panel consulta el conteo de episodios asociados (tabla `episodes` por `season_id`).
- La confirmación muestra explícitamente cuántos episodios serán eliminados junto con la temporada.
- La eliminación se ejecuta en una transacción:
  - `DELETE FROM episodes WHERE season_id = <seasonId>`
  - `DELETE FROM seasons WHERE id = <seasonId>`
- Si ocurre un error en cualquier paso, se hace rollback.

### Auditoría

- Cada eliminación en cascada intenta registrar un evento en la tabla `admin_audit_logs`.
- Si la tabla no existe, el servidor intenta crearla automáticamente (si la BD lo permite). Si no se puede, se registra el evento en logs del servidor como fallback.

### Endpoints usados por el panel

- Resumen previo (conteos):
  - `GET /api/movies/:id` → `{ movieFilesCount, exists }`
  - `GET /api/seasons/:id` → `{ episodesCount, exists }`
- Eliminación en cascada (transaccional):
  - `DELETE /api/movies/:id`
  - `DELETE /api/seasons/:id`

### Recomendación de rendimiento (BD)

- Para un rendimiento óptimo con grandes volúmenes, se recomiendan índices:
  - `movie_files(video_id)`
  - `episodes(season_id)`
