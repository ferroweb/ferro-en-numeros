import { prox, FOTOS_JUG } from "../../ctx.js";
import { $, el, S, limitar } from "../../lib/dom.js";

export function initPizarra() {
  const Z = prox && prox.pizarra; const box = $("#pizarra"); if (!box) return;
  if (!Z) { box.hidden = true; return; }
  $("#pz-intro").textContent = Z.intro || "";
  const pf = $("#pz-perfil"); (Z.perfil || []).forEach(([t, d]) => { const x = el("div"); x.append(el("b", null, t), document.createTextNode(d)); pf.append(x); });
  $("#pz-sis").textContent = `Nuestro once probable · ${Z.sistema || ""}`;
  $("#pz-once-nota").textContent = Z.once_nota || "";
  // cancha
  const W = 320, H = 400, c = $("#pz-cancha"); c.textContent = "";
  const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Once probable en la cancha: " + (Z.once || []).flat().join(", ") }, c);
  S("rect", { x: 0, y: 0, width: W, height: H, fill: "#1f7a3f" }, svg);
  for (let i = 0; i < 8; i++) S("rect", { x: 0, y: i * H / 8, width: W, height: H / 16, fill: "#23853f" }, svg);
  const ln = { fill: "none", stroke: "rgba(255,255,255,.75)", "stroke-width": 2 };
  S("rect", Object.assign({ x: 10, y: 10, width: W - 20, height: H - 20 }, ln), svg);
  S("line", Object.assign({ x1: 10, y1: H / 2, x2: W - 10, y2: H / 2 }, ln), svg);
  S("circle", Object.assign({ cx: W / 2, cy: H / 2, r: 36 }, ln), svg);
  S("rect", Object.assign({ x: W / 2 - 70, y: H - 70, width: 140, height: 60 }, ln), svg);
  S("rect", Object.assign({ x: W / 2 - 70, y: 10, width: 140, height: 60 }, ln), svg);
  const defs = S("defs", {}, svg);
  const filas = Z.once || [], n = filas.length;
  filas.forEach((fila, fi) => {
    const y = H - 46 - fi * ((H - 100) / Math.max(1, n - 1));
    fila.forEach((j, k) => {
      const x = W * (k + 1) / (fila.length + 1), r = 19, f = FOTOS_JUG[j];
      S("circle", { cx: x, cy: y, r: r + 2.5, fill: "#fff" }, svg);
      if (f) {
        const id = "pz" + fi + "_" + k; const cp = S("clipPath", { id }, defs); S("circle", { cx: x, cy: y, r }, cp);
        const im = S("image", { x: x - r, y: y - r, width: 2 * r, height: 2 * r, "clip-path": `url(#${id})`, preserveAspectRatio: "xMidYMid slice" }, svg); im.setAttribute("href", f);
      } else { S("circle", { cx: x, cy: y, r, fill: "#0b5e30" }, svg); const t = S("text", { x, y: y + 4, "text-anchor": "middle" }, svg); t.textContent = j.slice(0, 2).toUpperCase(); }
      const tb = S("text", { x, y: y + r + 14, "text-anchor": "middle", style: "paint-order:stroke;stroke:#0d4d26;stroke-width:3px" }, svg); tb.textContent = j;
    });
  });
  const li = (ul, arr) => (arr || []).forEach(([t, d]) => { const x = el("li"); x.append(el("b", null, t), el("span", null, d)); ul.append(x); });
  li($("#pz-ins"), Z.instrucciones); li($("#pz-deb"), Z.debilidades); li($("#pz-cui"), Z.cuidado);
  limitar(pf, 3); limitar($("#pz-ins"), 5); limitar($("#pz-deb"), 3); limitar($("#pz-cui"), 3);
  $("#pz-cierre").textContent = Z.cierre || "";
  if (Z.frase && Z.frase.texto) { $("#pz-frase").hidden = false; $("#pz-fr-t").textContent = Z.frase.texto; $("#pz-fr-a").textContent = "— " + Z.frase.autor; $("#pz-fr-p").textContent = Z.frase.por_que || ""; }
}
