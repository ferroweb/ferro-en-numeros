// «Un día como hoy»: arma public/data/efemerides.json, un archivo por día del año (clave "MM-DD").
// Fuentes:
//   · datos-fuente/efemerides-textos/MM.json  historias escritas por la redacción (voz propia) a partir de las
//     efemérides de LaFerropedia; cada una cita el id de la nota original, que tiene que ser del mismo día.
//   · datos-fuente/laferropedia/personas.json fichas de jugadores y DT (nacimiento, fallecimiento, debut, último partido),
//     corregidas con datos-fuente/laferropedia/ajustes-personas.json (cada ajuste con «motivo» y fuentes).
//   · datos-fuente/archivo-ferroweb.json      síntesis de FerroWeb 2006-hoy (resultado y día), con correcciones.json.
// LaFerropedia autorizó a Ferroweb a usar su información; los textos no copian los suyos y enlazan la nota original.
// Uso: node scripts/efemerides.mjs   (no baja nada: trabaja con lo que ya está en datos-fuente/)
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const R = (p) => JSON.parse(readFileSync(new URL("../" + p, import.meta.url), "utf8"));
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const ANIO_HOY = +(process.env.EFEM_ANIO || new Date().getFullYear());
const avisos = [];

// ---------- personas (LaFerropedia) ----------
// Se muestra el nombre completo de la ficha: acortarlo rompe los apellidos compuestos («Mac Allister», «Santa Cruz»,
// «Collado Solari»), y no hay forma segura de saber cuál es el apellido con el que se lo conoce.
export function nombreCorto(n) { return n.replace(/\s+/g, " ").trim(); }
const PUESTOS = { arquero: "Arquero", defensor: "Defensor", mediocampista: "Mediocampista", delantero: "Delantero" };
function puesto(p) {
  if (!p.puesto) return null;
  const [g, f] = p.puesto.split("|").map(s => s.trim());
  if (f && f.length < 30) return f.charAt(0).toUpperCase() + f.slice(1);
  return PUESTOS[(g || "").toLowerCase()] || null;
}
const plural = (n, s, pl) => `${n} ${n === 1 ? s : pl}`;
export function resumenJugador(p, rk) {
  if (!p.pj) return p.dt ? "Fue director técnico de Ferro." : null;
  const pu = puesto(p);
  let x = p.arquero ? `Atajó ${plural(p.pj, "partido", "partidos")} con la verde` : `Jugó ${plural(p.pj, "partido", "partidos")} con la verde${p.goles ? ` e hizo ${plural(p.goles, "gol", "goles")}` : ""}`;
  x = (pu && !p.arquero ? pu + ". " : "") + x + ".";
  const comp = (lista, v) => lista.filter(q => q === v).length > 1 ? " (compartido)" : "";
  if (rk.pj[p.url] && rk.pj[p.url] <= 20) x += ` Es el ${rk.pj[p.url]}°${comp(rk.pjs, p.pj)} con más partidos en la historia del club.`;
  else if (rk.gol[p.url] && rk.gol[p.url] <= 20) x += ` Es el ${rk.gol[p.url]}°${comp(rk.gols, p.goles)} goleador histórico del club.`;
  if (p.dt) x += " También fue DT de Ferro.";
  return x;
}
// «Ferro 1-San Lorenzo 3» → G/E/P desde el lado de Ferro (null si no se entiende)
export function resultadoDe(partido) {
  const m = (partido || "").match(/^(.*?)\s*(\d+)\s*-\s*(.*?)\s*(\d+)\s*$/);
  if (!m) return null;
  const [, a, ga, b, gb] = m; const fa = /^Ferro\b/.test(a), fb = /^Ferro\b/.test(b);
  if (fa === fb) return null;
  const f = fa ? +ga : +gb, r = fa ? +gb : +ga;
  return f > r ? "G" : f < r ? "P" : "E";
}

// ---------- partidos (FerroWeb) ----------
export function leerTitulo(t) {
  // «Ferro Carril Oeste 3 (4) - 3 (1) Los Andes» · «Güemes 1 - 3 Ferro Carril Oeste» · «Huracán 3 - Ferro Carril Oeste 2»
  const s = (t || "").replace(/\s+-\s+Definici[oó]n por penales\s*$/i, "").trim();
  const esFerro = (x) => /^Ferro(\s+Carr?il?\s+Oeste)?$/i.test(x.trim());
  const arma = (a, ga, pa, b, gb, pb) => {
    const fa = esFerro(a), fb = esFerro(b);
    if (fa === fb) return null;
    return { local: fa, rival: (fa ? b : a).trim(), gf: +(fa ? ga : gb), gc: +(fa ? gb : ga), pen: pa != null ? { f: +(fa ? pa : pb), r: +(fa ? pb : pa) } : null };
  };
  let m = s.match(/^(.*?)\s+(\d+)(?:\s*\((\d+)\))?\s*-\s*(\d+)(?:\s*\((\d+)\))?\s+(.*)$/);
  if (m) { const r = arma(m[1], m[2], m[3], m[6], m[4], m[5]); if (r) return r; }
  m = s.match(/^(.*?)\s+(\d+)\s*-\s*(.*?)\s+(\d+)$/);          // el resultado pegado a cada nombre
  if (m) return arma(m[1], m[2], undefined, m[3], m[4], undefined);
  return null;
}
function torneoCorto(t) {
  return (t || "").replace(/^Torneo\s+(Torneo\s+)?/i, "").replace(/\s+/g, " ").trim();
}

// Correcciones a las fichas (datos-fuente/laferropedia/ajustes-personas.json, clave = url de la ficha, con «motivo»).
export function ajustar(personas, ajustes) {
  const usados = new Set();
  const r = personas.map(p => { const a = ajustes[p.url]; if (!a) return p; usados.add(p.url); const { motivo, ...resto } = a; return { ...p, ...resto }; });
  for (const u of Object.keys(ajustes)) if (!usados.has(u)) avisos.push(`ajuste sin ficha: ${u}`);
  return r;
}

// ---------- armado ----------
export function armar({ textos, lfp, personas, archivo, correcciones, anioHoy = ANIO_HOY }) {
  const DIAS = {};
  const dia = (k) => (DIAS[k] ||= { historias: [], nacimientos: [], tambien_nacieron: [], fallecimientos: [], debuts: [], despedidas: [], partidos: [] });
  const LFP = new Map(lfp.map(e => [e.id, e]));

  // 1) historias
  for (const [k, lista] of Object.entries(textos)) for (const t of lista) {
    const e = LFP.get(t.id);
    if (!e) { avisos.push(`historia ${k}: la nota ${t.id} no está en LaFerropedia`); continue; }
    if (e.dia !== k) { avisos.push(`historia ${k}: la nota ${t.id} es del ${e.dia}`); continue; }
    const anio = +(e.titulo.match(/^(\d{4})/) || [])[1];
    if (!anio) { avisos.push(`historia ${k}: la nota ${t.id} no dice el año`); continue; }
    const h = { anio, titulo: t.titulo, texto: t.texto, url: e.url };
    // «desarrollo»: párrafos más largos (los escribe la tarea diaria con al menos dos fuentes, citadas en «fuentes»)
    if (Array.isArray(t.desarrollo) && t.desarrollo.length) { h.desarrollo = t.desarrollo; if (Array.isArray(t.fuentes)) h.fuentes = t.fuentes; }
    // camiseta y foto del partido (si la historia es de un partido con fotos: imagen en public/img/efemerides/)
    if (t.camiseta) h.camiseta = t.camiseta;
    if (t.foto) h.foto = t.foto;
    dia(k).historias.push(h);
  }

  // 2) personas
  const conPj = personas.filter(p => p.pj > 0);
  const rk = { pj: {}, gol: {}, pjs: conPj.map(p => p.pj), gols: conPj.filter(p => !p.arquero).map(p => p.goles) };
  [...conPj].sort((a, b) => b.pj - a.pj).forEach((p, i, L) => { rk.pj[p.url] = L.findIndex(q => q.pj === p.pj) + 1; });
  [...conPj].filter(p => !p.arquero && p.goles > 0).sort((a, b) => b.goles - a.goles).forEach((p, i, L) => { rk.gol[p.url] = L.findIndex(q => q.goles === p.goles) + 1; });
  const cuenta = (p) => (p.pj || 0) + (p.dt ? 40 : 0);   // para ordenar: un DT pesa como un jugador con 40 partidos
  for (const p of personas) {
    if (!(p.pj > 0 || p.dt)) continue;                  // solo los que jugaron o dirigieron
    const nom = nombreCorto(p.nombre), res = resumenJugador(p, rk);
    if (p.nacimiento) {
      const [a, m, d] = p.nacimiento.split("-");
      const it = { anio: +a, nombre: nom, texto: res, url: p.url, peso: cuenta(p) };
      // Solo «cumpliría» cuando la ficha registra el fallecimiento. Sin esa fecha no se dice «cumple»: la ficha puede no
      // tenerla cargada (pasa con Sabella), así que el sitio muestra el año de nacimiento y nada más.
      if (p.fallecimiento) { const edad = anioHoy - +a; if (edad < 110) it.cumpliria = edad; }
      dia(`${m}-${d}`).nacimientos.push(it);
    }
    if (p.fallecimiento) {
      const [a, m, d] = p.fallecimiento.split("-");
      dia(`${m}-${d}`).fallecimientos.push({ anio: +a, nombre: nom, texto: res, url: p.url, peso: cuenta(p) });
    }
    if (p.pj >= 50 && p.debut) {
      const [a, m, d] = p.debut.fecha.split("-"); const r = resultadoDe(p.debut.partido);
      let x = `${p.debut.partido ? p.debut.partido + ". " : ""}Fue el primero de sus ${p.pj} partidos con la verde.`;
      if (r === "P" && p.pj >= 100) x = `${p.debut.partido}. Arrancó perdiendo, pero se quedó para ${p.pj} partidos con la verde.`;
      dia(`${m}-${d}`).debuts.push({ anio: +a, nombre: nom, texto: x, url: p.url, peso: p.pj });
    }
    if (p.pj >= 100 && p.ultimo) {
      const [a, m, d] = p.ultimo.fecha.split("-");
      dia(`${m}-${d}`).despedidas.push({ anio: +a, nombre: nom, texto: `${p.ultimo.partido ? p.ultimo.partido + ". " : ""}Cerró una historia de ${p.pj} partidos con la verde.`, url: p.url, peso: p.pj });
    }
    if (p.dt && !p.pj && p.debut && p.ultimo && p.debut.fecha !== p.ultimo.fecha) {
      const [a, m, d] = p.debut.fecha.split("-");
      dia(`${m}-${d}`).debuts.push({ anio: +a, nombre: nom, texto: `Su primer partido como DT de Ferro: ${p.debut.partido}.`, url: p.url, peso: 40, dt: true });
    }
  }

  // 3) partidos de FerroWeb
  for (const pg of archivo) {
    if (!pg.sintesis || !pg.dia) continue;
    const t = leerTitulo(pg.titulo);
    if (!t) { avisos.push(`síntesis ${pg.view}: no entiendo «${pg.titulo}»`); continue; }
    const c = correcciones[pg.view];
    if (c && c.gl != null && c.gv != null) { t.gf = t.local ? c.gl : c.gv; t.gc = t.local ? c.gv : c.gl; }
    const res = t.gf > t.gc ? "G" : t.gf < t.gc ? "P" : t.pen ? (t.pen.f > t.pen.r ? "G" : "P") : "E";
    const [a, m, d] = pg.dia.split("-");
    dia(`${m}-${d}`).partidos.push({ anio: +a, rival: t.rival, local: t.local, gf: t.gf, gc: t.gc, pen: t.pen, res: t.pen ? "E" : res,
      torneo: torneoCorto(pg.torneo), fecha: pg.fecha_torneo || null, view: pg.view });
  }

  // 3b) si la historia es de un partido que tiene crónica en FerroWeb (mismo día y año), la fuente principal es la crónica
  for (const D of Object.values(DIAS)) for (const h of D.historias) {
    const p = D.partidos.find(x => x.anio === h.anio);
    if (p) h.cronica = `https://www.ferroweb.com.ar/v1/?mod=futbol&sub=cronica&view=${p.view}`;
  }

  // 4) orden, recortes y balance
  for (const [k, D] of Object.entries(DIAS)) {
    D.historias.sort((a, b) => a.anio - b.anio);
    const porPeso = (a, b) => b.peso - a.peso || a.anio - b.anio;
    D.nacimientos.sort(porPeso);
    D.tambien_nacieron = D.nacimientos.slice(3).map(n => ({ nombre: n.nombre, anio: n.anio, url: n.url }));
    D.nacimientos = D.nacimientos.slice(0, 3);
    for (const L of ["fallecimientos", "debuts", "despedidas"]) D[L] = D[L].sort(porPeso).slice(0, 3);
    for (const L of ["nacimientos", "fallecimientos", "debuts", "despedidas"]) D[L].forEach(x => delete x.peso);
    D.partidos.sort((a, b) => b.anio - a.anio);
    if (D.partidos.length) {
      const b = { pj: D.partidos.length, g: 0, e: 0, p: 0, gf: 0, gc: 0, desde: Math.min(...D.partidos.map(p => p.anio)) };
      for (const p of D.partidos) { b[p.res === "G" ? "g" : p.res === "P" ? "p" : "e"]++; b.gf += p.gf; b.gc += p.gc; }
      D.balance = b;
    }
    for (const L of Object.keys(D)) if (Array.isArray(D[L]) && !D[L].length) delete D[L];
  }
  return Object.fromEntries(Object.keys(DIAS).sort().map(k => [k, DIAS[k]]));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const textos = {};
  for (const f of readdirSync(new URL("../datos-fuente/efemerides-textos/", import.meta.url)).filter(f => /^\d\d\.json$/.test(f)).sort())
    Object.assign(textos, R("datos-fuente/efemerides-textos/" + f));
  const dias = armar({
    textos,
    lfp: R("datos-fuente/laferropedia/efemerides.json").efemerides,
    personas: ajustar(R("datos-fuente/laferropedia/personas.json").personas, R("datos-fuente/laferropedia/ajustes-personas.json")),
    archivo: R("datos-fuente/archivo-ferroweb.json").paginas,
    correcciones: R("datos-fuente/correcciones.json"),
  });
  const n = Object.keys(dias).length;
  const sinNada = [];
  for (let m = 1; m <= 12; m++) for (let d = 1; d <= new Date(2024, m, 0).getDate(); d++) { const k = `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; if (!dias[k]) sinNada.push(k); }
  writeFileSync(new URL("../public/data/efemerides.json", import.meta.url), JSON.stringify({
    generado: new Date().toISOString().slice(0, 10),
    anio_base: ANIO_HOY,
    fuentes: { historias: "LaFerropedia (laferropedia.com), con textos de la redacción de Ferroweb", personas: "Fichas de LaFerropedia", partidos: "Síntesis de FerroWeb desde 2006" },
    dias,
  }));
  console.log(`Listo: ${n} días con algo; sin nada: ${sinNada.join(", ") || "ninguno"}.`);
  if (avisos.length) { console.log("Avisos:"); avisos.forEach(a => console.log("  · " + a)); }
}
