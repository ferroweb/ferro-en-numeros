# Ferro en números

Estadísticas de Ferro Carril Oeste con datos de [FerroWeb](http://www.ferroweb.com.ar) · *Hablemos de Ferro*.
Sitio: https://ferroweb.github.io/ferro-en-numeros/

## Cómo trabajar

```
npm install      # una sola vez
npm run dev      # servidor local con recarga en vivo
npm run build    # genera dist/ (lo que se publica)
```

Al subir a `main`, GitHub Actions hace el build y publica en Pages (`.github/workflows/deploy.yml`).

## Estructura

```
public/data/        Los datos. La actualización diaria SOLO toca esta carpeta.
  tabla.json          tabla de posiciones, fecha, "actualizado"
  partidos.json       partidos y participaciones de cada jugador
  jugadores.json      estadísticas del plantel
  hallazgos.json      hallazgos, novedades del día, "la última vez"
  equipo.json         rendimiento, franjas, histórico 2025/2026
  proximo.json        próximo partido: calendario, pronóstico FW, escenarios, árbitro, cruce de planteles
  lab.json            datos del laboratorio
  prode-*.json        configuración y claves (hash) del Prode
  fotos-*.json        nombre → imagen (los archivos están en public/img/)
public/img/         Escudos y fotos.
src/
  main.js             arranque: carga los datos y monta todo
  ctx.js              datos cargados y valores derivados (se completa una vez)
  router.js           navegación por hash (#/grupo/página/parámetro) y menú lateral
  search.js           buscador global (/ o Ctrl+K)
  pages/              el MAPA DEL SITIO: index.js define los grupos del menú y hay un .html por grupo
                      (cada bloque data-tab es una página del menú, con su título y descripción)
  features/           la lógica que dibuja cada cosa (tablas, gráficos, previa, prode, laboratorio…)
  components/         piezas compartidas: tarjetas, caras, diálogo de desarrollo
  lib/                utilidades: DOM, gráficos y tablas, formatos, tema
  styles/             CSS por tema
```

## Menú del sitio

Inicio · Próximo partido (previa, pronóstico, pizarra, rival, chicanas, árbitro, árbitros de la temporada) · El equipo (tabla,
resultados, goles, puntos, forma y rendimiento, 2026 vs 2025) · Jugadores (plantel, ficha, comparador, duplas y banco) ·
Rivales (ficha de cada rival, historial, favoritos y bestias negras) · Herramientas · Comunidad (prode, trivia) · Hallazgos y datos.

**Compartir:** cada tarjeta tiene un botón ⤴ para copiar un texto listo para tuitear, copiar el link o bajar una imagen con la
marca del sitio (`src/components/compartir.js`). El detalle de cada hallazgo también tiene esas acciones.

## Para la redacción (sin conocimientos técnicos)

- **`LEEME-REDACCION.md`**: guía en lenguaje simple para cargar novedades, árbitro y horarios en una planilla de Google, y para escribir con ayuda de la IA.
- **Herramientas → Asistente de redacción** (en el sitio): arma el pedido para la IA con los datos reales ya incluidos; se copia y se pega en Claude.
- **`datos-fuente/EDITORIAL.md`**: instrucciones de la tarea con Claude que prepara la previa y los hallazgos de cada fecha.

## Actualización automática de datos

Una tarea de GitHub Actions (`.github/workflows/actualizar-datos.yml`) corre **cada 2 horas**: mira si FerroWeb publicó la
síntesis de un partido nuevo y si FútbolTotal actualizó la tabla. Si hay algo, guarda los datos y vuelve a publicar el sitio.
También se puede lanzar a mano: pestaña Actions → «Actualizar datos» → Run workflow.

**Qué actualiza solo** (`scripts/actualizar.mjs`):
- Partidos, participación de cada jugador (minutos, goles, tarjetas), estadísticas del plantel, rendimiento por situación y goles por franja.
- Tabla de posiciones (FútbolTotal).
- Con 2025 y 2024 leídos de las mismas síntesis de FerroWeb (se guardan una sola vez en `datos-fuente/temporadas.json`):
  - **Laboratorio:** forma, «y si al minuto…», mapa de minutos 2025 contra 2026, duplas y tridentes, impacto del banco, tal fecha como esta, rivales favoritos y bestias negras, cábalas.
  - **Árbitros:** tabla 2025-26 y las estadísticas del árbitro designado.
  - **La última vez que…**, **histórico 2025 contra 2026** (temporadas, evolución, historial por rival) y **escenarios del primer puesto**.
- El calendario (quién sigue, cuándo y dónde) se lee de los datos de `proximo.json`; hoy lo carga la tarea editorial.

**Qué NO actualiza** (texto o modelos que necesitan criterio): hallazgos y novedades, calendario y horarios, pronóstico FW y su historial, claves, simulación del primer puesto, árbitro designado, pizarra, chicanas, previa en números, cruce de planteles y termómetro de crónicas.
Cuando entra un partido nuevo, `datos-fuente/estado.json` marca `pendiente_editorial: true`. Mientras esas partes no se refresquen, el sitio
**no muestra** el pronóstico, las claves ni lo que depende de ellas como si fueran del partido siguiente (ver `previaAlDia` y
`escenariosAlDia` en `src/ctx.js`): muestra un aviso y vuelve solo cuando esos datos son de la fecha correcta.

**Cómo se cuida la calidad.** Antes de guardar un partido nuevo se comprueba que:
- el marcador coincida con los goles listados de cada equipo,
- haya 11 titulares y que los cambios cierren (entran tantos como salen),
- los nombres se reconozcan (los apellidos mal escritos por FerroWeb, como «Khim», se llevan al nombre que usa el sitio).

Si algo no cierra, **no se guarda nada**, la tarea falla y se abre un aviso (issue) en el repo. El sitio sigue mostrando los últimos
datos buenos. Si el error es de FerroWeb, se corrige en `datos-fuente/correcciones.json` (clave: número de síntesis, el
`view=` de la URL) y se vuelve a lanzar la tarea. Ejemplo: la síntesis de F6 dice 0-0 en el encabezado pero lista 2 goles.

**Otros archivos de `datos-fuente/`**
- `detalle.json`: por partido, minuto y autor de cada gol, ingresos de suplentes y tarjetas de Ferro. Se arma solo.
- `temporadas.json`: 2025 y 2024 leídos de FerroWeb. `alias-equipos.json`: nombres que FerroWeb escribe distinto según la temporada.
- `ajustes-jugadores.json`: ajustes manuales a las estadísticas, con el motivo. Revisar de vez en cuando.
- `estado.json`: última fecha cargada y si falta la parte editorial.

**Comandos**
```
npm test                      # pruebas del parser con síntesis reales
node scripts/validar-editorial.mjs      # qué falta para la previa de la próxima fecha
npm run datos:actualizar      # lo mismo que hace la tarea (agregar -- --seco para no escribir nada)
npm run datos:verificar       # reconstruye los partidos desde FerroWeb y los compara con lo cargado
node scripts/verificar-editorial.mjs      # lo mismo para laboratorio, árbitros, histórico y escenarios
node scripts/actualizar.mjs --temporadas  # vuelve a leer 2025 y 2024
node scripts/actualizar.mjs --reconstruir   # vuelve a leer todas las síntesis y rehace los datos
```

**Respeto por las fuentes.** Cada corrida hace 2 o 3 pedidos livianos (la síntesis siguiente y la tabla) y se identifica con un
`User-Agent` propio. Solo baja más páginas cuando hay un partido nuevo. FerroWeb autorizó esta lectura.

## Sumar algo nuevo

- **Una página nueva del menú**: agregar un `<div class="tab" data-tab="id" data-label="Nombre" data-desc="Qué responde">` en el `.html` del grupo (en `src/pages/`). El menú y el título se arman solos.
- **Un grupo nuevo del menú**: crear `src/pages/x.html` y registrarlo en `GRUPOS` de `src/pages/index.js`. Si necesita lógica, crear un módulo en `src/features/` con `init()` y sumarlo a `FEATURES`.
- **Un grupo de datos nuevo**: crear `public/data/x.json` y sumarlo a `ARCHIVOS` en `src/main.js`. Sus claves quedan disponibles en `DATA`.
- **Que una página no muestre todo de golpe**: `limitar(lista, 3)`, `limitarTabla(tabla, 8)` y `columnasExtra(tabla)` (en `src/lib/dom.js`) dejan lo principal visible y el resto detrás de un «Ver más». Las columnas de una tabla se marcan como secundarias con `x: 1`.
- **Que se encuentre en el buscador**: agregar el destino a `DESTINOS` en `src/search.js`.

## Links viejos

Los links anteriores (`#previa`, `#prode`, `#lab`, `#tabla`, `#/temporada/...`, `#/laboratorio/...`) siguen funcionando: el router los traduce a la ubicación nueva.
