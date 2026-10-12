import { caraJug } from "./caras.js";
import { abrirDesarrollo, tieneDesarrollo, desarrolloLargo } from "./desarrollo.js";
import { CAT } from "../lib/consts.js";
import { el } from "../lib/dom.js";
import { irAFicha } from "../lib/nav.js";

export function tarjeta(x, opts = {}) {
  const c = el("article", "h" + (x.tipo === "novedad" ? " nov" : ""));
  const tg = el("div", "tg"); const dot = el("i"); dot.style.background = (CAT[x.tipo] || ["", "var(--muted)"])[1];
  tg.append(dot, document.createTextNode((CAT[x.tipo] || [x.tipo])[0] + (x.extra ? " · " + x.extra : "")));
  if (x.jugador && caraJug(x.jugador, "", true)) { const fila = el("div", "quien-j"); fila.append(caraJug(x.jugador), el("div", "t", x.titulo)); c.append(tg, fila); }
  else c.append(tg, el("div", "t", x.titulo));
  const conDes = tieneDesarrollo(x);
  if (x.detalle) c.append(el("div", "d" + (desarrolloLargo(x) && x.tipo === "novedad" ? " corta" : ""), x.detalle));
  if (conDes) {
    c.classList.add("abre"); c.tabIndex = 0; c.setAttribute("role", "button"); c.setAttribute("aria-label", "Ver el desarrollo completo: " + x.titulo);
    c.append(el("span", "lee", desarrolloLargo(x) ? "Ver el desarrollo completo →" : "Ver más →"));
    c.addEventListener("click", e => { if (e.target.closest("a,button")) return; abrirDesarrollo(x); });
    c.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && e.target === c) { e.preventDefault(); abrirDesarrollo(x); } });
  }
  if (x.url && x.tipo === "novedad") { const a = el("a", null, "Ver fuente"); a.href = x.url; a.target = "_blank"; a.rel = "noopener"; a.style.fontSize = "13px"; c.append(a); }
  if (x.jugador && !opts.enFicha) { const b = el("button", "who", "Ver ficha de " + x.jugador); b.type = "button"; b.addEventListener("click", () => { irAFicha(x.jugador); }); c.append(b); }
  return c;
}
