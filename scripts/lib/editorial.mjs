// Parte editorial: lo que escribe la tarea con Claude (pronóstico, claves, pizarra, chicanas, hallazgos…).
// Acá vive (1) lo mecánico de esa parte, que se resuelve solo, y (2) el validador que dice si la previa de la próxima fecha está completa.
import { mismoEquipo, resolver } from "./texto.mjs";

const signo = (a, b) => Math.sign(a - b);

// El historial del pronóstico FW se completa solo cuando se juega el partido: qué dijimos, qué pasó y si acertamos.
export function resolverFwHistorial(historial, partidos, participaciones) {
  return (historial ?? []).map(h => {
    if (h.real) return h;
    const p = partidos.find(x => x.fecha === h.fecha);
    if (!p) return h;                                         // todavía no se jugó
    const goleadores = new Set(participaciones.filter(r => r.fecha === h.fecha && r.goles > 0).map(r => r.jugador));
    return { ...h, real: { gf: p.gf, gc: p.gc }, signo_ok: signo(h.gf, h.gc) === signo(p.gf, p.gc), exacto_ok: h.gf === p.gf && h.gc === p.gc, goleador_ok: !!h.goleador && goleadores.has(h.goleador) };
  });
}

// Huella de la tabla: partidos jugados y puntos de cada equipo. La parte editorial guarda la que revisó en
// hallazgos.tabla_revisada; si la tabla cambia (jugó un perseguidor, el próximo rival o cualquiera), hay que
// escribir la novedad, revisar la previa y las cuentas, y recién ahí actualizar la huella.
export const huellaTabla = (tabla) => Object.fromEntries((tabla ?? []).map(r => [r.equipo, `${r.pj}-${r.pts}`]));
export function cambiosDeTabla(tabla, revisada) {
  const ahora = huellaTabla(tabla);
  if (!revisada) return Object.keys(ahora);
  return Object.keys(ahora).filter(k => ahora[k] !== revisada[k]);
}

// ---------- validador ----------
const esTexto = (v, min = 1) => typeof v === "string" && v.trim().length >= min;
const esNum = (v) => typeof v === "number" && Number.isFinite(v);
const esPar = (v) => Array.isArray(v) && v.length === 2 && v.every(x => esTexto(x));
const TIPOS = ["record", "jugador", "equipo", "comparacion", "curiosidad", "tabla"];

// d: { ultima_fecha, tabla, jugadores, calendario, fw, pronostico, fw_historial, claves, arbitros, cruce, hallazgos, novedades, lab }
export function validarEditorial(d) {
  const errores = [], avisos = [];
  const err = (m) => errores.push(m), aviso = (m) => avisos.push(m);
  const U = d.ultima_fecha, F = U + 1;
  if (d.tabla) {
    const c = cambiosDeTabla(d.tabla, d.hallazgos?.tabla_revisada);
    if (c.length) err(`tabla: cambió desde la última revisión editorial (${c.slice(0, 6).map(k => { const r = d.tabla.find(x => x.equipo === k); return `${k} ${r.pj} PJ ${r.pts} pts`; }).join(", ")}${c.length > 6 ? "…" : ""}). Escribir la novedad de esos partidos (sobre todo si jugaron los de arriba o el próximo rival), corregir en la previa, las claves, los hallazgos y las cuentas todo dato que haya quedado viejo, y después correr «node scripts/validar-editorial.mjs --tabla-revisada».`);
  }
  if (F > d.calendario.total_fechas) { aviso(`No quedan fechas por jugar (se jugó la ${U} de ${d.calendario.total_fechas}).`); return { errores, avisos }; }
  const prox = d.calendario.proximos.find(p => p.fecha === F);
  if (!prox) { err(`calendario: falta el partido de la fecha ${F}`); return { errores, avisos }; }

  // el partido
  const donde = `calendario F${F}`;
  if (!esTexto(prox.rival)) err(`${donde}: falta el rival`);
  if (!["L", "V"].includes(prox.cond)) err(`${donde}: cond debe ser "L" o "V"`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(prox.dia ?? "")) err(`${donde}: falta el día (AAAA-MM-DD)`);
  if (!esTexto(prox.estadio)) err(`${donde}: falta el estadio`);
  if (!prox.hora) aviso(`${donde}: todavía sin horario`);
  if (!Array.isArray(prox.forma_rival) || prox.forma_rival.length < 3 || !prox.forma_rival.every(s => /^\d+-\d+ vs .+ \((L|V)\)$/.test(s))) err(`${donde}: forma_rival debe tener los últimos 5 del rival con el formato «1-1 vs Racing de Córdoba (L)»`);

  // chicanas
  const h = prox.humor;
  if (!h) err(`${donde}: falta humor (manual de chicanas)`);
  else {
    if (!esTexto(h.titulo) || !esTexto(h.intro) || !esTexto(h.cierre)) err(`${donde}.humor: faltan titulo, intro o cierre`);
    if (!Array.isArray(h.puntos) || h.puntos.length < 3 || !h.puntos.every(esPar)) err(`${donde}.humor.puntos: al menos 3 pares [título, explicación]`);
    if (!Array.isArray(h.frases) || h.frases.length < 3 || !h.frases.every(x => esTexto(x))) err(`${donde}.humor.frases: al menos 3 frases`);
    for (const k of ["cara", "tablero", "reloj", "final"]) if (!esTexto(h.graficos?.[k])) aviso(`${donde}.humor.graficos.${k}: falta el epígrafe del gráfico`);
  }

  // pizarra
  const z = prox.pizarra;
  if (!z) err(`${donde}: falta pizarra`);
  else {
    const once = (z.once ?? []).flat();
    if (once.length !== 11) err(`${donde}.pizarra.once: tiene ${once.length} jugadores (deben ser 11)`);
    const nombres = d.jugadores.map(j => j.jugador);
    once.filter(n => !resolver(n, nombres)).forEach(n => aviso(`${donde}.pizarra.once: «${n}» no está en el plantel`));
    if (!esTexto(z.sistema)) err(`${donde}.pizarra: falta el sistema`);
    for (const [k, min] of [["instrucciones", 4], ["debilidades", 2], ["cuidado", 2], ["perfil", 3]]) if (!Array.isArray(z[k]) || z[k].length < min || !z[k].every(esPar)) err(`${donde}.pizarra.${k}: al menos ${min} pares [título, explicación]`);
    if (!esTexto(z.intro) || !esTexto(z.cierre) || !esTexto(z.once_nota)) err(`${donde}.pizarra: faltan intro, cierre u once_nota`);
    if (!esTexto(z.frase?.texto) || !esTexto(z.frase?.autor)) aviso(`${donde}.pizarra.frase: falta la frase histórica`);
  }
  if (!prox.ateneaid) aviso(`${donde}: sin «previa en números» (ateneaid)`);
  else if (!Array.isArray(prox.ateneaid.metricas) || !prox.ateneaid.metricas.every(m => Array.isArray(m) && m.length === 6)) err(`${donde}.ateneaid.metricas: cada métrica es [nombre, unidad, rival, ferro, promedio, mejor_si_sube (1/-1)]`);
  if (!d.cruce || !mismoEquipo(d.cruce.rival ?? "", prox.rival)) aviso(`cruce de planteles: no es de ${prox.rival}`);

  // árbitro
  const A = d.arbitros;
  if (!prox.arbitro) aviso(`${donde}: la AFA todavía no publicó el árbitro`);
  else {
    if (A.designado_nombre !== prox.arbitro) err(`arbitros.designado_nombre («${A.designado_nombre}») no coincide con el árbitro de la fecha ${F} («${prox.arbitro}»)`);
    if (!prox.arbitro_humor) aviso(`${donde}: falta arbitro_humor`);
  }

  // pronóstico FW
  const suma = (...xs) => xs.reduce((a, b) => a + b, 0);
  const fw = d.fw;
  if (!fw || fw.fecha !== F) err(`fw: debe ser el pronóstico de la fecha ${F} (hoy es ${fw ? "la " + fw.fecha : "inexistente"})`);
  else {
    if (!mismoEquipo(fw.rival, prox.rival) || fw.cond !== prox.cond) err(`fw: rival o condición no coinciden con el calendario`);
    if (![fw.ganar, fw.empatar, fw.perder].every(esNum) || Math.abs(suma(fw.ganar, fw.empatar, fw.perder) - 100) > 1) err(`fw: ganar + empatar + perder debe dar 100 (da ${suma(fw.ganar, fw.empatar, fw.perder)})`);
    if (![fw.gf, fw.gc, fw.p_marcador, fw.p_salida, fw.xg_ferro, fw.xg_rival].every(esNum)) err(`fw: faltan gf, gc, p_marcador, p_salida, xg_ferro o xg_rival`);
    if (!Array.isArray(fw.goleadores) || !fw.goleadores.length || !fw.goleadores.every(x => esTexto(x.jugador) && esNum(x.p))) err(`fw.goleadores: lista de { jugador, p, goles }`);
    if (!Array.isArray(fw.autores) || fw.autores.length !== fw.gf) aviso(`fw.autores: debería tener un goleador por cada gol de Ferro (${fw.gf})`);
    for (const k of ["temporada", "condicion", "forma_ferro", "forma_rival"]) if (!Array.isArray(fw.factores?.[k]) || fw.factores[k].length !== 2 || !fw.factores[k].every(esNum)) err(`fw.factores.${k}: [goles a favor, goles en contra]`);
  }
  const pr = d.pronostico;
  if (!pr || pr.fecha !== F) err(`pronostico: debe ser el de la fecha ${F}`);
  else {
    if (Math.abs(suma(pr.ganar, pr.empatar, pr.perder) - 100) > 1) err(`pronostico: ganar + empatar + perder debe dar 100`);
    if (!Array.isArray(pr.escenarios) || pr.escenarios.length !== 3 || !pr.escenarios.every(e => esTexto(e.res) && esNum(e.pts) && esNum(e.necesita) && esNum(e.de) && typeof e.depende === "boolean")) err(`pronostico.escenarios: 3 escenarios { res, pts, necesita, de, depende }`);
    const ch = pr.chances_primero ?? [];
    if (!ch.length || Math.abs(suma(...ch.map(x => x.p)) - 100) > 2 || !ch.some(x => /ferro/i.test(x.equipo))) err(`pronostico.chances_primero: debe sumar 100 e incluir a Ferro`);
    if (!Array.isArray(pr.marcadores) || !pr.marcadores.length || !esNum(pr.marcador_hincha?.gf)) err(`pronostico: faltan marcadores o marcador_hincha`);
  }

  // historial del pronóstico (lo completa el script; acá se comprueba que el pronóstico de esta fecha quedó registrado)
  const hist = d.fw_historial ?? [];
  const mio = hist.find(x => x.fecha === F);
  if (fw && fw.fecha === F && !mio) err(`fw_historial: falta registrar el pronóstico de la fecha ${F} (para poder contar después si acertamos)`);
  else if (mio && fw && (mio.gf !== fw.gf || mio.gc !== fw.gc)) err(`fw_historial: el pronóstico registrado para la fecha ${F} no coincide con fw`);
  hist.filter(x => x.fecha <= U && !x.real).forEach(x => err(`fw_historial: la fecha ${x.fecha} ya se jugó y no tiene resultado (corré node scripts/actualizar.mjs)`));

  // claves
  const cl = d.claves ?? [];
  if (cl.length < 3 || cl.length > 12 || !cl.every(c => esTexto(c.titulo) && esTexto(c.porque, 20) && esTexto(c.dato))) err(`claves: entre 3 y 12 claves con titulo, porque y dato`);
  else if (!cl.some(c => c.porque.toLowerCase().includes(prox.rival.toLowerCase().split(" ")[0]))) aviso(`claves: ninguna menciona al rival (${prox.rival}); ¿son de la fecha anterior?`);

  // hallazgos y novedades
  const hs = d.hallazgos.hallazgos ?? [], ids = new Set();
  const nombres = d.jugadores.map(j => j.jugador);
  for (const x of hs) {
    if (ids.has(x.id)) err(`hallazgos: id repetido «${x.id}»`); ids.add(x.id);
    if (!TIPOS.includes(x.tipo)) err(`hallazgos ${x.id}: tipo «${x.tipo}» inválido (${TIPOS.join(", ")})`);
    if (!esTexto(x.titulo, 10)) err(`hallazgos ${x.id}: falta el título`);
    if (!esTexto(x.detalle)) aviso(`hallazgos ${x.id}: sin detalle`);
    if (!Number.isInteger(x.relevancia) || x.relevancia < 1 || x.relevancia > 10) err(`hallazgos ${x.id}: relevancia entera de 1 a 10`);
    if (x.tipo === "jugador" && x.jugador && !nombres.includes(x.jugador)) aviso(`hallazgos ${x.id}: el jugador «${x.jugador}» no está en el plantel`);
  }
  if (!hs.some(x => x.al_cierre_de === `Fecha ${U}`)) err(`hallazgos: ninguno está al cierre de la Fecha ${U}; hay que refrescarlos con los números nuevos`);
  if (!(d.hallazgos.novedades ?? []).length) aviso("novedades: no hay ninguna");
  if (!d.lab?.cronicas) aviso("lab.cronicas: falta el termómetro de crónicas");
  return { errores, avisos };
}
