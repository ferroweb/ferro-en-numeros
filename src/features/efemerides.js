// «Un día como hoy»: tarjeta en el Inicio y página con todos los días del año (#/datos/efemerides/MM-DD).
// Los datos (public/data/efemerides.json) los arma scripts/efemerides.mjs; acá solo se dibujan.
// El archivo se pide recién cuando hace falta, para no demorar la carga del sitio.
import { $, el, limitar } from "../lib/dom.js";
import { cargarHtml2canvas } from "../lib/html2canvas.js";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const SINTESIS = "http://www.ferroweb.com.ar/v1/?mod=futbol&sub=sintesis&view=";
let datos = null, pedido = null, actual = "";

function cargar() {
  if (datos) return Promise.resolve(datos);
  pedido ||= fetch(`${import.meta.env.BASE_URL}data/efemerides.json`, { cache: "no-cache" })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(j => (datos = j));
  return pedido;
}
// El día de hoy en Buenos Aires (no el del navegador: alguien en Europa a la noche ya estaría en el día siguiente).
export function hoyBA(ahora = new Date()) {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(ahora);
  const v = t => p.find(x => x.type === t).value;
  return { anio: +v("year"), clave: `${v("month")}-${v("day")}` };
}
const diaLargo = (k) => { const [m, d] = k.split("-"); return `${+d} de ${MESES[+m - 1]}`; };
const haceAnios = (anio) => { const n = hoyBA().anio - anio; return n === 0 ? "este año" : n === 1 ? "hace 1 año" : `hace ${n} años`; };
const valido = (k) => /^\d\d-\d\d$/.test(k || "") && datos && datos.dias[k];
function mover(k, delta) {
  const [m, d] = k.split("-").map(Number); const f = new Date(Date.UTC(2024, m - 1, d + delta));   // 2024: bisiesto, incluye el 29/2
  return `${String(f.getUTCMonth() + 1).padStart(2, "0")}-${String(f.getUTCDate()).padStart(2, "0")}`;
}
const pl = (n, a, b) => `${n} ${n === 1 ? a : b}`;
// Años en los que hubo partido ese día: «2009 y 2015» o «2010 a 2018». No se dice «cada»: no hubo partido todos los años.
function anios(D) { const A = [...new Set(D.partidos.map(p => p.anio))].sort((a, b) => a - b); return A.length === 1 ? String(A[0]) : A.length === 2 ? `${A[0]} y ${A[1]}` : `${A[0]} a ${A.at(-1)}`; }
const balanceTxt = (k, D) => { const b = D.balance; return `${b.pj === 1 ? "El único partido" : `Los ${b.pj} partidos`} de Ferro un ${diaLargo(k)} con síntesis de FerroWeb (${anios(D)}): ${pl(b.g, "ganado", "ganados")}, ${pl(b.e, "empatado", "empatados")} y ${pl(b.p, "perdido", "perdidos")}; goles: ${b.gf} a favor y ${b.gc} en contra.`; };
const marcador = (p) => p.local ? `Ferro ${p.gf}-${p.gc} ${p.rival}` : `${p.rival} ${p.gc}-${p.gf} Ferro`;
const penales = (p) => p.pen ? ` (${p.pen.f > p.pen.r ? "ganó" : "perdió"} ${p.pen.f}-${p.pen.r} por penales)` : "";
function enlace(href, texto) { const a = el("a", null, texto); a.href = href; a.target = "_blank"; a.rel = "noopener"; return a; }

// ---------- piezas ----------
function historia(h, grande, k) {
  const c = el("article", "ef-h" + (grande ? " grande" : ""));
  const cab = el("div", "ef-anio"); cab.append(el("b", null, String(h.anio)), el("span", null, haceAnios(h.anio)));
  c.append(cab, el("h4", null, h.titulo));
  if (h.foto) c.append(figura(h));
  c.append(el("p", null, h.texto));
  if (h.camiseta) c.append(chipCamiseta(h.camiseta));
  const f = el("p", "ef-fuente"); f.append("Dato: ", enlace(h.url, "LaFerropedia")); c.append(f);
  const acc = el("div", "ef-acc");
  const b = el("button", "ef-btn", h.desarrollo ? "Leer el desarrollo →" : "Ver el día completo →"); b.type = "button";
  b.addEventListener("click", () => abrirDia(k, h)); acc.append(b, botonPlaca(k));
  c.append(acc);
  return c;
}

const COLOR_CAM = { Verde: "verde", Blanca: "blanca", Negra: "negra", Violeta: "violeta", Rosa: "rosa", Naranja: "naranja", "Bordó": "bordo" };
function chipCamiseta(cm) {
  const p = el("p", "ef-cam"); const i = el("i", "ef-cam-c " + (COLOR_CAM[cm.color] || "")); i.setAttribute("aria-hidden", "true");
  p.append(i, el("b", null, "Ese día Ferro jugó con la " + cm.color.toLowerCase()));
  return p;
}
function figura(h) {
  const fg = el("figure", "ef-foto"); const im = el("img"); im.src = `${import.meta.env.BASE_URL}img/efemerides/${h.foto.archivo}`; im.alt = h.foto.epigrafe || h.titulo; im.loading = "lazy";
  const cap = el("figcaption"); cap.append((h.foto.epigrafe ? h.foto.epigrafe + " " : "") + "Foto: " + (h.foto.credito || "Ferroweb") + ".");
  fg.append(im, cap); return fg;
}

// ---------- desarrollo (usa el diálogo #des de los hallazgos) ----------
function resumenDia(k, D) {
  const out = [];
  if (D.partidos) out.push(balanceTxt(k, D));
  (D.nacimientos || []).slice(0, 2).forEach(n => out.push(`Nació ${n.nombre} (${n.anio})${n.cumpliria ? `, que hoy cumpliría ${n.cumpliria}` : ""}. ${n.texto || ""}`.trim()));
  (D.debuts || []).slice(0, 2).forEach(d => out.push(`Debutó ${d.nombre} (${d.anio}): ${d.texto}`));
  (D.despedidas || []).slice(0, 1).forEach(d => out.push(`Último partido de ${d.nombre} con la verde (${d.anio}): ${d.texto}`));
  (D.fallecimientos || []).slice(0, 2).forEach(f => out.push(`Nos dejó ${f.nombre} (${f.anio}). ${f.texto || ""}`.trim()));
  return out;
}
function abrirDia(k, h) {
  const D = datos.dias[k], dlg = $("#des"), c = $("#des-c"); c.textContent = "";
  $("#des-tg").textContent = `Un día como hoy · ${diaLargo(k)} de ${h.anio}`;
  $("#des-t").textContent = h.titulo;
  if (h.foto) c.append(figura(h));
  (h.desarrollo || [h.texto]).forEach(t => c.append(el("p", null, t)));
  if (h.camiseta) c.append(chipCamiseta(h.camiseta));
  const f = el("p", "ef-fuente"); f.append("Dato: ", enlace(h.url, "LaFerropedia"));
  (h.fuentes || []).forEach(x => { f.append(" · ", enlace(x.url, x.nombre)); });
  c.append(f);
  const R = resumenDia(k, D);
  if (R.length) { c.append(el("h4", null, `Además, un ${diaLargo(k)}`)); const ul = el("ul", "ef-lista ef-des"); R.forEach(t => ul.append(el("li", null, t))); c.append(ul); }
  const acc = el("div", "ef-acc"); acc.append(botonPlaca(k));
  const a = el("a", "ef-btn", "Ver todo el día →"); a.href = `#/datos/efemerides/${k}`; a.addEventListener("click", () => dlg.close()); acc.append(a);
  c.append(acc);
  if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
  c.scrollTop = 0;
}

// ---------- placa para WhatsApp (solo datos: sin fuentes ni links, como todas las placas) ----------
function armarPlaca(k) {
  const D = datos.dias[k];
  const P = el("div", "placa-n placa-ef"); const cab = el("div", "pc"); const izq = el("div");
  izq.append(el("span", "eti", "FERRO EN NÚMEROS"), el("h1", null, "Un día como hoy"), el("div", "f", diaLargo(k) + " · Hablemos de Ferro"));
  const lg = document.querySelector(".fwlogo"); cab.append(izq); if (lg) { const im = el("img"); im.src = lg.src; cab.append(im); } P.append(cab);
  const h = D.historias && D.historias[0];
  if (h) {
    const c = el("div", "card ef-pc");
    if (h.foto) { const im = el("img", "ef-pf"); im.src = `${import.meta.env.BASE_URL}img/efemerides/${h.foto.archivo}`; c.append(im); }
    c.append(el("div", "ef-pa", String(h.anio)), el("div", "t", h.titulo), el("div", "d", h.texto));
    if (h.camiseta) c.append(el("div", "ef-pcam", `Ese día Ferro jugó con la ${h.camiseta.color.toLowerCase()}.`));
    P.append(c);
  }
  if (D.partidos) {
    const b = D.balance, c = el("div", "card"); c.append(el("div", "t", `${b.pj === 1 ? "El único partido" : `Los ${b.pj} partidos`} de Ferro un ${diaLargo(k)} (${anios(D)})`));
    const t = el("div", "tiles"); [[b.g, b.g === 1 ? "ganado" : "ganados"], [b.e, b.e === 1 ? "empatado" : "empatados"], [b.p, b.p === 1 ? "perdido" : "perdidos"], [`${b.gf}-${b.gc}`, "goles a favor y en contra"]].forEach(([v, l]) => { const x = el("div", "tile"); x.append(el("b", null, String(v)), el("span", null, l)); t.append(x); });
    c.append(t); P.append(c);
  }
  const n = D.nacimientos && D.nacimientos[0];
  if (n && !(h && h.foto) && P.children.length < 4) { const c = el("div", "card"); c.append(el("div", "t", `Nació ${n.nombre} (${n.anio})`)); if (n.texto) c.append(el("div", "d", n.texto + (n.cumpliria ? ` Hoy cumpliría ${n.cumpliria}.` : ""))); P.append(c); }
  const d = D.debuts && D.debuts[0];
  if (d && !(h && h.foto) && P.children.length < 5) { const c = el("div", "card"); c.append(el("div", "t", `Debutó ${d.nombre} (${d.anio})`), el("div", "d", d.texto)); P.append(c); }
  if (P.children.length <= 3 && !(h && h.foto)) P.classList.add("pocas");   // pocas tarjetas: letra más grande, para no dejar media placa vacía
  const pie = el("div", "pn-pie"); pie.append(el("div", "px", "Ferro en números · Ferroweb")); P.append(pie);
  document.body.append(P); return P;
}
function botonPlaca(k) {
  const w = el("span", "ef-wa-w"); const b = el("button", "ef-wa", "📲 Placa para WhatsApp"); b.type = "button"; const msg = el("span", "ef-wa-msg"); msg.setAttribute("role", "status");
  b.addEventListener("click", async () => {
    msg.textContent = "Armando la placa…"; b.disabled = true;
    try {
      await cargarHtml2canvas(); const P = armarPlaca(k); const cv = await window.html2canvas(P, { scale: 1, backgroundColor: null, useCORS: true }); P.remove();
      const blob = await new Promise(r => cv.toBlob(r, "image/png")); const file = new File([blob], `ferro-un-dia-como-hoy-${k}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: `💚 Un día como hoy en Ferro · ${diaLargo(k)}` }); msg.textContent = ""; }
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.append(a); a.click(); a.remove(); msg.textContent = "Se descargó la placa: adjuntala en WhatsApp. (Desde el celu se comparte directo.)"; }
    } catch (e) { msg.textContent = e && e.name === "AbortError" ? "" : "No se pudo armar la placa. Probá de nuevo."; }
    b.disabled = false;
  });
  w.append(b, msg); return w;
}
function persona(x, verbo) {
  const li = el("li", "ef-p");
  const t = el("div", "ef-pt"); t.append(el("b", null, String(x.anio)), " · ");
  const a = enlace(x.url, x.nombre); t.append(verbo ? verbo + " " : "", a);
  if (x.cumpliria) t.append(el("span", "ef-c", ` · hoy cumpliría ${x.cumpliria}`));
  li.append(t); if (x.texto) li.append(el("div", "ef-px", x.texto));
  return li;
}
function listaPersonas(titulo, items, verbo, extra) {
  const box = el("div", "ef-bloque"); box.append(el("div", "pv-h4", titulo));
  const ul = el("ul", "ef-lista"); items.forEach(x => ul.append(persona(x, verbo))); box.append(ul);
  if (extra) box.append(extra);
  return box;
}
function partidos(D) {
  const box = el("div", "ef-bloque");
  const b = D.balance;
  box.append(el("p", "nota", `${balanceTxt(actual, D)} El archivo de síntesis de FerroWeb empieza en 2006.`));
  const k = el("div", "ef-bal");
  [["Partidos", b.pj], ["Ganados", b.g], ["Empatados", b.e], ["Perdidos", b.p], ["Goles", `${b.gf}-${b.gc}`]].forEach(([l, v]) => {
    const c = el("div", "kpi"); c.append(el("div", "l", l), el("div", "v", String(v))); k.append(c);
  });
  box.append(k);
  const ul = el("ul", "ef-lista ef-part");
  D.partidos.forEach(p => {
    const li = el("li"); const pill = el("span", "pill " + p.res, p.res); pill.setAttribute("aria-label", { G: "ganó", E: "empató", P: "perdió" }[p.res]);
    const tx = el("div"); tx.append(el("b", null, String(p.anio)), " · ", enlace(SINTESIS + p.view, marcador(p)), penales(p));
    tx.append(el("div", "ef-px", p.torneo + (p.fecha && !/final|semi|cuartos|4tos|octavos/i.test(p.torneo) ? ` · fecha ${p.fecha}` : "")));
    li.append(pill, tx); ul.append(li);
  });
  box.append(ul);
  return box;
}

// ---------- página ----------
function dibujarPagina(k) {
  const D = datos.dias[k]; actual = k;
  $("#ef-dia").textContent = diaLargo(k);
  const sel = $("#ef-sel"); if (sel.value !== k) sel.value = k;
  const box = $("#ef-cont"); box.textContent = "";
  if (D.historias) {
    const c = el("div", "caja"); c.append(el("h3", null, `La historia del ${diaLargo(k)}`));
    D.historias.forEach((h, i) => c.append(historia(h, i === 0, k))); box.append(c);
  }
  if (D.partidos) { const c = el("div", "caja"); c.append(el("h3", null, `Ferro, los ${diaLargo(k)}`)); c.append(partidos(D)); box.append(c); limitar(c.querySelector(".ef-part"), 5); }
  const gente = el("div", "caja"); gente.append(el("h3", null, `Cumpleaños, debuts y despedidas del ${diaLargo(k)}`));
  let hay = false;
  if (D.nacimientos) {
    hay = true; let extra = null;
    if (D.tambien_nacieron) {
      extra = el("p", "ef-tambien"); extra.append("También nacieron un día como hoy: ");
      D.tambien_nacieron.forEach((x, i) => { if (i) extra.append(", "); extra.append(enlace(x.url, x.nombre), ` (${x.anio})`); });
      extra.append(".");
    }
    gente.append(listaPersonas("Nacieron", D.nacimientos, "", extra));
  }
  if (D.debuts) { hay = true; gente.append(listaPersonas("Debutaron", D.debuts, "")); }
  if (D.despedidas) { hay = true; gente.append(listaPersonas("Jugaron su último partido con la verde", D.despedidas, "")); }
  if (D.fallecimientos) { hay = true; gente.append(listaPersonas("Nos dejaron", D.fallecimientos, "")); }
  if (hay) { gente.append(el("p", "nota", "Partidos, goles y fechas según las fichas de LaFerropedia.")); box.append(gente); }
}
function initPagina() {
  const sel = $("#ef-sel"); if (!sel) return;
  for (let m = 1; m <= 12; m++) for (let d = 1; d <= new Date(Date.UTC(2024, m, 0)).getUTCDate(); d++) {
    const k = `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`; const o = el("option", null, `${d} de ${MESES[m - 1]}`); o.value = k; sel.append(o);
  }
  const ir = (k) => { location.hash = `#/datos/efemerides/${k}`; };
  sel.addEventListener("change", () => ir(sel.value));
  $("#ef-ant").addEventListener("click", () => ir(mover(actual, -1)));
  $("#ef-sig").addEventListener("click", () => ir(mover(actual, 1)));
  $("#ef-hoy").addEventListener("click", () => ir(hoyBA().clave));
}

// ---------- Inicio ----------
function dibujarInicio() {
  const sec = $("#efem"); if (!sec) return;
  const k = hoyBA().clave, D = datos.dias[k]; if (!D) return;
  const box = $("#efem-l"); box.textContent = "";
  $("#efem-f").textContent = diaLargo(k);
  if (D.historias) box.append(historia(D.historias[0], true, k));
  else { const acc = el("div", "ef-acc"); acc.append(botonPlaca(k)); box.append(acc); }
  const ul = el("ul", "ef-lista ef-mini");
  if (D.partidos) {
    const p = D.partidos[0];
    const li = el("li"); li.append(balanceTxt(k, D), " El último: ", enlace(SINTESIS + p.view, `${marcador(p)} (${p.anio})`), ".");
    ul.append(li);
  }
  const n = D.nacimientos && D.nacimientos[0];
  if (n) { const li = el("li"); li.append(el("b", null, "Nació: "), enlace(n.url, n.nombre), ` (${n.anio})${n.cumpliria ? `, hoy cumpliría ${n.cumpliria}` : ""}. ${n.texto || ""}`); ul.append(li); }
  const d = D.debuts && D.debuts[0];
  if (d) { const li = el("li"); li.append(el("b", null, "Debutó: "), enlace(d.url, d.nombre), ` (${d.anio}). ${d.texto}`); ul.append(li); }
  if (ul.children.length) box.append(ul);
  sec.hidden = false;
}

export default {
  init() {
    initPagina();
    cargar().then(() => { dibujarInicio(); if (location.hash.startsWith("#/datos/efemerides")) this.onShow("datos", "efemerides", location.hash.split("/")[3]); })
      .catch(e => { console.error(e); const c = $("#ef-cont"); if (c) c.textContent = "No pudimos cargar las efemérides. Probá recargar la página."; });
  },
  onShow(grupo, pagina, param) {
    if (grupo !== "datos" || pagina !== "efemerides" || !datos) return;
    const k = valido(param) ? param : hoyBA().clave;
    if (k !== actual || !$("#ef-cont").children.length) dibujarPagina(k);
  },
};
