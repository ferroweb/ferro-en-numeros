// Controla la camiseta asignada a cada partido de una temporada contra Piel de Oeste.
// Uso: node scripts/camisetas/controlar.mjs DESDE HASTA ANIOS_PDO '{"<view>":"Verde", ...}'
//   DESDE/HASTA: fechas AAAA-MM-DD de los partidos (archivo de FerroWeb); ANIOS_PDO: años de modelo de Piel de Oeste a sumar, «2019,2020».
//   Ojo: hasta 2019/20 las temporadas iban de agosto a junio y Piel de Oeste nombra cada camiseta por el año del modelo.
// Muestra los totales por color (PJ, G, E, P) nuestros y los de Piel de Oeste, y deja el detalle en /tmp/camisetas_DESDE.json.
import fs from "node:fs";
import { leerTitulo } from "../efemerides.mjs";
const [desde, hasta, aniosPdo, mapaTxt] = process.argv.slice(2); const mapa = JSON.parse(mapaTxt || "{}"); const anios = aniosPdo.split(",").map(Number);
const R = (p) => JSON.parse(fs.readFileSync(new URL("../../" + p, import.meta.url)));
const A = R("datos-fuente/archivo-ferroweb.json").paginas.filter(x => x.sintesis && x.dia && x.dia >= desde && x.dia <= hasta).sort((a, b) => a.dia.localeCompare(b.dia));
const C = R("datos-fuente/correcciones.json");
const nuestro = {}, filas = [];
for (const p of A) {
  const c = C[p.view];
  // Título sin resultado («San Martín . - . Ferro»): se arma con el resultado de correcciones.json, si lo hay.
  const t = leerTitulo(p.titulo) || (c && c.gl != null ? leerTitulo((p.titulo || "").replace(/\s\.\s*-\s*\.\s/, ` ${c.gl} - ${c.gv} `)) : null);
  if (!t) { console.log("sin resultado:", p.view, p.titulo); continue; } if (c && c.gl != null) { t.gf = t.local ? c.gl : c.gv; t.gc = t.local ? c.gv : c.gl; }
  const res = t.gf > t.gc ? "G" : t.gf < t.gc ? "P" : "E"; const cam = mapa[p.view] || "?";
  const a = (nuestro[cam] ||= [0, 0, 0, 0]); a[0]++; a[" GEP".indexOf(res)]++;
  filas.push({ fecha: p.fecha_torneo, view: p.view, dia: p.dia, rival: t.rival, cond: t.local ? "L" : "V", gf: t.gf, gc: t.gc, res, camiseta: cam, torneo: p.torneo });
}
const pdo = {};
for (const c of R("datos-fuente/pieldeoeste-camisetas.json").hasta_2025.camisetas.filter(c => anios.includes(c.anio))) { const a = (pdo[c.color] ||= [0, 0, 0, 0]); a[0] += c.pj; a[1] += c.g; a[2] += c.e; a[3] += c.p; }
console.log("Nuestro conteo (PJ, G, E, P):", JSON.stringify(nuestro));
console.log("Piel de Oeste    (PJ, G, E, P):", JSON.stringify(pdo));
const ok = JSON.stringify(Object.keys(nuestro).sort().map(k => [k, nuestro[k]])) === JSON.stringify(Object.keys(pdo).sort().map(k => [k, pdo[k]]));
console.log(ok ? "COINCIDE" : "NO COINCIDE: revisar");
fs.writeFileSync(`/tmp/camisetas_${desde}.json`, JSON.stringify(filas, null, 1));
