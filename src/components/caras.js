import { FOTOS_JUG } from "../ctx.js";
import { el } from "../lib/dom.js";

// ---------- caras de los jugadores ----------
export function caraJug(n, cls = "", soloSiHay = false, id = null) {
  const f = FOTOS_JUG[n];
  if (soloSiHay) return !!f;
  const c = el("div", "cara-j" + (cls ? " " + cls : "")); if (id) c.id = id;
  if (f) c.style.backgroundImage = `url(${f})`; else c.textContent = (n || "?").replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "").slice(0, 2).toUpperCase();
  c.setAttribute("aria-hidden", "true"); return c;
}
