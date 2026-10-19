// Recorre las fichas de personas de LaFerropedia (robots.txt permite todo) y guarda
// solo las que mencionan un texto (por defecto «Chaco»), con las frases donde aparece.
import fs from "node:fs";
const BUSCAR = new RegExp(process.argv[2] || "Chaco", "i");
const SAL = process.argv[3] || "datos-fuente/crudas/chaco/lfp/menciones.json";
const UA = { headers: { "User-Agent": "Mozilla/5.0 (ferro-en-numeros; consulta ocasional)" } };
const dormir = ms => new Promise(r => setTimeout(r, ms));
async function texto(u) { for (let i = 0; i < 3; i++) { try { const r = await fetch(u, UA); if (r.ok) return await r.text(); console.log("HTTP", r.status, u); } catch (e) { console.log("ERR", u, e.message); } await dormir(2000); } return null; }
const locs = x => [...x.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map(m => m[1].replace(/^http:/, "https:"));
const idx = await texto("https://laferropedia.com/sitemap_index.xml");
const mapas = locs(idx || ""); console.log("sitemaps:", mapas);
let urls = [];
for (const m of mapas) { if (/post-sitemap|page-sitemap|category|tag|author/.test(m)) continue; const x = await texto(m); urls.push(...locs(x || "")); await dormir(500); }
urls = [...new Set(urls)].filter(u => /\/persona\/|\/jugador-|\/director-tecnico-/.test(u));
console.log("fichas:", urls.length);
const plano = h => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/g, " ").replace(/&#8211;|&ndash;/g, "-").replace(/&#8217;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ");
const res = [];
let n = 0;
for (const u of urls) {
  n++; const h = await texto(u); await dormir(400);
  if (!h) continue; const t = plano(h);
  if (!BUSCAR.test(t)) continue;
  const titulo = (h.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const frases = [...t.matchAll(new RegExp("[^.]{0,260}" + BUSCAR.source + "[^.]{0,200}", "gi"))].map(m => m[0].trim());
  const debut = (t.match(/Debut[^:]{0,20}:\s*.{0,90}/i) || [""])[0];
  const ultimo = (t.match(/[ÚU]ltimo partido[^:]{0,20}:\s*.{0,90}/i) || [""])[0];
  res.push({ url: u, titulo, debut, ultimo, frases });
  console.log(n, "✔", titulo);
}
fs.mkdirSync(SAL.replace(/[^/]+$/, ""), { recursive: true });
fs.writeFileSync(SAL, JSON.stringify({ fecha: new Date().toISOString(), fichas_revisadas: urls.length, encontradas: res.length, res }, null, 1));
console.log("listo", res.length, "de", urls.length);
