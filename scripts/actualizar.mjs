// Actualización automática de los NÚMEROS del sitio (partidos, jugadores, rendimiento, franjas y tabla).
//
//   node scripts/actualizar.mjs                 busca partidos nuevos en FerroWeb y actualiza public/data/*.json
//   node scripts/actualizar.mjs --seco          hace todo pero no escribe archivos
//   node scripts/actualizar.mjs --reconstruir   vuelve a leer TODAS las síntesis y rehace los datos (aplica correcciones)
//   node scripts/actualizar.mjs --temporadas    vuelve a leer 2025 y 2024 (normalmente se leen una sola vez)
//
// También recalcula, con 2025 y 2024 leídos de FerroWeb: laboratorio, árbitros, «la última vez que…», histórico y escenarios.
// Qué NO toca (es trabajo editorial o de modelos): hallazgos y novedades, calendario, pronóstico FW, claves, árbitro
// designado, cruce de planteles y crónicas. Ver README.
//
// Reglas de seguridad: si un partido nuevo no se puede leer o sus números no cierran (marcador contra goles listados,
// 11 titulares, cambios coherentes), NO se guarda nada y el script falla con un mensaje claro. Los errores de FerroWeb
// conocidos se corrigen en datos-fuente/correcciones.json.
import { readFileSync, writeFileSync, existsSync, appendFileSync } from "node:fs";
import { bajarSintesis, parseSintesis, corregir, FERRO } from "./lib/ferroweb.mjs";
import { procesarPartido, acumularPuntos, estadisticasJugadores, rendimiento, franjas } from "./lib/derive.mjs";
import { bajarTabla, URL_TABLA } from "./lib/futboltotal.mjs";
import { mismoEquipo, equipoCanonico, ahoraArgentina } from "./lib/texto.mjs";
import { bajarTemporada } from "./lib/temporadas.mjs";
import * as C from "./lib/calculos.mjs";
import { resolverFwHistorial } from "./lib/editorial.mjs";
import { bajarPlanilla, aplicarArbitroYHorario, pedidosPendientes } from "./lib/redaccion.mjs";

const args = new Set(process.argv.slice(2));
const SECO = args.has("--seco"), RECONSTRUIR = args.has("--reconstruir"), RELEER_TEMPORADAS = args.has("--temporadas");
const ruta = (r) => new URL(`../${r}`, import.meta.url);
const leer = (r, def) => existsSync(ruta(r)) ? JSON.parse(readFileSync(ruta(r), "utf8")) : def;
const serializar = (o) => JSON.stringify(o);

const avisos = [], errores = [], cambios = [];
const aviso = (m) => { avisos.push(m); console.log(`⚠️  ${m}`); };
const viewDe = (p) => +p.sintesis.match(/view=(\d+)/)[1];

const dp = leer("public/data/partidos.json"), dj = leer("public/data/jugadores.json"), de = leer("public/data/equipo.json");
const dt = leer("public/data/tabla.json"), dprox = leer("public/data/proximo.json");
const CORR = leer("datos-fuente/correcciones.json", {}), AJUSTES = leer("datos-fuente/ajustes-jugadores.json", {});
let DETALLE = RECONSTRUIR ? {} : leer("datos-fuente/detalle.json", {});   // por fecha: goles, ingresos y tarjetas de Ferro

let partidos = RECONSTRUIR ? [] : dp.partidos.slice(), participaciones = RECONSTRUIR ? [] : dp.participaciones.slice();
const conocidos = dj.jugadores.map(j => j.jugador);
const nuevos = [];

async function incorporar({ view, fecha, rival, n, nota = "" }) {
  const html = await bajarSintesis(view);
  const s0 = parseSintesis(html);
  if (!s0) return null;                                   // todavía no hay síntesis publicada
  const s = corregir(s0, CORR[view]);
  const r = procesarPartido(s, { fecha, rival, n, view, conocidos });
  r.avisos.forEach(a => aviso(`F${fecha} (síntesis ${view}): ${a}`));
  if (r.errores.length) {
    r.errores.forEach(e => { errores.push(`F${fecha} (síntesis ${view}): ${e}`); console.log(`❌ F${fecha} (síntesis ${view}): ${e}`); });
    if (!CORR[view]) console.log(`   Si el error es de FerroWeb, se corrige en datos-fuente/correcciones.json (clave "${view}").`);
    throw new Error("partido con errores");
  }
  partidos.push({ ...r.partido, nota }); participaciones.push(...r.participaciones); DETALLE[fecha] = { goles: r.goles, entradas: r.entradas, tarjetas: r.tarjetas };
  return r;
}

async function main() {
  // 1) reconstrucción total (opcional)
  if (RECONSTRUIR) {
    for (const p of dp.partidos.slice().sort((a, b) => a.n - b.n)) {
      try { await incorporar({ view: viewDe(p), fecha: p.fecha, rival: p.rival, n: p.n, nota: p.nota }); console.log(`✔ reconstruido F${p.fecha} ${p.rival}`); }
      catch (e) { if (e.message !== "partido con errores") throw e; }
    }
    if (errores.length) return;
  }

  // 2) partidos nuevos: las síntesis se publican con números correlativos; se prueba la siguiente hasta que no haya
  const ultimaVista = Math.max(...partidos.map(viewDe));
  const rivales = [...new Set([...partidos.map(p => p.rival), ...(dprox.calendario?.proximos ?? []).map(x => x.rival)])];
  for (let view = ultimaVista + 1; view <= ultimaVista + 6; view++) {
    const html = await bajarSintesis(view);
    const s = parseSintesis(html);
    if (!s) { console.log(`· la síntesis ${view} todavía no está publicada`); break; }
    const ferroLocal = mismoEquipo(s.local, FERRO);
    if (!ferroLocal && !mismoEquipo(s.visitante, FERRO)) { aviso(`La página ${view} no es un partido de Ferro (${s.local} - ${s.visitante}); se ignora`); break; }
    const oponente = ferroLocal ? s.visitante : s.local;
    const rival = equipoCanonico(oponente, rivales) ?? (aviso(`Rival nuevo «${oponente}»: no coincide con ninguno cargado`), oponente);
    const cal = (dprox.calendario?.proximos ?? []).find(x => !partidos.some(p => p.fecha === x.fecha) && mismoEquipo(x.rival, oponente));
    const fecha = cal?.fecha ?? (aviso(`No encontré «${oponente}» en el calendario; asumo la fecha ${Math.max(...partidos.map(p => p.fecha)) + 1}`), Math.max(...partidos.map(p => p.fecha)) + 1);
    if (partidos.some(p => p.fecha === fecha)) { aviso(`La fecha ${fecha} ya estaba cargada; se ignora la síntesis ${view}`); continue; }
    const n = Math.max(...partidos.map(p => p.n)) + 1;
    try {
      const r = await incorporar({ view, fecha, rival, n });
      nuevos.push(r.partido); console.log(`✔ partido nuevo: F${fecha} ${r.partido.condicion === "Local" ? `Ferro ${r.partido.gf}-${r.partido.gc} ${rival}` : `${rival} ${r.partido.gc}-${r.partido.gf} Ferro`}`);
    } catch (e) { if (e.message !== "partido con errores") throw e; return; }
  }

  // 3) goles por minuto de los partidos que todavía no estén en el cache (primera ejecución)
  for (const p of partidos) {
    if (DETALLE[p.fecha] && DETALLE[p.fecha].tarjetas) continue;
    const s = parseSintesis(await bajarSintesis(viewDe(p)));
    const r = s && procesarPartido(corregir(s, CORR[viewDe(p)]), { fecha: p.fecha, rival: p.rival, n: p.n, view: viewDe(p), conocidos });
    if (!r) { aviso(`No pude leer los goles de F${p.fecha}`); continue; }
    DETALLE[p.fecha] = { goles: r.goles, entradas: r.entradas, tarjetas: r.tarjetas }; if (r.errores.length) aviso(`F${p.fecha}: ${r.errores.join("; ")}`);
  }
}

try { await main(); } catch (e) { errores.push(e.stack || String(e)); console.error(e); }
if (errores.length) { resumen(); process.exit(1); }

// ---------- cálculo ----------
const P = acumularPuntos(partidos);
const ultimaFecha = Math.max(...P.map(p => p.fecha));
let J = estadisticasJugadores(P, participaciones, dj.jugadores);
for (const [nombre, aj] of Object.entries(AJUSTES)) {
  const j = J.find(x => x.jugador === nombre); if (!j) continue;
  for (const [campo, v] of Object.entries(aj)) if (campo !== "motivo") j[campo] += v;
}
const GOLES = Object.fromEntries(Object.entries(DETALLE).map(([f, d]) => [f, d.goles]));
const equipoNuevo = { ...de, rendimiento: rendimiento(P, GOLES), franjas: franjas(P, GOLES) };

// ---------- tabla de posiciones (FútbolTotal) ----------
let tabla = dt.tabla, fuente = dt.tabla_fuente;
try {
  const ft = await bajarTabla();
  const f = ft.find(x => mismoEquipo(x.equipo, FERRO));
  const mios = P.reduce((a, p) => ({ pj: a.pj + 1, g: a.g + (p.resultado === "G"), e: a.e + (p.resultado === "E"), p: a.p + (p.resultado === "P"), gf: a.gf + p.gf, gc: a.gc + p.gc }), { pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0 });
  const coincide = f && ["pj", "g", "e", "p", "gf", "gc"].every(k => f[k] === mios[k]) && f.pts === mios.g * 3 + mios.e;
  if (!coincide) aviso(`FútbolTotal todavía no refleja la fecha ${ultimaFecha} de Ferro (muestra PJ ${f?.pj}, ${f?.pts} pts; los partidos cargados dan PJ ${mios.pj}, ${mios.g * 3 + mios.e} pts). Se deja la tabla anterior.`);
  else {
    const nombres = [...new Set([...P.map(p => p.rival), ...dt.tabla.map(x => x.equipo)])]; // primero los nombres de los partidos (los del sitio)
    tabla = ft.sort((a, b) => a.pos - b.pos).map(x => ({ e: x.e, equipo: equipoCanonico(x.equipo, nombres) ?? x.equipo, g: x.g, gc: x.gc, gf: x.gf, p: x.p, pj: x.pj, pos: x.pos, pts: x.pts, dg: x.dg }));
    fuente = { fuente: "FútbolTotal", url: URL_TABLA, actualizada: `tras la fecha ${ultimaFecha}` };
  }
} catch (e) { aviso(`No se pudo actualizar la tabla: ${e.message}`); }


// ---------- cálculos que cruzan temporadas (laboratorio, árbitros, última vez, histórico, escenarios) ----------
let T = leer("datos-fuente/temporadas.json", null);
if (RELEER_TEMPORADAS || !T || !T[2025]?.[0]?.tarjetas) {
  console.log("Leyendo 2025 y 2024 desde FerroWeb (se hace una sola vez)…");
  const hist = dj ? dj.jugadores.map(j => j.jugador) : [];
  const conocidosJ = [...new Set([...hist, ...(de.historico?.jugadores ?? []).map(j => j.jugador)])];
  const lab0 = leer("public/data/lab.json").lab;
  const rivalesK = [...new Set([...partidos.map(p => p.rival), ...(de.historico?.h2h ?? []).map(h => h.rival), ...lab0.rivales.favoritos.map(x => x.rival), ...lab0.rivales.bestias.map(x => x.rival), ...(lab0.tal_fecha?.lista ?? []).map(x => x.rival), ...(dprox.calendario?.proximos ?? []).map(x => x.rival)])];
  T = {};
  for (const a of [2025, 2024]) T[a] = await bajarTemporada(a, { conocidos: conocidosJ, rivales: rivalesK, correcciones: CORR, alias: leer("datos-fuente/alias-equipos.json", {}), aviso });
}
const P26 = C.unificar2026(P, participaciones, DETALLE), P25 = C.unificarAnterior(T[2025]), P24 = C.unificarAnterior(T[2024]);
const arbitrosConocidos = [...new Set(P26.map(p => p.arbitro))];
for (const p of [...P25, ...P24]) { p.arbitro = C.canonicoArbitro(p.arbitro, arbitrosConocidos); if (!arbitrosConocidos.includes(p.arbitro)) arbitrosConocidos.push(p.arbitro); }

// Lo que carga la redacción en la planilla de Google: árbitro y horario de cada fecha se aplican solos; los pedidos para la IA se dejan listos.
const cfgRed = leer("public/data/redaccion-config.json", {});
let filasPlanilla = [];
if (cfgRed.csv) { try { filasPlanilla = await bajarPlanilla(cfgRed.csv); } catch (e) { aviso(`No se pudo leer la planilla de la redacción: ${e.message}`); } }
const aplicado = aplicarArbitroYHorario(dprox.calendario, filasPlanilla, { ultimaFecha, arbitrosConocidos, designadoActual: dprox.arbitros?.designado_nombre });
aplicado.avisos.forEach(aviso);
const dproxB = { ...dprox, calendario: aplicado.calendario, arbitros: { ...dprox.arbitros, designado_nombre: aplicado.designado_nombre } };
const labViejo = leer("public/data/lab.json").lab, hallViejo = leer("public/data/hallazgos.json");
const proxPendiente = (dproxB.calendario?.proximos ?? []).find(x => x.fecha > ultimaFecha);
const arb = C.arbitros([...P25, ...P26], dproxB.arbitros?.designado_nombre);
const minutos = C.labMinutos(P26, P25), duplas = C.labDuplas(P26), rivalesLab = C.labRivales([...P24, ...P25, ...P26], [2024, 2025, 2026]);
const labNuevo = {
  ...labViejo,
  minutos: { 2026: minutos[2026], 2025: minutos[2025] }, estados: C.labEstados(P26), forma: C.labForma(P26),
  forma_rival: C.labFormaRival(proxPendiente) ?? labViejo.forma_rival, duplas, banco: C.labBanco(P26),
  tal_fecha: C.labTalFecha(proxPendiente ? proxPendiente.fecha : ultimaFecha + 1, [P25, P24]), cabalas: C.labCabalas(P26), rivales: rivalesLab,
};
const tablaAlDia = fuente.actualizada === `tras la fecha ${ultimaFecha}`;
const proxNuevo = {
  ...dproxB,
  arbitros: { ...dproxB.arbitros, ...arb },
  fw_historial: resolverFwHistorial(dproxB.fw_historial, P, participaciones),   // anota solo si el pronóstico FW acertó
  // Los escenarios parten de los puntos de la tabla: si FútbolTotal todavía no la actualizó, se deja lo anterior (el sitio lo detecta por tras_fecha).
  escenarios: tablaAlDia ? { ...C.escenarios(tabla, dproxB.calendario, ultimaFecha, FERRO), tras_fecha: ultimaFecha } : dproxB.escenarios,
};
const hallNuevo = { ...hallViejo, ultimas: C.ultimas([...P25, ...P26]) };
const historicoNuevo = { ...de.historico, ...C.historico(P26, P25, de.historico) };
equipoNuevo.historico = historicoNuevo;

// ---------- escritura ----------
const salidas = {
  "public/data/partidos.json": { partidos: P, participaciones },
  "public/data/jugadores.json": { jugadores: J },
  "public/data/equipo.json": equipoNuevo,
  "datos-fuente/detalle.json": DETALLE,
  "datos-fuente/temporadas.json": T,
  ...(cfgRed.csv ? { "datos-fuente/pedidos-ia.json": pedidosPendientes(filasPlanilla, leer("datos-fuente/pedidos-atendidos.json", [])) } : {}),
  "public/data/lab.json": { lab: labNuevo },
  "public/data/proximo.json": proxNuevo,
  "public/data/hallazgos.json": hallNuevo,
};
const tablaSinHora = { ultima_fecha: ultimaFecha, tabla, tabla_fuente: fuente };
const hayCambioTabla = serializar({ ultima_fecha: dt.ultima_fecha, tabla: dt.tabla, tabla_fuente: dt.tabla_fuente }) !== serializar(tablaSinHora);
const cambiados = Object.entries(salidas).filter(([r, o]) => serializar(leer(r, null)) !== serializar(o)).map(([r]) => r);
if (hayCambioTabla) cambiados.push("public/data/tabla.json");

if (!cambiados.length) console.log("Sin cambios: los datos ya estaban al día.");
else if (SECO) console.log(`(modo seco) Cambiarían: ${cambiados.join(", ")}`);
else {
  for (const [r, o] of Object.entries(salidas)) if (cambiados.includes(r)) writeFileSync(ruta(r), serializar(o));
  if (hayCambioTabla) writeFileSync(ruta("public/data/tabla.json"), serializar({ actualizado: ahoraArgentina(), ...tablaSinHora }));
  else if (cambiados.some(r => !r.startsWith("datos-fuente/"))) writeFileSync(ruta("public/data/tabla.json"), serializar({ ...dt, actualizado: ahoraArgentina() }));
  writeFileSync(ruta("datos-fuente/estado.json"), JSON.stringify({ ultima_fecha: ultimaFecha, partidos_nuevos: nuevos.map(p => p.fecha), actualizado: ahoraArgentina(), pendiente_editorial: nuevos.length > 0 }, null, 2));
  console.log(`Archivos actualizados: ${cambiados.join(", ")}`);
}
cambios.push(...cambiados);
resumen();

function resumen() {
  const lineas = [`### Actualización de datos`,
    nuevos.length ? `- Partidos nuevos: ${nuevos.map(p => `F${p.fecha} ${p.rival} (${p.gf}-${p.gc})`).join(", ")}` : `- Sin partidos nuevos`,
    cambios.length ? `- Archivos modificados: ${cambios.join(", ")}` : `- Archivos modificados: ninguno`,
    ...avisos.map(a => `- ⚠️ ${a}`), ...errores.map(e => `- ❌ ${e}`)];
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, lineas.join("\n") + "\n");
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `nuevos=${nuevos.map(p => p.fecha).join(",")}\ncambios=${cambios.length}\n`);
}
