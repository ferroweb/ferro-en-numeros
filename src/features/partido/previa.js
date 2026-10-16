import { mismoEquipo } from "../../lib/equipos.js";
import { tarjeta } from "../../components/tarjeta.js";
import { DATA, prox, TODOS, previaAlDia, escenariosAlDia } from "../../ctx.js";
import { tabla } from "../../lib/charts.js";
import { FERRO } from "../../lib/consts.js";
import { $, el, S, limitar } from "../../lib/dom.js";
import { fechaLarga } from "../../lib/fmt.js";

// ---------- gráficos del manual de chicanas ----------
function graficosChicana(hu) {
  const g = $("#humor-g"); if (!g) return; g.textContent = "";
  const cap = (hu.graficos || {});
  const yo = DATA.tabla.find(r => r.equipo === FERRO);
  const rv = DATA.tabla.find(r => r.equipo.toLowerCase().startsWith(prox.rival.split(" ")[0].toLowerCase()));
  if (!yo || !rv) return;
  const RIV = prox.rival, cF = "var(--verde)", cR = "var(--lin25)";
  const tarjeta = (titulo, texto) => { const c = el("div", "hg"); c.append(el("h4", null, titulo)); g.append(c); return [c, () => texto && c.append(el("div", "cap", texto))]; };
  const ley = (c) => { const l = el("div", "ley2"); [["Ferro", cF], [RIV, cR]].forEach(([n, col]) => { const s = el("span"); const i = el("i"); i.style.background = col; s.append(i, n); l.append(s); }); c.append(l); };
  // 1. cara a cara
  {
    const [c, fin] = tarjeta("Cara a cara", cap.cara || "Mismo torneo, otra categoría.");
    ley(c);
    const box = el("div", "cc");
    [["Puntos", "pts"], ["Victorias", "g"], ["Goles a favor", "gf"], ["Goles en contra", "gc"]].forEach(([l, k]) => {
      const mx = Math.max(yo[k], rv[k]) || 1; box.append(el("div", "m", l + (k === "gc" ? " (menos es mejor)" : "")));
      [[yo, cF, "Ferro"], [rv, cR, RIV]].forEach(([t, col, n]) => { const b = el("div", "br"); const i = el("i"); i.style.width = (t[k] / mx * 80) + "%"; i.style.background = col; b.title = `${n}: ${t[k]} ${l.toLowerCase()}`; b.append(i, el("b", null, String(t[k]))); box.append(b); });
    });
    c.append(box); fin();
  }
  // 2. el tablero (últimos 5 del rival)
  if (prox.forma_rival && prox.forma_rival.length) {
    const [c, fin] = tarjeta(`El tablero de ${RIV}: últimos 5`, cap.tablero || "");
    const led = el("div", "led");
    prox.forma_rival.forEach(s0 => { const m = s0.match(/(\d+)-(\d+)\s+vs\s+(.+?)\s*\((L|V)\)/); const d = el("div", m && +m[1] === 0 ? "apag" : ""); d.textContent = m ? `${m[1]}-${m[2]}` : s0; if (m) { d.append(el("small", null, m[3].replace("Deportivo ", ""))); d.title = s0; } led.append(d); });
    const gol = prox.forma_rival.reduce((a, s0) => a + (+((s0.match(/^(\d+)/) || [0, 0])[1])), 0);
    c.append(led, el("div", "nota", `${gol} ${gol === 1 ? "gol" : "goles"} en 5 partidos. Tablero en gris: no convirtieron.`)); fin();
  }
  // 3. el reloj del gol
  {
    const mF = Math.round(yo.pj * 90 / Math.max(yo.gf, 1)), mR = Math.round(rv.pj * 90 / Math.max(rv.gf, 1)), mx = Math.max(mF, mR);
    const [c, fin] = tarjeta("Minutos para ver un gol", cap.reloj || "");
    const r = el("div", "reloj");
    [["Ferro", mF, cF], [RIV, mR, cR]].forEach(([n, v, col]) => { const f = el("div", "r"); const t = el("div", "t"); t.style.width = (v / mx * 100) + "%"; t.style.background = col; t.textContent = v + "'"; t.title = `${n}: un gol cada ${v} minutos`; f.append(el("span", null, n), t); r.append(f); });
    c.append(r); fin();
  }
  // 4. cómo terminan sus partidos
  {
    const [c, fin] = tarjeta("Cómo terminan los partidos", cap.final || "");
    const l = el("div", "ley2"); [["Ganados", "var(--ok)"], ["Empatados", "var(--lin25)"], ["Perdidos", "var(--bad)"]].forEach(([n, col]) => { const s = el("span"); const i = el("i"); i.style.background = col; s.append(i, n); l.append(s); }); c.append(l);
    const f0 = el("div", "fin");
    [["Ferro", yo], [RIV, rv]].forEach(([n, t]) => { const f = el("div", "r"); const s = el("div", "s"); [["g", "var(--ok)", "ganados"], ["e", "var(--lin25)", "empatados"], ["p", "var(--bad)", "perdidos"]].forEach(([k, col, nn]) => { const i = el("i"); i.style.flex = t[k]; i.style.background = col; i.textContent = t[k]; i.title = `${n}: ${t[k]} ${nn} de ${t.pj}`; s.append(i); }); f.append(el("span", null, n), s); f0.append(f); });
    c.append(f0); fin();
  }
}

// ---------- previa ----------
export function previa() {
  const box = $("#prox"); box.textContent = "";
  if (!prox) { box.append(el("h3", null, "Sin próximo partido cargado")); return; }
  const ag = $("#aguante-sub"); if (ag) ag.textContent = `Fecha ${prox.fecha}: ${prox.cond === "L" ? "en Caballito" : "de visitante"} contra ${prox.rival}. Vamos Ferro, que esta es la nuestra`;
  box.append(el("div", "nota", `Fecha ${prox.fecha}${prox.confirmado ? "" : " · a confirmar"}`));
  const vs = el("div", "vs");
  const loc = prox.cond === "L" ? "Ferro" : prox.rival, vis = prox.cond === "L" ? prox.rival : "Ferro";
  vs.append(el("span", "eq", loc), el("span", "x", "vs"), el("span", "eq", vis)); box.append(vs);
  const ida = DATA.partidos.find(p => mismoEquipo(p.rival, prox.rival));
  const rv = DATA.tabla.find(r => r.equipo.toLowerCase().startsWith(prox.rival.split(" ")[0].toLowerCase()));
  const datos = el("div", "datos");
  const d = (l, v) => { const x = el("div", "dato"); x.append(el("div", "l", l), el("div", "v", v)); datos.append(x); };
  d("Cuándo", prox.dia ? fechaLarga(prox.dia) + (prox.hora ? " · " + prox.hora + " hs" : "") : "A confirmar");
  d("Dónde", prox.estadio || "—");
  if (ida) d("En la ida", `F${ida.fecha}: Ferro ${ida.gf}-${ida.gc}` + (ida.goleadores !== "—" ? ` (${ida.goleadores.replace(/ \d+(pt|st)/g, "")})` : ""));
  if (rv) d(prox.rival + " en la tabla", `${rv.pos}° · ${rv.pts} pts · ${rv.gf} goles`);
  const h2 = DATA.historico && DATA.historico.h2h && DATA.historico.h2h.find(h => mismoEquipo(h.rival, prox.rival));
  if (h2) d("Historial 2025-26", `${h2.g}G ${h2.e}E ${h2.p}P`);
  box.append(datos);
  if (prox.forma_rival && prox.forma_rival.length) {
    box.append(el("div", "nota", `Últimos partidos de ${prox.rival}`));
    const fo = el("div", "forma");
    prox.forma_rival.forEach(s => { const m = s.match(/(\d+)-(\d+)/); const r = m ? (+m[1] > +m[2] ? "G" : +m[1] === +m[2] ? "E" : "P") : "E"; const p = el("span", "pill " + r, m ? m[0] : "?"); p.title = s; fo.append(p); });
    box.append(fo);
  }
  // escenarios
  const E = escenariosAlDia ? DATA.escenarios : null; const c = $("#c-esc"); c.textContent = "";
  if (E) {
  $("#esc-nota").textContent = `Puntos actuales y máximo posible si ganan todo lo que les queda. Necesitamos ${E.necesita_para_asegurar} puntos para asegurar el 1° sin depender de nadie.`;
  const filas = [{ equipo: "Ferro", pts: E.ferro, maximo: E.ferro_max, yo: true }, ...E.perseguidores.map(p => ({ equipo: p.equipo.replace("Deportivo ", ""), pts: p.pts, maximo: p.maximo }))];
  const W = c.clientWidth || 340, rowH = 40, ml = 92, mr = 40, H = filas.length * rowH + 24;
  const lo = Math.min(...filas.map(f => f.pts)) - 6, hi = Math.max(...filas.map(f => f.maximo)) + 1;
  const x = v => ml + (v - lo) / (hi - lo) * (W - ml - mr);
  const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Puntos actuales y máximos posibles" }, c);
  const meta = E.ferro + E.necesita_para_asegurar;
  S("line", { x1: x(meta), x2: x(meta), y1: 0, y2: H - 18, stroke: "var(--verde)", "stroke-dasharray": "4 4", "stroke-width": 1.5 }, svg);
  const tm = S("text", { x: x(meta), y: H - 4, "text-anchor": "middle" }, svg); tm.textContent = `${meta} asegura el 1°`;
  filas.forEach((f, i) => {
    const y = i * rowH + 14;
    const tl = S("text", { x: ml - 10, y: y + 10, "text-anchor": "end" }, svg); tl.textContent = f.equipo; if (f.yo) tl.setAttribute("style", "font-weight:700;fill:var(--ink)");
    S("rect", { x: x(lo), y: y + 3, width: x(f.maximo) - x(lo), height: 14, rx: 7, fill: "var(--chip)" }, svg);
    S("rect", { x: x(lo), y: y + 3, width: x(f.pts) - x(lo), height: 14, rx: 7, fill: f.yo ? "var(--verde)" : "var(--lin25)" }, svg);
    const tv = S("text", { x: x(f.maximo) + 6, y: y + 14 }, svg); tv.textContent = `${f.pts} → ${f.maximo}`;
  });
  }
  const ol = $("#claves"); ol.textContent = "";
  if (previaAlDia && DATA.claves && DATA.claves.length) { $("#claves-t").textContent = `Claves para ganarle a ${prox.rival}`; DATA.claves.forEach(k => { const li = el("li"); const t = el("span", "kt"); if (k.enfoque) t.append(el("span", "ke", k.enfoque)); t.append(k.titulo); li.append(t, el("span", "kd", k.dato), el("span", "kp", k.porque)); ol.append(li); }); }
  else $("#claves-caja").hidden = true;
  limitar(ol, 4);
  const hu = prox.humor;
  if (hu) { $("#humor-t").textContent = `Manual para bajar a ${prox.rival} de un hondazo`; $("#humor-i").textContent = hu.intro; graficosChicana(hu); const l = $("#humor-l"); l.textContent = ""; hu.puntos.forEach(([a, b]) => { const li = el("li"); li.append(el("b", null, a), el("span", null, b)); l.append(li); }); $("#humor-c").textContent = hu.cierre || ""; }
  else $("#humor-caja").hidden = true;
  limitar($("#humor-l"), 4);
  const hp = $("#hall-previa"); hp.textContent = "";
  TODOS.filter(x => x.tipo === "tabla" || (prox && (x.titulo + (x.detalle || "")).includes(prox.rival))).slice(0, 6).forEach(x => hp.append(tarjeta(x)));
  limitar(hp, 3);
}
