import { PS } from "../lib/prode-state.js";
import { abrirDesarrollo, tieneDesarrollo } from "../components/desarrollo.js";
import { tarjeta } from "../components/tarjeta.js";
import { DATA, prox, ult, ferroT, segundo, TODOS, FOTOS_FW, previaAlDia, novedadVigente } from "../ctx.js";
import { tabla } from "../lib/charts.js";
import { FERRO } from "../lib/consts.js";
import { $, el, S } from "../lib/dom.js";
import { fechaLarga } from "../lib/fmt.js";
import { cargarHtml2canvas } from "../lib/html2canvas.js";

function marcador() {
$("#meta").textContent = `Primera Nacional 2026 · Grupo 1 · al cierre de la fecha ${DATA.ultima_fecha}. Actualizado ${DATA.actualizado}`;
const dest = (DATA.novedades || []).find(novedadVigente) || DATA.hallazgos.find(h => h.tipo !== "tabla") || DATA.hallazgos[0];
$("#dest-eti").textContent = dest.fuente ? `Novedad · ${dest.fecha}` : "Hallazgo destacado";
$("#dest-t").textContent = dest.titulo; $("#dest-d").textContent = dest.detalle || "";
{
  const dx = dest.fuente ? { tipo: "novedad", titulo: dest.titulo, detalle: dest.detalle, extra: dest.fecha, url: dest.url, fuente: dest.fuente, desarrollo: dest.desarrollo, datos: dest.datos } : { tipo: dest.tipo, titulo: dest.titulo, detalle: dest.detalle, jugador: dest.jugador };
  if (tieneDesarrollo(dx)) {
    const dd = $(".destacado"); dd.classList.add("abre"); dd.tabIndex = 0; dd.setAttribute("role", "button");
    dd.append(el("span", "lee", "Ver el desarrollo completo →"));
    dd.addEventListener("click", () => abrirDesarrollo(dx));
    dd.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrirDesarrollo(dx); } });
  }
}
const celdas = [
  ["Posición", ferroT ? ferroT.pos + "°" : "—"],
  ["Puntos", ferroT ? ferroT.pts : "—"],
  ["Ventaja", ferroT && segundo ? (ferroT.pts - segundo.pts > 0 ? "+" : "") + (ferroT.pts - segundo.pts) : "—", segundo ? "sobre " + segundo.equipo.replace("Deportivo ", "") : ""],
  ["G · E · P", ferroT ? `${ferroT.g}·${ferroT.e}·${ferroT.p}` : "—"],
  ["Goles", ferroT ? `${ferroT.gf}<small>/${ferroT.gc}</small>` : "—", "a favor / en contra"],
  ["Fechas restantes", DATA.escenarios ? DATA.escenarios.restan : "—"],
];
celdas.forEach(([l, v, sub]) => { const c = el("div", "celda"); c.append(el("div", "l", l)); const vv = el("div", "v num"); vv.innerHTML = String(v).replace(/[^0-9·+\-°<>/a-z]/gi, ""); c.append(vv); if (sub) c.append(el("div", "l", sub)); $("#tablero").append(c); });
const cinta = $("#cinta");
const span = (lbl, val) => { const s = el("span"); s.append(lbl + " "); s.append(el("b", null, val)); return s; };
cinta.append(span("Último:", `F${ult.fecha} ${ult.condicion === "Local" ? "Ferro " + ult.gf + "-" + ult.gc + " " + ult.rival : ult.rival + " " + ult.gc + "-" + ult.gf + " Ferro"}`));
if (prox) cinta.append(span("Próximo:", `F${prox.fecha} ${prox.rival} (${prox.cond === "L" ? "local" : "visitante"})${prox.dia ? " · " + fechaLarga(prox.dia).replace("-", "\u2011") + (prox.hora ? " " + prox.hora : "") : ""}`));
cinta.append(span("Hallazgos activos:", String(DATA.hallazgos.length + (DATA.novedades || []).length)));
}

export function initNovedadesHoy() {
  const N = (DATA.novedades || []).filter(novedadVigente); if (!N.length) return;
  const ult = N.map(n => n.fecha).sort().pop(); const hoyL = N.filter(n => n.fecha === ult);
  const hoyIso = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const dias = Math.round((new Date(hoyIso) - new Date(ult)) / 864e5);
  $("#hoy").hidden = false; $("#nav-hoy").hidden = false;
  $("#hoy-t").textContent = dias === 0 ? "Las novedades de hoy" : dias === 1 ? "Las novedades de ayer" : "Las últimas novedades";
  $("#hoy-f").textContent = fechaLarga(ult) + ` · ${hoyL.length} ${hoyL.length === 1 ? "hallazgo nuevo" : "hallazgos nuevos"}`;
  { const url = "https://ferroweb.github.io/ferro-en-numeros/", btn = $("#hoy-wa"), msg = $("#hoy-wa-msg");
    const armar = () => {
      const P = el("div", "placa-n"); const cab = el("div", "pc"); const izq = el("div");
      izq.append(el("span", "eti", "FERRO EN NÚMEROS"), el("h1", null, dias === 0 ? "Las novedades de hoy" : "Últimas novedades"), el("div", "f", fechaLarga(ult) + " · Hablemos de Ferro"));
      const lg = document.querySelector(".fwlogo"); cab.append(izq); if (lg) { const im = el("img"); im.src = lg.src; cab.append(im); } P.append(cab);
      hoyL.slice(0, 3).forEach(n => { const c = el("div", "card"); const dd = (n.detalle || "").split(/(?<=\.)\s/)[0]; c.append(el("div", "t", n.titulo), el("div", "d", dd.length > 170 ? dd.slice(0, 167).replace(/\s\S*$/, "") + "…" : dd));
        if (n.datos && n.datos.length) { const t = el("div", "tiles"); n.datos.slice(0, 3).forEach(([l, v]) => { const x = el("div", "tile"); x.append(el("b", null, String(v).split(" · ")[0]), el("span", null, l + (String(v).includes(" · ") ? " · " + String(v).split(" · ").slice(1).join(" · ") : ""))); t.append(x); }); c.append(t); }
        P.append(c); });
      const pie = el("div", "pn-pie"), px = el("div", "px");
      if (prox) { const F = DATA.fw; px.append(document.createTextNode(`Próximo: ${prox.cond === "L" ? "Ferro vs " + prox.rival : prox.rival + " vs Ferro"}${prox.dia ? " · " + fechaLarga(prox.dia).replace("-", "\u2011") + (prox.hora ? " " + prox.hora : "") : ""}`)); if (F && F.fecha === prox.fecha) { px.append(el("br")); const e = el("em", null, `Pronóstico FW: ${prox.cond === "L" ? `Ferro ${F.gf}-${F.gc} ${prox.rival}` : `${prox.rival} ${F.gc}-${F.gf} Ferro`}${F.autores && F.autores.length ? " (" + F.autores.join(", ") + ")" : ""}`); px.append(e); } }
      pie.append(px, el("div", "pu", "ferroweb.github.io/ferro-en-numeros")); P.append(pie);
      document.body.append(P); return P;
    };
    const lib = cargarHtml2canvas;
    btn.addEventListener("click", async () => {
      msg.textContent = "Armando la imagen…"; btn.disabled = true;
      try {
        await lib(); const P = armar(); const cv = await window.html2canvas(P, { scale: 1, backgroundColor: null, useCORS: true }); P.remove();
        const blob = await new Promise(r => cv.toBlob(r, "image/png")); const file = new File([blob], `ferro-novedades-${ult}.png`, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: "🆕 Novedades de Ferro en números 💚 " + url }); msg.textContent = ""; }
        else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.append(a); a.click(); a.remove(); msg.textContent = "Se descargó la imagen: adjuntala en el grupo de WhatsApp. (Desde el celu se comparte directo.)"; }
      } catch (e) { if (e && e.name === "AbortError") msg.textContent = ""; else msg.textContent = "No se pudo armar la imagen. Probá de nuevo."; }
      btn.disabled = false;
    });
  }
  const box = $("#hoy-l"); hoyL.forEach(n => box.append(tarjeta({ id: n.id, tipo: "novedad", titulo: n.titulo, detalle: n.detalle, extra: n.fecha, url: n.url, fuente: n.fuente, desarrollo: n.desarrollo, datos: n.datos, partidos: n.partidos })));
}

export function initPlaca() {
  const btn = $("#pp-btn"), msg = $("#pp-msg"); if (!btn) return;
  const u = DATA.partidos.slice().sort((a, b) => b.n - a.n)[0]; if (!u) { btn.hidden = true; return; }
  btn.textContent = `📲 Placa de Ferro ${u.gf}-${u.gc} ${u.rival} para WhatsApp`;
  const lib = cargarHtml2canvas;
  const armar = () => {
    const P = el("div", "placa-n"); const cab = el("div", "pc"), izq = el("div");
    izq.append(el("span", "eti", `FECHA ${u.fecha} · ${u.condicion === "Local" ? "EN CABALLITO" : "DE VISITANTE"}`), el("h1", null, u.condicion === "Local" ? `Ferro ${u.gf}-${u.gc} ${u.rival}` : `${u.rival} ${u.gc}-${u.gf} Ferro`), el("div", "f", u.gf > u.gc ? "¡Ganamos! 💚" : u.gf === u.gc ? "Empatamos" : "Perdimos"));
    const lg = document.querySelector(".fwlogo"); cab.append(izq); if (lg) { const im = el("img"); im.src = lg.src; cab.append(im); } P.append(cab);
    const c1 = el("div", "card"); c1.append(el("div", "t", "⚽ Goles de Ferro"), el("div", "d", u.goleadores && u.goleadores !== "—" ? u.goleadores.replace(/(\d+)(pt|st)/g, "$1'$2") : "No hubo goles nuestros.")); P.append(c1);
    const tb = DATA.tabla.slice().sort((a, b) => a.pos - b.pos).slice(0, 4), c2 = el("div", "card"); c2.append(el("div", "t", "📊 Así quedó la punta")); const ti = el("div", "tiles"); tb.forEach(r => { const x = el("div", "tile"); x.append(el("b", null, `${r.pos}° · ${r.pts}`), el("span", null, r.equipo.replace("Deportivo ", "").replace("Ferro Carril Oeste", "Ferro"))); ti.append(x); }); c2.append(ti); P.append(c2);
    const R = PS.data, pf = R && R.preds && R.preds[u.fecha]; const fw = (DATA.fw_historial || []).find(h => h.fecha === u.fecha);
    const c3 = el("div", "card"); c3.append(el("div", "t", "🏆 El Prode de la fecha"));
    const lineas = []; if (fw) lineas.push(`La Máquina dijo ${fw.gf}-${fw.gc}${fw.goleador ? " con gol de " + fw.goleador : ""}: ${fw.exacto_ok ? "¡exacto!" : fw.signo_ok ? "acertó el resultado" : "le erró"}.`);
    if (pf) { const ex = Object.entries(pf).filter(([n, p]) => p.gf === u.gf && p.gc === u.gc).map(([n]) => cortoN(n)); const ac = Object.entries(pf).filter(([n, p]) => Math.sign(p.gf - p.gc) === Math.sign(u.gf - u.gc) && !(p.gf === u.gf && p.gc === u.gc)).map(([n]) => cortoN(n)); lineas.push(ex.length ? `Exacto: ${ex.join(", ")} 🎯` : "Nadie le pegó al exacto."); if (ac.length) lineas.push(`Acertaron el resultado: ${ac.join(", ")}.`); }
    c3.append(el("div", "d", lineas.join(" ") || "Todavía no hay pronósticos cargados para esta fecha.")); P.append(c3);
    { const E = DATA.escenarios, F = DATA.fw, c4 = el("div", "card"); c4.append(el("div", "t", "🔮 Lo que viene")); const l = [];
      if (E && E.quedan) { const seg = (E.perseguidores || [])[0]; l.push(`Quedan ${E.quedan.length} ${E.quedan.length === 1 ? "fecha" : "fechas"}${seg ? ` y le llevamos ${E.ferro - seg.pts} a ${seg.equipo.replace("Deportivo ", "")}` : ""}.`); if (E.necesita_para_asegurar != null) l.push(E.necesita_para_asegurar ? `Con ${E.necesita_para_asegurar} de ${3 * E.quedan.length} puntos terminamos primeros sin mirar a nadie.` : "¡Ya no nos alcanza nadie!"); }
      if (prox && F && F.fecha === prox.fecha) l.push(`Pronóstico FW para ${prox.rival}: ${prox.cond === "L" ? `Ferro ${F.gf}-${F.gc}` : `${F.gc}-${F.gf} Ferro`}${F.autores && F.autores.length ? ", gol de " + [...new Set(F.autores)].join(" y ") : ""}.`);
      c4.append(el("div", "d", l.join(" "))); P.append(c4); }
    const pie = el("div", "pn-pie"), px = el("div", "px"); if (prox) px.append(document.createTextNode(`Próximo: ${prox.cond === "L" ? "Ferro vs " + prox.rival : prox.rival + " vs Ferro"}${prox.dia ? " · " + fechaLarga(prox.dia).replace("-", "\u2011") : ""}`)); pie.append(px, el("div", "pu", "ferroweb.github.io/ferro-en-numeros")); P.append(pie);
    document.body.append(P); return P;
  };
  const cortoN = n => ({ "Ignacio Carrión": "Nacho" })[n] || n.split(" ")[0];
  btn.addEventListener("click", async () => {
    msg.textContent = "Armando la placa…"; btn.disabled = true;
    try { await lib(); const P = armar(); const cv = await window.html2canvas(P, { scale: 1, backgroundColor: null }); P.remove();
      const blob = await new Promise(r => cv.toBlob(r, "image/png")); const file = new File([blob], `ferro-F${u.fecha}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: "Ferro en números 💚 https://ferroweb.github.io/ferro-en-numeros/" }); msg.textContent = ""; }
      else { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.append(a); a.click(); a.remove(); msg.textContent = "Se descargó la placa: adjuntala en el grupo. (Desde el celu se comparte directo.)"; }
    } catch (e) { msg.textContent = e && e.name === "AbortError" ? "" : "No se pudo armar la placa. Probá de nuevo."; }
    btn.disabled = false;
  });
}

export function initCartel() {
  const NOMBRES = ["Gaby Zimmerman", "Nico Casillo", "Ignacio Carrión", "Balta Alcaide", "Román Da Silva", "Guille Criscuolli", "Vitto Bianchi", "Ale Zarate"];
  const pool = TODOS.filter(x => x.tipo !== "tabla" && !/diferencia|corregido/i.test(x.titulo));
  if (!pool.length) { $("#cartel").hidden = true; return; }
  let ni = Math.floor(Math.random() * NOMBRES.length), hi = Math.floor(Math.random() * pool.length);
  const q = $("#quien"), h = $("#cartel-h"); let actual = null;
  const ct = $("#cartel"); ct.classList.add("abre"); ct.tabIndex = 0; ct.setAttribute("role", "button"); ct.setAttribute("aria-label", "Ver el hallazgo completo");
  const ver = el("span", "lee", "Tocá para ver el hallazgo completo →"); $(".cartel-tx").append(ver);
  ct.addEventListener("click", () => actual && abrirDesarrollo(actual));
  ct.addEventListener("keydown", e => { if ((e.key === "Enter" || e.key === " ") && actual) { e.preventDefault(); abrirDesarrollo(actual); } });
  function mostrar() {
    const nom = NOMBRES[ni % NOMBRES.length], foto = Object.assign({}, FOTOS_FW, DATA.fotos_fw || {})[nom], c = $("#cara");
    q.textContent = nom; h.textContent = pool[hi % pool.length].titulo; actual = pool[hi % pool.length];
    if (foto) { c.style.backgroundImage = `url(${foto})`; c.textContent = ""; } else { c.style.backgroundImage = "none"; c.textContent = nom.split(" ").map(w => w[0]).join("").slice(0, 2); }
    [q, h, c].forEach(e => { e.classList.remove("cambia"); void e.offsetWidth; e.classList.add("cambia"); });
  }
  mostrar();
  setInterval(() => { ni += 1 + Math.floor(Math.random() * (NOMBRES.length - 1)); hi += 1 + Math.floor(Math.random() * 5); mostrar(); }, 7000);
}

function proximoCard() {
  const box = $("#inicio-prox"); if (!box) return;
  if (!prox) { box.hidden = true; return; }
  const loc = prox.cond === "L" ? "Ferro" : prox.rival, vis = prox.cond === "L" ? prox.rival : "Ferro";
  const a = el("a", "prox-card"); a.href = "#/partido";
  a.append(el("div", "eti", `Próximo partido · Fecha ${prox.fecha}`), el("div", "vs", `${loc} vs ${vis}`));
  const cuando = prox.dia ? fechaLarga(prox.dia).replace("-", "\u2011") + (prox.hora ? ` · ${prox.hora} hs` : "") : "A confirmar";
  a.append(el("div", "cuando", cuando + (prox.estadio ? ` · ${prox.estadio}` : "")));
  const W = DATA.fw;
  if (W && previaAlDia) { const [gl, gv] = W.cond === "L" ? [W.gf, W.gc] : [W.gc, W.gf]; a.append(el("div", "fw", `Pronóstico FW: ${gl}-${gv}`)); }
  a.append(el("span", "lee", "Ver la previa completa →"));
  box.append(a);
}

function ultimoResultado() {
  const a = $("#ult-res"); if (!a || !ult) return;
  const vis = ult.condicion !== "Local";
  const [nl, gl, nv, gv] = vis ? [ult.rival, ult.gc, "Ferro", ult.gf] : ["Ferro", ult.gf, ult.rival, ult.gc];
  const ver = ult.gf > ult.gc ? "Ganamos" : ult.gf === ult.gc ? "Empatamos" : "Perdimos";
  a.append(el("div", "eti", `Último resultado · Fecha ${ult.fecha} · ${vis ? "de visitante" : "en Caballito"}`));
  const m = el("div", "ur-m");
  const eq = (n, g, fe) => { const d = el("div", "ur-eq" + (fe ? " fe" : "")); d.append(el("span", "ur-n", n), el("b", "ur-g num", String(g))); return d; };
  m.append(eq(nl, gl, nl === "Ferro"), el("span", "ur-x", "–"), eq(nv, gv, nv === "Ferro")); a.append(m);
  const pie = el("div", "ur-pie"); pie.append(el("span", "pill " + (ult.resultado || ""), ver));
  if (ult.goleadores && ult.goleadores !== "—") pie.append(el("span", null, "⚽ " + ult.goleadores.replace(/(\d+)(pt|st)/g, "$1' $2")));
  if (ferroT) pie.append(el("span", null, `Quedamos ${ferroT.pos}° con ${ferroT.pts} puntos`));
  a.append(pie, el("span", "lee", "Ver todos los resultados →"));
  a.setAttribute("aria-label", `Último resultado: ${nl} ${gl}, ${nv} ${gv}. ${ver}.`);
  a.hidden = false;
}

function ultimosHallazgos() {
  const box = $("#inicio-hall"); if (!box) return;
  TODOS.filter(x => x.tipo !== "tabla" && x.tipo !== "novedad").slice(0, 4).forEach(x => box.append(tarjeta(x)));
}

export default {
  init() { ultimoResultado(); marcador(); initNovedadesHoy(); initPlaca(); initCartel(); proximoCard(); ultimosHallazgos(); },
};
