// Pruebas del parser con síntesis reales de FerroWeb que traen los problemas típicos. Uso: npm test
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseSintesis, corregir } from "../lib/ferroweb.mjs";
import { procesarPartido } from "../lib/derive.mjs";
import { parseTabla } from "../lib/futboltotal.mjs";

const html = (v) => new TextDecoder("windows-1252").decode(readFileSync(new URL(`./fixtures/${v}.html`, import.meta.url)));
const CONOCIDOS = ["Monetti", "Kihm", "Tévez", "Tarón", "Canto", "Corda", "Kabalín", "Obradovich", "Castellani", "González", "Dening", "Acosta", "Gómez", "Ozuna", "Campos", "Parisi", "García", "Marra", "Orellana", "Hoyos", "Reniero", "Olguín"];
const proc = (v, extra = {}, corr) => procesarPartido(corregir(parseSintesis(html(v)), corr), { fecha: 1, rival: "X", n: 1, view: v, conocidos: CONOCIDOS, ...extra });

test("una página sin síntesis publicada devuelve null", () => {
  assert.equal(parseSintesis("<html><body><h1>Ferroweb</h1></body></html>"), null);
});

test("F6: el marcador del encabezado (0-0) no coincide con los goles listados y se frena", () => {
  const r = proc(763);
  assert.ok(r.errores.some(e => /rival/.test(e) && /2/.test(e)), r.errores.join("|"));
});

test("F6 con la corrección manual (0-2) es válida", () => {
  const r = proc(763, {}, { gv: 2 });
  assert.deepEqual(r.errores, []);
  assert.equal(r.partido.resultado, "P");
  assert.equal(r.partido.gc, 2);
});

test("F16: los apellidos mal escritos en la formación se llevan al nombre del sitio (Khim → Kihm)", () => {
  const nombres = proc(773).participaciones.map(p => p.jugador);
  assert.ok(nombres.includes("Kihm") && nombres.includes("Dening") && nombres.includes("Tévez"), nombres.join(","));
  assert.ok(!nombres.some(n => ["khim", "Denig", "Tevéz"].includes(n)));
});

test("F13: un cambio en tiempo agregado (47' del ST) pasa de 90 y el que entra suma 1 minuto", () => {
  const por = Object.fromEntries(proc(770).participaciones.map(p => [p.jugador, p.minutos]));
  assert.equal(por["González"], 92);
  assert.equal(por["Campos"], 1);
});

test("F27: «16 y 30´st García» son dos goles del segundo tiempo", () => {
  const r = proc(785);
  assert.equal(r.participaciones.find(p => p.jugador === "García").goles, 2);
  assert.match(r.partido.goleadores, /García 16st, García 30st/);
});

test("F30: cambios escritos en varias líneas y con una frase de dos cambios («Marra x González y García x Parisi»)", () => {
  const r = proc(788);
  assert.deepEqual(r.errores, []);
  const por = Object.fromEntries(r.participaciones.map(p => [p.jugador, p.minutos]));
  assert.equal(por["González"], 65); assert.equal(por["Marra"], 25); assert.equal(por["Parisi"], 65); assert.equal(por["García"], 25);
});

test("tabla de FútbolTotal: lee el grupo donde está Ferro", () => {
  const fila = (...c) => `<tr>${c.map(x => `<td>${x}</td>`).join("")}</tr>`;
  const tabla = (nombre) => `<table><thead><tr>${["Pos", "Equipo", "Pts", "PJ", "G", "E", "P", "GF", "GC", "DG", "Forma"].map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${fila(1, nombre, 62, 33, 18, 8, 7, 37, 28, "+9", "PGGEE")}</tbody></table>`;
  const r = parseTabla(tabla("Otro Club") + tabla("Ferro Carril Oeste"));
  assert.equal(r[0].equipo, "Ferro Carril Oeste"); assert.equal(r[0].pts, 62); assert.equal(r[0].dg, 9);
});

// Nombres de equipos según la fuente (FerroWeb, FútbolTotal, el sitio): tienen que reconocerse como el mismo club.
import { mismoEquipo as mismoEq } from "../lib/texto.mjs";
test("mismoEquipo reconoce los nombres de FútbolTotal", () => {
  for (const [a, b] of [["Racing Cordoba", "Racing de Córdoba"], ["Racing (Córdoba)", "Racing de Córdoba"], ["CA Estudiantes", "Estudiantes de Caseros"],
    ["Atletico Mitre", "Mitre (SdE)"], ["Deportivo Morón", "Morón"], ["Ciudad de Bolívar", "Ciudad de Bolivar"]]) assert.ok(mismoEq(a, b), `${a} = ${b}`);
  for (const [a, b] of [["Deportivo Morón", "Deportivo Madryn"], ["San Telmo", "San Miguel"], ["Los Andes", "All Boys"], ["Central Norte", "Racing de Córdoba"]]) assert.ok(!mismoEq(a, b), `${a} ≠ ${b}`);
});

test("parseTarjetas no parte «García, Santiago» en dos eventos", async () => {
  const { parseTarjetas } = await import("../lib/ferroweb.mjs");
  const r = parseTarjetas("36´pt Rodríguez, 48´pt Fernandes Pinto, 37´st García, Santiago, 47´st Mosca");
  assert.equal(r.length, 4);
  assert.equal(r[2].nombre, "García, Santiago");
  assert.ok(r.every(x => !x.error));
});

test("parseSuplentes: dos con el mismo apellido se distinguen con la inicial", async () => {
  const { parseSuplentes } = await import("../lib/ferroweb.mjs");
  assert.deepEqual(parseSuplentes("12- Ruiz, Lucas 17- García, Franco 18- Dening, Emanuel 19- García, Santiago"), ["Ruiz", "García F.", "Dening", "García S."]);
});
