import { DATA, prox, previaAlDia } from "../../ctx.js";
import { FERRO } from "../../lib/consts.js";
import { $, el } from "../../lib/dom.js";
import { fechaLarga } from "../../lib/fmt.js";

function animarPronostico(W) {
  const quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mk = document.querySelector("#pv-fw .mk"), big = $("#pv-big"), barra = $("#pv-barra");
  const segs = [...barra.querySelectorAll("i")], objetivos = segs.map(i => i.style.width);
  const leys = [...document.querySelectorAll("#pv-ley b")], vals = ["ganar", "empatar", "perder"].map(k => W[k]);
  const camp = document.querySelector("#pv-campeon b"), campV = camp ? parseInt(camp.textContent) : 0;
  let bola = barra.querySelector(".pv-bola"); if (!bola) { bola = el("span", "pv-bola", "⚽"); bola.setAttribute("aria-hidden", "true"); barra.append(bola); }
  const final = mk ? mk.textContent : "";
  const contar = (elx, hasta, ms, suf = "%") => { if (!elx) return; const t0 = performance.now(); const paso = t => { const k = Math.min(1, (t - t0) / ms); elx.textContent = Math.round(hasta * (1 - Math.pow(1 - k, 3))) + suf; if (k < 1) requestAnimationFrame(paso); }; requestAnimationFrame(paso); };
  function tirar() {
    if (quieto) { if (mk) mk.textContent = final; bola.style.left = `calc(${W.ganar}% - 10px)`; return; }
    segs.forEach(i => { i.style.transition = "none"; i.style.width = "0%"; }); bola.style.transition = "none"; bola.style.left = "0"; bola.style.transform = "rotate(0deg)";
    big.classList.add("oculto"); leys.forEach(b => b.textContent = "0%"); if (camp) camp.textContent = "0%";
    void barra.offsetWidth;
    if (mk) {
      const [a, b] = final.split("-"); mk.textContent = ""; const d1 = el("span", "dg", "?"), d2 = el("span", "dg", "?"); mk.append(d1, document.createTextNode("-"), d2);
      mk.classList.remove("listo"); mk.classList.add("gira");
      const t0 = performance.now(); const iv = setInterval(() => { const e = performance.now() - t0; d1.textContent = e > 1100 ? a : Math.floor(Math.random() * 5); d2.textContent = e > 1400 ? b : Math.floor(Math.random() * 5); if (e > 1400) { clearInterval(iv); mk.classList.remove("gira"); void mk.offsetWidth; mk.classList.add("listo"); big.classList.remove("oculto"); const g = big.querySelector(".pv-gol"); if (g) { g.style.animation = "none"; void g.offsetWidth; g.style.animation = ""; } } }, 70);
    }
    setTimeout(() => { segs.forEach((i, n) => { i.style.transition = ""; i.style.width = objetivos[n]; }); bola.style.transition = ""; bola.style.left = `calc(${W.ganar}% - 10px)`; bola.style.transform = `rotate(${Math.round(W.ganar * 7)}deg)`; leys.forEach((b, n) => contar(b, vals[n], 1300)); contar(camp, campV, 1600); }, 250);
  }
  if (mk) { mk.title = "Tocá para volver a tirar el pronóstico"; mk.setAttribute("role", "button"); mk.tabIndex = 0; mk.addEventListener("click", e => { e.stopPropagation(); tirar(); }); mk.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); tirar(); } }); }
  const card = $("#pv-res");
  if ("IntersectionObserver" in window) { const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) { io.disconnect(); tirar(); } }, { threshold: .4 }); io.observe(card); } else tirar();
}

export function initResumen() {
  const P = DATA.pronostico, sec = $("#pv-res");
  if (!prox) { sec.hidden = true; return; }
  const lugar = prox.cond === "L" ? "en Caballito" : (prox.estadio ? prox.estadio.replace(/^.*\(([^)]+)\).*$/, "$1") : "de visitante");
  $("#pv-eti").textContent = `Previa · Fecha ${prox.fecha}` + (prox.dia ? ` · ${fechaLarga(prox.dia)}${prox.hora ? " · " + prox.hora + " hs" : ""}` : "") + ` · ${lugar}`;
  const vs = $("#pv-vs"); vs.textContent = "";
  const loc = prox.cond === "L" ? "Ferro" : prox.rival, vis = prox.cond === "L" ? prox.rival : "Ferro";
  vs.append(document.createTextNode(loc), el("small", null, "vs"), document.createTextNode(vis));
  if (P && previaAlDia) {
    const W = DATA.fw || P;
    if (DATA.fw) {
      const fwb = $("#pv-fw"); fwb.textContent = "";
      const [gl, gv] = W.cond === "L" ? [W.gf, W.gc] : [W.gc, W.gf];
      fwb.append(el("span", "eq", loc), el("span", "mk", `${gl}-${gv}`), el("span", "eq", vis));
      const aut = (W.autores || []).filter(Boolean);
      const cuenta = {}; aut.forEach(x => cuenta[x] = (cuenta[x] || 0) + 1);
      const goles = Object.entries(cuenta).map(([j, n]) => n > 1 ? `${j} (${n})` : j).join(" y ");
      $("#pv-big").textContent = W.gf > W.gc ? `Ganamos${goles ? ", gol" + (aut.length > 1 ? "es" : "") + " de " + goles : ""}` : W.gf === W.gc ? `Empate${goles ? ", gol nuestro de " + goles : ""}` : "Se nos complica, pero hay fe";
      if (goles) { const g = el("span", "pv-gol", " ⚽"); g.setAttribute("aria-hidden", "true"); $("#pv-big").append(g); }
      // detalle
      const f = W.factores;
      $("#pv-fw-nota").textContent = `Esperamos ${W.xg_ferro.toLocaleString("es-AR")} goles nuestros y ${W.xg_rival.toLocaleString("es-AR")} de ${W.rival}. Con eso, ${W.p_salida}% de chances del resultado que elegimos (${W.gf > W.gc ? "victoria" : W.gf === W.gc ? "empate" : "derrota"}) y ${W.p_marcador}% de pegarle al marcador exacto: en el fútbol el resultado justo sale una de cada cinco veces, por eso lo llamamos pronóstico y no profecía.` + (W.suspendidos && W.suspendidos.length ? ` No cuenta con ${W.suspendidos.join(", ")}, expulsado en la fecha anterior.` : "");
      const g = $("#pv-gol"); g.textContent = "";
      W.goleadores.forEach((x, i) => { const r = el("div", "pv-ch" + (i === 0 ? " yo" : "")); const b = el("div", "b"); const ii = el("i"); ii.style.width = Math.min(100, x.p * 3) + "%"; b.append(ii); r.append(el("span", null, x.jugador), b, el("span", "n", x.p + "%")); g.append(r); });
      g.append(el("div", "nota", "Chance de que convierta, según sus goles por minuto y los minutos que viene jugando."));
      const filasF = [["Temporada (para este partido)", f.temporada], [W.cond === "L" ? "Nosotros de local" : "Nosotros de visitante", f.condicion], ["Nuestras últimas 5", f.forma_ferro], [`${W.rival}: últimas 5`, f.forma_rival]];
      const tb = $("#pv-fact"); tb.textContent = "";
      const th = el("tr"); ["", "Goles a favor", "En contra"].forEach(t => th.append(el("th", null, t))); const thead = el("thead"); thead.append(th); tb.append(thead);
      const tbo = el("tbody"); filasF.forEach(([l, v]) => { const tr = el("tr"); tr.append(el("td", null, l), el("td", "num", v[0].toLocaleString("es-AR")), el("td", "num", v[1].toLocaleString("es-AR"))); tbo.append(tr); }); tb.append(tbo);
      const H = (DATA.fw_historial || []).filter(h => h.real);
      $("#pv-hist").textContent = H.length ? `Cómo nos fue con los pronósticos FW: acertamos el resultado en ${H.filter(h => h.signo_ok).length} de ${H.length}, el marcador exacto en ${H.filter(h => h.exacto_ok).length} y el goleador en ${H.filter(h => h.goleador_ok).length}.` : "Este es el primer pronóstico FW: después de cada partido vamos a contar acá si le pegamos o no, sin trampa.";
    } else { $("#pv-fwcaja").hidden = true; $("#pv-big").textContent = "Le tenemos fe"; }
    const barra = $("#pv-barra"); barra.textContent = "";
    [["ganar", "#7fe0a2", "Ganamos"], ["empatar", "rgba(255,255,255,.55)", "Empate"], ["perder", "#ff9b85", "Perdemos"]].forEach(([k, c, l]) => {
      const i = el("i"); i.style.width = W[k] + "%"; i.style.background = c; barra.append(i);
      const sp = el("span"); sp.style.setProperty("--c", c); sp.append(l + " "); sp.append(el("b", null, W[k] + "%")); $("#pv-ley").append(sp);
    });
    const yo = P.chances_primero.find(c => c.equipo === FERRO);
    if (yo) { const cc = $("#pv-campeon"); cc.textContent = ""; cc.append("Chance de terminar primeros: "); cc.append(el("b", null, yo.p + "%")); }
    animarPronostico(W);
    // escenarios
    $("#pv-esc-nota").textContent = `Hoy tenemos ${DATA.escenarios.ferro} puntos. Para las cuentas suponemos que ${DATA.escenarios.perseguidores[0].equipo.replace("Deportivo ", "")} gana todo lo que le queda.`;
    const box = $("#pv-escs"); box.textContent = "";
    const pr = { "Si ganamos": ["G", W.ganar], "Si empatamos": ["E", W.empatar], "Si perdemos": ["P", W.perder] };
    P.escenarios.forEach(e => {
      const [cl, pp] = pr[e.res]; const c = el("div", "pv-esc " + cl);
      c.append(el("h4", null, e.res), el("div", "pp", `${pp}% de chances · quedamos con ${e.pts}`));
      let t;
      if (e.necesita === 0) t = "¡Primeros asegurados! Se festeja en Caballito.";
      else if (!e.depende) t = `Ya no dependemos solo de nosotros: necesitaríamos ${e.necesita} puntos y quedan ${e.de}. A mirar de reojo a Morón.`;
      else if (e.necesita === e.de) t = `Hay que ganar los ${e.de / 3} que quedan, sin margen de error. Con eso somos primeros sin mirar a nadie.`;
      else t = `Nos alcanzan ${e.necesita} de los ${e.de} puntos que quedan para ser primeros sin mirar a nadie.`;
      c.append(el("p", null, t)); box.append(c);
    });
    const ch = $("#pv-chances"); ch.textContent = "";
    P.chances_primero.forEach(x => { const r = el("div", "pv-ch" + (x.equipo === FERRO ? " yo" : "")); const b = el("div", "b"); const i = el("i"); i.style.width = Math.max(x.p, 1) + "%"; b.append(i); r.append(el("span", null, x.equipo === FERRO ? "Ferro" : x.equipo.replace("Deportivo ", "")), b, el("span", "n", x.p + "%")); ch.append(r); });
  } else {
    // La previa de esta fecha todavía no está lista: se ocultan los bloques que dependen del pronóstico.
    $(".pv-pron").hidden = true;
    ["#pv-fwcaja", "#pv-esc-caja", "#pv-metodo", "#pv-quien1"].forEach(id => { $(id).hidden = true; });
    $("#aviso-previa").hidden = false;
  }
  // chicanas rotativas
  const hu = prox.humor || {}; const frases = (hu.frases && hu.frases.length) ? hu.frases : (hu.puntos || []).map(x => x[1].split(". ")[0] + ".");
  const fr = $("#pv-frase");
  if (frases.length) {
    let iF = Math.floor(Math.random() * frases.length); fr.textContent = frases[iF];
    const quieto = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (frases.length > 1 && !quieto) setInterval(() => { fr.style.opacity = 0; setTimeout(() => { iF = (iF + 1) % frases.length; fr.textContent = frases[iF]; fr.style.opacity = 1; }, 350); }, 6500);
  } else fr.closest(".pv-chica").hidden = true;

}
