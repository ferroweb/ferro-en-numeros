// «Un día como hoy»: tarjeta en el Inicio y página con todos los días del año (#/datos/efemerides/MM-DD).
// Los datos (public/data/efemerides.json) los arma scripts/efemerides.mjs; acá solo se dibujan.
// El archivo se pide recién cuando hace falta, para no demorar la carga del sitio.
import { $, el, limitar } from "../lib/dom.js";

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
const marcador = (p) => p.local ? `Ferro ${p.gf}-${p.gc} ${p.rival}` : `${p.rival} ${p.gc}-${p.gf} Ferro`;
const penales = (p) => p.pen ? ` (${p.pen.f > p.pen.r ? "ganó" : "perdió"} ${p.pen.f}-${p.pen.r} por penales)` : "";
function enlace(href, texto) { const a = el("a", null, texto); a.href = href; a.target = "_blank"; a.rel = "noopener"; return a; }

// ---------- piezas ----------
function historia(h, grande) {
  const c = el("article", "ef-h" + (grande ? " grande" : ""));
  const cab = el("div", "ef-anio"); cab.append(el("b", null, String(h.anio)), el("span", null, haceAnios(h.anio)));
  c.append(cab, el("h4", null, h.titulo), el("p", null, h.texto));
  const f = el("p", "ef-fuente"); f.append("Dato: ", enlace(h.url, "LaFerropedia")); c.append(f);
  return c;
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
  box.append(el("p", "nota", `Partidos con síntesis en FerroWeb jugados un ${diaLargo(actual)}, desde 2006. El primero que hay es de ${b.desde}.`));
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
    D.historias.forEach((h, i) => c.append(historia(h, i === 0))); box.append(c);
  }
  if (D.partidos) { const c = el("div", "caja"); c.append(el("h3", null, `Ferro, cada ${diaLargo(k)}`)); c.append(partidos(D)); box.append(c); limitar(c.querySelector(".ef-part"), 5); }
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
  if (D.historias) box.append(historia(D.historias[0], true));
  const ul = el("ul", "ef-lista ef-mini");
  if (D.partidos) {
    const b = D.balance, p = D.partidos[0];
    const li = el("li"); li.append(el("b", null, `Cada ${diaLargo(k)} desde ${b.desde}: `), `${b.pj} ${b.pj === 1 ? "partido" : "partidos"}, ${b.g} ${b.g === 1 ? "ganado" : "ganados"}, ${b.e} ${b.e === 1 ? "empatado" : "empatados"} y ${b.p} ${b.p === 1 ? "perdido" : "perdidos"}. El último: `, enlace(SINTESIS + p.view, `${marcador(p)} (${p.anio})`), ".");
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
