// Compartir cualquier dato: copiar un texto listo para tuitear, copiar el link directo o bajar una imagen con la marca del sitio.
import { $, el } from "../lib/dom.js";
import { cargarHtml2canvas } from "../lib/html2canvas.js";

const LIMITE_TUIT = 255;   // deja lugar para el link (X cuenta 23 caracteres)

// ---------- avisos ----------
let aviso, avisoT;
export function avisar(texto) {
  if (!aviso) { aviso = el("div", "toast"); aviso.setAttribute("role", "status"); document.body.append(aviso); }
  aviso.textContent = texto; aviso.classList.add("on");
  clearTimeout(avisoT); avisoT = setTimeout(() => aviso.classList.remove("on"), 2600);
}

export async function copiar(texto, mensaje = "Copiado") {
  try { await navigator.clipboard.writeText(texto); }
  catch (e) {   // navegadores sin permiso de portapapeles
    const t = el("textarea"); t.value = texto; t.style.cssText = "position:fixed;opacity:0"; document.body.append(t); t.select();
    try { document.execCommand("copy"); } finally { t.remove(); }
  }
  avisar(mensaje);
}

// ---------- texto ----------
const recortar = (s, max) => s.length <= max ? s : s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
export function textoParaTuit(titulo, detalle, enlace) {
  const t = titulo.trim(), d = (detalle || "").replace(/\s+/g, " ").trim();
  const cuerpo = d ? recortar(`${t}\n\n${d}`, LIMITE_TUIT) : recortar(t, LIMITE_TUIT);
  return `${cuerpo}\n${enlace}`;
}
export const enlaceActual = () => location.href;

// ---------- imagen ----------
const nombreArchivo = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "dato";

// Arma una placa con el contenido clonado, el nombre del sitio arriba y el link abajo, y la convierte en PNG.
export async function imagenDe(nodo, titulo) {
  await cargarHtml2canvas();
  const placa = el("div", "placa-comp");
  placa.style.width = Math.max(nodo.offsetWidth || 0, 560) + "px";
  const cab = el("div", "pc-cab"); const logo = el("img"); logo.src = import.meta.env.BASE_URL + "img/escudo.png"; logo.alt = "";
  const marca = el("div"); marca.append(el("b", null, "Ferro en números"), el("small", null, "FerroWeb · Hablemos de Ferro")); cab.append(logo, marca);
  const clon = nodo.cloneNode(true);
  clon.querySelectorAll(".btn-compartir, .menu-comp, .ver-mas, .tip, .acciones-comp").forEach(e => e.remove());
  clon.classList.add("clon");
  const pie = el("div", "pc-pie", `${location.host}${location.pathname.replace(/\/$/, "")}`);
  placa.append(cab, clon, pie); document.body.append(placa);
  try {
    const fondo = getComputedStyle(document.body).backgroundColor;
    const cv = await window.html2canvas(placa, { scale: 2, backgroundColor: fondo, useCORS: true });
    return await new Promise(ok => cv.toBlob(ok, "image/png"));
  } finally { placa.remove(); }
}

export async function bajarImagen(nodo, titulo) {
  avisar("Armando la imagen…");
  try {
    const blob = await imagenDe(nodo, titulo);
    const archivo = new File([blob], `ferro-en-numeros-${nombreArchivo(titulo)}.png`, { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [archivo] }) && /Mobi|Android/i.test(navigator.userAgent)) {
      await navigator.share({ files: [archivo], text: `${titulo} · Ferro en números` }); avisar("Listo");
    } else {
      const a = el("a"); a.href = URL.createObjectURL(blob); a.download = archivo.name; document.body.append(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000); avisar("Imagen descargada");
    }
  } catch (e) { if (e && e.name === "AbortError") return; console.error(e); avisar("No se pudo armar la imagen. Probá de nuevo."); }
}

// ---------- botones ----------
function menu(caja, titulo, descripcion) {
  document.querySelectorAll(".menu-comp").forEach(m => m.remove());
  const m = el("div", "menu-comp"); m.setAttribute("role", "menu");
  const item = (texto, fn) => { const b = el("button", null, texto); b.type = "button"; b.setAttribute("role", "menuitem"); b.addEventListener("click", () => { m.remove(); fn(); }); m.append(b); };
  item("Copiar texto para tuit", () => copiar(textoParaTuit(titulo, descripcion, enlaceActual()), "Texto copiado"));
  item("Copiar link", () => copiar(enlaceActual(), "Link copiado"));
  item("Descargar imagen", () => bajarImagen(caja, titulo));
  caja.append(m); m.querySelector("button").focus();
  const cerrar = (e) => { if (e.type === "keydown" ? e.key === "Escape" : !m.contains(e.target)) { m.remove(); document.removeEventListener("click", cerrar, true); document.removeEventListener("keydown", cerrar); } };
  setTimeout(() => { document.addEventListener("click", cerrar, true); document.addEventListener("keydown", cerrar); }, 0);
}

// Agrega el botón a cada tarjeta de contenido (.caja con título) de la página.
export function iniciarCompartir(raiz) {
  raiz.querySelectorAll(".caja").forEach(caja => {
    const h = caja.querySelector("h3"); if (!h || caja.querySelector(":scope > .btn-compartir")) return;
    caja.classList.add("comp");
    const b = el("button", "btn-compartir", "⤴"); b.type = "button"; b.title = "Compartir este dato"; b.setAttribute("aria-label", "Compartir este dato");
    b.addEventListener("click", () => {
      const titulo = h.textContent.trim(), nota = caja.querySelector(".nota");
      menu(caja, titulo, nota ? nota.textContent : "");
    });
    caja.append(b);
  });
}

// Botones para el detalle de un hallazgo (el diálogo).
export function accionesDelDetalle(x, contenedor, titulo, enlace) {
  const fila = el("div", "acciones-comp");
  const primero = (x.detalle || (x.desarrollo && x.desarrollo[0]) || "");
  const b1 = el("button", null, "Copiar texto para tuit"), b2 = el("button", null, "Descargar imagen");
  [b1, b2].forEach(b => { b.type = "button"; fila.append(b); });
  b1.addEventListener("click", () => copiar(textoParaTuit(titulo, primero, enlace), "Texto copiado"));
  b2.addEventListener("click", () => {
    const nodo = el("div", "hallazgo-img"); nodo.append(el("h3", null, titulo), ...[...contenedor.children].filter(c => !c.classList.contains("acciones-comp")).map(c => c.cloneNode(true)));
    nodo.style.cssText = "position:fixed;left:-9999px;top:0;width:560px;padding:16px"; document.body.append(nodo);
    bajarImagen(nodo, titulo).finally(() => nodo.remove());
  });
  return fila;
}
