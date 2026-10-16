// «Los que están al límite»: jugadores cerca de la quinta amarilla (una fecha de suspensión).
// Los datos los calcula scripts/lib/calculos.mjs (limiteAmarillas) y vienen en DATA.limite_amarillas.
import { DATA, prox } from "../../ctx.js";
import { caraJug } from "../../components/caras.js";
import { $, el } from "../../lib/dom.js";

function fila(x, extra, cuenta) {
  const f = el("div", "lim-j");
  f.append(caraJug(x.jugador), el("b", null, x.jugador));
  f.append(el("span", "lim-c", cuenta || `${x.ciclo} de 5`));
  const cumplio = x.suspensiones.filter(y => !y.jugo_siguiente).map(y => `llegó a ${x.fechas.indexOf(y.fecha) + 1} en la F${y.fecha} y cumplió la fecha en la F${y.siguiente}`);
  const texto = x.confirmado ? `✔ ${x.confirmado.fuente.replace(/^./, c => c.toUpperCase())}: ${x.confirmado.ciclo} al cierre de la fecha ${x.confirmado.al_cierre_de_fecha}. ${x.confirmado.nota}` : `Amarillas en las fechas ${x.fechas.join(", ")}${cumplio.length ? ". " + cumplio.join("; ").replace(/^./, c => c.toUpperCase()) + "." : ""}`;
  f.append(el("span", "nota", extra || texto));
  return f;
}

export function initLimite() {
  const L = DATA.limite_amarillas;
  const caja = $("#lim-caja"), c2 = $("#lim-caja2"), c3 = $("#lim-caja3");
  if (!Array.isArray(L) || !L.length) { [caja, c2, c3, $("#lim-regla")].forEach(e => { e.hidden = true; }); return; }
  const dudosos = L.filter(x => !x.confirmado && x.suspensiones.some(s => s.jugo_siguiente));
  const ok = L.filter(x => !dudosos.includes(x));
  const sig = prox && (DATA.calendario.proximos || []).find(p => p.fecha === prox.fecha + 1);
  const a1 = ok.filter(x => x.faltan === 1), a2 = ok.filter(x => x.faltan === 2);
  $("#lim-n1").textContent = prox ? `Si ven una amarilla ante ${prox.rival} (fecha ${prox.fecha}), se pierden ${sig ? `la fecha ${sig.fecha} contra ${sig.rival}` : "la fecha siguiente"}.` : "";
  a1.forEach(x => $("#lim-1").append(fila(x)));
  if (!a1.length) $("#lim-1").append(el("p", "nota", "Nadie está a una amarilla."));
  a2.forEach(x => $("#lim-2").append(fila(x)));
  if (!a2.length) c2.hidden = true;
  if (dudosos.length) {
    $("#lim-n3").textContent = "Según las síntesis llegaron a 5 amarillas, pero jugaron el partido siguiente: puede haber una amarilla mal cargada, así que su conteo podría estar corrido en una.";
    dudosos.forEach(x => { const s = x.suspensiones.find(y => y.jugo_siguiente); $("#lim-3").append(fila(x, `Amarillas en las fechas ${x.fechas.join(", ")}. Llegó a 5 en la F${s.fecha} y jugó la F${s.siguiente}: si sobra una amarilla, hoy estaría en ${(x.amarillas - 1) % 5} de 5.`, `¿${(x.amarillas - 1) % 5} de 5?`)); });
  } else c3.hidden = true;
  $("#lim-regla").textContent = "Cómo se cuenta: los marcados con ✔ están confirmados con el club; el resto sale de las síntesis de Ferroweb. Cada 5 amarillas se cumple una fecha de suspensión y el conteo vuelve a cero. La amarilla de una doble amonestación (que termina en roja) no suma. Las rojas tienen su propia sanción y no entran acá. No figuran los jugadores que ya no están en el plantel. Fuente: síntesis de Ferroweb.";
}
