// Inventario del archivo de síntesis de FerroWeb: recorre las páginas anteriores a las ya cargadas y anota qué partido es
// cada una (encabezado, fecha y torneo si aparecen). No cambia ningún dato del sitio: deja el resultado en
// datos-fuente/archivo-ferroweb.json para decidir qué temporadas incorporar en scripts/lib/temporadas.mjs.
// Uso: node scripts/explorar-archivo.mjs [desde=700] [hasta=1]
import { writeFileSync } from "node:fs";
import { bajarSintesis } from "./lib/ferroweb.mjs";

const desde = +(process.argv[2] ?? 700), hasta = +(process.argv[3] ?? 1);
const limpiar = (s) => s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
const out = [];
let vacias = 0;
for (let view = desde; view >= hasta; view--) {
  let html;
  try { html = await bajarSintesis(view, 2); } catch (e) { out.push({ view, error: String(e.message || e) }); continue; }
  const cab = html.match(/<h1 class="up right">(.*?)<\/h1>/s);
  const texto = limpiar(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " "));
  const fecha = texto.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  const nfecha = texto.match(/\bFecha\s*(?:N[°º]\s*)?(\d{1,2})\b/i);
  const torneo = texto.match(/(Primera\s+(?:Nacional|B\s+Nacional)|B\s+Nacional|Copa\s+Argentina|Torneo\s+[A-ZÁÉÍÓÚ][\wáéíóú ]{2,30}|Campeonato\s+[\wáéíóú ]{2,30})/i);
  const tieneSintesis = /id="tbl_sintesis"/.test(html);
  if (!cab && !tieneSintesis) vacias++;
  out.push({ view, titulo: cab ? limpiar(cab[1]) : null, sintesis: tieneSintesis, fecha: fecha?.[0] ?? null, fecha_torneo: nfecha ? +nfecha[1] : null, torneo: torneo?.[0] ?? null });
  if (view % 25 === 0) console.log(`… ${view}: ${cab ? limpiar(cab[1]) : "(sin síntesis)"}`);
  await new Promise(r => setTimeout(r, 300));     // pedidos espaciados: no cargar el servidor de FerroWeb
}
const con = out.filter(x => x.sintesis);
writeFileSync(new URL("../datos-fuente/archivo-ferroweb.json", import.meta.url), JSON.stringify({ generado: new Date().toISOString(), desde, hasta, con_sintesis: con.length, sin_sintesis: vacias, paginas: out }, null, 0));
console.log(`Listo: ${con.length} síntesis encontradas entre ${hasta} y ${desde}; ${vacias} páginas sin síntesis.`);
