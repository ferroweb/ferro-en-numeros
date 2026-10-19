// Pruebas de los cálculos con partidos armados a mano (el resultado se verifica con cuentas simples).
import test from "node:test";
import assert from "node:assert/strict";
import { ultimas, escenarios, labBanco, labForma, labCabalas, canonicoArbitro } from "../lib/calculos.mjs";

const gol = (a, t) => ({ a, t, pt: t <= 45 });
const partido = (o) => ({ anio: 2026, fecha: 1, n: 1, rival: "X", cond: "L", gf: 0, gc: 0, res: "E", arbitro: "A", goles: [], entradas: {}, tarjetas: [], participaciones: [], ...o });

test("«la última vez que…»: cuenta cuántos partidos pasaron y cuántas veces ocurrió", () => {
  const S = [
    partido({ fecha: 1, gf: 3, gc: 1, res: "G", rival: "A" }), partido({ fecha: 2, gf: 1, gc: 0, res: "G", rival: "B" }),
    partido({ fecha: 3, gf: 0, gc: 0, res: "E", rival: "C" }), partido({ fecha: 4, gf: 0, gc: 2, res: "P", rival: "D" }),
  ];
  const u = Object.fromEntries(ultimas(S).map(x => [x.situacion, x]));
  assert.equal(u["Ganamos por dos goles"].ultima, "2026 F1: Ferro 3-1 A");
  assert.equal(u["Ganamos por dos goles"].hace, 3);
  assert.equal(u["Empatamos 0-0"].veces, 1);
  assert.equal(u["Perdimos por dos goles"].hace, 0);
  assert.equal(u["Goleamos por cuatro o más"].veces, 0);
  assert.equal(u["Goleamos por cuatro o más"].temporada, null);
});

test("«dimos vuelta» exige ganar habiendo ido perdiendo", () => {
  const vuelta = partido({ gf: 2, gc: 1, res: "G", goles: [gol("r", 10), gol("f", 50), gol("f", 80)] });
  const siempreArriba = partido({ fecha: 2, gf: 2, gc: 1, res: "G", goles: [gol("f", 10), gol("r", 50), gol("f", 80)] });
  assert.equal(ultimas([vuelta, siempreArriba]).find(x => x.situacion === "Dimos vuelta un partido").veces, 1);
});

test("escenarios: puntos máximos y puntos que hacen falta para asegurar el primer puesto", () => {
  const tabla = [{ equipo: "Ferro", pts: 62, pj: 33, pos: 1 }, { equipo: "B", pts: 58, pj: 33, pos: 2 }, { equipo: "C", pts: 56, pj: 32, pos: 3 }];
  const cal = { total_fechas: 36, proximos: [{ fecha: 34, rival: "R", cond: "L" }, { fecha: 35, rival: "S", cond: "V" }, { fecha: 36, rival: "T", cond: "L" }] };
  const e = escenarios(tabla, cal, 33, "Ferro");
  assert.equal(e.restan, 3); assert.equal(e.ferro_max, 71);
  assert.deepEqual(e.perseguidores.map(x => x.maximo), [67, 68]);   // C tiene un partido menos jugado: 56 + 12
  assert.equal(e.necesita_para_asegurar, 7);                        // 68 - 62 + 1
  assert.deepEqual(e.quedan.map(x => x.fecha), [34, 35, 36]);
});

test("banco: puntos rescatados según cómo estaba el partido cuando entró", () => {
  const p = (fecha, f, c, goles, minuto) => partido({ fecha, n: fecha, gf: f, gc: c, res: f > c ? "G" : f === c ? "E" : "P", goles, entradas: { Suplente: minuto }, participaciones: [{ jugador: "Suplente", rol: "Suplente", goles: 0 }] });
  const P = [p(1, 1, 0, [gol("f", 80)], 70), p(2, 2, 2, [gol("r", 10), gol("f", 20), gol("r", 30), gol("f", 40)], 60), p(3, 1, 0, [gol("f", 50)], 60), p(4, 0, 1, [gol("r", 80)], 70)];
  const [b] = labBanco(P);
  assert.equal(b.entradas, 4);
  assert.equal(b.rescatados, 2);       // solo F1: entró 0-0 (1 pt) y se ganó (3 pts). F2 (2-2 y terminó 2-2) y F3 (ya ganaba 1-0) no cambian nada
  assert.equal(b.perdidos, 1);         // F4: entró 0-0 (1 pt) y se perdió (0)
});

test("forma: suma de los últimos 5 partidos, incluso al principio del torneo", () => {
  const P = ["G", "E", "E", "P", "G", "G"].map((res, i) => partido({ fecha: i + 1, res }));
  assert.deepEqual(labForma(P).map(x => x.ult5), [3, 4, 5, 5, 8, 8]);
});

test("cábalas: amarilla antes del minuto 20 y expulsado", () => {
  const P = [partido({ res: "G", tarjetas: [{ tipo: "a", t: 12, pt: true }] }), partido({ fecha: 2, res: "P", tarjetas: [{ tipo: "r", t: 80, pt: false }] })];
  const c = Object.fromEntries(labCabalas(P).map(x => [x.cabala, x]));
  assert.equal(c["Amarilla nuestra antes del minuto 20"].pj, 1);
  assert.equal(c["Partido con expulsado nuestro"].p, 1);
  assert.equal(c["Ninguna amarilla en el primer tiempo"].pj, 1);
});

test("árbitros: se unifican tipeos y acentos", () => {
  const conocidos = ["Javier Delbarba", "Álvaro Carranza"];
  assert.equal(canonicoArbitro("Javier Dalbarba", conocidos), "Javier Delbarba");
  assert.equal(canonicoArbitro("Alvaro Carranza", conocidos), "Álvaro Carranza");
  assert.equal(canonicoArbitro("Otro Nuevo", conocidos), "Otro Nuevo");
});

test("limiteAmarillas: orden de juego, banco, ciclo de 5, doble amarilla y aviso si jugó suspendido", async () => {
  const { limiteAmarillas } = await import("../lib/calculos.mjs");
  // la fecha 4 se juega última (n = 7)
  const partidos = [1, 2, 3, 5, 6, 7, 4].map((fecha, i) => ({ fecha, n: i + 1 }));
  const am = (k) => ({ k, tipo: "a" }), ro = (k) => ({ k, tipo: "r" });
  const detalle = {
    1: { tarjetas: [am("Ozuna"), am("Kihm"), am("Canto"), am("Benegas")] },
    2: { tarjetas: [am("Ozuna"), am("Kihm"), am("Canto"), ro("Canto"), am("Castellani")] },   // Canto: doble amarilla; Castellani en el banco
    3: { tarjetas: [am("Ozuna"), am("Kihm")] },
    5: { tarjetas: [am("Ozuna"), am("Kihm")] },
    6: { tarjetas: [] }, 7: { tarjetas: [] },
    4: { tarjetas: [am("Ozuna")] },
  };
  const participaciones = [{ jugador: "Ozuna", fecha: 6, minutos: 90 }];
  const L = limiteAmarillas(partidos, detalle, participaciones, { bajas: ["Benegas"] });
  const k = L.find(x => x.jugador === "Kihm"); assert.equal(k.faltan, 1);
  const o = L.find(x => x.jugador === "Ozuna"); assert.equal(o.ciclo, 0); assert.deepEqual(o.suspensiones, [{ fecha: 4, siguiente: null, jugo_siguiente: false }]);
  assert.deepEqual(o.fechas, [1, 2, 3, 5, 4]);
  assert.equal(L.find(x => x.jugador === "Canto").amarillas, 1);
  assert.equal(L.find(x => x.jugador === "Castellani").amarillas, 1);
  assert.ok(!L.some(x => x.jugador === "Benegas"));
});

test("limiteAmarillas: un conteo confirmado pisa a la síntesis y suma lo posterior", async () => {
  const { limiteAmarillas } = await import("../lib/calculos.mjs");
  const partidos = [1, 2, 3].map((fecha, i) => ({ fecha, n: i + 1 }));
  const detalle = { 1: { tarjetas: [{ k: "Hoyos", tipo: "a" }] }, 2: { tarjetas: [] }, 3: { tarjetas: [{ k: "Hoyos", tipo: "a" }] } };
  const c = { Hoyos: { ciclo: 3, al_cierre_de_fecha: 2, fuente: "club" } };
  const h = limiteAmarillas(partidos, detalle, [], { confirmadas: c }).find(x => x.jugador === "Hoyos");
  assert.equal(h.ciclo, 4); assert.equal(h.faltan, 1); assert.equal(h.confirmado.fuente, "club");
});

test("cruceAmarillas: marca lo que está en una sola fuente e ignora la doble amarilla", async () => {
  const { cruceAmarillas, limiteAmarillas } = await import("../lib/calculos.mjs");
  const detalle = { 1: { tarjetas: [{ k: "Kihm", tipo: "a" }, { k: "Canto", tipo: "a" }, { k: "Canto", tipo: "r" }] }, 2: { tarjetas: [{ k: "Parisi", tipo: "a" }] }, 3: { tarjetas: [] } };
  const otra = { 1: { amarillas: ["Canto"], rojas: ["Canto"] }, 2: { amarillas: ["Parisi", "Ozuna"] } };
  const dif = cruceAmarillas(detalle, otra);
  assert.deepEqual(dif, [{ fecha: 1, jugador: "Kihm", en: "ferroweb" }, { fecha: 2, jugador: "Ozuna", en: "otra" }]);
  const L = limiteAmarillas([1, 2, 3].map((fecha, n) => ({ fecha, n })), detalle, [], { cruce: dif });
  assert.equal(L.find(x => x.jugador === "Kihm").cruce.ciclo, 0);
  assert.deepEqual(L.find(x => x.jugador === "Ozuna").cruce, { diferencias: [{ fecha: 2, en: "otra" }], amarillas: 1, ciclo: 1, suspensiones: [] });
  assert.equal(L.find(x => x.jugador === "Parisi").cruce, undefined);
});

test("limiteAmarillas: con la otra fuente se recalcula la suspensión (explica un «jugó suspendido»)", async () => {
  const { limiteAmarillas } = await import("../lib/calculos.mjs");
  const partidos = [1, 2, 3, 4, 5, 6, 7, 8].map((fecha, n) => ({ fecha, n }));
  const am = () => ({ tarjetas: [{ k: "Canto", tipo: "a" }] }), nada = () => ({ tarjetas: [] });
  const detalle = { 1: am(), 2: am(), 3: nada(), 4: am(), 5: am(), 6: nada(), 7: am(), 8: nada() };   // FW: llega a 5 en la F7
  const jugo = [1, 2, 3, 4, 5, 7, 8].map(fecha => ({ jugador: "Canto", fecha, minutos: 90 }));   // no jugó la F6
  const c = limiteAmarillas(partidos, detalle, jugo, { cruce: [{ fecha: 3, jugador: "Canto", en: "otra" }] }).find(x => x.jugador === "Canto");
  assert.equal(c.suspensiones[0].jugo_siguiente, true);                      // con FW, jugó la F8 «suspendido»
  assert.deepEqual(c.cruce.suspensiones, [{ fecha: 5, siguiente: 6, jugo_siguiente: false }]);   // con la otra, cumplió en la F6
  assert.equal(c.cruce.ciclo, 1);
  assert.deepEqual(c.si_sobra_una, [4]);                                      // sacando una de FW, también cierra (4)
});

test("amarillasPorFuente: tres fuentes, mayoría y fuente sin dato", async () => {
  const { amarillasPorFuente, correccionPorMayoria } = await import("../lib/calculos.mjs");
  const detalle = { 9: { tarjetas: [] }, 11: { tarjetas: [{ k: "Kihm", tipo: "a" }] }, 14: { tarjetas: [] }, 3: { tarjetas: [{ k: "Hoyos", tipo: "a" }] } };
  const fuentes = {
    soloascenso: { 9: { amarillas: ["Kihm"] }, 11: { amarillas: [] }, 14: { amarillas: ["Canto"] }, 3: { amarillas: [] } },
    afa: { 9: { amarillas: ["Kihm"] }, 11: { amarillas: ["Kihm"] }, 14: { amarillas: [] } },   // la F3 no la tiene
  };
  const F = amarillasPorFuente(detalle, fuentes);
  assert.deepEqual(F, [
    { fecha: 3, jugador: "Hoyos", ferroweb: true, soloascenso: false, afa: null, mayoria: true },     // empate 1 a 1: queda FerroWeb
    { fecha: 9, jugador: "Kihm", ferroweb: false, soloascenso: true, afa: true, mayoria: true },
    { fecha: 11, jugador: "Kihm", ferroweb: true, soloascenso: false, afa: true, mayoria: true },
    { fecha: 14, jugador: "Canto", ferroweb: false, soloascenso: true, afa: false, mayoria: false },
  ]);
  assert.deepEqual(correccionPorMayoria(F), [{ fecha: 9, jugador: "Kihm", en: "otra" }]);
});

test("limiteAmarillas: lecturas de la fuente en minoría que también cierran", async () => {
  const { limiteAmarillas } = await import("../lib/calculos.mjs");
  const partidos = [1, 2, 3, 4, 5, 6, 7].map((fecha, n) => ({ fecha, n }));
  const am = () => ({ tarjetas: [{ k: "Marra", tipo: "a" }] }), nada = () => ({ tarjetas: [] });
  const detalle = { 1: am(), 2: am(), 3: am(), 4: nada(), 5: am(), 6: nada(), 7: nada() };   // 4 amarillas
  const jugo = [1, 2, 3, 4, 5, 7].map(fecha => ({ jugador: "Marra", fecha, minutos: 90 }));       // no jugó la F6
  const alt = [{ fecha: 4, jugador: "Marra", en: "otra" }, { fecha: 7, jugador: "Marra", en: "otra" }];
  const m = limiteAmarillas(partidos, detalle, jugo, { alternativas: alt }).find(x => x.jugador === "Marra");
  assert.equal(m.ciclo, 4);
  // con la F4 llega a 5 en la F5 y no juega la F6: cierra (0). Con la F7 llega a 5 al final, sin partido siguiente: también (0).
  assert.deepEqual(m.otras_lecturas.map(o => [o.fecha, o.ciclo]), [[4, 0], [7, 0]]);
  assert.deepEqual(m.otras_lecturas[0].suspension, { fecha: 5, siguiente: 6, jugo_siguiente: false });
});

test("limiteAmarillas: total ajustado al conteo confirmado y fechas de la próxima suspensión", async () => {
  const { limiteAmarillas } = await import("../lib/calculos.mjs");
  const partidos = [...Array(10)].map((_, i) => ({ fecha: i + 1, n: i + 1 }));
  const am = (...ks) => ({ tarjetas: ks.map(k => ({ k, tipo: "a" })) });
  const detalle = { 1: am("Ozuna", "Marra"), 2: am("Ozuna", "Hoyos"), 3: am("Ozuna", "Marra"), 4: am("Ozuna"), 5: am("Ozuna", "Marra"),
    6: am(), 7: am("Ozuna", "Marra"), 8: am("Ozuna"), 9: am("Ozuna"), 10: am("Ozuna") };
  const conf = { Marra: { ciclo: 0, al_cierre_de_fecha: 10, fuente: "AFA" }, Hoyos: { ciclo: 2, al_cierre_de_fecha: 10, fuente: "AFA" } };
  const L = limiteAmarillas(partidos, detalle, [], { confirmadas: conf });
  const o = L.find(x => x.jugador === "Ozuna"), m = L.find(x => x.jugador === "Marra"), h = L.find(x => x.jugador === "Hoyos");
  assert.deepEqual([o.total, o.ciclo, o.proxima_sancion], [9, 4, 2]);     // la décima son dos fechas
  assert.deepEqual([m.total, m.ciclo, m.proxima_sancion], [5, 0, 2]);     // el informe dice 0: le falta una amarilla (la más chica corrección), ya cumplió
  assert.deepEqual([h.total, h.ciclo, h.proxima_sancion], [2, 2, 1]);
});

test("filasSegunInforme: el conteo oficial decide la amarilla en disputa", async () => {
  const { filasSegunInforme } = await import("../lib/calculos.mjs");
  const partidos = [1, 2, 3, 4].map((fecha, n) => ({ fecha, n }));
  const am = (...ks) => ({ tarjetas: ks.map(k => ({ k, tipo: "a" })) });
  const det = { 1: am("Marra", "Ozuna"), 2: am("Marra", "Ozuna"), 3: am("Marra"), 4: am() };
  const filas = [{ fecha: 4, jugador: "Marra", mayoria: false }, { fecha: 3, jugador: "Ozuna", mayoria: false }, { fecha: 4, jugador: "Tévez", mayoria: false }];
  const F = filasSegunInforme(partidos, det, [], filas, { Marra: { ciclo: 4 }, Ozuna: { ciclo: 2 } });
  assert.deepEqual(F.map(f => f.informe), [true, false, null]);   // Marra: existió; Ozuna: confirma la mayoría; Tévez: sin informe
});

test("limiteAmarillas: con el conteo confirmado en 4, la amarilla siguiente es suspensión", async () => {
  const { limiteAmarillas } = await import("../lib/calculos.mjs");
  const partidos = [1, 2, 3].map((fecha, n) => ({ fecha, n }));
  const detalle = { 1: { tarjetas: [{ k: "Hoyos", tipo: "a" }] }, 2: { tarjetas: [{ k: "Hoyos", tipo: "a" }] }, 3: { tarjetas: [] } };
  const h = limiteAmarillas(partidos, detalle, [], { confirmadas: { Hoyos: { ciclo: 4, al_cierre_de_fecha: 1, fuente: "AFA" } } }).find(x => x.jugador === "Hoyos");
  assert.equal(h.ciclo, 0);
  assert.deepEqual(h.suspensiones, [{ fecha: 2, siguiente: 3, jugo_siguiente: false }]);
});
