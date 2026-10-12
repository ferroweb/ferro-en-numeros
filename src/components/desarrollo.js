import { accionesDelDetalle } from "./compartir.js";
import { caraJug } from "./caras.js";
import { DATA, prox, FOTOS_JUG } from "../ctx.js";
import { CAT } from "../lib/consts.js";
import { $, el, f2 } from "../lib/dom.js";
import { irAFicha } from "../lib/nav.js";

export function tieneDesarrollo(x) { return !!(x && x.titulo); }
export function desarrolloLargo(x) { return !!((x.desarrollo && x.desarrollo.length) || (x.datos && x.datos.length)); }
export function abrirDesarrollo(x) {
  const dlg = $("#des"), c = $("#des-c"); c.textContent = "";
  $("#des-tg").textContent = ((CAT[x.tipo] || [x.tipo])[0]) + (x.extra ? " · " + x.extra : "") + (x.fuente ? " · " + x.fuente : "");
  $("#des-t").textContent = x.titulo;
  let datos = x.datos;
  const jug = x.jugador && DATA.jugadores.find(j => j.jugador === x.jugador);
  if ((!datos || !datos.length) && jug) { const f2 = v => v == null ? "—" : v.toLocaleString("es-AR", { maximumFractionDigits: 2 }); datos = [["Partidos", `${jug.pj} (${jug.titular} de titular)`], ["Minutos", jug.minutos.toLocaleString("es-AR")], ["Goles", String(jug.goles)], ["Amarillas / rojas", `${jug.amarillas} / ${jug.rojas}`], ["Pts/p con él titular", f2(jug.pts_partido_titular)], ["Pts/p sin él", f2(jug.pts_partido_sin_el)]]; }
  if (jug && FOTOS_JUG[x.jugador]) { const top = el("div", "des-jug"); top.append(caraJug(x.jugador, "g"), el("b", null, x.jugador)); c.append(top); }
  x = Object.assign({}, x, { datos });
  if (x.datos && x.datos.length) { const g = el("div", "dd"); x.datos.forEach(([l, v]) => { const d = el("div"); d.append(el("div", "l", l), el("div", "v", v)); g.append(d); }); c.append(g); }
  const pars = x.desarrollo && x.desarrollo.length ? x.desarrollo : (x.detalle ? [x.detalle] : []);
  pars.forEach(t => c.append(el("p", null, t)));
  // hallazgos relacionados: mismo jugador o mismo rival mencionado
  const claves = [];
  if (x.jugador) claves.push(x.jugador);
  if (prox && (x.titulo + " " + (x.detalle || "")).includes(prox.rival)) claves.push(prox.rival);
  DATA.jugadores && DATA.jugadores.forEach(j => { const n = j.jugador || j.nombre; if (n && n.length > 3 && new RegExp("\\b" + n + "\\b").test(x.titulo)) claves.push(n); });
  const rel = claves.length ? DATA.hallazgos.filter(h => h.titulo !== x.titulo && claves.some(k => (h.titulo + " " + (h.detalle || "")).includes(k))).slice(0, 4) : [];
  if (rel.length) { c.append(el("h4", null, "Hallazgos relacionados")); const r = el("div", "rel"); rel.forEach(h => { const d = el("div"); d.append(el("b", null, h.titulo)); if (h.detalle) d.append(document.createTextNode(h.detalle)); r.append(d); }); c.append(r); }
  if (jug) { const b = el("button", "pv-cerrar", `Ver la ficha completa de ${x.jugador} →`); b.type = "button"; b.addEventListener("click", () => { $("#des").close(); irAFicha(x.jugador); }); c.append(b); }
  if (x.url) { const a = el("a", null, "Ver la fuente →"); a.href = x.url; a.target = "_blank"; a.rel = "noopener"; c.append(a); }
  c.append(accionesDelDetalle(x, c, x.titulo, location.origin + location.pathname + "#/datos/hallazgos"));
  if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
  c.scrollTop = 0; dlg.scrollTop = 0;
}

export function initDesarrollo() {
  $("#des-x").addEventListener("click", () => $("#des").close());
  $("#des").addEventListener("click", e => { if (e.target.id === "des") $("#des").close(); });
}
