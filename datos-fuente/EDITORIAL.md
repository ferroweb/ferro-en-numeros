# Instrucciones para la tarea editorial (Claude)

Esta es la guía de la tarea que prepara **lo que necesita criterio**: la previa de la próxima fecha y los hallazgos. Los números
(resultados, tabla, estadísticas, laboratorio, árbitros, histórico, escenarios) ya los calcula `node scripts/actualizar.mjs`:
**no se escriben a mano ni se tocan**.

## Rutina (cada vez que se juega un partido, o cuando la persona de la redacción lo pida)

1. `git pull` y `npm install` (si hace falta).
2. `node scripts/actualizar.mjs`. Trae el partido nuevo y deja los números al día. Si dice que FerroWeb todavía no publicó la síntesis, **esperar**: no se prepara la previa con datos viejos.
3. `node scripts/validar-editorial.mjs`. Lista **exactamente** lo que falta. Ese listado es el trabajo.
4. Leer `datos-fuente/pedidos-ia.json` (si existe): son pedidos de la redacción para esta previa. Atenderlos con prioridad y, al terminar, agregar sus `id` a `datos-fuente/pedidos-atendidos.json` (una lista de textos).
5. Escribir lo que falte (ver más abajo) editando **solo** los archivos indicados.
6. Repetir `node scripts/validar-editorial.mjs` hasta que diga «La parte editorial está completa». Correr también `npm test`.
7. `git add -A`, commit («Previa fecha N: …») y `git push`. El sitio se publica solo.

Si algo no se puede resolver (por ejemplo, el árbitro todavía no está designado), no inventarlo: dejarlo vacío y que el validador lo marque como aviso.

## Reglas de oro

- **Nada inventado.** Todo número sale de `public/data/*.json` o de una fuente citada. Si no hay dato, no se escribe.
- **No tocar lo calculado:** `partidos`, `jugadores`, `tabla`, `lab`, `equipo`, `arbitros.tabla`, `escenarios`, `ultimas` y `datos-fuente/*.json` (salvo `pedidos-atendidos.json` y `correcciones.json`).
- Tono de hincha verdolaga, rioplatense, con humor pero sin faltar el respeto. Las chicanas apuntan al juego y a los números, no a las personas.
- Mantener la estructura exacta de cada archivo: el sitio lee campos concretos.

## Qué se escribe y dónde

Todo en `public/data/` (formato compacto, UTF-8). Las reglas completas están en `scripts/lib/editorial.mjs` (función `validarEditorial`).

### `proximo.json`

- **`calendario.proximos[]`**, entrada de la próxima fecha (`fecha = última_fecha + 1`):
  - Datos del partido: `rival`, `cond` (`"L"`/`"V"`), `dia` (`AAAA-MM-DD`), `hora`, `estadio`, `confirmado`, `fuente`, `forma_rival` (últimos 5 del rival, formato `"1-1 vs Racing de Córdoba (L)"`, marcador desde su punto de vista).
  - `humor`: `{ titulo, intro, puntos: [[título, texto], …], frases: […], graficos: { cara, tablero, reloj, final }, cierre }`.
  - `pizarra`: `{ intro, sistema, once: [[arquero], [defensores], [medios], [delanteros]], once_nota, perfil, instrucciones, debilidades, cuidado, cierre, frase: { texto, autor, por_que } }` (pares `[título, texto]`; el once con los 11 nombres tal como figuran en el plantel).
  - `ateneaid` (previa en números): `{ fuente, metricas: [[nombre, unidad, rival, ferro, promedio, mejor_si_sube], …], lecturas: [[título, texto], …] }`.
  - `arbitro`, `arbitro_humor` si la AFA ya designó (el árbitro y el horario también pueden venir de la planilla de la redacción).
- **`fw`** (Pronóstico FW de esa fecha): `fecha`, `rival`, `cond`, `ganar`/`empatar`/`perder` (suman 100), `gf`, `gc`, `p_marcador`, `p_salida`, `xg_ferro`, `xg_rival`, `autores`, `suspendidos`, `goleadores: [{ jugador, p, goles }]`, `factores: { temporada, condicion, forma_ferro, forma_rival }` (cada uno `[goles a favor, goles en contra]`).
  Método (es el que el sitio le cuenta al lector): mezclar lo que hace y recibe cada equipo en la temporada comparado con el promedio del grupo, cómo nos va de local o de visitante y el momento de los dos en las últimas cinco fechas; corregir los empates, que en partidos cerrados salen más de lo que dice la teoría; repartir los goles de Ferro según lo que viene metiendo y jugando cada uno.
- **`pronostico`**: `fecha`, `rival`, `cond`, `ganar`, `empatar`, `perder`, `goles_ferro`, `goles_rival`, `marcadores`, `marcador_hincha`, `escenarios` (3: `Si ganamos` / `Si empatamos` / `Si perdemos`, con `pts`, `necesita`, `de`, `depende`) y `chances_primero` (simulación de lo que queda del torneo; suma 100 e incluye a Ferro).
- **`fw_historial`**: agregar la entrada `{ fecha, rival, cond, gf, gc, goleador, p_salida, hecho }` con el pronóstico recién publicado. El resultado real y los aciertos los completa solo `actualizar.mjs` cuando se juega.
- **`claves`**: entre 3 y 12 `{ titulo, porque, dato }` específicas de este rival, con los números del sitio.
- **`cruce`**: ex compañeros y ex jugadores entre Ferro y el rival (si hay fuente); si no, dejarlo sin tocar.

### `hallazgos.json`

- **`hallazgos[]`**: refrescar con los números nuevos. Cada uno `{ id, tipo, jugador, titulo, detalle, relevancia (1 a 10), al_cierre_de: "Fecha N" }`, con `tipo` en `record, jugador, equipo, comparacion, curiosidad, tabla`. Ids únicos (`h01`, `h02`…). Al menos uno debe estar al cierre de la última fecha.
- **`novedades[]`**: `{ id (n001…), fecha, fuente, titulo, detalle, url, desarrollo?, datos? }` con lo que pasó en el partido y la semana.
- **`ultimas`**: lo calcula el script. No tocar.

### `lab.json`

- Solo **`lab.cronicas`** (termómetro de crónicas de FerroWeb: tono elogioso, equilibrado o crítico según el resultado). Todo lo demás lo calcula el script.

## Cómo programar la tarea

Pedirle a Claude Code una tarea programada con este texto:

> Leé `datos-fuente/EDITORIAL.md` y seguí la rutina. Si FerroWeb todavía no publicó la síntesis del último partido, no hagas nada. Si hay una fecha nueva, dejá la previa y los hallazgos completos hasta que `node scripts/validar-editorial.mjs` no marque problemas, corré `npm test` y publicá con `git push`.

Frecuencia sugerida: todos los días a las 9 y la noche de cada partido (la rutina no hace nada si no hay novedades).
