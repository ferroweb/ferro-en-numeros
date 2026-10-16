// «Los que están al límite»: jugadores cerca de la quinta amarilla (una fecha de suspensión).
// Los datos los calcula scripts/lib/calculos.mjs (limiteAmarillas + cruceAmarillas) y vienen en DATA.limite_amarillas y DATA.cruce_amarillas.
import { DATA, prox } from "../../ctx.js";
import { caraJug } from "../../components/caras.js";
import { $, el } from "../../lib/dom.js";

const may = (s) => s.replace(/^./, c => c.toUpperCase());
// ¿La segunda fuente cuenta distinto? (no aplica si el club ya confirmó el número)
const difiere = (x) => !x.confirmado && x.cruce && x.cruce.ciclo !== x.ciclo;
const enLista = (fs) => fs.map(f => `F${f}`).join(", ").replace(/, ([^,]*)$/, " y $1");

function textoCruce(x) {
  if (!x.cruce || x.confirmado) return "";
  const fw = x.cruce.diferencias.filter(d => d.en === "ferroweb").map(d => d.fecha), sa = x.cruce.diferencias.filter(d => d.en === "otra").map(d => d.fecha);
  const partes = [];
  if (fw.length) partes.push(`Ferroweb le marca amarilla en ${enLista(fw)} y Solo Ascenso no`);
  if (sa.length) partes.push(`Solo Ascenso le marca amarilla en ${enLista(sa)} y Ferroweb no`);
  const cierra = x.suspensiones.some(s => s.jugo_siguiente) && x.cruce.suspensiones.length && !x.cruce.suspensiones.some(s => s.jugo_siguiente);
  const s = x.cruce.suspensiones[x.cruce.suspensiones.length - 1];
  return `⚠ ${partes.join("; ")}. ` + (cierra ? `Con las amarillas de Solo Ascenso las cuentas cierran: llegó a 5 en la F${s.fecha} y no jugó el partido siguiente (F${s.siguiente}). Así, hoy estaría en ${x.cruce.ciclo} de 5. Hay que confirmarlo con el club.`
    : difiere(x) ? `Con Solo Ascenso estaría en ${x.cruce.ciclo} de 5: hay que confirmarlo con el club.` : "El total da igual en las dos fuentes.");
}

function fila(x, extra, cuenta) {
  const f = el("div", "lim-j");
  f.append(caraJug(x.jugador), el("b", null, x.jugador));
  f.append(el("span", "lim-c", cuenta || (difiere(x) ? `¿${x.ciclo} o ${x.cruce.ciclo}?` : `${x.ciclo} de 5`)));
  const cumplio = x.suspensiones.filter(y => !y.jugo_siguiente).map(y => `llegó a ${x.fechas.indexOf(y.fecha) + 1} en la F${y.fecha} y cumplió la fecha en la F${y.siguiente}`);
  const texto = x.confirmado ? `✔ ${may(x.confirmado.fuente)}: ${x.confirmado.ciclo} al cierre de la fecha ${x.confirmado.al_cierre_de_fecha}. ${x.confirmado.nota}`
    : x.fechas.length ? `Amarillas en Ferroweb: fechas ${x.fechas.join(", ")}${cumplio.length ? ". " + may(cumplio.join("; ")) + "." : ""}` : "Ferroweb no le registra amarillas.";
  f.append(el("span", "nota", extra || texto));
  const tc = textoCruce(x); if (tc) f.append(el("span", "lim-x", tc));
  return f;
}

export function initLimite() {
  const L = DATA.limite_amarillas;
  const caja = $("#lim-caja"), c2 = $("#lim-caja2"), c3 = $("#lim-caja3"), c4 = $("#lim-caja4");
  if (!Array.isArray(L) || !L.length) { [caja, c2, c3, c4, $("#lim-regla")].forEach(e => { e.hidden = true; }); return; }
  const dudosos = L.filter(x => !x.confirmado && x.suspensiones.some(s => s.jugo_siguiente));
  const ok = L.filter(x => !dudosos.includes(x));
  // Si las fuentes no coinciden, se ubica por el conteo más alto (mejor avisar de más que de menos).
  const ciclo = (x) => difiere(x) ? Math.max(x.ciclo, x.cruce.ciclo) : x.ciclo;
  const sig = prox && (DATA.calendario.proximos || []).find(p => p.fecha === prox.fecha + 1);
  const a1 = ok.filter(x => ciclo(x) === 4), a2 = ok.filter(x => ciclo(x) === 3);
  // Conteos posibles de un «a confirmar»: los que cierran sacando una amarilla y, si cierra, el de Solo Ascenso.
  const cierraSA = (x) => x.cruce && x.cruce.suspensiones.length && !x.cruce.suspensiones.some(s => s.jugo_siguiente);
  const posibles = (x) => [...new Set([...(x.si_sobra_una || []), ...(cierraSA(x) ? [x.cruce.ciclo] : [])])].sort((a, b) => a - b);
  const alerta = dudosos.filter(x => posibles(x).includes(4)).map(x => x.jugador);
  $("#lim-n1").textContent = (prox ? `Si ven una amarilla ante ${prox.rival} (fecha ${prox.fecha}), se pierden ${sig ? `la fecha ${sig.fecha} contra ${sig.rival}` : "la fecha siguiente"}.` : "") + (alerta.length ? ` Ojo: ${alerta.join(" y ")} también podría${alerta.length > 1 ? "n" : ""} estar en 4 (ver «A confirmar»).` : "");
  a1.forEach(x => $("#lim-1").append(fila(x)));
  if (!a1.length) $("#lim-1").append(el("p", "nota", "Nadie está a una amarilla."));
  a2.forEach(x => $("#lim-2").append(fila(x)));
  if (!a2.length) c2.hidden = true;
  if (dudosos.length) {
    $("#lim-n3").textContent = "Según las síntesis de Ferroweb llegaron a 5 amarillas, pero jugaron el partido siguiente: hay alguna amarilla mal cargada. Mostramos solo los conteos con los que las cuentas cierran.";
    dudosos.forEach(x => { const s = x.suspensiones.find(y => y.jugo_siguiente); const v = posibles(x), sobra = x.si_sobra_una || [];
      const hip = sobra.length ? `si sobra una amarilla, hoy estaría en ${sobra.join(" o ")} de 5.` : "sacando una sola amarilla de Ferroweb las cuentas tampoco cierran.";
      $("#lim-3").append(fila(x, `Amarillas en Ferroweb: fechas ${x.fechas.join(", ")}. Llegó a 5 en la F${s.fecha} y jugó la F${s.siguiente}: ${hip}`, v.length ? `¿${v.join(" o ")}${v.length > 1 ? "" : " de 5"}?` : "¿?")); });
  } else c3.hidden = true;
  const X = DATA.cruce_amarillas;
  if (X && X.diferencias && X.diferencias.length) {
    $("#lim-n4").textContent = `Comparamos las amarillas de Ferro en las síntesis de Ferroweb y de Solo Ascenso (${X.fechas.length} partidos). Estas no coinciden; las que importan para la suspensión hay que confirmarlas con el club.`;
    const porFecha = new Map(); X.diferencias.forEach(d => porFecha.set(d.fecha, [...(porFecha.get(d.fecha) || []), d]));
    for (const [f, ds] of porFecha) {
      const rival = (DATA.partidos.find(p => p.fecha === f) || {}).rival;
      const txt = ds.map(d => `${d.jugador} (solo en ${d.en === "ferroweb" ? "Ferroweb" : X.fuente})`).join(", ");
      $("#lim-4").append(el("div", null, `F${f}${rival ? ` vs ${rival}` : ""}: ${txt}`));
    }
  } else c4.hidden = true;
  $("#lim-regla").textContent = "Cómo se cuenta: los marcados con ✔ están confirmados con el club; el resto sale de las síntesis de Ferroweb, cruzadas con las de Solo Ascenso. Cuando no coinciden, el jugador se ubica según el conteo más alto y se marca con ⚠. Cada 5 amarillas se cumple una fecha de suspensión y el conteo vuelve a cero. La amarilla de una doble amonestación (que termina en roja) no suma. Las rojas tienen su propia sanción y no entran acá. No figuran los jugadores que ya no están en el plantel.";
}
