import { caraJug } from "../../components/caras.js";
import { DATA, prox } from "../../ctx.js";
import { $, el, limitar } from "../../lib/dom.js";

export function initAten() {
  const A = prox && prox.ateneaid; if (!A) return;
  $("#aten-caja").hidden = false; $("#aten-riv").textContent = prox.rival;
  $("#aten-n").textContent = `Datos de ${A.fuente}. En verde la métrica donde estamos mejor que ellos.`;
  const box = $("#aten-m"); const fmt = (v, u) => v.toLocaleString("es-AR", { maximumFractionDigits: 2 }) + (u === "%" ? "%" : "");
  A.metricas.forEach(([n, u, r, f, pr, dir]) => {
    const mx = Math.max(r, f, pr) * 1.08, x = el("div", "am"), t = el("div", "t");
    const gana = dir > 0 ? f > r : f < r; t.append(document.createTextNode(n)); if (gana) t.append(el("span", null, "✓ mejor nosotros")); x.append(t);
    [[r, "var(--lin25)", prox.rival], [f, "var(--verde)", "Ferro"]].forEach(([v, col, who]) => { const row = el("div", "r"); const b = el("div", "b"); const i = el("i"); i.style.width = (v / mx * 100) + "%"; i.style.background = col; const uu = el("u"); uu.style.left = (pr / mx * 100) + "%"; b.append(i, uu); b.title = `${who}: ${fmt(v, u)} · promedio ${fmt(pr, u)}`; row.append(b, el("span", "v", fmt(v, u))); x.append(row); });
    box.append(x);
  });
  const l = $("#aten-l"); (A.lecturas || []).forEach(([a, b]) => { const li = el("li"); li.append(el("b", null, a), el("span", null, b)); l.append(li); });
  limitar(box, 4); limitar(l, 3);
}

export function initCarasConocidas() {
  const C = DATA.cruce; if (!C || !prox || C.rival !== prox.rival) return;
  $("#cc-caja").hidden = false;
  $("#cc-n").textContent = `Cruzamos la trayectoria de los dos planteles (datos de ${C.fuente}; años aproximados). Ex compañeros, ex nuestros y clubes en los que coincidieron.`;
  const yy = (d, h) => d && h && d !== h ? `${d}-${String(h).slice(2)}` : (d || h || "");
  const FR = ["Si la mete, que no lo grite. Es lo mínimo.", "Conoce el vestuario, el Oeste y nuestras mañas. Atención.", "Vuelve a cruzarse con nosotros. Que nos extrañe un ratito más.", "La ley del ex no perdona. Que esta vez sí perdone."];
  const ex = $("#cc-ex");
  if (!C.ex_ferro.length) $("#cc-exw").hidden = true;
  C.ex_ferro.forEach((x, i) => { const d = el("div"); d.append(el("b", null, x.jugador), el("span", null, `Jugó en Ferro ${yy(x.desde, x.hasta)}${x.nota ? " (" + x.nota + ")" : ""}. ${FR[i % FR.length]}`)); ex.append(d); });
  C.ex_rival.forEach(x => { const d = el("div"); d.style.borderColor = "var(--verde)"; d.append(el("b", null, x.jugador), el("span", null, `Nuestro, pero pasó por ${C.rival} ${yy(x.desde, x.hasta)}. Sabe dónde les duele.`)); ex.append(d); });
  if (C.ex_rival.length) $("#cc-exw").hidden = false;
  const par = $("#cc-par"), G = {};
  C.companeros.forEach(x => { (G[x.ferro] = G[x.ferro] || []).push(x); });
  const ks = Object.keys(G); if (!ks.length) $("#cc-parw").hidden = true;
  ks.sort((a, b) => G[b].length - G[a].length).forEach(n => {
    const li = el("li"), t = el("div"); li.append(caraJug(n));
    const vistos = new Set(), txt = G[n].filter(x => { const k = x.rival + x.club; if (vistos.has(k)) return false; vistos.add(k); return true; }).map(x => `${x.rival} en ${x.club} (${x.anios.split("-")[0] === x.anios.split("-")[1] ? x.anios.split("-")[0] : x.anios})`);
    t.append(el("b", null, n), el("small", null, "Compartió plantel con " + txt.join(" · "))); li.append(t); par.append(li);
  });
  const cl = $("#cc-cl");
  C.clubes.slice(0, 10).forEach(([c, a, b]) => { const sp = el("span", null, `${c} · ${a.length}+${b.length}`); sp.title = `Nuestros: ${a.join(", ")}\nDe ${C.rival}: ${b.join(", ")}`; cl.append(sp); });
  cl.append(el("span", null, "N+M = nuestros + de ellos que pasaron por ahí"));
  limitar(ex, 3); limitar(par, 4);
  cl.lastChild.style.border = "0";
}

export function initRival() { initAten(); initCarasConocidas(); }
