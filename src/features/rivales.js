// Ficha de cada rival: tabla, cómo nos fue, historial, quién nos hizo goles y lo que viene.
import { DATA, prox } from "../ctx.js";
import { $, el } from "../lib/dom.js";
import { FERRO } from "../lib/consts.js";
import { fechaLarga } from "../lib/fmt.js";
import { mismoEquipo } from "../lib/equipos.js";

let lista = [], sel;

// Todos los equipos con los que tenemos algo: la tabla del grupo y los rivales ya enfrentados (ej. del otro grupo).
function armarLista() {
  const rivales = DATA.tabla.filter(t => t.equipo !== FERRO).map(t => t.equipo);
  DATA.partidos.forEach(p => { if (!rivales.some(r => mismoEquipo(r, p.rival))) rivales.push(p.rival); });
  const pos = (r) => { const t = DATA.tabla.find(x => mismoEquipo(x.equipo, r)); return t ? t.pos : 99; };
  return rivales.sort((a, b) => pos(a) - pos(b) || a.localeCompare(b, "es"));
}

const kpi = (l, v) => { const d = el("div", "kpi"); d.append(el("div", "l", l), el("div", "v", String(v))); return d; };
const seccion = (titulo) => { const s = el("div", "rv-sec"); s.append(el("h4", "pv-h4", titulo)); return s; };
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;

function render(rival) {
  const cuerpo = $("#rv-cuerpo"), kp = $("#rv-kpis"); cuerpo.textContent = ""; kp.textContent = "";
  const T = DATA.tabla.find(x => mismoEquipo(x.equipo, rival));
  const jugados = DATA.partidos.filter(p => mismoEquipo(p.rival, rival)).sort((a, b) => a.n - b.n);
  const g = jugados.filter(p => p.resultado === "G").length, e = jugados.filter(p => p.resultado === "E").length, p_ = jugados.filter(p => p.resultado === "P").length;

  if (T) [["En la tabla", `${T.pos}°`], ["Puntos", T.pts], ["Partidos", T.pj], ["Goles", `${T.gf}/${T.gc}`], ["Diferencia", (T.dg > 0 ? "+" : "") + T.dg]].forEach(([l, v]) => kp.append(kpi(l, v)));
  else kp.append(el("p", "nota", "Este equipo no está en la tabla de nuestro grupo."));

  // cómo nos fue
  const s1 = seccion("Cómo nos fue contra ellos esta temporada");
  if (!jugados.length) s1.append(el("p", "nota", "Todavía no los enfrentamos."));
  else {
    const gf = jugados.reduce((a, x) => a + x.gf, 0), gc = jugados.reduce((a, x) => a + x.gc, 0);
    s1.append(el("p", "nota", `${plural(g, "ganado", "ganados")}, ${plural(e, "empatado", "empatados")}, ${plural(p_, "perdido", "perdidos")} · goles ${gf} a favor y ${gc} en contra.`));
    const ul = el("ul", "rv-partidos");
    jugados.forEach(x => {
      const li = el("li"); const a = el("a", null, `F${x.fecha}`); a.href = x.sintesis; a.target = "_blank"; a.rel = "noopener";
      li.append(a, el("span", "pill " + x.resultado, `${x.gf}-${x.gc}`), el("span", "c", x.condicion === "Local" ? "de local" : "de visitante"));
      const det = [];
      if (x.goleadores && x.goleadores !== "—") det.push(`Goles: ${x.goleadores.replace(/(\d+)(pt|st)/g, "$1'$2")}`);
      if (x.arbitro) det.push(`Árbitro: ${x.arbitro}`);
      if (det.length) li.append(el("small", null, det.join(" · ")));
      ul.append(li);
    });
    s1.append(ul);
  }
  cuerpo.append(s1);

  // quién les hizo goles
  const goleadores = {};
  DATA.participaciones.filter(r => r.goles && mismoEquipo(r.rival, rival)).forEach(r => { goleadores[r.jugador] = (goleadores[r.jugador] || 0) + r.goles; });
  const gl = Object.entries(goleadores).sort((a, b) => b[1] - a[1]);
  if (gl.length) { const s = seccion("Quién les hizo goles"); const f = el("div", "rv-chips"); gl.forEach(([n, v]) => f.append(el("span", null, `${n} · ${v}`))); s.append(f); cuerpo.append(s); }

  // historial 2025-26
  const H = DATA.historico && DATA.historico.h2h && DATA.historico.h2h.find(x => mismoEquipo(x.rival, rival));
  if (H) {
    const s = seccion("Historial 2025-26");
    s.append(el("p", "nota", `${H.partidos} partidos: ${H.g}G ${H.e}E ${H.p}P · goles ${H.gf} a ${H.gc}.`));
    const f = el("div", "rv-chips"); (H.detalle || "").split(" · ").filter(Boolean).forEach(t => f.append(el("span", null, t))); s.append(f); cuerpo.append(s);
  }

  // favorito o bestia negra
  const R = DATA.lab && DATA.lab.rivales;
  const fav = R && R.favoritos.find(x => mismoEquipo(x.rival, rival)), bes = R && R.bestias.find(x => mismoEquipo(x.rival, rival));
  if (fav || bes) {
    const x = fav || bes;
    cuerpo.append(el("p", "rv-etiqueta " + (fav ? "fav" : "bes"), `${fav ? "😍 Rival que nos sienta bien" : "👹 Bestia negra"}: ${x.g}G ${x.e}E ${x.p}P en ${x.pj} partidos, ${x.ppp.toLocaleString("es-AR", { minimumFractionDigits: 2 })} puntos por partido.`));
  }

  // lo que viene
  const futuros = ((DATA.calendario && DATA.calendario.proximos) || []).filter(x => mismoEquipo(x.rival, rival) && x.fecha > DATA.ultima_fecha);
  if (futuros.length) {
    const s = seccion("Lo que viene");
    futuros.forEach(x => {
      const p = el("p", "rv-prox");
      p.append(document.createTextNode(`Fecha ${x.fecha} · ${x.cond === "L" ? "de local" : "de visitante"}${x.dia ? " · " + fechaLarga(x.dia) + (x.hora ? " " + x.hora + " hs" : "") : ""}${x.estadio ? " · " + x.estadio : ""} `));
      if (prox && prox.fecha === x.fecha) { const a = el("a", null, "Ver la previa →"); a.href = "#/partido/previa"; p.append(a); }
      s.append(p);
    });
    cuerpo.append(s);
  }
}

function elegir(nombre) {
  const r = lista.find(x => mismoEquipo(x, nombre)) || lista[0];
  sel.value = r; render(r);
}

export default {
  init() {
    lista = armarLista(); sel = $("#rv-sel");
    lista.forEach(r => sel.append(new Option(r, r)));
    sel.addEventListener("change", () => { location.hash = "#/rivales/ficha/" + encodeURIComponent(sel.value); });
    elegir(prox ? prox.rival : lista[0]);
  },
  onShow(grupo, pagina, param) {
    if (grupo !== "rivales" || pagina !== "ficha") return;
    elegir(param ? decodeURIComponent(param) : (prox ? prox.rival : sel.value));
  },
};
