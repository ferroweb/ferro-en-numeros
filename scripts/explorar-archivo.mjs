// Inventario del archivo de síntesis de FerroWeb: recorre las páginas anteriores a las ya cargadas y anota qué partido es
// cada una (encabezado, fecha y torneo si aparecen). No cambia ningún dato del sitio: deja el resultado en
// datos-fuente/archivo-ferroweb.json para decidir qué temporadas incorporar en scripts/lib/temporadas.mjs.
// Uso: node scripts/explorar-archivo.mjs [desde=700] [hasta=1]   (v2: suma fecha, torneo y día desde la crónica)
import { writeFileSync } from "node:fs";
import { bajarSintesis, BASE } from "./lib/ferroweb.mjs";

// La crónica comparte el número con la síntesis y trae el encabezado «1ª Fecha del Nacional B Apertura 2006 ¦ Jugada el día 07.08.06».
async function bajarCronica(view) {
  const r = await fetch(`${BASE}?mod=futbol&sub=cronica&view=${view}`, { headers: { "User-Agent": "ferro-en-numeros (actualizacion automatica, autorizada por FerroWeb)" }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return new TextDecoder("windows-1252").decode(await r.arrayBuffer());
}

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
  let cronica = null;
  try {
    const c = limpiar((await bajarCronica(view)).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " "));
    const m = c.match(/(\d{1,2})\s*[ªº°]?\s*Fecha\s+(?:del?\s+)?(.{3,70}?)\s*[¦|]\s*Jugad[ao] el d[ií]a\s*(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/i);
    const otro = !m && c.match(/([^.¦|]{3,90}?)\s*[¦|]\s*Jugad[ao] el d[ií]a\s*(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/i);
    const aaaa = (y) => (y.length === 2 ? (+y > 50 ? "19" : "20") + y : y);
    if (m) cronica = { fecha_torneo: +m[1], torneo: m[2].trim(), dia: `${aaaa(m[5])}-${m[4].padStart(2, "0")}-${m[3].padStart(2, "0")}` };
    else if (otro) cronica = { fecha_torneo: null, torneo: otro[1].trim(), dia: `${aaaa(otro[4])}-${otro[3].padStart(2, "0")}-${otro[2].padStart(2, "0")}` };
    else cronica = { sin_encabezado: true, inicio: c.slice(0, 160) };
  } catch (e) { cronica = { error: String(e.message || e) }; }
  out.push({ view, titulo: cab ? limpiar(cab[1]) : null, sintesis: tieneSintesis, ...cronica });
  if (view % 25 === 0) console.log(`… ${view}: ${cab ? limpiar(cab[1]) : "(sin síntesis)"} · ${out.at(-1).torneo ?? "?"} ${out.at(-1).dia ?? ""}`);
  await new Promise(r => setTimeout(r, 300));     // pedidos espaciados: no cargar el servidor de FerroWeb
}
const con = out.filter(x => x.sintesis);
writeFileSync(new URL("../datos-fuente/archivo-ferroweb.json", import.meta.url), JSON.stringify({ generado: new Date().toISOString(), desde, hasta, con_sintesis: con.length, sin_sintesis: vacias, paginas: out }, null, 0));
console.log(`Listo: ${con.length} síntesis encontradas entre ${hasta} y ${desde}; ${vacias} páginas sin síntesis.`);
