// La planilla de la redacción: lectura del CSV, novedades visibles y lo que se aplica solo (árbitro, horario, pedidos para la IA).
import test from "node:test";
import assert from "node:assert/strict";
import { parseCSV, filasDePlanilla, novedadesVisibles, parsearFecha } from "../../src/lib/planilla.js";
import { aplicarArbitroYHorario, parsearHorario, pedidosPendientes } from "../lib/redaccion.mjs";

const CSV = [
  'Marca temporal,Tipo,Título,Texto,Link',
  '11/10/2026 20:15:00,Novedad,"Ferro sigue puntero","Suma 62 puntos, a 4 de Morón.\nSe viene Racing.",https://ferroweb.com.ar/x',
  '11/10/2026 20:20:00,Árbitro,34,Javier Dalbarba,',
  '11/10/2026 20:21:00,Horario,34,17/10 17:30,',
  '12/10/2026 09:00:00,Pedido para la IA,Hallazgo de Reniero,"Escribir algo sobre su gol de ayer",',
  '12/10/2026 09:05:00,Cosa rara,sin tipo conocido,x,',
].join("\n");

test("el CSV se lee con comillas, comas y saltos de línea dentro de una celda", () => {
  const f = parseCSV(CSV);
  assert.equal(f.length, 6);
  assert.equal(f[1][3], "Suma 62 puntos, a 4 de Morón.\nSe viene Racing.");
});

test("las filas se reconocen por el nombre de la columna y se descartan las de tipo desconocido", () => {
  const filas = filasDePlanilla(CSV);
  assert.deepEqual(filas.map(f => f.tipo), ["novedad", "arbitro", "horario", "pedido"]);
  assert.equal(filas[0].titulo, "Ferro sigue puntero"); assert.equal(filas[0].link, "https://ferroweb.com.ar/x");
  assert.equal(parsearFecha("11/10/2026 20:15:00").getHours(), 20);
});

test("las novedades visibles son las activas de los últimos días", () => {
  const csv = 'Fecha,Tipo,Título,Texto,Activo\n01/10/2026,Novedad,Vieja,x,\n10/10/2026,Novedad,Reciente,x,\n10/10/2026,Novedad,Oculta,x,No';
  const v = novedadesVisibles(filasDePlanilla(csv), new Date(2026, 9, 12), 10);
  assert.deepEqual(v.map(f => f.titulo), ["Reciente"]);
});

test("el árbitro y el horario de la próxima fecha se aplican al calendario (con el nombre corregido)", () => {
  const cal = { total_fechas: 36, proximos: [{ fecha: 34, rival: "Racing", dia: "2026-10-17", hora: null, nota_hora: "provisorio" }] };
  const r = aplicarArbitroYHorario(cal, filasDePlanilla(CSV), { ultimaFecha: 33, arbitrosConocidos: ["Javier Delbarba"], designadoActual: "Yamil Possi" });
  const p = r.calendario.proximos[0];
  assert.equal(p.arbitro, "Javier Delbarba"); assert.equal(r.designado_nombre, "Javier Delbarba");
  assert.equal(p.dia, "2026-10-17"); assert.equal(p.hora, "17:30"); assert.equal(p.confirmado, true); assert.equal(p.nota_hora, undefined);
});

test("si la fecha no existe se avisa y no se rompe nada", () => {
  const r = aplicarArbitroYHorario({ total_fechas: 36, proximos: [{ fecha: 34 }] }, filasDePlanilla("Tipo,Título,Texto\nÁrbitro,99,Fulano"), { ultimaFecha: 33 });
  assert.match(r.avisos[0], /no encuentro la fecha/);
});

test("si hay dos cargas para la misma fecha vale la última", () => {
  const csv = "Tipo,Título,Texto\nHorario,34,sábado 17/10 17:00\nHorario,34,sábado 17/10 21:00";
  const r = aplicarArbitroYHorario({ total_fechas: 36, proximos: [{ fecha: 34, dia: "2026-10-17" }] }, filasDePlanilla(csv), { ultimaFecha: 33 });
  assert.equal(r.calendario.proximos[0].hora, "21:00");
});

test("formatos de horario aceptados", () => {
  assert.deepEqual(parsearHorario("2026-10-17 17:00", 2026), { dia: "2026-10-17", hora: "17:00" });
  assert.deepEqual(parsearHorario("17/10/2026 9:05", 2026), { dia: "2026-10-17", hora: "09:05" });
  assert.deepEqual(parsearHorario("20.30 hs", 2026), { dia: null, hora: "20:30" });
  assert.deepEqual(parsearHorario("a confirmar", 2026), { dia: null, hora: null });
});

test("los pedidos para la IA pendientes no incluyen los ya atendidos", () => {
  const filas = filasDePlanilla(CSV);
  const [p] = pedidosPendientes(filas);
  assert.equal(p.titulo, "Hallazgo de Reniero");
  assert.deepEqual(pedidosPendientes(filas, [p.id]), []);
});
