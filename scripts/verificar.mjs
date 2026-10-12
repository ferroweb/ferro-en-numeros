// Prueba de fuego: reconstruye todos los partidos desde FerroWeb y los compara con lo que ya está cargado en public/data.
// Sirve para saber si el parser reproduce los datos que se revisaron a mano. Uso: node scripts/verificar.mjs
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { bajarSintesis, parseSintesis, corregir } from "./lib/ferroweb.mjs";
import { procesarPartido, acumularPuntos, estadisticasJugadores, rendimiento, franjas } from "./lib/derive.mjs";
import { equipoCanonico } from "./lib/texto.mjs";

const leer = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}.json`, import.meta.url), "utf8"));
const { partidos: PV, participaciones: PARV } = leer("partidos");
const JV = leer("jugadores").jugadores, EQ = leer("equipo");
const CORR = JSON.parse(readFileSync(new URL("../datos-fuente/correcciones.json", import.meta.url), "utf8"));
const cache = process.env.FW_CACHE;
if (cache) mkdirSync(cache, { recursive: true });

const CONOCIDOS = JV.map(j => j.jugador);
const nuevos = [], parts = [], golesPorFecha = {}; let problemas = 0;
for (const p of PV.slice().sort((a, b) => a.n - b.n)) {
  const view = +p.sintesis.match(/view=(\d+)/)[1];
  const f = cache && join(cache, `${view}.html`);
  const html = f && existsSync(f) ? readFileSync(f, "latin1") : await bajarSintesis(view);
  if (f && !existsSync(f)) writeFileSync(f, html, "latin1");
  const s = corregir(parseSintesis(html), CORR[view]);
  const r = procesarPartido(s, { fecha: p.fecha, rival: p.rival, n: p.n, view, conocidos: CONOCIDOS });
  r.avisos.forEach(a => console.log(`  aviso F${p.fecha}: ${a}`));
  r.errores.forEach(a => { problemas++; console.log(`  ERROR F${p.fecha}: ${a}`); });
  nuevos.push(r.partido); parts.push(...r.participaciones); golesPorFecha[p.fecha] = r.goles;
}
const P = acumularPuntos(nuevos);

const dif = (titulo, a, b) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) { problemas++; console.log(`DIFERENCIA ${titulo}\n   cargado:      ${x}\n   reconstruido: ${y}`); } };
console.log("\n== partidos ==");
for (const p of PV) { const q = P.find(x => x.n === p.n); for (const k of Object.keys(p)) if (k !== "nota") dif(`partido n=${p.n} F${p.fecha} .${k}`, p[k], q[k]); }
console.log("\n== participaciones ==");
const clave = (r) => `${r.fecha}|${r.jugador}`;
const A = new Map(PARV.map(r => [clave(r), r])), B = new Map(parts.map(r => [clave(r), r]));
for (const [k, r] of A) { const q = B.get(k); if (!q) { problemas++; console.log(`FALTA en reconstruido: ${k} ${JSON.stringify(r)}`); continue; } for (const c of Object.keys(r)) dif(`participación ${k} .${c}`, r[c], q[c]); }
for (const [k, r] of B) if (!A.has(k)) { problemas++; console.log(`SOBRA en reconstruido: ${k} ${JSON.stringify(r)}`); }
console.log("\n== jugadores ==");
const J = estadisticasJugadores(P, parts, JV);
dif("orden de jugadores", JV.map(j => j.jugador), J.map(j => j.jugador));
for (const j of JV) { const q = J.find(x => x.jugador === j.jugador); if (!q) continue; for (const k of Object.keys(j)) if (k !== "trayectoria") dif(`jugador ${j.jugador} .${k}`, j[k], q[k]); }
console.log("\n== equipo ==");
dif("rendimiento", EQ.rendimiento, rendimiento(P, golesPorFecha));
dif("franjas", EQ.franjas, franjas(P, golesPorFecha));
console.log(problemas ? `\n${problemas} diferencias` : "\nTodo coincide con lo cargado.");
