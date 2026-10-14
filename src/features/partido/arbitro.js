import { DATA, prox, previaAlDia } from "../../ctx.js";
import { tabla } from "../../lib/charts.js";
import { $, el, f2, limitarTabla } from "../../lib/dom.js";

export function initArbitro() {
  const A = DATA.arbitros, sec = $('[data-tab="arbitro"]'); if (!A) { document.querySelectorAll('[data-tab="arbitro"], [data-tab="arbitros"]').forEach(t => { t.hidden = true; }); return; }
  const d = A.designado, nom = A.designado_nombre, hu = prox && prox.arbitro_humor;
  const caja = $("#arb-caja");
  if (!nom || !previaAlDia) { caja.hidden = true; }
  else {
    $("#arb-eti").textContent = `El árbitro del domingo · F${prox.fecha} vs ${prox.rival}`;
    $("#arb-t").textContent = hu && hu.titulo ? hu.titulo : nom;
    if (prox.arbitro_foto) {   // foto recortada en public/img/arbitros (con crédito del medio)
      const ico = caja.querySelector(".arb-ico"), im = el("img");
      im.src = import.meta.env.BASE_URL + prox.arbitro_foto; im.alt = nom; im.loading = "lazy";
      ico.textContent = ""; ico.classList.add("con-foto"); ico.removeAttribute("aria-hidden"); ico.append(im);
    }
    $("#arb-i").textContent = hu && hu.intro ? hu.intro : (d ? `${nom} ya nos dirigió ${d.pj} ${d.pj === 1 ? "vez" : "veces"}.` : `${nom} nunca nos dirigió en los partidos cargados. Primera cita.`);
    const k = $("#arb-kpis");
    if (d) {
      const f2 = v => v.toLocaleString("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 2 });
      [["Partidos con él", d.pj, false], ["G · E · P", `${d.g}·${d.e}·${d.p}`, d.g === 0], ["Pts/p con él", f2(d.pts_p), d.pts_p < A.prom_pts], ["Pts/p en el torneo", f2(A.prom_pts), false], ["Amarillas/p con él", f2(d.am_p), d.am_p > A.prom_am], ["Amarillas/p en el torneo", f2(A.prom_am), false], ["Goles a favor / en contra", `${d.gf}/${d.gc}`, d.gc > d.gf]]
        .forEach(([l, v, malo]) => { const x = el("div", "kpi" + (malo ? " malo" : "")); x.append(el("div", "l", l), el("div", "v", String(v))); k.append(x); });
      const ps = $("#arb-ps");
      d.partidos.forEach(p => { const r = p.gf > p.gc ? "G" : p.gf === p.gc ? "E" : "P"; const x = el("div", "arb-p"); x.append(el("span", "pill " + r, `${p.gf}-${p.gc}`), document.createTextNode(` ${p.temporada} F${p.fecha} · ${p.rival} (${p.cond === "L" ? "local" : "visitante"}) · ${p.am} amarillas`)); ps.append(x); });
    } else k.hidden = true;
    const l = $("#arb-l"); (hu && hu.puntos || []).forEach(([a, b]) => { const li = el("li"); li.append(el("b", null, a), el("span", null, b)); l.append(li); });
    const cs = $("#arb-cons"); (hu && hu.consejos || []).forEach(t => cs.append(el("li", null, t))); if (!(hu && hu.consejos && hu.consejos.length)) cs.parentElement.hidden = true;
    $("#arb-c").textContent = hu && hu.cierre || "";
    const medio = (() => { try { return new URL(prox.arbitro_fuente).hostname.replace(/^www\./, ""); } catch { return "Solo Ascenso"; } })();
    $("#arb-f").textContent = `Humor de tribuna con números reales: es cábala y estadística, no una acusación. Designación: AFA, publicada por ${medio}.` + (prox.arbitro_foto_credito ? ` Foto: ${prox.arbitro_foto_credito}.` : "");
  }
  tabla("#t-arb", [{ k: "arbitro", h: "Árbitro", l: 1 }, { k: "pj", h: "PJ" }, { k: "g", h: "G" }, { k: "e", h: "E" }, { k: "p", h: "P" }, { k: "gf", h: "GF" }, { k: "gc", h: "GC" }, { k: "pts_p", h: "Pts/p", f: v => v.toLocaleString("es-AR", { minimumFractionDigits: 2 }) }, { k: "am_p", h: "Amar./p", f: v => v.toLocaleString("es-AR", { minimumFractionDigits: 2 }) }, { k: "ro", h: "Rojas" }],
    A.tabla, { sortable: true, sort: { k: "pj", d: -1 }, yo: r => r.arbitro === nom });
  limitarTabla($("#t-arb"), 8);
}
