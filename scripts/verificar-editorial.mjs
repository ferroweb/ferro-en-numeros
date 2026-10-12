// Prueba de fuego de los cálculos: con los partidos hasta la fecha 32 recalcula laboratorio, árbitros, «la última vez que…»,
// histórico y escenarios, y lo compara con lo que ya estaba cargado (revisado a mano). Uso: node scripts/verificar-editorial.mjs
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { bajarTemporada } from "./lib/temporadas.mjs";
import * as C from "./lib/calculos.mjs";
import { FERRO } from "./lib/ferroweb.mjs";

const HASTA = 32, COMMIT_PREVIO = "9ad8a6c";          // estado de los datos antes de la fecha 33
const leer = (f) => JSON.parse(readFileSync(new URL(`../${f}`, import.meta.url), "utf8"));
const previo = (f) => JSON.parse(execSync(`git show ${COMMIT_PREVIO}:${f}`, { encoding: "utf8", maxBuffer: 1e8, cwd: new URL("..", import.meta.url) }));

const dp = leer("public/data/partidos.json"), dj = leer("public/data/jugadores.json").jugadores, det = leer("datos-fuente/detalle.json");
const lab = leer("public/data/lab.json").lab, prox = leer("public/data/proximo.json"), hall = leer("public/data/hallazgos.json"), eq = leer("public/data/equipo.json");
const tabla32 = previo("public/data/tabla.json").tabla;
const CORR = leer("datos-fuente/correcciones.json"), ALIAS = leer("datos-fuente/alias-equipos.json");

// temporadas anteriores (se leen una sola vez)
let T = existsSync(new URL("../datos-fuente/temporadas.json", import.meta.url)) ? leer("datos-fuente/temporadas.json") : null;
if (!T || !T[2025]?.[0]?.participaciones) {
  const conocidos = [...new Set([...dj.map(j => j.jugador), ...eq.historico.jugadores.map(j => j.jugador)])];
  const rivales = [...new Set([...dp.partidos.map(p => p.rival), ...eq.historico.h2h.map(h => h.rival), ...lab.rivales.favoritos.map(x => x.rival), ...lab.rivales.bestias.map(x => x.rival), ...lab.tal_fecha.lista.map(x => x.rival), ...prox.calendario.proximos.map(x => x.rival)])];
  T = {}; for (const a of [2025, 2024]) T[a] = await bajarTemporada(a, { conocidos, rivales, correcciones: CORR, alias: ALIAS, aviso: m => console.log("  aviso", m) });
  writeFileSync(new URL("../datos-fuente/temporadas.json", import.meta.url), JSON.stringify(T));
}

const partidos = dp.partidos.filter(p => p.fecha <= HASTA), parts = dp.participaciones.filter(r => r.fecha <= HASTA);
const P26 = C.unificar2026(partidos, parts, det), P25 = C.unificarAnterior(T[2025]), P24 = C.unificarAnterior(T[2024]);
// árbitros con nombres unificados entre temporadas
const arbConocidos = [...new Set(P26.map(p => p.arbitro))];
[...P25, ...P24].forEach(p => { p.arbitro = C.canonicoArbitro(p.arbitro, arbConocidos); if (!arbConocidos.includes(p.arbitro)) arbConocidos.push(p.arbitro); });

let diferencias = 0;
const dif = (titulo, a, b) => { const x = JSON.stringify(a), y = JSON.stringify(b); if (x !== y) { diferencias++; console.log(`DIFERENCIA ${titulo}\n   cargado:    ${x.slice(0, 600)}\n   calculado:  ${y.slice(0, 600)}`); } };
const difLista = (titulo, a, b, clave) => {
  const A = new Map(a.map(x => [clave(x), x])), B = new Map(b.map(x => [clave(x), x]));
  for (const [k, x] of A) { if (!B.has(k)) { diferencias++; console.log(`FALTA en calculado (${titulo}): ${JSON.stringify(x).slice(0, 300)}`); } else dif(`${titulo} «${k}»`, x, B.get(k)); }
  for (const [k, x] of B) if (!A.has(k)) { diferencias++; console.log(`SOBRA en calculado (${titulo}): ${JSON.stringify(x).slice(0, 300)}`); }
  const oa = a.map(clave).join("|"), ob = b.map(clave).join("|"); if (oa !== ob && A.size === B.size && [...A.keys()].every(k => B.has(k))) console.log(`(solo el orden difiere en ${titulo})\n   cargado:   ${oa}\n   calculado: ${ob}`);
};

console.log("== laboratorio ==");
dif("estados", lab.estados, C.labEstados(P26));
dif("forma", lab.forma, C.labForma(P26));
dif("forma_rival", lab.forma_rival, C.labFormaRival(prox.calendario.proximos.find(p => p.fecha > HASTA)));
const mins = C.labMinutos(P26, P25); dif("minutos 2026", lab.minutos[2026], mins[2026]); dif("minutos 2025", lab.minutos[2025], mins[2025]);
const dup = C.labDuplas(P26); for (const k of ["mejores", "peores", "tridentes"]) difLista("duplas." + k, lab.duplas[k], dup[k], x => x.jug.join("+"));
difLista("banco", lab.banco, C.labBanco(P26), x => x.jugador);
dif("tal_fecha", lab.tal_fecha, C.labTalFecha(HASTA + 1, [P25, P24]));
const riv = C.labRivales([...P24, ...P25, ...P26], [2024, 2025, 2026]); difLista("rivales.favoritos", lab.rivales.favoritos, riv.favoritos, x => x.rival); difLista("rivales.bestias", lab.rivales.bestias, riv.bestias, x => x.rival);
difLista("cabalas", lab.cabalas, C.labCabalas(P26), x => x.cabala);

console.log("\n== hallazgos: la última vez que… ==");
difLista("ultimas", hall.ultimas, C.ultimas([...P25, ...P26]), x => x.situacion);

console.log("\n== árbitros ==");
const arb = C.arbitros([...P25, ...P26], prox.arbitros.designado_nombre);
difLista("arbitros.tabla", prox.arbitros.tabla, arb.tabla, x => x.arbitro);
dif("arbitros.prom_am", prox.arbitros.prom_am, arb.prom_am); dif("arbitros.prom_pts", prox.arbitros.prom_pts, arb.prom_pts);
dif("arbitros.designado", prox.arbitros.designado, arb.designado);

console.log("\n== histórico ==");
const h = C.historico(P26, P25, eq.historico);
dif("historico.temporadas", eq.historico.temporadas, h.temporadas); dif("historico.evolucion", eq.historico.evolucion.slice(0, 32), h.evolucion.slice(0, 32));
difLista("historico.h2h", eq.historico.h2h, h.h2h, x => x.rival);
difLista("historico.jugadores", eq.historico.jugadores, h.jugadores, x => x.id);

console.log("\n== escenarios ==");
const esc = C.escenarios(tabla32, prox.calendario, HASTA, FERRO);
dif("escenarios", { ...prox.escenarios, quedan: prox.escenarios.quedan.map(q => ({ fecha: q.fecha, rival: q.rival, cond: q.cond })) }, esc);
console.log(diferencias ? `\n${diferencias} diferencias` : "\nTodo coincide con lo cargado.");
