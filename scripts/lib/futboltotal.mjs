// Tabla de posiciones de la Primera Nacional desde FútbolTotal (trae los dos grupos con PJ, G, E, P, GF, GC, DG).
import { mismoEquipo } from "./texto.mjs";
import { FERRO } from "./ferroweb.mjs";

export const URL_TABLA = "https://futboltotal.futbol/league/primera-nacional/clasificacion";
const UA = "ferro-en-numeros (actualizacion automatica, autorizada por FerroWeb)";

const texto = (h) => h.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

export async function bajarTabla() {
  const r = await fetch(URL_TABLA, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`FútbolTotal respondió HTTP ${r.status}`);
  return parseTabla(await r.text());
}

// Devuelve las filas del grupo donde está Ferro: [{ pos, equipo, pts, pj, g, e, p, gf, gc, dg }]
export function parseTabla(html) {
  for (const t of html.match(/<table[\s\S]*?<\/table>/g) ?? []) {
    const cab = [...t.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(m => texto(m[1]));
    if (!(cab.includes("Pos") && cab.includes("Equipo") && cab.includes("Pts"))) continue;
    const col = Object.fromEntries(cab.map((c, i) => [c, i]));
    const filas = [...t.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map(m => [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(c => texto(c[1]))).filter(f => f.length >= cab.length - 1);
    const num = (f, c) => parseInt(String(f[col[c]]).replace("+", ""), 10);
    const tabla = filas.map(f => ({ pos: num(f, "Pos"), equipo: f[col.Equipo], pts: num(f, "Pts"), pj: num(f, "PJ"), g: num(f, "G"), e: num(f, "E"), p: num(f, "P"), gf: num(f, "GF"), gc: num(f, "GC"), dg: num(f, "DG") }));
    if (tabla.some(f => mismoEquipo(f.equipo, FERRO))) return tabla;
  }
  throw new Error("No se encontró la tabla del grupo de Ferro en FútbolTotal (¿cambió el formato de la página?)");
}
