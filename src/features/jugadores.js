import { caraJug } from "../components/caras.js";
import { tarjeta } from "../components/tarjeta.js";
import { DATA, TODOS, nombres } from "../ctx.js";
import { tip, showTip, hideTip, tabla } from "../lib/charts.js";
import { RESC } from "../lib/consts.js";
import { $, el, f2, miles, S, limitar, columnasExtra } from "../lib/dom.js";

let selF, A, B;

const ETAPAS_VISIBLES = 5;   // las más recientes; el resto se despliega con un botón

// Trayectoria: lista cronológica «años · club», con la etapa en Ferro resaltada.
function trayectoria(j, despuesDe) {
  const viejo = $("#ficha-tray"); if (viejo) viejo.remove();
  const etapas = j.trayectoria || []; if (!etapas.length) return;
  const anios = (d, h) => d && h ? (d === h ? `${d}` : `${d}–${h}`) : d ? `${d}–hoy` : h ? `hasta ${h}` : "";
  const nota = (x) => x === "juveniles" ? "Inferiores" : x === "préstamo" ? "Préstamo" : "";
  const sec = el("section", "tray"); sec.id = "ficha-tray";
  const cab = el("div", "tray-cab"); cab.append(el("h4", null, "Trayectoria"), el("span", null, `${etapas.length} ${etapas.length === 1 ? "etapa" : "etapas"}`));
  const lista = el("ol", "tray-lista");
  const filas = etapas.map(([club, d, h, x]) => {
    const fe = /ferro carril oeste/i.test(club);
    const li = el("li", fe ? "fe" : ""); li.append(el("time", null, anios(d, h)), el("b", null, fe ? "Ferro Carril Oeste" : club));
    if (nota(x)) li.append(el("small", null, nota(x)));
    return li;
  });
  filas.forEach(li => lista.append(li));
  const ocultas = filas.slice(0, Math.max(0, filas.length - ETAPAS_VISIBLES));
  ocultas.forEach(li => li.hidden = true);
  sec.append(cab, lista);
  if (ocultas.length) {
    const b = el("button", "tray-mas", `Ver las ${ocultas.length} etapas anteriores`); b.type = "button";
    b.addEventListener("click", () => { const abre = ocultas[0].hidden; ocultas.forEach(li => li.hidden = !abre); b.textContent = abre ? "Ver menos" : `Ver las ${ocultas.length} etapas anteriores`; });
    sec.append(b);
  }
  despuesDe.after(sec);
}
function ficha(n) {
  selF.value = n; const j = DATA.jugadores.find(x => x.jugador === n);
  { const fc = $("#ficha-cara"); fc.replaceWith(caraJug(n, "g", false, "ficha-cara")); }
  const k = $("#ficha-kpis"); k.textContent = "";
  [["Partidos", `${j.pj}`], ["Titular / suplente", `${j.titular}/${j.suplente}`], ["Minutos", miles(j.minutos)], ["Goles", j.goles], ["Amarillas / rojas", `${j.amarillas}/${j.rojas}`], ["Pts/p con él", f2(j.pts_partido_titular)], ["Pts/p sin él", f2(j.pts_partido_sin_el)]]
    .forEach(([l, v]) => { const d = el("div", "kpi"); d.append(el("div", "l", l), el("div", "v", String(v))); k.append(d); });
  trayectoria(j, k);
  const c = $("#c-ficha"); c.textContent = "";
  const mine = new Map(DATA.participaciones.filter(p => p.jugador === n).map(p => [p.fecha, p]));
  const fechas = DATA.partidos.slice().sort((a, b) => a.n - b.n).map(p => p.fecha), W = c.clientWidth || 600, H = 170, m = { t: 26, r: 4, b: 22, l: 30 };
  const bw = (W - m.l - m.r) / fechas.length, y = v => H - m.b - Math.min(90, v) / 90 * (H - m.t - m.b);
  const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Minutos por partido de " + n }, c);
  [0, 45, 90].forEach(v => { S("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: "var(--line)" }, svg); const t = S("text", { x: m.l - 6, y: y(v) + 4, "text-anchor": "end" }, svg); t.textContent = v + "'"; });
  const t = tip(c);
  fechas.forEach((f, i) => {
    const r = mine.get(f), x0 = m.l + i * bw + bw * 0.15, w = bw * 0.7;
    if (i % Math.ceil(fechas.length / Math.max(4, W / 40)) === 0) { const tl = S("text", { x: x0 + w / 2, y: H - 6, "text-anchor": "middle" }, svg); tl.textContent = "F" + f; }
    if (r) {
      S("rect", { x: x0, y: y(r.minutos), width: w, height: y(0) - y(r.minutos), rx: 2, fill: RESC[r.res], "fill-opacity": r.rol === "Suplente" ? .45 : 1 }, svg);
      for (let g = 0; g < r.goles; g++) S("circle", { cx: x0 + w / 2, cy: m.t - 8 - g * 9, r: 3.5, fill: "var(--ink)" }, svg);
      if (r.amarilla || r.roja) { const tc = S("text", { x: x0 + w / 2, y: y(r.minutos) - 4, "text-anchor": "middle" }, svg); tc.textContent = r.roja ? "✕" : "▮"; tc.setAttribute("style", `fill:${r.roja ? "var(--bad)" : "var(--warn)"};font-size:10px`); }
    } else S("rect", { x: x0, y: y(0) - 2, width: w, height: 2, fill: "var(--line)" }, svg);
    const hit = S("rect", { x: m.l + i * bw, y: 0, width: bw, height: H, fill: "transparent" }, svg);
    const p = DATA.partidos.find(z => z.fecha === f);
    hit.addEventListener("mouseenter", () => showTip(t, c, (x0 + w / 2) * c.clientWidth / W, 30, `F${f} · ${p.rival} ${p.gf}-${p.gc}`, r ? [`${r.rol}, ${r.minutos}'`, (r.goles ? r.goles + (r.goles > 1 ? " goles" : " gol") : "Sin goles") + (r.amarilla ? " · amarilla" : "") + (r.roja ? " · roja" : "")] : ["No jugó"]));
    hit.addEventListener("mouseleave", hideTip(t));
  });
  const fh = $("#ficha-h"); fh.textContent = "";
  const mis = TODOS.filter(x => x.jugador === n || (x.titulo || "").includes(n + " "));
  if (!mis.length) fh.append(el("div", "d", "Todavía sin hallazgos destacados para este jugador."));
  mis.forEach(x => fh.append(tarjeta(x, { enFicha: true })));
  limitar(fh, 3);
}

function comparar() {
  const a = DATA.jugadores.find(j => j.jugador === A.value), b = DATA.jugadores.find(j => j.jugador === B.value);
  const box = $("#cmp"); box.textContent = "";
  $("#cmp-ca").replaceWith(caraJug(A.value, "", false, "cmp-ca")); $("#cmp-cb").replaceWith(caraJug(B.value, "", false, "cmp-cb"));
  const met = [["Partidos", "pj", 1], ["Titularidades", "titular", 1], ["Minutos", "minutos", 1], ["Goles", "goles", 1], ["Goles desde el banco", "goles_suplente", 1], ["Minutos por gol", "minutos_por_gol", -1], ["Amarillas", "amarillas", -1], ["Pts/p con él titular", "pts_partido_titular", 1]];
  met.forEach(([lbl, k, dir]) => {
    const va = a[k], vb = b[k], mx = Math.max(va || 0, vb || 0) || 1;
    const mejor = va == null || vb == null || va === vb ? 0 : ((va > vb) === (dir > 0) ? -1 : 1);
    const fmt = v => v == null ? "—" : (k.startsWith("pts") ? f2(v) : miles(v));
    const ca = el("div", "a"); const ba = el("div", "bar"); ba.style.width = ((va || 0) / mx * 100) + "px"; const na = el("span", mejor === -1 ? "gana" : null, fmt(va)); ca.append(na, ba);
    const cb = el("div", "b"); const bb = el("div", "bar"); bb.style.width = ((vb || 0) / mx * 100) + "px"; const nb = el("span", mejor === 1 ? "gana" : null, fmt(vb)); cb.append(bb, nb);
    box.append(ca, el("div", "m", lbl), cb);
  });
}

export default {
  init() {
    const maxMin = Math.max(...DATA.jugadores.map(j => j.minutos));
    tabla("#t-jug", [
  { k: "jugador", h: "Jugador", l: 1, render: (td, v) => { td.append(caraJug(v, "ch"), document.createTextNode(v)); } }, { k: "pj", h: "PJ" }, { k: "titular", h: "Tit." }, { k: "suplente", h: "Sup.", x: 1 },
  { k: "minutos", h: "Minutos", render: (td, v) => { td.append(document.createTextNode(miles(v))); const b = el("span", "barra"); b.style.width = Math.round(v / maxMin * 60) + "px"; td.append(b); } },
  { k: "goles", h: "Goles" }, { k: "goles_suplente", h: "Desde el banco", x: 1 }, { k: "minutos_por_gol", h: "Min/gol", x: 1 }, { k: "amarillas", h: "Amar." }, { k: "rojas", h: "Rojas" },
  { k: "pts_partido_titular", h: "Pts/p con él", f: f2 }, { k: "pts_partido_sin_el", h: "Pts/p sin él", f: f2, x: 1 }
], DATA.jugadores, { sortable: true, sort: { k: "minutos", d: -1 } });
    columnasExtra($("#t-jug"));
    selF = $("#sel-ficha"); nombres.forEach(n => selF.append(new Option(n, n)));
    selF.addEventListener("change", e => ficha(e.target.value));
    A = $("#cmp-a"); B = $("#cmp-b"); nombres.forEach(n => { A.append(new Option(n, n)); B.append(new Option(n, n)); });
    A.value = nombres.includes("Parisi") ? "Parisi" : nombres[0]; B.value = nombres.includes("Dening") ? "Dening" : nombres[1];
    A.addEventListener("change", comparar); B.addEventListener("change", comparar);
    ficha(nombres.includes("Parisi") ? "Parisi" : nombres[0]); comparar();
  },
  // La ficha se dibuja con el ancho real, así que se redibuja al mostrarse.
  onShow(grupo, pagina, param) {
    if (grupo !== "jugadores" || pagina !== "ficha") return;
    const n = param && decodeURIComponent(param);
    if (n && nombres.includes(n)) ficha(n); else ficha(selF.value);
  },
};
