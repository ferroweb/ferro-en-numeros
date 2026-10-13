// Comprueba que la parte editorial (pronóstico, claves, pizarra, chicanas, hallazgos…) esté completa para la próxima fecha.
// Uso: node scripts/validar-editorial.mjs   (sale con error si falta algo que el sitio necesita)
import { readFileSync, writeFileSync } from "node:fs";
import { validarEditorial, huellaTabla } from "./lib/editorial.mjs";

const leer = (f) => JSON.parse(readFileSync(new URL(`../public/data/${f}.json`, import.meta.url), "utf8"));
const t = leer("tabla"), p = leer("proximo");
if (process.argv.includes("--tabla-revisada")) {   // se usa SOLO después de reflejar en la parte editorial los cambios de la tabla
  const f = new URL("../public/data/hallazgos.json", import.meta.url), h = JSON.parse(readFileSync(f, "utf8"));
  h.tabla_revisada = huellaTabla(t.tabla); writeFileSync(f, JSON.stringify(h));
  console.log(`Tabla marcada como revisada (${t.actualizado}).`);
}
const { errores, avisos } = validarEditorial({
  ultima_fecha: t.ultima_fecha, tabla: t.tabla, jugadores: leer("jugadores").jugadores, calendario: p.calendario, fw: p.fw, pronostico: p.pronostico,
  fw_historial: p.fw_historial, claves: p.claves, arbitros: p.arbitros, cruce: p.cruce, hallazgos: leer("hallazgos"), lab: leer("lab").lab,
});
console.log(`Datos al cierre de la fecha ${t.ultima_fecha}; se valida la previa de la fecha ${t.ultima_fecha + 1}.`);
avisos.forEach(a => console.log(`⚠️  ${a}`));
errores.forEach(e => console.log(`❌ ${e}`));
console.log(errores.length ? `\n${errores.length} ${errores.length === 1 ? "problema" : "problemas"} para resolver antes de publicar.` : "\nLa parte editorial está completa.");
process.exit(errores.length ? 1 : 0);
