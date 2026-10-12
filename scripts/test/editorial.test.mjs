// El validador acepta una previa completa y rechaza las que le faltan piezas; el historial del pronóstico se completa solo.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validarEditorial, resolverFwHistorial } from "../lib/editorial.mjs";

const base = () => JSON.parse(readFileSync(new URL("./fixtures/editorial-f33.json", import.meta.url), "utf8"));
const errores = (d) => validarEditorial(d).errores;
const f33 = (d) => d.calendario.proximos[0];

test("una previa completa pasa la validación", () => assert.deepEqual(errores(base()), []));

test("si la tabla avanzó una fecha y la previa sigue siendo la anterior, falla en lo que falta", () => {
  const d = base(); d.ultima_fecha = 33;
  const e = errores(d).join("\n");
  assert.match(e, /falta el partido de la fecha 34/);
});

test("falta la pizarra o las chicanas", () => {
  const d = base(); delete f33(d).pizarra; delete f33(d).humor;
  const e = errores(d).join("\n"); assert.match(e, /falta pizarra/); assert.match(e, /falta humor/);
});

test("el once de la pizarra debe tener 11 jugadores", () => {
  const d = base(); f33(d).pizarra.once = [["Monetti"], ["Ozuna"]];
  assert.match(errores(d).join("\n"), /tiene 2 jugadores/);
});

test("el pronóstico FW tiene que ser de la fecha y sumar 100", () => {
  let d = base(); d.fw.fecha = 32; assert.match(errores(d).join("\n"), /fw: debe ser el pronóstico de la fecha 33/);
  d = base(); d.fw.ganar = 70; assert.match(errores(d).join("\n"), /debe dar 100/);
  d = base(); d.pronostico.chances_primero = [{ equipo: "Ferro Carril Oeste", p: 40 }]; assert.match(errores(d).join("\n"), /chances_primero/);
});

test("el pronóstico de la fecha tiene que quedar registrado en el historial", () => {
  const d = base(); d.fw_historial = [];
  assert.match(errores(d).join("\n"), /fw_historial: falta registrar/);
});

test("el árbitro designado del calendario tiene que ser el de las estadísticas", () => {
  const d = base(); d.arbitros.designado_nombre = "Otro Árbitro";
  assert.match(errores(d).join("\n"), /designado_nombre/);
});

test("los hallazgos tienen que estar al cierre de la última fecha", () => {
  const d = base(); d.hallazgos.hallazgos.forEach(h => { h.al_cierre_de = "Fecha 30"; });
  assert.match(errores(d).join("\n"), /ninguno está al cierre de la Fecha 32/);
});

test("el historial del pronóstico FW se completa solo al jugarse el partido", () => {
  const hist = [{ fecha: 33, gf: 1, gc: 0, goleador: "Dening" }, { fecha: 34, gf: 2, gc: 0, goleador: "Parisi" }];
  const partidos = [{ fecha: 33, gf: 1, gc: 1 }];
  const r = resolverFwHistorial(hist, partidos, [{ fecha: 33, jugador: "Reniero", goles: 1 }]);
  assert.deepEqual(r[0].real, { gf: 1, gc: 1 });
  assert.equal(r[0].signo_ok, false); assert.equal(r[0].exacto_ok, false); assert.equal(r[0].goleador_ok, false);
  assert.equal(r[1].real, undefined);                       // la fecha 34 todavía no se jugó
  const acierto = resolverFwHistorial([{ fecha: 33, gf: 1, gc: 1, goleador: "Reniero" }], partidos, [{ fecha: 33, jugador: "Reniero", goles: 1 }])[0];
  assert.ok(acierto.signo_ok && acierto.exacto_ok && acierto.goleador_ok);
});
