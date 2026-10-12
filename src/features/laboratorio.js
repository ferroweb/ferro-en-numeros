import { caraJug } from "../components/caras.js";
import { DATA, ult, ferroT, FOTOS_FW, PRODE_CFG, escenariosAlDia } from "../ctx.js";
import { tabla } from "../lib/charts.js";
import { FERRO } from "../lib/consts.js";
import { $, el, S, limitarTabla } from "../lib/dom.js";
import { PS } from "../lib/prode-state.js";

export function initLaboratorio() {
  const L = DATA.lab; if (!L) { return; }
  const NOMFW = ["Gaby Zimmerman", "Nico Casillo", "Ignacio Carrión", "Balta Alcaide", "Román Da Silva", "Guille Criscuolli", "Vitto Bianchi", "Ale Zarate"];
  const cortoFW = n => ({ "Ignacio Carrión": "Nacho" })[n] || n.split(" ")[0];
  const caraF = n => { const c = el("div", "cara-j"); const f = FOTOS_FW[n]; if (f) c.style.backgroundImage = `url(${f})`; else c.textContent = n.split(" ").map(w => w[0]).join("").slice(0, 2); return c; };
  const pct = (a, t) => t ? Math.round(100 * a / t) : 0;
  const seg = (val, on) => { const w = el("div", "seg"); ["G", "E", "P"].forEach(k => { const b = el("button", k, k); b.type = "button"; b.setAttribute("aria-pressed", String(k === val)); b.addEventListener("click", () => { [...w.children].forEach(x => x.setAttribute("aria-pressed", String(x === b))); on(k); }); w.append(b); }); return w; };

  // --- calculadora del primer puesto ---
  (function calc() {
    const E = DATA.escenarios; if (!escenariosAlDia || !E || !E.quedan || !E.quedan.length) { $("#lab-calc").hidden = true; return; }
    const restan = E.quedan.length, PTS = { G: 3, E: 1, P: 0 };
    const eqs = [{ equipo: FERRO, nombre: "Ferro", pts: E.ferro, fe: true, rows: E.quedan.map(q => `F${q.fecha} ${q.cond === "L" ? "vs" : "en cancha de"} ${q.rival}`), sel: E.quedan.map(() => "G") }]
      .concat((E.perseguidores || []).map(p => ({ equipo: p.equipo, nombre: p.equipo.replace("Deportivo ", ""), pts: p.pts, rows: Array.from({ length: restan }, (_, i) => `Partido ${i + 1}`), sel: Array.from({ length: restan }, () => "G") })));
    const grid = $("#lc-grid");
    const dibujar = () => {
      const fin = eqs.map(e => ({ ...e, final: e.pts + e.sel.reduce((a, k) => a + PTS[k], 0) })).sort((a, b) => b.final - a.final);
      const fe = fin.find(e => e.fe), otro = fin.find(e => !e.fe), res = $("#lc-res"); res.textContent = "";
      const empate = fin.filter(e => e.final === fin[0].final).length > 1;
      const t = fin[0].fe && !empate ? `🏆 ¡Terminamos primeros con ${fe.final} puntos!` : fin[0].fe && empate ? `🤞 Terminamos igualados arriba con ${fe.final}: se define por desempate (diferencia de gol).` : `😬 Así terminamos ${fin.indexOf(fe) + 1}°, a ${fin[0].final - fe.final} del primero.`;
      res.append(el("b", "big", t));
      const ol = el("ol"); fin.forEach(e => { const li = el("li", null, `${e.nombre}: ${e.final} pts`); if (e.fe) li.style.fontWeight = "800"; ol.append(li); }); res.append(ol);
      const nec = Math.max(0, otro.final - fe.pts + 1); res.append(el("p", null, `Con estos resultados de los demás, nos alcanza con sumar ${nec} ${nec === 1 ? "punto" : "puntos"} de ${3 * restan} para ser primeros sin depender del desempate.`));
    };
    eqs.forEach(e => { const c = el("div", "lc-eq" + (e.fe ? " fe" : "")); const h = el("h4"); h.append(el("span", null, e.nombre), el("span", null, `${e.pts} pts`)); c.append(h);
      e.rows.forEach((r, i) => { const row = el("div", "lc-row"); row.append(el("span", null, r), seg(e.sel[i], k => { e.sel[i] = k; dibujar(); })); c.append(row); }); grid.append(c); });
    dibujar();
  })();

  // --- ¿y si al minuto... vamos...? ---
  (function estados() {
    const S2 = L.estados; let corte = "45", est = "empatando";
    const C = [["0", "Quién hace el primero"], ["45", "Entretiempo"], ["60", "Minuto 60"], ["75", "Minuto 75"]];
    const ES = [["ganando", "Ganando"], ["empatando", "Empatando"], ["perdiendo", "Perdiendo"]];
    const g1 = $("#le-corte"), g2 = $("#le-est");
    const pinta = () => {
      [...g1.children].forEach(b => b.setAttribute("aria-pressed", String(b.dataset.k === corte)));
      [...g2.children].forEach(b => { b.setAttribute("aria-pressed", String(b.dataset.k === est)); b.hidden = corte === "0" && b.dataset.k === "empatando"; b.textContent = corte === "0" ? (b.dataset.k === "ganando" ? "Lo hacemos nosotros" : b.dataset.k === "perdiendo" ? "Lo hacen ellos" : "") : ES.find(x => x[0] === b.dataset.k)[1]; });
      if (corte === "0" && est === "empatando") est = "ganando";
      const d = S2[corte][est], t = d.G + d.E + d.P, o = $("#le-out"); o.textContent = "";
      if (!t) { o.append(el("p", null, "Este año nunca estuvimos en esa situación.")); return; }
      const bar = el("div", "bar"); [["G", "var(--ok)"], ["E", "var(--lin25)"], ["P", "var(--bad)"]].forEach(([k, col]) => { if (!d[k]) return; const i = el("i", null, `${pct(d[k], t)}%`); i.style.width = pct(d[k], t) + "%"; i.style.background = col; bar.append(i); }); o.append(bar);
      const sit = corte === "0" ? (est === "ganando" ? "Cuando hicimos el primer gol" : "Cuando el primero lo hizo el rival") : `Cuando íbamos ${est} ${corte === "45" ? "al entretiempo" : "al minuto " + corte}`;
      o.append(el("p", null, `${sit} (${t} ${t === 1 ? "partido" : "partidos"}): ganamos ${d.G}, empatamos ${d.E} y perdimos ${d.P}.`));
      const ppp = ((3 * d.G + d.E) / t).toFixed(2).replace(".", ","); o.append(el("p", null, `Promedio: ${ppp} puntos por partido.`));
    };
    C.forEach(([k, t]) => { const b = el("button", null, t); b.type = "button"; b.dataset.k = k; b.addEventListener("click", () => { corte = k; pinta(); }); g1.append(b); });
    ES.forEach(([k, t]) => { const b = el("button", null, t); b.type = "button"; b.dataset.k = k; b.addEventListener("click", () => { est = k; pinta(); }); g2.append(b); });
    pinta();
  })();

  // --- índice de forma ---
  (function forma() {
    const F = L.forma || []; if (!F.length) { $("#lab-forma").hidden = true; return; }
    const c = $("#lf-chart"), W = c.clientWidth || 520, H = 170, m = { t: 14, r: 8, b: 22, l: 26 };
    const x = i => m.l + i * (W - m.l - m.r) / Math.max(1, F.length - 1), y = v => H - m.b - v / 15 * (H - m.t - m.b);
    const svg = S("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": "Puntos en los últimos 5 partidos" }, c);
    [0, 5, 10, 15].forEach(v => { S("line", { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), stroke: "var(--line)" }, svg); const t = S("text", { x: m.l - 5, y: y(v) + 4, "text-anchor": "end", "font-size": 11 }, svg); t.textContent = v; });
    S("path", { d: F.map((p, i) => (i ? "L" : "M") + x(i) + " " + y(p.ult5)).join(" "), fill: "none", stroke: "var(--verde)", "stroke-width": 3 }, svg);
    F.forEach((p, i) => { const ci = S("circle", { cx: x(i), cy: y(p.ult5), r: 3.5, fill: p.res === "G" ? "var(--ok)" : p.res === "E" ? "var(--lin25)" : "var(--bad)" }, svg); const ti = S("title", {}, ci); ti.textContent = `F${p.fecha} ${p.rival}: ${p.ult5} pts en los últimos 5`; });
    const ult = F[F.length - 1], max = F.reduce((a, b) => b.ult5 > a.ult5 ? b : a);
    let txt = `Hoy: ${ult.ult5} de 15 en los últimos 5. Pico del año: ${max.ult5} (hasta la F${max.fecha}).`;
    if (L.forma_rival && L.forma_rival.pj) txt += ` ${L.forma_rival.rival}, nuestro próximo rival, sumó ${L.forma_rival.ult5} de ${3 * L.forma_rival.pj} en sus últimos ${L.forma_rival.pj}.`;
    $("#lf-nota").textContent = txt;
  })();

  // --- mapa de minutos ---
  (function minutos() {
    const M = L.minutos, box = $("#lm"); const fr = ["1-15", "16-30", "31-45", "46-60", "61-75", "76-90"];
    box.append(el("div", "h", "")); fr.forEach(f => box.append(el("div", "h", f)));
    const max = Math.max(...Object.values(M).flatMap(v => v.favor.concat(v.contra)), 1);
    Object.entries(M).sort((a, b) => b[0] - a[0]).forEach(([a, v]) => [["favor", "46,158,98", "a favor"], ["contra", "200,70,40", "en contra"]].forEach(([k, rgb, lab]) => {
      box.append(el("div", "l", `${a} ${lab}`));
      v[k].forEach((n, i) => { const d = el("div", null, String(n)); d.style.background = `rgba(${rgb},${0.12 + 0.88 * n / max})`; if (n / max > .5) d.style.color = "#fff"; d.title = `${a}, ${fr[i]}': ${n} goles ${lab}`; box.append(d); });
    }));
    const v = M["2026"], i = v.favor.indexOf(Math.max(...v.favor)), j = v.contra.indexOf(Math.max(...v.contra));
    let t = `Nuestro cuarto de hora de oro en 2026: ${fr[i]}' (${v.favor[i]} goles). El más flojo: ${fr[j]}' (${v.contra[j]} en contra).`;
    if (M["2025"]) { const u = 5; t += ` En el último cuarto de hora pasamos de ${M["2025"].favor[u]}-${M["2025"].contra[u]} en 2025 a ${v.favor[u]}-${v.contra[u]} este año.`; }
    $("#lm-nota").textContent = t;
  })();

  // --- duplas y tridentes ---
  (function duplas() {
    const D = L.duplas, box = $("#ld"); $("#ld-nota").textContent = `Puntos por partido cuando arrancan juntos de titulares (duplas con ${D.min_duplas}+ partidos, tridentes con ${D.min_tri}+).`;
    const tabla = (titulo, filas) => { box.append(el("h4", "pv-h4", titulo)); const t = el("table", "ltab"); filas.forEach(f => { const tr = el("tr"), a = el("td", "l"); const cs = el("span", "caras"); f.jug.forEach(j => cs.append(caraJug(j))); a.append(cs, document.createTextNode(f.jug.join(" + "))); tr.append(a, el("td", null, `${f.g}G ${f.e}E ${f.p}P`), el("td", null, f.ppp.toFixed(2).replace(".", ","))); t.append(tr); }); box.append(t); };
    tabla("Las mejores duplas", D.mejores.slice(0, 5)); tabla("Los mejores tridentes", D.tridentes.slice(0, 4)); tabla("Las que menos rinden", D.peores);
  })();

  // --- impacto del banco ---
  (function banco() {
    const B = L.banco || [], t = el("table", "ltab"); const h = el("tr"); ["Jugador", "Entró", "Goles", "Pts rescatados", "Pts perdidos"].forEach((x, i) => h.append(el("th", i ? null : "l", x))); t.append(h);
    B.forEach(b => { const tr = el("tr"), a = el("td", "l"); const cs = el("span", "caras"); cs.append(caraJug(b.jugador)); a.append(cs);
      if (b.partidos.length) { const d = el("details"); d.append(el("summary", null, b.jugador)); b.partidos.forEach(p => d.append(el("div", "nota", p))); a.append(d); } else a.append(document.createTextNode(b.jugador));
      tr.append(a, el("td", null, b.entradas), el("td", null, b.goles), el("td", null, "+" + b.rescatados), el("td", null, b.perdidos ? "-" + b.perdidos : "0")); t.append(tr); });
    $("#lb").append(t);
    limitarTabla(t, 6);
  })();

  // --- tal fecha como esta ---
  (function talFecha() {
    const T = L.tal_fecha; if (!T || !T.lista.length) { $("#lab-tal").hidden = true; return; }
    $("#lt-nota").textContent = `Qué pasó en la fecha ${T.fecha} de las temporadas anteriores que tenemos cargadas.`;
    const ul = el("ul", "ult-l"); ul.style.cssText = "list-style:none;padding:0;margin:0";
    T.lista.forEach(p => { const li = el("li"); li.style.cssText = "padding:8px 0;border-bottom:1px solid var(--line)"; li.append(el("b", null, `${p.anio} · ${p.res === "G" ? "Ganamos" : p.res === "E" ? "Empatamos" : "Perdimos"} ${p.gf}-${p.gc} ${p.cond === "L" ? "en Caballito con" : "de visitante con"} ${p.rival}`)); if (p.goles.length) li.append(el("div", "nota", "Goles: " + p.goles.join(", "))); ul.append(li); });
    $("#lt").append(ul);
  })();

  // --- cábalas ---
  (function cabalas() {
    const t = el("table", "ltab"); (L.cabalas || []).slice().sort((a, b) => b.ppp - a.ppp).forEach(c => { const tr = el("tr"); const a = el("td", "l", (c.ppp >= 2.3 ? "🍀 " : c.ppp < 1.2 ? "⚠️ " : "") + c.cabala); tr.append(a, el("td", null, `${c.g}G ${c.e}E ${c.p}P`), el("td", null, c.ppp.toFixed(2).replace(".", ",") + " pts/p")); t.append(tr); });
    $("#lcab").append(t);
  })();

  // --- rival favorito y bestia negra ---
  (function rivales() {
    const R = L.rivales; $("#lr-nota").textContent = `Con todos los partidos cargados (${R.temporadas.join(", ")}${R.temporadas.includes(2024) ? "; 2024 incompleto" : ""}), rivales con 2 partidos o más.`;
    [["😍 Los que nos sientan bien", R.favoritos], ["👹 Bestias negras", R.bestias]].forEach(([t, l]) => { const d = el("div"); d.append(el("h4", null, t)); const ul = el("ul"); l.forEach(r => { const li = el("li"); li.append(el("b", null, r.rival), el("small", null, `${r.g}G ${r.e}E ${r.p}P · goles ${r.gf}-${r.gc} · ${r.ppp.toFixed(2).replace(".", ",")} pts/p · ${r.anios.join(", ")}`)); ul.append(li); }); d.append(ul); $("#lr").append(d); });
  })();

  // --- termómetro de crónicas ---
  (function cronicas() {
    const C = L.cronicas || {}, box = $("#lcr"); const ks = ["elogiosa", "equilibrada", "crítica"].filter(k => C[k]);
    if (!ks.length) { box.append(el("p", "nota", "Todavía no hay crónicas clasificadas.")); return; }
    ks.forEach(k => { const c = C[k], t = c.g + c.e + c.p; const d = el("div"); d.style.margin = "8px 0"; d.append(el("b", null, `${k === "elogiosa" ? "😍" : k === "crítica" ? "😤" : "🤔"} ${k[0].toUpperCase() + k.slice(1)} (${t})`), el("div", "nota", `Cuando ganamos: ${c.g} · empatamos: ${c.e} · perdimos: ${c.p}`)); c.ejemplos.forEach(e => d.append(el("div", "nota", e))); box.append(d); });
    box.append(el("p", "nota", "Se va completando a medida que la revisión diaria lee las crónicas de Ferroweb."));
  })();

  // --- trivia de la semana ---
  (function trivia() {
    const hoy = new Date(Date.now() - 3 * 3600e3), ini = new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1)), sem = Math.ceil(((hoy - ini) / 864e5 + ini.getUTCDay() + 1) / 7), clave = `trivia-${hoy.getUTCFullYear()}-${sem}`;
    let seed = hoy.getUTCFullYear() * 100 + sem; const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    const mezclar = a => a.map(v => [rnd(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);
    const J = DATA.jugadores, P = DATA.partidos, Q = [];
    const gol = J.slice().sort((a, b) => b.goles - a.goles); Q.push({ q: "¿Quién es nuestro goleador del torneo?", ok: gol[0].jugador, op: gol.slice(0, 4).map(j => j.jugador) });
    if (ferroT) Q.push({ q: "¿Cuántos puntos tenemos en la tabla?", ok: String(ferroT.pts), op: [ferroT.pts, ferroT.pts - 3, ferroT.pts + 2, ferroT.pts - 5].map(String) });
    const pr = P[Math.floor(rnd() * P.length)], otros = mezclar([...new Set(P.map(p => p.rival).filter(r => r !== pr.rival))]).slice(0, 3);
    Q.push({ q: `En la fecha ${pr.fecha} ${pr.gf > pr.gc ? "ganamos" : pr.gf === pr.gc ? "empatamos" : "perdimos"} ${pr.gf}-${pr.gc}. ¿Contra quién?`, ok: pr.rival, op: [pr.rival, ...otros] });
    const sup = J.slice().sort((a, b) => b.goles_suplente - a.goles_suplente); if (sup[0].goles_suplente) Q.push({ q: "¿Quién hizo más goles saliendo del banco?", ok: sup[0].jugador, op: [sup[0].jugador, ...mezclar(J.filter(j => j.jugador !== sup[0].jugador && j.goles).map(j => j.jugador)).slice(0, 3)] });
    const vg = P.filter(p => p.condicion !== "Local" && p.gf > p.gc).length; Q.push({ q: "¿Cuántos partidos ganamos de visitante este torneo?", ok: String(vg), op: [vg, vg - 2, vg + 2, vg + 4].map(String) });
    if (L.duplas.mejores[0]) { const d = L.duplas.mejores; Q.push({ q: `¿Qué dupla de titulares suma más puntos por partido (con ${L.duplas.min_duplas}+ partidos juntos)?`, ok: d[0].jug.join(" y "), op: [d[0], ...(L.duplas.peores || [])].slice(0, 4).map(x => x.jug.join(" y ")) }); }
    if (L.estados["0"].ganando) { const g = L.estados["0"].ganando; const t = g.G + g.E + g.P; Q.push({ q: `De los ${t} partidos en que hicimos el primer gol, ¿cuántos perdimos?`, ok: String(g.P), op: [g.P, g.P + 1, g.P + 3, g.P + 5].map(String) }); }
    if (L.rivales.bestias[0]) { const b = L.rivales.bestias; Q.push({ q: "¿Cuál es nuestra bestia negra (el rival contra el que peor nos va)?", ok: b[0].rival, op: [b[0].rival, ...L.rivales.favoritos.slice(0, 3).map(r => r.rival)] }); }
    const preg = mezclar(Q).slice(0, 5).map(x => ({ ...x, op: mezclar([...new Set(x.op)]) }));
    $("#tv-nota").textContent = `Cinco preguntas que cambian todos los lunes, armadas con los datos del sitio. Semana ${sem}.`;
    const box = $("#tv"); let bien = 0, resp = 0, quien = null;
    preg.forEach((x, i) => { const d = el("div", "tv-q"); d.append(el("p", null, `${i + 1}. ${x.q}`)); const ops = el("div", "tv-op");
      x.op.forEach(o => { const b = el("button", null, o); b.type = "button"; b.addEventListener("click", () => { if (d.dataset.ok) return; d.dataset.ok = "1"; resp++; if (o === x.ok) { bien++; b.className = "ok"; } else { b.className = "mal"; [...ops.children].find(c => c.textContent === x.ok).className = "ok"; } if (resp === preg.length) fin(); }); ops.append(b); });
      d.append(ops); box.append(d); });
    const fin = () => {
      const f = el("div", "tv-fin"); f.append(el("b", null, `Sacaste ${bien} de ${preg.length}. ${bien === 5 ? "¡Enciclopedia verdolaga! 🏆" : bien >= 3 ? "Bien ahí, hincha. 💚" : "Hay que leer más Ferroweb. 😅"}`));
      const api = PS.api, ok = typeof PRODE_CFG !== "undefined" && PRODE_CFG.accion;
      if (ok) { f.append(el("div", "nota", "¿Sos de Ferroweb? Tocá tu cara para anotar tu puntaje en la tabla:")); const cs = el("div", "tv-caras");
        NOMFW.forEach(n => { const b = el("button"); b.type = "button"; b.append(caraF(n), document.createTextNode(cortoFW(n))); b.addEventListener("click", async () => { if (quien) return; quien = n; [...cs.children].forEach(c => c.setAttribute("aria-pressed", String(c === b)));
          try { const h = await api.sha(`${n}|${({ "Ignacio Carrión": "nacho" })[n] || n.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}`); const E2 = PRODE_CFG.entradas, fd = new FormData(); fd.append("entry." + E2.quien, n); fd.append("entry." + E2.clave, h); fd.append("entry." + E2.fecha, clave); fd.append("entry." + E2.gf, String(bien)); fd.append("entry." + E2.gc, String(preg.length)); fd.append("entry." + E2.gol, "trivia"); await fetch(PRODE_CFG.accion, { method: "POST", mode: "no-cors", body: fd }); f.append(el("div", "nota", `¡Anotado, ${cortoFW(n)}! En un rato aparece en la tabla.`)); } catch (e) { f.append(el("div", "nota", "No se pudo anotar. Probá de nuevo.")); quien = null; } }); cs.append(b); });
        f.append(cs); }
      box.append(f);
    };
    const rank = () => { const R = PS.data, out = $("#tv-rank"); out.textContent = ""; if (!R) { out.append(el("p", "nota", "La tabla aparece cuando alguien de Ferroweb anota su primer puntaje.")); return; }
      const best = {}; R.rows.forEach(r => { const n = (r[R.iq] || "").trim(), f = (r[R.iF] || "").trim(); if (!f.startsWith("trivia-") || !NOMFW.includes(n)) return; const k = n + "|" + f; best[k] = Math.max(best[k] || 0, +r[R.ig] || 0); });
      const tot = {}; Object.entries(best).forEach(([k, v]) => { const n = k.split("|")[0]; tot[n] = tot[n] || { pts: 0, sem: 0 }; tot[n].pts += v; tot[n].sem++; });
      const fil = Object.entries(tot).sort((a, b) => b[1].pts - a[1].pts); if (!fil.length) { out.append(el("p", "nota", "Todavía nadie anotó su puntaje. ¡Estrenala!")); return; }
      const t = el("table", "ltab"); fil.forEach(([n, v], i) => { const tr = el("tr"), a = el("td", "l"); const cs = el("span", "caras"); cs.append(caraF(n)); a.append(document.createTextNode(`${i + 1}. `), cs, document.createTextNode(cortoFW(n))); tr.append(a, el("td", null, `${v.pts} aciertos`), el("td", null, `${v.sem} ${v.sem === 1 ? "semana" : "semanas"}`)); t.append(tr); }); out.append(t); };
    rank(); document.addEventListener("prode-cargado", rank);
  })();
}

export default { init: initLaboratorio };
