// Baja las efemérides de LaFerropedia (categoría «Evento», vía la API pública de WordPress) y las guarda
// como insumo en datos-fuente/laferropedia/efemerides.json. LaFerropedia autorizó a Ferroweb a usar su
// información; los textos del sitio se escriben aparte, con voz propia (no se copian).
import fs from "node:fs";
const UA = { headers: { "User-Agent": "Mozilla/5.0 (ferro-en-numeros; efemerides)" } };
const dormir = ms => new Promise(r => setTimeout(r, ms));
const ent = s => (s || "").replace(/<[^>]+>/g, " ").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&hellip;/g, "…").replace(/\s+/g, " ").trim();
async function pagina(n) {
  const u = `https://laferropedia.com/wp-json/wp/v2/posts?categories=31&per_page=100&page=${n}&_fields=id,date,title,link,content`;
  for (let i = 0; i < 4; i++) {
    try { const r = await fetch(u, UA); if (r.status === 400) return []; if (r.ok) return await r.json(); console.log("HTTP", r.status, n); }
    catch (e) { console.log("ERR", n, e.message); }
    await dormir(3000);
  }
  throw new Error("no pude bajar la página " + n);
}
const todos = [];
for (let n = 1; n < 100; n++) { const a = await pagina(n); if (!a.length) break; todos.push(...a); await dormir(500); }
const ev = todos.map(x => ({ id: x.id, dia: x.date.slice(5, 10), titulo: ent(x.title.rendered), url: x.link, texto: ent(x.content.rendered) }))
  .sort((a, b) => a.dia.localeCompare(b.dia) || a.titulo.localeCompare(b.titulo));
if (ev.length < 2500) throw new Error("vinieron pocas efemérides: " + ev.length);
fs.mkdirSync("datos-fuente/laferropedia", { recursive: true });
fs.writeFileSync("datos-fuente/laferropedia/efemerides.json", JSON.stringify({ fecha: new Date().toISOString(), total: ev.length, efemerides: ev }, null, 0));
console.log("listo", ev.length);
