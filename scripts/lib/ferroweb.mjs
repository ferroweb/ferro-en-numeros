// Lectura de las síntesis de partido de FerroWeb (http://www.ferroweb.com.ar).
// La página es HTML viejo en ISO-8859-1; cada columna de la tabla es un equipo (la izquierda es la local).
import { norm, resolver } from "./texto.mjs";

export const BASE = "http://www.ferroweb.com.ar/v1/";
export const urlSintesis = (id) => `${BASE}?mod=futbol&sub=sintesis&view=${id}`;
export const FERRO = "Ferro Carril Oeste";

const UA = "ferro-en-numeros (actualizacion automatica, autorizada por FerroWeb)";

export async function bajarSintesis(id, intentos = 3) {
  let ultimo;
  for (let i = 0; i < intentos; i++) {
    try {
      const r = await fetch(urlSintesis(id), { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return new TextDecoder("windows-1252").decode(await r.arrayBuffer());
    } catch (e) { ultimo = e; await new Promise(z => setTimeout(z, 1500 * (i + 1))); }
  }
  throw new Error(`No se pudo bajar la síntesis ${id}: ${ultimo.message}`);
}

const ENTIDADES = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };
const limpiar = (html) => html
  .replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "")
  .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, m => ENTIDADES[m]).replace(/ /g, " ")
  .split("\n").map(l => l.replace(/\s+/g, " ").trim()).join("\n").trim();

// ---------- tiempos y eventos ----------
const MARCA = String.raw`[´'’′\`]?`;
const minutoTotal = (min, mitad) => mitad === "st" ? 45 + min : min;

// «18´pt Kihm, 42´st Obradovich», «16 y 30´st García», «30´st Acosta (penal)», «20´pt Biafore e/c»
export function parseGoles(texto) {
  const out = [];
  for (const item of texto.replace(/,\s*([A-ZÁÉÍÓÚÑ])\./g, " $1.").split(/[,\n]/).map(s => s.trim()).filter(Boolean)) {
    const m = item.match(new RegExp(String.raw`^(\d+(?:\s*y\s*\d+)*)\s*${MARCA}\s*(pt|st)\.?\s+(.+)$`, "i"));
    if (!m) { out.push({ error: item }); continue; }
    const mitad = m[2].toLowerCase();
    let nombre = m[3].trim();
    const penal = /\(?\bpenal\b\)?/i.test(nombre), ec = /\be\/c\b|\(en contra\)/i.test(nombre);
    nombre = nombre.replace(/\(?\bpenal\b\)?/i, "").replace(/\be\/c\b|\(en contra\)/i, "").trim();
    for (const n of m[1].split(/\s*y\s*/)) out.push({ min: +n, mitad, t: minutoTotal(+n, mitad), nombre, penal, ec });
  }
  return out;
}

// Amonestados y expulsados: «43´pt Canto, 27´st Tarán» / «16´st Canto (doble amonestación)»
export function parseTarjetas(texto) {
  return parseGoles(texto).map(g => g.error ? g : { min: g.min, mitad: g.mitad, t: g.t, nombre: g.nombre.replace(/\(.*?\)/g, "").trim() });
}

// Cambios: «0´st Castellani y Benegas x Hoyos y Dening, 28´st García x Gómez». Los que entran y los que salen se
// distinguen mirando el plantel (quién está en cancha y quién en el banco), no la posición en la frase.
export function parseCambios(texto) {
  const t = texto.replace(/,\s*([A-ZÁÉÍÓÚÑ])\./g, " $1.").replace(/\n/g, " ");
  const re = new RegExp(String.raw`(\d+)\s*${MARCA}\s*(pt|st)\b`, "gi");
  const marcas = [...t.matchAll(re)];
  return marcas.map((m, i) => {
    const fin = i + 1 < marcas.length ? marcas[i + 1].index : t.length;
    const cuerpo = t.slice(m.index + m[0].length, fin).replace(/[,\s]+$/, "").trim();
    const nombres = cuerpo.split(/\s+x\s+|\s+y\s+|,/i).map(s => s.trim()).filter(Boolean);
    const mitad = m[2].toLowerCase();
    return { min: +m[1], mitad, t: minutoTotal(+m[1], mitad), nombres };
  });
}

// «Suplentes: 12- Ruiz, Lucas 13- Tarán, Misael» (a veces sin coma o con guiones sueltos)
export function parseSuplentes(texto) {
  return texto.split(/\b\d{1,2}\s*-\s*/).map(s => s.replace(/\s*-\s*$/, "").trim()).filter(Boolean).map(claveJugador);
}

// Clave de jugador: el apellido tal como lo escribe la formación («Monetti, Fernando (c)» → «Monetti»).
export function claveJugador(nombreCompleto) {
  const s = nombreCompleto.replace(/\(c\)/i, "").trim();
  if (s.includes(",")) return s.split(",")[0].trim();
  return s.split(/\s+/)[0];
}

// ---------- la página ----------
export function parseSintesis(html) {
  const cab = html.match(/<h1 class="up right">(.*?)<\/h1>/s);
  const tabla = html.match(/id="tbl_sintesis"[\s\S]*?<\/table>/);
  if (!cab || !tabla) return null;            // la página existe pero todavía no tiene síntesis
  const titulo = limpiar(cab[1]);
  const t = titulo.match(/^(.*?)\s+(\d+)\s*-\s*(\d+)\s+(.*)$/);
  if (!t) throw new Error(`Encabezado de síntesis ilegible: «${titulo}»`);
  const [, local, gl, gv, visitante] = t;

  const celdas = [...tabla[0].matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)].map(m => ({ attrs: m[1], html: m[2] }));
  const formaciones = celdas.filter(c => /cld_sintesis_num/.test(c.html));
  const eventos = celdas.filter(c => /F_B">\s*Suplentes:/.test(c.html));
  if (formaciones.length !== 2 || eventos.length !== 2) throw new Error("La tabla de la síntesis no tiene la estructura esperada (formaciones/eventos)");

  const plantel = formaciones.map(c => {
    const jugadores = []; let dt = "";
    for (const m of c.html.matchAll(/<span class="cld_sintesis_num[^"]*">([^<]*)<\/span>\s*([^<]*)/g)) {
      const num = m[1].trim(), nombre = m[2].replace(/\s+/g, " ").trim();
      if (num === "DT") dt = nombre; else jugadores.push({ num: +num, nombre, clave: claveJugador(nombre), capitan: /\(c\)/i.test(nombre) });
    }
    return { jugadores, dt };
  });

  const parseEventos = (c) => {
    const e = { suplentes: [], goles: [], amonestados: [], expulsados: [], cambios: [] };
    for (const parte of c.html.split('<span class="F_B">').slice(1)) {
      const m = parte.match(/^([^:<]+):<\/span>([\s\S]*)$/); if (!m) continue;
      const etiqueta = m[1].trim().toLowerCase(), valor = limpiar(m[2]);
      if (etiqueta === "suplentes") e.suplentes = parseSuplentes(valor.replace(/\n/g, " "));
      else if (etiqueta === "goles") e.goles = parseGoles(valor);
      else if (etiqueta === "amonestados") e.amonestados = parseTarjetas(valor);
      else if (etiqueta === "expulsados") e.expulsados = parseTarjetas(valor);
      else if (etiqueta === "cambios") e.cambios = parseCambios(valor);
    }
    return e;
  };

  const sistemas = [...tabla[0].matchAll(/<img src="img\/[^"]+"[^>]*alt="([^"]*)"/g)].map(m => m[1].trim());
  const arbitro = (tabla[0].match(/Arbitro:<\/span>\s*([^<]*)/) || [])[1]?.trim() ?? "";
  const cancha = (tabla[0].match(/Cancha:<\/span>\s*([^<]*)/) || [])[1]?.trim() ?? "";

  return {
    local, visitante, gl: +gl, gv: +gv,
    plantel: { local: plantel[0], visitante: plantel[1] },
    sistema: { local: sistemas[0] ?? "", visitante: sistemas[1] ?? "" },
    eventos: { local: parseEventos(eventos[0]), visitante: parseEventos(eventos[1]) },
    arbitro, cancha,
  };
}

// Correcciones manuales de errores de FerroWeb (datos-fuente/correcciones.json), por número de síntesis.
// Se usan cuando la página trae un dato evidentemente mal (por ejemplo, un marcador que no coincide con los goles listados).
export function corregir(s, correccion) {
  if (!correccion) return s;
  const c = { ...s };
  if (correccion.gl != null) c.gl = correccion.gl;
  if (correccion.gv != null) c.gv = correccion.gv;
  if (correccion.arbitro) c.arbitro = correccion.arbitro;
  if (correccion.golesRival) {   // goles del rival que la síntesis no lista (con minuto aproximado)
    const lado = c.local === FERRO || /ferro carril oeste/i.test(c.local) ? "visitante" : "local";
    c.eventos = { ...c.eventos, [lado]: { ...c.eventos[lado], goles: [...c.eventos[lado].goles, ...correccion.golesRival.map(g => ({ min: g.min, mitad: g.mitad, t: g.mitad === "st" ? 45 + g.min : g.min, nombre: "(sin dato)", penal: false, ec: false }))] } };
  }
  return c;
}

// Resuelve los nombres sueltos de un evento contra las claves de un plantel.
export const buscar = (nombre, claves) => resolver(nombre, claves);
export { norm };
