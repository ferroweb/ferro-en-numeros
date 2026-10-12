import { DATA, ult, ferroT, nombres } from "../ctx.js";
import { tip, showTip, hideTip, tabla } from "../lib/charts.js";
import { RESC, FERRO } from "../lib/consts.js";
import { $, el, f2, miles, S, limitarTabla } from "../lib/dom.js";

function evol() {
  const c = $("#c-evol"); c.textContent = "";
  const ev = (DATA.historico && DATA.historico.evolucion && DATA.historico.evolucion.length) ? DATA.historico.evolucion : DATA.partidos.map(p => ({ fecha: p.n, "2026": p.pts_acum }));
  const W = c.clientWidth || 600, H = 280, m = { t: 14, r: 64, b: 28, l: 34 };
  const maxF = Math.max(...ev.map(r => r.fecha)), maxP = Math.max(...ev.flatMap(r => [r["2026"] || 0, r["2025"] || 0]));
  const x = f => m.l + (f - 1) / (maxF - 1) * (W - m.l - m.r), y = v => H - m.b - v / (Math.ceil(maxP / 10) * 10) * (H - m.t - m.b);
  const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Puntos acumulados 2026 y 2025" }, c);
  for (let v = 0; v <= Math.ceil(maxP / 10) * 10; v += 10) { S("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: "var(--line)" }, svg); const t = S("text", { x: m.l - 6, y: y(v) + 4, "text-anchor": "end" }, svg); t.textContent = v; }
  [1, 5, 10, 15, 20, 25, 30, maxF].filter((v, i, a) => a.indexOf(v) === i && v <= maxF).forEach(f => { const t = S("text", { x: x(f), y: H - 8, "text-anchor": "middle" }, svg); t.textContent = f; });
  const linea = (k, color, w) => { const pts = ev.filter(r => r[k] != null); if (!pts.length) return; S("path", { d: pts.map((r, i) => (i ? "L" : "M") + x(r.fecha) + "," + y(r[k])).join(" "), fill: "none", stroke: color, "stroke-width": w, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg); const l = pts[pts.length - 1]; const t = S("text", { x: x(l.fecha) + 8, y: y(l[k]) + 4 }, svg); t.textContent = `${k}: ${l[k]}`; t.setAttribute("style", `fill:${color};font-weight:700`); };
  linea("2025", "var(--lin25)", 2); linea("2026", "var(--verde)", 3);
  const t = tip(c);
  DATA.partidos.forEach(p => {
    const r = ev.find(e => e.fecha === p.n); if (!r || r["2026"] == null) return;
    const cx = x(p.n), cy = y(r["2026"]);
    S("circle", { cx, cy, r: 4.5, fill: RESC[p.resultado], stroke: "var(--panel)", "stroke-width": 1.5 }, svg);
    const hit = S("rect", { x: cx - 8, y: m.t, width: 16, height: H - m.t - m.b, fill: "transparent" }, svg);
    hit.addEventListener("mouseenter", () => showTip(t, c, cx * c.clientWidth / W, cy * c.clientWidth / W, `Partido ${p.n} · Fecha ${p.fecha} · ${p.condicion}`, [`${p.rival} ${p.gf}-${p.gc}`, `2026: ${r["2026"]} pts` + (r["2025"] != null ? ` · 2025: ${r["2025"]} pts` : "")]));
    hit.addEventListener("mouseleave", hideTip(t));
  });
}


function franjas() {
  const c = $("#c-franjas"); c.textContent = "";
  const rows = DATA.franjas, W = c.clientWidth || 340, H = 220, m = { t: 10, r: 6, b: 26, l: 26 };
  const max = Math.max(...rows.flatMap(r => [r.a_favor, r.en_contra])) + 1;
  const bw = (W - m.l - m.r) / rows.length, y = v => H - m.b - v / max * (H - m.t - m.b);
  const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Goles por franja" }, c);
  for (let v = 0; v <= max; v += 2) { S("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: "var(--line)" }, svg); const t = S("text", { x: m.l - 6, y: y(v) + 4, "text-anchor": "end" }, svg); t.textContent = v; }
  const t = tip(c);
  rows.forEach((r, i) => {
    const x0 = m.l + i * bw, w = Math.min(22, bw * 0.34);
    [[r.a_favor, "var(--verde)", -1], [r.en_contra, "var(--bad)", 1]].forEach(([v, col, s]) => {
      const bx = x0 + bw / 2 + (s < 0 ? -w - 2 : 2);
      S("rect", { x: bx, y: y(v), width: w, height: Math.max(0, y(0) - y(v)), rx: 3, fill: col }, svg);
      const tv = S("text", { x: bx + w / 2, y: y(v) - 4, "text-anchor": "middle" }, svg); tv.textContent = v;
    });
    const tl = S("text", { x: x0 + bw / 2, y: H - 8, "text-anchor": "middle" }, svg); tl.textContent = r.franja;
  });
}


function historia() {
  const H = DATA.historico; if (!H || !H.temporadas.length) { $('[data-tab="vs-2025"]').hidden = true; return; }
  const cur = H.temporadas[0], ant = H.temporadas[1];
  $("#temp-nota").textContent = `"Misma altura" compara las primeras ${cur.fechas_jugadas} fechas de cada torneo. ${ant ? ant.temporada + " se jugó completo (" + ant.fechas_jugadas + " fechas)." : ""}`;
  const filas = [["Puntos", "pts"], ["Ganados", "g"], ["Empatados", "e"], ["Perdidos", "p"], ["Goles a favor", "gf"], ["Goles en contra", "gc"], ["Vallas invictas", "vallas"], ["Puntos por partido", "ppp"]];
  const rows = filas.map(([l, k]) => { const r = { m: l }; H.temporadas.forEach(t => { r["a" + t.temporada] = t["misma_altura_" + k]; r["t" + t.temporada] = t["total_" + k]; }); return r; });
  const ferroPts = ferroT ? ferroT.pts : null;
  if (ferroPts != null) rows[0]["a" + cur.temporada] = ferroPts;
  const cols = [{ k: "m", h: "", l: 1 }, ...H.temporadas.map(t => ({ k: "a" + t.temporada, h: `${t.temporada} · F1-${cur.fechas_jugadas}`, f: v => typeof v === "number" && !Number.isInteger(v) ? f2(v) : (v ?? "—") })),
    ...H.temporadas.slice(1).map(t => ({ k: "t" + t.temporada, h: `${t.temporada} completo`, f: v => typeof v === "number" && !Number.isInteger(v) ? f2(v) : (v ?? "—") }))];
  tabla("#t-temp", cols, rows);
  tabla("#t-h2h", [{ k: "rival", h: "Rival", l: 1 }, { k: "partidos", h: "PJ" }, { k: "g", h: "G" }, { k: "e", h: "E" }, { k: "p", h: "P" }, { k: "gf", h: "GF" }, { k: "gc", h: "GC" }, { k: "detalle", h: "Partidos", l: 1 }],
    H.h2h.slice().sort((a, b) => (b.g * 3 + b.e) / b.partidos - (a.g * 3 + a.e) / a.partidos));
  const porJ = {}; H.jugadores.forEach(r => { (porJ[r.jugador] = porJ[r.jugador] || {})[r.temporada] = r; });
  const anios = H.temporadas.map(t => t.temporada);
  const filasJ = Object.entries(porJ).filter(([n, v]) => anios.every(a => v[a]) && nombres.includes(n)).map(([n, v]) => {
    const r = { jugador: n }; anios.forEach(a => { r["m" + a] = v[a].min; r["g" + a] = v[a].goles; }); return r; });
  tabla("#t-jt", [{ k: "jugador", h: "Jugador", l: 1 }, ...anios.slice().reverse().flatMap(a => [{ k: "m" + a, h: `Min ${a}`, f: miles }, { k: "g" + a, h: `Goles ${a}` }])], filasJ, { sortable: true, sort: { k: "m" + cur.temporada, d: -1 } });
}

export function initUltimas() {
  const box = $("#ult"); box.textContent = "";
  if (!DATA.ultimas.length) { $("#ult").hidden = true; return; }
  DATA.ultimas.forEach(u => {
    const c = el("div", "u" + (u.veces === 0 ? " nunca" : u.hace === 0 ? " ahora" : ""));
    c.append(el("div", "s", u.situacion));
    const hc = el("div", "hc");
    if (u.veces === 0) { hc.append(el("b", null, "Nunca")); hc.append(el("span", null, "en los datos cargados")); }
    else if (u.hace === 0) { hc.append(el("b", null, "Ahora")); hc.append(el("span", null, "fue en el último partido")); }
    else { hc.append(el("b", null, String(u.hace))); hc.append(el("span", null, u.hace === 1 ? "partido atrás" : "partidos atrás")); }
    c.append(hc, el("div", "q", u.ultima));
    if (u.veces) c.append(el("div", "s", `${u.veces} ${u.veces === 1 ? "vez" : "veces"} desde ${DATA.historico && DATA.historico.temporadas.length ? Math.min(...DATA.historico.temporadas.map(t => t.temporada)) : 2026}`));
    box.append(c);
  });
}

function filtroPartidos() {
  const q = $("#fp-q");
  const norm = s => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const aplicar = () => { const v = norm(q.value.trim()); document.querySelectorAll("#t-part tbody tr").forEach(tr => { tr.hidden = !!v && !norm(tr.textContent).includes(v); }); };
  q.addEventListener("input", aplicar);
  return (v) => { q.value = v || ""; aplicar(); };
}

let filtrar, filtroAplicado;
export default {
  init() {
    tabla("#t-rend", [{ k: "corte", h: "Situación", l: 1 }, { k: "pj", h: "PJ" }, { k: "g", h: "G" }, { k: "e", h: "E" }, { k: "p", h: "P" }, { k: "gf", h: "GF" }, { k: "gc", h: "GC" }, { k: "ppp", h: "Pts/p", f: f2 }], DATA.rendimiento);
    tabla("#t-tabla", [{ k: "pos", h: "#" }, { k: "equipo", h: "Equipo", l: 1 }, { k: "pts", h: "Pts" }, { k: "pj", h: "PJ" }, { k: "g", h: "G" }, { k: "e", h: "E" }, { k: "p", h: "P" }, { k: "gf", h: "GF" }, { k: "gc", h: "GC" }, { k: "dg", h: "DG" }],
  DATA.tabla.slice().sort((a, b) => a.pos - b.pos), { yo: r => r.equipo === FERRO });
    tabla("#t-part", [
  { k: "fecha", h: "F", render: (td, v, r) => { if (!r.sintesis) { td.textContent = "F" + v; return; } const a = el("a", null, "F" + v); a.href = r.sintesis; a.target = "_blank"; a.rel = "noopener"; if (r.nota) a.title = r.nota; td.append(a); } },
  { k: "rival", h: "Rival", l: 1 }, { k: "condicion", h: "", l: 1, f: v => v === "Local" ? "L" : "V" },
  { k: "resultado", h: "Res.", render: (td, v, r) => td.append(el("span", "pill " + v, `${r.gf}-${r.gc}`)) },
  { k: "goleadores", h: "Goles de Ferro", l: 1, f: v => v === "—" ? "—" : v.replace(/(\d+)(pt|st)/g, "$1'$2") }, { k: "arbitro", h: "Árbitro", l: 1 }
], DATA.partidos.slice().sort((a, b) => b.fecha - a.fecha));
    $("#tabla-p").textContent = DATA.tabla_fuente ? `Tabla de ${DATA.tabla_fuente.fuente} (${DATA.tabla_fuente.actualizada}).` : "";
    filtrar = filtroPartidos();
    historia(); initUltimas(); evol(); franjas();
    limitarTabla($("#t-rend"), 6); limitarTabla($("#t-jt"), 8);
  },
  onShow(grupo, pagina, param) {
    if (grupo !== "equipo") return;
    evol(); franjas();
    if (pagina === "resultados" && param !== filtroAplicado) { filtroAplicado = param; filtrar(param ? decodeURIComponent(param) : ""); }
  },
};
