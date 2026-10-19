// Arma la base interna de LaFerropedia: baja cada ficha (personas, jugadores, DT) y guarda
// el contenido principal simplificado. El resultado se cifra en el workflow con la clave
// pública de datos-fuente/laferropedia-publica.pem (uso interno: no se publica en claro).
import fs from "node:fs"; import zlib from "node:zlib";
const SAL = process.argv[2] || "lfp-fichas.json.gz";
const UA = { headers: { "User-Agent": "Mozilla/5.0 (ferro-en-numeros; base interna)" } };
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function texto(u) { for (let i = 0; i < 3; i++) { try { const r = await fetch(u, UA); if (r.ok) return await r.text(); console.log("HTTP", r.status, u); } catch (e) { console.log("ERR", u, e.message); } await dormir(2000); } return null; }
const locs = x => [...x.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1].replace(/^http:/, "https:"));
const idx = await texto("https://laferropedia.com/sitemap_index.xml");
const mapas = locs(idx || ""); console.log("sitemaps:", mapas.join(" "));
let urls = [];
for (const m of mapas) { if (/category|tag|author/.test(m)) continue; const x = await texto(m); urls.push(...locs(x || "").map(u => ({ u, mapa: m }))); await dormir(400); }
const vistos = new Set(); urls = urls.filter(x => !vistos.has(x.u) && vistos.add(x.u));
console.log("urls:", urls.length);
const limpiar = h => {
  const m = h.match(/<article[\s\S]*?<\/article>/i) || h.match(/<main[\s\S]*?<\/main>/i) || h.match(/<body[\s\S]*?<\/body>/i) || [h];
  return m[0].replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>|<noscript[\s\S]*?<\/noscript>/gi, "")
    .replace(/<(\/?)(\w+)[^>]*>/g, (_, c, t) => /^(table|tr|td|th|h\d|p|li|br|a)$/i.test(t) ? `<${c}${t.toLowerCase()}>` : " ")
    .replace(/\s+/g, " ");
};
const fichas = []; let n = 0;
for (const { u, mapa } of urls) {
  n++; const h = await texto(u); await dormir(350); if (!h) continue;
  fichas.push({ url: u, mapa, titulo: (h.match(/<title>([^<]*)<\/title>/) || [])[1] || "", html: limpiar(h) });
  if (n % 100 === 0) console.log(n, "/", urls.length);
}
fs.writeFileSync(SAL, zlib.gzipSync(JSON.stringify({ fecha: new Date().toISOString(), total: fichas.length, fichas })));
console.log("listo", fichas.length);
