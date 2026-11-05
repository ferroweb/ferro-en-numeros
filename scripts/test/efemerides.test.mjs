// «Un día como hoy»: lectura de resultados de FerroWeb y armado por día.
import { test } from "node:test";
import assert from "node:assert/strict";
import { leerTitulo, resultadoDe, nombreCorto, armar } from "../efemerides.mjs";

test("leerTitulo entiende los formatos de FerroWeb", () => {
  assert.deepEqual(leerTitulo("Güemes (Santiago del Estero) 1 - 3 Ferro Carril Oeste"), { local: false, rival: "Güemes (Santiago del Estero)", gf: 3, gc: 1, pen: null });
  assert.deepEqual(leerTitulo("Ferro Carril Oeste 3 (4) - 3 (1) Los Andes (Lomas de Zamora)").pen, { f: 4, r: 1 });
  assert.equal(leerTitulo("Huracán 3 - Ferro Carril Oeste 2").gc, 3);
  assert.equal(leerTitulo("Ferro Carril OEste 5 - 0 Atlético Rafaela").gf, 5);
  assert.equal(leerTitulo("Talleres 0 - 1 Ferro Carri Oeste").gf, 1);
  assert.equal(leerTitulo("River Plate 0 (6) - 0 (5) Ferro Carril Oeste - Definición por penales").pen.f, 5);
  assert.equal(leerTitulo("San Martín de San Juan . - . Ferro Carril Oeste"), null);
});

test("resultadoDe mira el partido desde Ferro", () => {
  assert.equal(resultadoDe("Ferro 1-San Lorenzo 3"), "P");
  assert.equal(resultadoDe("Talleres 3-Ferro 2"), "P");
  assert.equal(resultadoDe("Platense 0-Ferro 1"), "G");
  assert.equal(resultadoDe("Ferro 1-Newell's 1"), "E");
  assert.equal(resultadoDe("Racing 0-Ferro"), null);
});

test("nombreCorto acorta los nombres largos", () => {
  assert.equal(nombreCorto("Juan Domingo Antonio Rocchia"), "Juan Rocchia");
  assert.equal(nombreCorto("Alejandro Sabella"), "Alejandro Sabella");
  assert.equal(nombreCorto("Juan Carlos de la Fuente"), "Juan de la Fuente");
});

test("armar: historias del mismo día, cumpliría solo con fallecimiento, balance y corrección", () => {
  const dias = armar({
    anioHoy: 2026,
    textos: { "05-30": [{ id: 1, titulo: "Campeones", texto: "Texto propio." }], "05-31": [{ id: 2, titulo: "Mal día", texto: "x" }] },
    lfp: [{ id: 1, dia: "05-30", titulo: "1984 // Campeones", url: "u1" }, { id: 2, dia: "06-01", titulo: "1990 // Otro", url: "u2" }],
    personas: [
      { nombre: "Alejandro Sabella", url: "s", pj: 27, goles: 2, nacimiento: "1954-11-05", fallecimiento: null, puesto: "Mediocampista | Volante ofensivo izquierdo" },
      { nombre: "Carlos Barisio", url: "b", pj: 139, goles: 116, arquero: true, nacimiento: "1951-01-03", fallecimiento: "2020-02-05", debut: { fecha: "1978-12-10", partido: "Talleres 3-Ferro 2" }, puesto: "Arquero" },
      { nombre: "Sin Partidos", url: "z", pj: 0, nacimiento: "1950-11-05" },
    ],
    archivo: [
      { view: 10, sintesis: true, dia: "2015-11-25", titulo: "Ferro Carril Oeste 0 - 0 Ramón Santamarina (Tandil)", torneo: "Torneo Reducido", fecha_torneo: 2 },
      { view: 11, sintesis: true, dia: "2020-11-25", titulo: "Ferro Carril Oeste 2 - 1 Atlanta", torneo: "Torneo Primera Nacional 2020", fecha_torneo: 3 },
    ],
    correcciones: { 10: { gl: 0, gv: 2 } },
  });
  assert.equal(dias["05-30"].historias[0].anio, 1984);
  assert.equal(dias["05-31"], undefined, "una historia cuyo id es de otro día no se publica");
  assert.equal(dias["11-05"].nacimientos.length, 1, "solo los que jugaron");
  assert.equal(dias["11-05"].nacimientos[0].cumpliria, undefined, "sin fecha de fallecimiento no se dice cuántos cumple");
  assert.equal(dias["01-03"].nacimientos[0].cumpliria, 75);
  assert.match(dias["12-10"].debuts[0].texto, /Arrancó perdiendo, pero se quedó para 139/);
  assert.deepEqual(dias["11-25"].balance, { pj: 2, g: 1, e: 0, p: 1, gf: 2, gc: 3, desde: 2015 });
});
