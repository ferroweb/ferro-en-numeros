import { tarjeta } from "../components/tarjeta.js";
import { TODOS } from "../ctx.js";
import { tabla } from "../lib/charts.js";
import { CAT } from "../lib/consts.js";
import { $, el } from "../lib/dom.js";
import { abrirDesarrollo } from "../components/desarrollo.js";

let filtro = "todos", q = "", todos = false;
function hallazgos() {
  const chips = $("#chips"); chips.textContent = "";
  const orden = ["todos", "record", "curiosidad", "jugador", "equipo", "comparacion", "tabla", "novedad"];
  orden.forEach(k => {
    const n = k === "todos" ? TODOS.length : TODOS.filter(x => x.tipo === k).length; if (!n) return;
    const b = el("button", "chip"); b.type = "button"; b.setAttribute("aria-pressed", String(filtro === k));
    if (k !== "todos") { const i = el("i"); i.style.background = CAT[k][1]; b.append(i); }
    b.append(document.createTextNode((k === "todos" ? "Todos" : CAT[k][0] + (k === "curiosidad" ? "" : "")) + " " + n));
    b.addEventListener("click", () => { filtro = k; todos = false; hallazgos(); });
    chips.append(b);
  });
  const lista = TODOS.filter(x => (filtro === "todos" || x.tipo === filtro) && (!q || (x.titulo + " " + (x.detalle || "") + " " + (x.jugador || "")).toLowerCase().includes(q)));
  const box = $("#hall"); box.textContent = "";
  const lim = todos || q ? lista.length : 12;
  lista.slice(0, lim).forEach(x => box.append(tarjeta(x)));
  if (!lista.length) box.append(el("div", "d", "Ningún hallazgo coincide con la búsqueda."));
  $("#mas").hidden = lista.length <= lim;
  $("#mas").textContent = `Ver los ${lista.length}`;
}

function init() {
  $("#mas").addEventListener("click", () => { todos = true; hallazgos(); });
  $("#q").addEventListener("input", e => { q = e.target.value.trim().toLowerCase(); hallazgos(); });
  hallazgos();
}
// Link directo a un dato: #/datos/hallazgos/<id> abre su detalle (lo usan las placas y los botones de compartir).
let abierto = "";
function onShow(grupo, pagina, param) {
  if (grupo !== "datos" || pagina !== "hallazgos" || !param) { abierto = ""; return; }
  if (param === abierto) return;
  const x = TODOS.find(h => h.id === param); if (!x) return;
  abierto = param; abrirDesarrollo(x);
}
export default { init, onShow };
