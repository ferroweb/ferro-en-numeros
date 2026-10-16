// Síntesis de Solo Ascenso (https://www.soloascenso.com.ar/sintesis/<partido>/<id>): segunda fuente para cruzar tarjetas.
// Cada síntesis trae «Amonestados: Nombre Apellido (FER), …» y «Expulsados: 62' Nombre Apellido (FER)».
import { norm } from "./texto.mjs";

const limpiar = (s) => s.replace(/<[^>]+>/g, " ").replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const linea = (html, etiqueta) => { const m = html.match(new RegExp(`<b>${etiqueta}:</b>([\\s\\S]*?)</p>`)); return m ? limpiar(m[1]) : ""; };

// Devuelve { fecha, amonestados: [nombre completo de Ferro], expulsados: [{ min, nombre }] } o null si no hay síntesis.
export function parseSintesisSA(html, sigla = "FER") {
  const cab = (html.match(/<div id="fecha-hora">([\s\S]*?)<\/div>/) || [])[1];
  if (!cab) return null;
  const fecha = +((limpiar(cab).match(/Fecha (\d+)/) || [])[1] ?? NaN);
  const deFerro = (s) => s.split(/,\s*/).map(x => x.trim()).filter(x => x.endsWith(`(${sigla})`)).map(x => x.replace(/\s*\([A-Z]+\)$/, ""));
  const amonestados = deFerro(linea(html, "Amonestados"));
  const expulsados = deFerro(linea(html, "Expulsados")).map(x => { const m = x.match(/^(\d+)'(?:\s*\(\+\d+\))?\s+(.*)$/); return m ? { min: +m[1], nombre: m[2] } : { min: null, nombre: x }; });
  return { fecha, amonestados, expulsados };
}

// «Matías Kabalin» → clave del sitio («Kabalín»): por apellido normalizado (tolera tildes); si hay dos con el mismo apellido, no adivina.
export function claveDe(nombreCompleto, claves) {
  const n = norm(nombreCompleto);
  const candidatas = claves.filter(k => { const c = norm(k); return n === c || n.endsWith(" " + c); });
  return candidatas.length === 1 ? candidatas[0] : null;
}

// Links a las síntesis que aparecen en la página del club (vienen como «/../sintesis/<partido>/<id>»).
export const linksSintesisSA = (html) => [...new Set([...html.matchAll(/href="([^"]*?\/sintesis\/[^"]+\/\d+)"/g)].map(m => m[1]))];

export async function bajarSA(url) {
  const r = await fetch(url, { headers: { "User-Agent": "ferro-en-numeros (cruce de tarjetas)" }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} en ${url}`);
  return await r.text();
}
