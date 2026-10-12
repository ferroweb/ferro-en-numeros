# Ferro en números — contexto para quien siga el proyecto

Estadísticas de Ferro Carril Oeste para **FerroWeb · «Hablemos de Ferro»** (medio partidario). Se usa para analizar partidos, escribir
tuits y preparar el programa de los jueves. Sitio: https://ferroweb.github.io/ferro-en-numeros/ (GitHub Pages).

Este archivo resume cómo está pensado el proyecto y por qué. **Leelo entero antes de tocar nada**: el sitio original era un único
`index.html` de 477 KB con datos, CSS y JS mezclados, y la meta de este rediseño fue justamente no volver a eso.

---

## 1. Principios (lo que no se negocia)

1. **Datos separados del código.** Los datos viven en `public/data/*.json`. Nunca se pega un dato en un `.js`, `.html` o `.css`.
2. **El código del sitio nunca se reescribe desde una tarea automática.** Las tareas solo escriben en `public/data/` y `datos-fuente/`. El `index.html` es un cascarón de ~60 líneas que no se toca para actualizar datos.
3. **Una página responde una pregunta.** Se organiza por lo que busca el lector, no por cómo se construyó cada cosa (ej.: «Goles» junta franjas y mapa de minutos 2025 vs 2026; antes estaban escondidos en dos lugares).
4. **Mostrar poco, dejar el resto a un clic.** Lo principal visible; lo secundario detrás de «Ver más» (`limitar`, `limitarTabla`, `columnasExtra`). Páginas largas se parten en dos antes de apilar más cosas.
5. **Lo que se puede calcular, se calcula.** Todo lo derivado de partidos sale de código con **pruebas** y se valida contra datos revisados a mano. Solo lo que necesita criterio (texto, modelos) lo hace una persona o una IA.
6. **Nada inventado.** Un número del sitio sale de una fuente (FerroWeb, FútbolTotal) o de un cálculo sobre ellas. Si FerroWeb trae un error, se corrige en un archivo con el motivo escrito, nunca «a ojo» en el JSON.
7. **Si un dato está viejo, no se muestra como si fuera nuevo.** Hay protecciones (`previaAlDia`, `escenariosAlDia`) que ocultan lo que quedó de la fecha anterior y muestran un aviso.
8. **Sin frameworks ni dependencias de más.** JS plano con módulos ES, Vite solo para empaquetar. Única dependencia de runtime: `html2canvas` (imágenes para compartir, carga diferida).

## 2. Mapa del repositorio

```
index.html                  cascarón: barra superior, lateral, <main id="app">, diálogos (des, prode-dlg, buscador)
public/data/                LOS DATOS (JSON). Los carga src/main.js y los mezcla en un único objeto DATA
  tabla · partidos · jugadores · hallazgos · equipo · proximo · lab        (grupos que se mezclan en DATA)
  fotos-*.json · prode-*.json · redaccion-config.json                      (se leen aparte)
public/img/                 escudo, logos, fotos (jugadores/ y fw/)
datos-fuente/               insumos y correcciones de los scripts (NO se publican en el sitio)
  detalle.json              por partido: goles (minuto y autor), ingresos, tarjetas de Ferro
  temporadas.json           2025 y 2024 leídos de FerroWeb (una sola vez)
  correcciones.json         errores conocidos de FerroWeb, por número de síntesis, con «motivo»
  ajustes-jugadores.json    ajustes manuales a estadísticas, con «motivo»
  alias-equipos.json        nombres de clubes que FerroWeb escribe distinto según la temporada
  estado.json · pedidos-ia.json · pedidos-atendidos.json
  EDITORIAL.md              instrucciones de la tarea con Claude (previa y hallazgos)
scripts/                    actualización automática (Node 22, sin dependencias)
  actualizar.mjs            orquestador
  lib/ferroweb.mjs          lee y parsea las síntesis de FerroWeb
  lib/derive.mjs            síntesis → partido, participaciones, estadísticas, rendimiento, franjas
  lib/calculos.mjs          laboratorio, árbitros, «última vez», histórico, escenarios (funciones puras)
  lib/temporadas.mjs        lee 2025 y 2024
  lib/futboltotal.mjs       tabla de posiciones
  lib/redaccion.mjs         planilla de la redacción (árbitro, horario, pedidos para la IA)
  lib/editorial.mjs         validador de la parte editorial + historial del pronóstico FW
  lib/texto.mjs             normalización y comparación de nombres (tolera tipeos)
  validar-editorial.mjs · verificar.mjs · verificar-editorial.mjs   (ver §7)
  test/                     pruebas con síntesis reales (fixtures/) y datos armados a mano
src/
  main.js                   arranque: carga datos → initCtx → monta páginas → init de cada feature → buscador → router
  ctx.js                    estado compartido: DATA y derivados (prox, ult, ferroT, TODOS, previaAlDia, escenariosAlDia…)
  router.js                 hash router + menú lateral (se arma solo)
  search.js                 buscador global (/ o Ctrl+K)
  pages/                    EL MAPA DEL SITIO: index.js (grupos) + un .html por grupo
  features/                 la lógica que dibuja cada cosa (un módulo por área; partido/ para la previa)
  components/               tarjeta, caras, diálogo de detalle, compartir
  lib/                      dom, charts (tablas y tooltips), fmt, equipos, planilla, tema, prode-state
  styles/                   CSS por tema (tokens, base, shell, layout, components, partido, …)
.github/workflows/          deploy.yml (publica en Pages) · actualizar-datos.yml (cada 2 h)
LEEME-REDACCION.md          guía para la redacción (no técnica)
```

## 3. Cómo funciona el front

- **Rutas:** `#/grupo/pagina/parametro` (ej. `#/jugadores/ficha/Parisi`, `#/rivales/ficha/Godoy%20Cruz`). Las rutas viejas (`#previa`, `#/temporada/...`, `#/laboratorio/...`) se traducen en `router.js`; si movés una página, **agregá la traducción**.
- **Menú lateral y páginas se arman solos.** Cada grupo es un `src/pages/<grupo>.html`; cada bloque `<div class="tab" data-tab="id" data-label="Nombre" data-desc="Qué responde">` es una **página del menú** (el router le pone encabezado, miga de pan y link). Un grupo se declara en `src/pages/index.js` (`GRUPOS`); su lógica, en un módulo de `features/` listado en `FEATURES`.
- **Una página «vacía» desaparece del menú sola:** si todos los hijos del bloque tienen `hidden`, el router oculta el link y salta a la siguiente. Los módulos esconden (`hidden = true`) lo que no tienen datos para mostrar.
- **Ciclo de un módulo de `features/`:** `export default { init(), onShow(grupo, pagina, param) }`. `init` corre una vez, con todo el HTML ya montado; `onShow` en cada cambio de ruta (sirve para redibujar gráficos que dependen del ancho y para leer `param`).
- **Todas las páginas están en el DOM a la vez** (solo una visible). Por eso los módulos buscan por `id` y no hay estado por vista.
- **Helpers:** `$` y `el(tag, clase, texto)` (`lib/dom.js`; usar `textContent`, no `innerHTML` con datos), `S` para SVG, `tabla()` ordenable (`lib/charts.js`), `tarjeta()` para hallazgos (`components/tarjeta.js`).
- **Compartir:** `iniciarCompartir()` agrega a cada `.caja` con `<h3>` un botón ⤴ (copiar texto de tuit, copiar link, descargar imagen con la marca). No hay que hacer nada para que una caja nueva lo tenga.
- **Buscador:** indexa jugadores, rivales, árbitros, hallazgos y `DESTINOS` (lista en `search.js`). **Cada página nueva se agrega ahí** con sinónimos.
- **Datos viejos:** `previaAlDia` = el pronóstico (`DATA.fw.fecha`) es de la próxima fecha. `escenariosAlDia` = `DATA.escenarios.tras_fecha === DATA.ultima_fecha`. Si usás datos que dependen de la previa, respetá esas banderas.
- **Rutas con base:** el sitio se publica bajo `/ferro-en-numeros/`. Usar `import.meta.env.BASE_URL` para cualquier archivo público (imágenes, JSON). `vite.config.js` toma `BASE_PATH` del entorno (el workflow lo pone según el nombre del repo).

## 4. Estética (misma línea siempre)

- **Identidad:** verde Ferro `#0b5e30` (`--verde`), tablero oscuro `#0b3d24` (`--marcador`). Tipografías: **Big Shoulders Display** (títulos en mayúsculas, números grandes), **Public Sans** (texto), **IBM Plex Mono** (etiquetas chicas en mayúsculas con `letter-spacing`).
- **Siempre con variables** de `src/styles/tokens.css` (`--bg --panel --ink --muted --line --verde --verde-txt --warn --bad --ok --chip --lin25 --side-*`). **Prohibido** hardcodear colores nuevos: hay tema claro y oscuro (sigue al sistema, con botón); lo que no use variables se rompe en uno de los dos.
- **Piezas:** `.caja` (tarjeta con borde), `.kpi`, `.hall` + `.h` (grilla de hallazgos), `.grid2`, `.pill G/E/P`, `.nota` (texto chico gris), `.pv-h4` (subtítulo en mayúsculas). Antes de crear un componente, buscá si ya existe.
- **Menú lateral:** fondo propio (`--side-bg`); títulos de grupo en Big Shoulders mayúsculas con subrayado verde; subítems chicos y apagados. En escritorio se oculta con el botón del lateral (queda una barra con «Menú»); en el celular es un cajón.
- **Textos:** español rioplatense con **voseo** («Tocá», «Elegí», «Mirá»), tono de hincha verdolaga, claro y sin tecnicismos. Los títulos de tarjeta dicen qué pregunta responden («Goles por franja de 15 minutos»).
- **Responsive:** todo tiene que andar a 390 px sin scroll horizontal. Tablas anchas: columnas secundarias con `x: 1` + `columnasExtra()`, o contenedor `.tw` con scroll.
- **Accesibilidad mínima:** `button`/`a` reales, `aria-label` en botones de ícono, foco visible, respeto de `prefers-reduced-motion`.

## 5. Datos y automatización

**Fuentes:** síntesis de partidos de **FerroWeb** (`http://www.ferroweb.com.ar/v1/?mod=futbol&sub=sintesis&view=<id>`, HTML en ISO-8859-1, HTML viejo) y tabla de **FútbolTotal** (`https://futboltotal.futbol/league/primera-nacional/clasificacion`). FerroWeb autorizó la lectura automática; los pedidos van con un `User-Agent` propio y son pocos (2-3 por corrida).
**No se leen redes sociales** (frágil, contra condiciones de uso o paga).

**Flujo (`scripts/actualizar.mjs`, cada 2 h por GitHub Actions, o a mano):**
1. Prueba la síntesis siguiente (`view` correlativo). Si la página no tiene síntesis, todavía no se jugó/publicó: no hace nada.
2. Parsea (formaciones, goles, cambios, tarjetas, árbitro, esquema), **valida** y recién ahí guarda. Validaciones: marcador = goles listados por equipo, 11 titulares, cambios coherentes (entran = salen), nombres reconocidos (tolera tipeos con distancia de edición con transposiciones: «Khim» → «Kihm»).
3. **Si algo no cierra, no guarda nada y falla** (el workflow abre un issue). Un error de FerroWeb se corrige en `datos-fuente/correcciones.json` (clave = número de síntesis, con `motivo`). Hoy hay: F6 (encabezado 0-0, hubo 0-2) y goles de rival que faltan en 2025 F17/F19.
4. Recalcula: partidos, participaciones, estadísticas del plantel, rendimiento por situación, franjas, **y con 2025/2024**: laboratorio, árbitros, «la última vez que…», histórico, escenarios. Tabla desde FútbolTotal **solo si coincide con los partidos cargados** (si va atrasada, deja la anterior).
5. Aplica árbitro y horario de la planilla de la redacción; deja los pedidos para la IA en `datos-fuente/pedidos-ia.json`; completa solo el historial del pronóstico FW (acertó/no acertó).
6. Marca `datos-fuente/estado.json` (`pendiente_editorial`).

**Mapa de temporadas anteriores:** 2025: `view = 724 + fecha` (F1=725…F34=758). 2024: `view = 686 + fecha` (desde la F15). Verificado: 2025 reproduce exacto 41 pts, 10G 11E 13P, 24 a 33.
**Convenciones de datos:** el apellido del jugador (`"Kabalín"`) es la clave en todo el sitio; `n` = orden de juego, `fecha` = fecha del torneo (la F4 se jugó entre la 18 y la 19); minutos pueden pasar de 90 por cambios en tiempo agregado (el que entra suma ≥1); franjas: los goles del primer tiempo con minuto > 45 van a «31-45+».
**Al cambiar la forma de un JSON** actualizá: quien lo escribe (`scripts/`), quien lo lee (`src/features`), el validador (`scripts/lib/editorial.mjs`), las pruebas y el fixture `scripts/test/fixtures/editorial-f33.json`.

**Parte editorial (la hace una persona o Claude, no el script):** hallazgos y novedades, calendario/horarios, pronóstico FW (`fw`, `pronostico`, `fw_historial`), `claves`, pizarra, chicanas, previa en números, cruce de planteles, crónicas. Instrucciones completas en **`datos-fuente/EDITORIAL.md`**. Cierra con `node scripts/validar-editorial.mjs`.

**Planilla de la redacción (Google Sheets):** la redacción (no técnica) carga Novedad / Árbitro / Horario / Pedido para la IA. Config en `public/data/redaccion-config.json` (`csv` publicado, `planilla`). Guía para ellos: `LEEME-REDACCION.md`. **Nunca un formulario público**: las novedades se publican sin revisión.

## 6. Cómo agregar cosas (recetas)

| Quiero… | Hacer |
|---|---|
| Una **página** nueva en un grupo | Bloque `data-tab` en `src/pages/<grupo>.html` + (si dibuja algo) `onShow`/`init` en su feature + destino en `search.js` + ruta vieja en `router.js` si reemplaza otra |
| Un **grupo** nuevo del menú | `src/pages/<grupo>.html` + entrada en `GRUPOS` y módulo en `FEATURES` (`src/pages/index.js`) + destinos en `search.js` |
| Un **dato** nuevo | JSON en `public/data/`, agregarlo a `ARCHIVOS` en `src/main.js`, quien lo calcule en `scripts/`, prueba, y si es editorial, regla en `validarEditorial` |
| Un **cálculo** nuevo | Función pura en `scripts/lib/calculos.mjs`, prueba en `scripts/test/calculos.test.mjs`, verificación contra datos revisados en `verificar-editorial.mjs` |
| **Menos información** en una página | `limitar(lista, n)`, `limitarTabla(tabla, n)`, `columnasExtra(tabla)` (`lib/dom.js`); o partir la página en dos |
| Corregir un **error de FerroWeb** | Entrada en `datos-fuente/correcciones.json` con `motivo`; `node scripts/actualizar.mjs --reconstruir` si afecta partidos viejos |
| Un club con **nombre distinto** | `datos-fuente/alias-equipos.json` |

Antes de dar algo por terminado: `npm test`, `npm run build`, y mirarlo **en un navegador** (ver §7).

## 7. Comandos y verificación

```
npm install · npm run dev · npm run build · npm run preview
npm test                                   # 32 pruebas: parser (síntesis reales), cálculos, validador, planilla
node scripts/actualizar.mjs [--seco]       # lo que hace la tarea (--seco: no escribe)
node scripts/actualizar.mjs --reconstruir  # relee TODAS las síntesis y rehace los datos
node scripts/actualizar.mjs --temporadas   # relee 2025 y 2024
node scripts/verificar.mjs                 # reconstruye partidos desde FerroWeb y los compara con lo cargado
node scripts/verificar-editorial.mjs       # idem para laboratorio, árbitros, histórico y escenarios (estado a la fecha 32)
node scripts/validar-editorial.mjs         # qué falta para la previa de la próxima fecha
```

**Verificación visual (se usó siempre):** Chrome en modo headless (`puppeteer-core` instalado fuera del repo) contra `vite preview`. Se comprobó: cero errores de consola, que todas las rutas carguen (incluidas las viejas), ancho a 390 px sin desborde (`scrollWidth`), tema claro y oscuro, menú oculto/mostrado, y capturas de lo cambiado. No hay pruebas automáticas del front en el repo: si agregás alguna, mantenela liviana.

## 8. Errores ya cometidos (no repetir)

- **Meter datos en el HTML/JS** y reescribir `index.html` desde la tarea diaria. Rompía el sitio y mezclaba diffs de datos y código.
- **Una sola página infinita.** Cualquier cosa nueva va a su lugar del menú, no al final de otra página.
- **Duplicar un gráfico en dos lugares** con definiciones distintas (pasó con las franjas de goles).
- **Confiar en la carga manual como verdad.** Al recalcular aparecieron errores reales: una cábala invertida («ninguna amarilla en el primer tiempo» contaba los partidos *con* amarilla), el gol de García de F27 en el tiempo equivocado, un 0-0 que fue 0-2. Por eso todo cálculo se valida contra lo cargado y las diferencias se **explican** antes de aceptarlas.
- **Dejar un nombre de variable viejo tras una migración** (`window.__prode` siguió en la placa de WhatsApp y falló en silencio). Buscá con `grep` los restos al refactorizar.
- **Mostrar el pronóstico de la fecha anterior bajo el rival nuevo.** Por eso existen `previaAlDia`/`escenariosAlDia`.
- **Compilar con un servidor `vite preview` abierto** puede hacer fallar el build de forma intermitente: cerrá el servidor antes.
- En Windows, las heredocs largas de Git Bash con comillas fallan: para archivos grandes usá la herramienta de escritura de archivos, no `cat <<EOF`.

## 9. Estado y pendientes (al momento de escribir esto)

- `versionEti` se mergeó a `main` (local). Falta: `git push origin main`.
- **Pages:** Settings → Pages → Source = **GitHub Actions**; Settings → Actions → «Read and write permissions».
- **Apagar la tarea vieja** que reescribía `index.html`; la nueva tarea editorial se programa con el texto al final de `datos-fuente/EDITORIAL.md`.
- **Planilla de la redacción:** crearla y completar `public/data/redaccion-config.json` (ver `LEEME-REDACCION.md`).
- **Previa de la fecha 34** (Racing de Córdoba): los números están al día, falta lo editorial (el validador lista los 5 pendientes).
- **Sin automatizar todavía:** calendario y horarios (salvo lo que cargue la planilla), modelo del pronóstico FW y su simulación del primer puesto, claves, pizarra, chicanas, crónicas, cruce de planteles.
- **Ideas sin hacer:** página de ficha de partido (cada resultado con goles, cambios, árbitro y crónica), modo programa (pantalla limpia con números grandes), calendario `.ics`, glosario, que el Inicio muestre menos (hoy ~1900 px), partir Pizarra de Sara.
- Diferencias menores conocidas contra la carga manual: una roja de Loustau y ±0,02 en el promedio de amarillas por árbitro (tarjetas ilegibles en síntesis de 2025).
