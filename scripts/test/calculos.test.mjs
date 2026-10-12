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
