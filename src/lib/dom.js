export const $ = (s) => document.querySelector(s);
export const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
export const f2 = (v) => v == null ? "—" : Number(v).toFixed(2).replace(".", ",");
export const miles = (v) => v == null ? "—" : Number(v).toLocaleString("es-AR");
const svgNS = "http://www.w3.org/2000/svg";
export const S = (tag, attrs, parent) => { const e = document.createElementNS(svgNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };

// ---------- "Ver más": mostrar lo principal y dejar el resto a un clic ----------
const botonMas = (texto, alClick) => { const b = el("button", "ver-mas", texto); b.type = "button"; b.addEventListener("click", alClick); return b; };
const quitarBoton = (ref) => { const s = ref.nextElementSibling; if (s && s.classList.contains("ver-mas")) s.remove(); };

// Muestra los primeros n hijos de `cont` (tarjetas, ítems de lista…) y esconde el resto detrás de un botón.
export function limitar(cont, n, singular = "más") {
  if (!cont) return;
  quitarBoton(cont);
  const hijos = [...cont.children]; hijos.forEach(h => { h.hidden = false; });
  if (hijos.length <= n + 1) return;                      // por uno solo no vale la pena esconder
  const extra = hijos.slice(n); extra.forEach(h => { h.hidden = true; });
  const rotulo = `Ver ${extra.length === 1 ? "1 más" : `los ${extra.length} restantes`}${singular === "más" ? "" : ` (${singular})`}`;
  const b = botonMas(rotulo, () => { const abre = extra[0].hidden; extra.forEach(h => { h.hidden = !abre; }); b.textContent = abre ? "Ver menos" : rotulo; });
  cont.after(b);
}

// Igual para filas de una tabla (funciona aunque se reordene): muestra las primeras n filas.
export function limitarTabla(tabla, n) {
  if (!tabla) return;
  const caja = tabla.closest(".tw") || tabla; quitarBoton(caja);
  const filas = tabla.querySelectorAll("tbody tr").length || tabla.querySelectorAll("tr").length;
  tabla.classList.remove("t-corta", `t-corta-${n}`);
  if (filas <= n + 1) return;
  tabla.classList.add("t-corta", `t-corta-${n}`);
  const rotulo = `Ver las ${filas - n} filas restantes`;
  const b = botonMas(rotulo, () => { const corta = tabla.classList.toggle("t-corta"); b.textContent = corta ? rotulo : "Ver menos"; });
  caja.after(b);
}

// Tablas anchas: las columnas marcadas con `x` quedan ocultas hasta que se pida verlas todas.
export function columnasExtra(tabla) {
  const caja = tabla.closest(".tw"); quitarBoton(caja);
  caja.classList.add("cols-pocas");
  const b = botonMas("Ver todas las columnas", () => { const poco = caja.classList.toggle("cols-pocas"); b.textContent = poco ? "Ver todas las columnas" : "Ver menos columnas"; });
  caja.after(b);
}
