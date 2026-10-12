import { tarjeta } from "../components/tarjeta.js";
import { DATA, prox, FOTOS_FW, PRODE_CFG, PRODE_HASH } from "../ctx.js";
import { tabla } from "../lib/charts.js";
import { $, el } from "../lib/dom.js";
import { PS } from "../lib/prode-state.js";

export function initProde() {
  PS.api = {};
  const NOM = ["Gaby Zimmerman", "Nico Casillo", "Ignacio Carrión", "Balta Alcaide", "Román Da Silva", "Guille Criscuolli", "Vitto Bianchi", "Ale Zarate"];
  const corto = n => ({ "Ignacio Carrión": "Nacho" })[n] || n.split(" ")[0];
  Object.assign(PS.api, { NOM, corto });
  const caraFW = (n, cls) => { const c = el("div", "cara-j" + (cls ? " " + cls : "")); const f = FOTOS_FW[n]; if (f) c.style.backgroundImage = `url(${f})`; else c.textContent = n.split(" ").map(w => w[0]).join("").slice(0, 2); return c; };
  const listo = !!(PRODE_CFG.accion && PRODE_CFG.csv);
  const ls = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };
  const kick = prox && prox.dia ? new Date(`${prox.dia}T${prox.hora || "00:00"}:00-03:00`) : null;
  const abierto = () => !kick || Date.now() < kick.getTime();
  PS.api.sha = t => sha(t);
  const sha = async t => { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("").slice(0, 16); };
  // resultados reales y goleadores por fecha
  const real = {}; DATA.partidos.forEach(p => real[p.fecha] = p);
  const goleo = {}; DATA.participaciones.forEach(q => { if (q.goles) (goleo[q.fecha] = goleo[q.fecha] || new Set()).add(q.jugador); });
  const sig = (a, b) => a > b ? "G" : a === b ? "E" : "P";
  const puntos = (pr, f) => { const r = real[f]; if (!r) return null; let p = 0, ex = 0, ac = 0, go = 0; if (pr.gf === r.gf && pr.gc === r.gc) { p += 3; ex = 1; ac = 1; } else if (sig(pr.gf, pr.gc) === sig(r.gf, r.gc)) { p += 1; ac = 1; } if (pr.gol && goleo[f]) { const el_ = [...new Set(pr.gol.split(",").map(x => x.trim()).filter(Boolean))]; go = el_.filter(x => goleo[f].has(x)).length; p += go; } return { p, ex, ac, go }; };
  // botones
  const botones = [$("#pv-prode"), $("#pr-boton")];
  if (!prox) { botones.forEach(b => b && (b.hidden = true)); }
  botones.forEach(b => { if (!b) return; if (prox) b.textContent = `🏆 Prode: tu pronóstico para ${prox.rival}`; if (!listo) { b.disabled = true; b.title = "El Prode arranca con la fecha 34"; } else if (!abierto()) { b.disabled = true; b.textContent = "🏆 Prode cerrado: ya empezó el partido"; } b.addEventListener("click", e => { e.stopPropagation(); abrir(); }); });
  // diálogo
  const dlg = $("#prode-dlg"); let quien = ls.get("prode_quien") || "", gf = 1, gc = 0;
  function abrir() {
    $("#pd-tg").textContent = `Prode · Fecha ${prox.fecha}`; $("#pd-t").textContent = `${prox.cond === "L" ? "Ferro vs " + prox.rival : prox.rival + " vs Ferro"}`;
    const cs = $("#pd-caras"); cs.textContent = "";
    NOM.forEach(n => { const b = el("button"); b.type = "button"; b.setAttribute("aria-pressed", String(n === quien)); b.append(caraFW(n), document.createTextNode(corto(n))); b.addEventListener("click", () => { quien = n; [...cs.children].forEach(x => x.setAttribute("aria-pressed", "false")); b.setAttribute("aria-pressed", "true"); const c = ls.get("prode_clave_" + n); $("#pd-clave").value = c || ""; }); cs.append(b); });
    $("#pd-clave").value = quien ? (ls.get("prode_clave_" + quien) || "") : "";
    const r = $("#pd-res"); r.textContent = "";
    const num = (get, set) => { const w = el("div", "pd-num"); const m = el("button", null, "–"); m.type = "button"; m.setAttribute("aria-label", "Restar"); const v = el("b", null, String(get())); const p = el("button", null, "+"); p.type = "button"; p.setAttribute("aria-label", "Sumar"); m.onclick = () => { set(Math.max(0, get() - 1)); v.textContent = get(); golVis(); }; p.onclick = () => { set(Math.min(9, get() + 1)); v.textContent = get(); golVis(); }; w.append(m, v, p); return w; };
    const eqF = el("div", "pd-eq"); eqF.append(document.createTextNode("Ferro"), num(() => gf, v => gf = v));
    const eqR = el("div", "pd-eq"); eqR.append(document.createTextNode(prox.rival), num(() => gc, v => gc = v));
    if (prox.cond === "L") r.append(eqF, el("span", null, "–"), eqR); else r.append(eqR, el("span", null, "–"), eqF);
    golesSel = [];
    golVis(); $("#pd-msg").textContent = ""; $("#pd-msg").className = "pd-msg";
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
  }
  let golesSel = [];
  function golVis() {
    $("#pd-gol-p").hidden = gf === 0;
    const box = $("#pd-gol"), prev = [...box.querySelectorAll("select")].map(s => s.value); box.textContent = "";
    const n = Math.min(gf, 6); $("#pd-gol-l").textContent = n > 1 ? `3. ¿Quiénes la meten? (${n} goles)` : "3. ¿Quién la mete por nosotros?";
    const orden = DATA.jugadores.slice().sort((a, b) => b.goles - a.goles || a.jugador.localeCompare(b.jugador));
    for (let i = 0; i < n; i++) { const s = el("select", "pd-in"); s.setAttribute("aria-label", `Goleador ${i + 1}`); orden.forEach(j => s.append(new Option((n > 1 ? `Gol ${i + 1}: ` : "") + j.jugador + (j.goles ? ` (${j.goles} goles)` : ""), j.jugador))); if (prev[i]) s.value = prev[i]; else if (i > 0 && prev.length) s.value = prev[prev.length - 1]; box.append(s); }
  }
  $("#pd-x").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
  $("#pd-ok").addEventListener("click", async () => {
    const msg = $("#pd-msg"); msg.className = "pd-msg err";
    if (!quien) { msg.textContent = "Tocá tu cara primero."; return; }
    const clave = ({ "Ignacio Carrión": "nacho" })[quien] || quien.split(" ")[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const h = await sha(`${quien}|${clave}`);
    if (PRODE_HASH[quien] !== h) { msg.textContent = "Esa no es tu clave: poné tu nombre (gaby, nico, nacho, balta, roman, guille, vitto o ale)."; return; }
    if (!abierto()) { msg.textContent = "Ya empezó el partido: el Prode está cerrado."; return; }
    const gol = gf > 0 ? [...$("#pd-gol").querySelectorAll("select")].map(s => s.value).join(", ") : "";
    const E = PRODE_CFG.entradas, fd = new FormData();
    fd.append("entry." + E.quien, quien); fd.append("entry." + E.clave, h); fd.append("entry." + E.fecha, String(prox.fecha)); fd.append("entry." + E.gf, String(gf)); fd.append("entry." + E.gc, String(gc)); fd.append("entry." + E.gol, gol);
    try { await fetch(PRODE_CFG.accion, { method: "POST", mode: "no-cors", body: fd }); } catch (e) { msg.textContent = "No se pudo guardar. Probá de nuevo en un rato."; return; }
    ls.set("prode_quien", quien); ls.set("prode_clave_" + quien, clave);
    msg.className = "pd-msg ok"; msg.textContent = `¡Anotado, ${corto(quien)}! Ferro ${gf}-${gc}${gol ? (gol.includes(",") ? ", goles de " : ", gol de ") + gol : ""}. Podés cambiarlo hasta que empiece el partido.`;
    setTimeout(cargar, 2500);
  });
  // tabla y pronósticos
  function parseCSV(t) { const rows = []; let row = [], cur = "", q = false; for (let i = 0; i < t.length; i++) { const ch = t[i]; if (q) { if (ch === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else if (ch === '"') q = true; else if (ch === ",") { row.push(cur); cur = ""; } else if (ch === "\n" || ch === "\r") { if (ch === "\r" && t[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; } else cur += ch; } if (cur || row.length) { row.push(cur); rows.push(row); } return rows; }
  function dibujar(preds) {
    // preds: {fecha: {nombre: {gf,gc,gol}}}  (la última carga vale)
    const tabla = {}; const base = n => tabla[n] = tabla[n] || { n, p: 0, ex: 0, ac: 0, go: 0, pj: 0, goles: 0 };
    Object.entries(preds).forEach(([f, porQ]) => Object.entries(porQ).forEach(([n, pr]) => { const r = puntos(pr, +f); if (!r) return; const t = base(n); t.p += r.p; t.ex += r.ex; t.ac += r.ac; t.go += r.go; t.pj++; t.goles += pr.gf; }));
    const fechasJugadas = Object.keys(preds).map(Number).filter(f => real[f]);
    (DATA.fw_historial || []).filter(h => fechasJugadas.includes(h.fecha)).forEach(h => { const r = puntos({ gf: h.gf, gc: h.gc, gol: h.goleador }, h.fecha); if (!r) return; const t = base("La Máquina (Pronóstico FW)"); t.maq = true; t.p += r.p; t.ex += r.ex; t.ac += r.ac; t.go += r.go; t.pj++; t.goles += h.gf; });
    const filas = Object.values(tabla).sort((a, b) => b.p - a.p || b.ex - a.ex || b.go - a.go);
    const tb = $("#t-prode"); tb.textContent = "";
    const th = el("thead"); const tr0 = el("tr"); ["#", "", "Pts", "Exactos", "Aciertos", "Goleador", "Jugó"].forEach((t, i) => tr0.append(el("th", i === 1 ? "l" : null, t))); th.append(tr0); tb.append(th);
    const bd = el("tbody");
    if (!filas.length) { const tr = el("tr"); const td = el("td", "l", listo ? "Todavía no hay partidos con pronósticos jugados. La tabla arranca después de la primera fecha." : "Todavía no hay partidos con pronósticos jugados. La tabla arranca después de la primera fecha."); td.colSpan = 7; tr.append(td); bd.append(tr); }
    filas.forEach((t, i) => { const tr = el("tr", t.maq ? "maq" : ""); const nm = el("td", "l"); nm.append(t.maq ? (() => { const c = el("div", "cara-j"); c.textContent = "🤖"; return c; })() : caraFW(t.n), document.createTextNode(" " + (t.maq ? "La Máquina" : corto(t.n)))); nm.style.display = "flex"; nm.style.alignItems = "center"; nm.style.gap = "8px"; tr.append(el("td", null, String(i + 1)), nm, el("td", null, String(t.p)), el("td", null, String(t.ex)), el("td", null, String(t.ac)), el("td", null, String(t.go)), el("td", null, String(t.pj))); bd.append(tr); });
    tb.append(bd);
    $("#pr-nota").textContent = filas.length ? `Después de ${fechasJugadas.length} ${fechasJugadas.length === 1 ? "fecha" : "fechas"}.` : "";
    // pronósticos de la fecha que viene
    const lista = $("#pr-lista"); lista.textContent = "";
    if (prox) {
      $("#pr-fecha-t").textContent = `Pronósticos para ${prox.rival} (F${prox.fecha})`;
      const pf = preds[prox.fecha] || {}; const quienes = Object.keys(pf);
      const ver = !abierto();
      $("#pr-fecha-n").textContent = !listo ? "El Prode todavía no está conectado." : ver ? "Ya empezó el partido: estos son los pronósticos." : `Tocá tu cara para cargar el tuyo. Ya cargaron ${quienes.length} de 8. Los pronósticos se destapan cuando empieza el partido, así nadie se copia.`;
      NOM.forEach(n => { const it = el("div", "pr-it"); it.append(caraFW(n), el("span", null, corto(n)));
        if (listo && !ver) { it.style.cursor = "pointer"; it.title = "Cargá el pronóstico de " + corto(n); it.addEventListener("click", () => { quien = n; abrir(); }); } const pr = pf[n]; if (!pr) it.append(el("span", "mk", "—")); else if (!ver) it.append(el("span", "mk", "✅")); else { const [a, b] = prox.cond === "L" ? [pr.gf, pr.gc] : [pr.gc, pr.gf]; it.append(el("span", "g", pr.gol ? "⚽ " + pr.gol : ""), el("span", "mk", `${a}-${b}`)); } lista.append(it); });
      const maq = (DATA.fw_historial || []).find(h => h.fecha === prox.fecha);
      if (maq) { const it = el("div", "pr-it"); const c = el("div", "cara-j"); c.textContent = "🤖"; const [a, b] = prox.cond === "L" ? [maq.gf, maq.gc] : [maq.gc, maq.gf]; it.append(c, el("span", null, "La Máquina"), el("span", "g", maq.goleador ? "⚽ " + maq.goleador : ""), el("span", "mk", `${a}-${b}`)); lista.append(it); }
    }
    // hallazgos del Prode
    const hh = $("#pr-hall"); hh.textContent = "";
    const hum = filas.filter(t => !t.maq), maqT = filas.find(t => t.maq);
    const H = [];
    if (hum.length) {
      const lider = hum[0]; H.push({ tipo: "curiosidad", titulo: `${corto(lider.n)} es el que más sabe: ${lider.p} puntos`, detalle: `${lider.ex} ${lider.ex === 1 ? "exacto" : "exactos"}, ${lider.ac} ${lider.ac === 1 ? "acierto" : "aciertos"} y ${lider.go} ${lider.go === 1 ? "goleador" : "goleadores"} en ${lider.pj} ${lider.pj === 1 ? "fecha" : "fechas"}.` });
      if (maqT) { const leGanan = hum.filter(t => t.p > maqT.p).map(t => corto(t.n)); H.push({ tipo: "comparacion", titulo: leGanan.length ? `Le ganan a la Máquina: ${leGanan.join(", ")}` : `La Máquina le gana a todos: ${maqT.p} puntos`, detalle: leGanan.length ? `La Máquina suma ${maqT.p}. El resto, a estudiar.` : "Ninguno de los ocho le pudo ganar todavía. Algunos deberían pedirle consejos." }); }
      const conPj = hum.filter(t => t.pj); if (conPj.length > 1) { const prom = t => t.goles / t.pj; const opt = conPj.slice().sort((a, b) => prom(b) - prom(a))[0], pes = conPj.slice().sort((a, b) => prom(a) - prom(b))[0]; H.push({ tipo: "curiosidad", titulo: `El optimista: ${corto(opt.n)}. El pesimista: ${corto(pes.n)}`, detalle: `${corto(opt.n)} pronostica ${prom(opt).toFixed(1).replace(".", ",")} goles nuestros por partido; ${corto(pes.n)}, ${prom(pes).toFixed(1).replace(".", ",")}.` }); }
      const cero = hum.filter(t => t.pj >= 2 && t.p === 0); if (cero.length) H.push({ tipo: "curiosidad", titulo: `Todavía en cero: ${cero.map(t => corto(t.n)).join(", ")}`, detalle: "Ni un resultado, ni un goleador. La tribuna pide explicaciones." });
    }
    H.forEach(x => hh.append(tarjeta(x)));
  }
  async function cargar() {
    if (!listo) { dibujar({}); return; }
    try {
      const t = await (await fetch(PRODE_CFG.csv + (PRODE_CFG.csv.includes("?") ? "&" : "?") + "t=" + Date.now())).text();
      const rows = parseCSV(t.trim()); const hd = rows.shift().map(x => x.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_"));
      const ix = k => hd.findIndex(x => x === k || x.startsWith(k));
      const iq = ix("quien"), ic = ix("clave"), iF = ix("fecha"), ig = ix("goles_ferro"), ir = ix("goles_rival"), igl = ix("goleador");
      const preds = {};
      rows.forEach(r => { const n = (r[iq] || "").trim(); if (!PRODE_HASH[n] || (r[ic] || "").trim() !== PRODE_HASH[n]) return; const f = +r[iF]; if (!f) return; (preds[f] = preds[f] || {})[n] = { gf: +r[ig] || 0, gc: +r[ir] || 0, gol: (r[igl] || "").trim() }; });
      PS.data = { rows, iq, ic, iF, ig, ir, igl, preds }; document.dispatchEvent(new CustomEvent("prode-cargado"));
      dibujar(preds);
    } catch (e) { dibujar({}); $("#pr-nota").textContent = "No se pudo leer el Prode en este momento."; }
  }
  cargar();
}

export default { init: initProde };
