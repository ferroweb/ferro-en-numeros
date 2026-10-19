// «Los que están al límite»: jugadores cerca de la quinta amarilla (una fecha de suspensión).
// Las amarillas se cuentan por mayoría entre tres fuentes (Ferroweb, Solo Ascenso y AFA); lo calcula scripts/lib/calculos.mjs
// (amarillasPorFuente + limiteAmarillas) y viene en DATA.limite_amarillas y DATA.cruce_amarillas.
import { DATA, prox } from "../../ctx.js";
import { caraJug } from "../../components/caras.js";
import { tabla } from "../../lib/charts.js";
import { $, el } from "../../lib/dom.js";

const may = (s) => s.replace(/^./, c => c.toUpperCase());
const FUENTES = [["ferroweb", "Ferroweb"], ["soloascenso", "Solo Ascenso"], ["afa", "AFA"]];
const lista = (xs) => xs.join(", ").replace(/, ([^,]*)$/, " y $1");

// «F12: Ferroweb y AFA le marcan amarilla, Solo Ascenso no (se cuenta).»
function textoFuentes(x) {
  if (!x.fuentes || x.confirmado) return "";
  return "⚠ " + x.fuentes.map(f => {
    const si = FUENTES.filter(([k]) => f[k] === true).map(([, n]) => n), no = FUENTES.filter(([k]) => f[k] === false).map(([, n]) => n);
    return `F${f.fecha}: ${lista(si)} le marca${si.length > 1 ? "n" : ""} amarilla, ${lista(no)} no (${f.mayoria ? "se cuenta" : "no se cuenta"})`;
  }).join(". ") + ".";
}

function fila(x, extra, cuenta) {
  const f = el("div", "lim-j");
  f.append(caraJug(x.jugador), el("b", null, x.jugador));
  f.append(el("span", "lim-c", cuenta || `${x.ciclo} de 5`));
  const cumplio = x.suspensiones.filter(y => !y.jugo_siguiente).map(y => `llegó a 5 en la F${y.fecha} y cumplió la fecha en la F${y.siguiente}`);
  const sancion = x.faltan === 1 ? ` Con una amarilla más se pierde ${x.proxima_sancion === 1 ? "una fecha" : x.proxima_sancion === 2 ? "dos fechas" : "más de una fecha"}.` : "";
  const texto = x.confirmado ? `✔ ${may(x.confirmado.fuente)}: ${x.confirmado.ciclo} acumulada${x.confirmado.ciclo === 1 ? "" : "s"} al cierre de la fecha ${x.confirmado.al_cierre_de_fecha}.${sancion} ${x.confirmado.nota}`.trim()
    : `Amarillas en las fechas ${x.fechas.join(", ")}${cumplio.length ? ". " + may(cumplio.join("; ")) + "." : ""}`;
  f.append(el("span", "nota", extra || texto));
  const tf = textoFuentes(x); if (tf) f.append(el("span", "lim-x", tf));
  // Si la fuente en minoría tuviera razón y las cuentas también cierran, se avisa cómo quedaría.
  (x.otras_lecturas || []).forEach(o => {
    const r = x.fuentes.find(y => y.fecha === o.fecha), quien = r ? lista(FUENTES.filter(([k]) => r[k] != null && r[k] !== r.mayoria).map(([, n]) => n)) : "la otra fuente";
    const s = o.suspension && o.suspension.siguiente != null ? ` (llegaría a 5 en la F${o.suspension.fecha} y no jugó la F${o.suspension.siguiente})` : "";
    f.append(el("span", "lim-x", `Si tuviera razón ${quien} en la F${o.fecha}, hoy estaría en ${o.ciclo} de 5${s}: hay que confirmarlo con el club.`));
  });
  return f;
}

export function initLimite() {
  const L = DATA.limite_amarillas;
  const caja = $("#lim-caja"), c2 = $("#lim-caja2"), c3 = $("#lim-caja3"), c4 = $("#lim-caja4");
  if (!Array.isArray(L) || !L.length) { [caja, c2, c3, c4, $("#lim-caja0"), $("#lim-regla")].forEach(e => { e.hidden = true; }); return; }
  // Los que llegaron a 5 (o 10) en el último partido: se pierden el próximo.
  const ult = DATA.ultima_fecha, susp = L.filter(x => x.suspensiones.some(s => s.fecha === ult));
  if (susp.length && prox) {
    $("#lim-n0").textContent = `Llegaron a una nueva tanda de 5 amarillas en la fecha ${ult} y no pueden jugar ante ${prox.rival} (fecha ${prox.fecha}).`;
    susp.forEach(x => $("#lim-0").append(fila(x, `Vio la amarilla en la fecha ${ult} y completó ${x.total} en el torneo.${x.confirmado ? " Conteo base: " + x.confirmado.fuente + "." : ""}`, "Suspendido")));
  } else $("#lim-caja0").hidden = true;
  const dudosos = L.filter(x => !x.confirmado && x.suspensiones.some(s => s.jugo_siguiente));
  const ok = L.filter(x => !dudosos.includes(x));
  const sig = prox && (DATA.calendario.proximos || []).find(p => p.fecha === prox.fecha + 1);
  const a1 = ok.filter(x => x.faltan === 1), a2 = ok.filter(x => x.faltan === 2);
  const alerta = dudosos.filter(x => (x.si_sobra_una || []).includes(4) || (x.otras_lecturas || []).some(o => o.ciclo === 4)).map(x => x.jugador);
  const dos = a1.filter(x => x.proxima_sancion === 2).map(x => x.jugador);
  $("#lim-n1").textContent = (prox ? `Si ven una amarilla ante ${prox.rival} (fecha ${prox.fecha}), se pierden ${sig ? `la fecha ${sig.fecha} contra ${sig.rival}` : "la fecha siguiente"}${dos.length ? `; ${lista(dos)}, dos fechas, porque sería su décima amarilla` : ""}.` : "") + (alerta.length ? ` Ojo: ${lista(alerta)} también podría${alerta.length > 1 ? "n" : ""} estar en 4 (ver «A confirmar»).` : "");
  a1.forEach(x => $("#lim-1").append(fila(x)));
  if (!a1.length) $("#lim-1").append(el("p", "nota", "Nadie está a una amarilla."));
  a2.forEach(x => $("#lim-2").append(fila(x)));
  if (!a2.length) c2.hidden = true;
  if (dudosos.length) {
    $("#lim-n3").textContent = "Según las amarillas registradas llegaron a 5, pero jugaron el partido siguiente: falta o sobra alguna. Mostramos solo los conteos con los que las cuentas cierran.";
    dudosos.forEach(x => { const s = x.suspensiones.find(y => y.jugo_siguiente), v = [...new Set([...(x.si_sobra_una || []), ...(x.otras_lecturas || []).map(o => o.ciclo)])].sort((a, b) => b - a);
      const hip = (x.si_sobra_una || []).length ? `si sobra una amarilla, hoy estaría en ${x.si_sobra_una.join(" o ")} de 5.` : (x.otras_lecturas || []).length ? "sacando una amarilla no cierra; ver abajo la otra lectura." : "sacando una sola amarilla las cuentas tampoco cierran.";
      $("#lim-3").append(fila(x, `Amarillas en las fechas ${x.fechas.join(", ")}. Llegó a 5 en la F${s.fecha} y jugó la F${s.siguiente}: ${hip}`, v.length ? `¿${v.join(" o ")}${v.length > 1 ? "" : " de 5"}?` : "¿?")); });
  } else c3.hidden = true;
  const X = DATA.cruce_amarillas;
  if (X && X.filas && X.filas.length) {
    const n = (k) => (X.fechas[k] || []).length, falta = X.fechas.ferroweb.filter(f => !X.fechas.afa.includes(f));
    $("#lim-n4").textContent = `Comparamos las amarillas de Ferro en Ferroweb (${n("ferroweb")} partidos), Solo Ascenso (${n("soloascenso")}) y la ficha oficial de AFA (${n("afa")}${falta.length ? `; no tiene la F${falta.join(", F")}` : ""}). Cuando no coinciden, se cuenta lo que dicen al menos dos de las tres; con ✔, lo que se desprende del informe oficial de amarillas acumuladas de AFA, que manda sobre las tres.`;
    const marca = (td, v) => { td.textContent = v == null ? "—" : v ? "Sí" : "No"; if (v != null) td.className = v ? "si" : "no"; };
    tabla("#lim-4", [
      { k: "fecha", h: "Fecha", f: (v) => `F${v}` },
      { k: "rival", h: "Rival", l: 1, x: 1 },
      { k: "jugador", h: "Jugador", l: 1 },
      ...FUENTES.map(([k, h]) => ({ k, h, render: marca })),
      { k: "cuenta", h: "Se cuenta", render: (td, v, r) => { marca(td, v); if (r.informe != null) td.textContent += " ✔"; } },
    ], X.filas.map(f => ({ ...f, cuenta: f.informe ?? f.mayoria, rival: (DATA.partidos.find(p => p.fecha === f.fecha) || {}).rival })));
  } else c4.hidden = true;
  $("#lim-regla").textContent = "Cómo se cuenta: los marcados con ✔ salen del informe oficial de amarillas acumuladas de AFA; las amarillas de los partidos posteriores, y los jugadores que no estén en el informe, salen de cruzar Ferroweb, Solo Ascenso y la ficha de AFA de cada partido, contando lo que dicen al menos dos de las tres (la tabla muestra dónde no coinciden). Al llegar a 5 amarillas se cumple una fecha de suspensión y el conteo vuelve a cero; al llegar a 10, son dos fechas. La amarilla de una doble amonestación (que termina en roja) no suma. Las rojas tienen su propia sanción y no entran acá. No figuran los jugadores que ya no están en el plantel.";
}
