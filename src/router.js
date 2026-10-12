// Router por hash: #/grupo/página/parámetro. Todas las páginas viven en el DOM; se muestra una sola.
// El menú lateral se arma solo a partir de los grupos y de los bloques data-tab de cada plantilla.
import { $, el } from "./lib/dom.js";
import { GRUPOS, FEATURES } from "./pages/index.js";

// Rutas de versiones anteriores del sitio: se traducen a la ubicación nueva.
const RUTAS_VIEJAS = {
  "temporada": ["equipo", "tabla"], "temporada/tabla": ["equipo", "tabla"], "temporada/evolucion": ["equipo", "puntos"],
  "temporada/vs-2025": ["equipo", "vs-2025"], "temporada/ultima-vez": ["datos", "ultima-vez"],
  "hallazgos": ["datos", "hallazgos"],
  "laboratorio": ["herramientas", "calculadora"], "laboratorio/calculadora": ["herramientas", "calculadora"], "laboratorio/en-vivo": ["herramientas", "en-vivo"],
  "laboratorio/minutos": ["equipo", "goles"], "laboratorio/duplas-banco": ["jugadores", "duplas-banco"], "laboratorio/rivales": ["rivales", "favoritos"],
  "laboratorio/trivia": ["comunidad", "trivia"], "prode": ["comunidad", "prode"],
};
// Anclas de la primera versión (#previa, #lab…).
const ANCLAS_VIEJAS = {
  previa: ["partido", "previa"], "pv-fwcaja": ["partido", "pronostico"], pizarra: ["partido", "pizarra"], "humor-caja": ["partido", "chicanas"],
  arbitros: ["partido", "arbitro"], prode: ["comunidad", "prode"], lab: ["herramientas", "calculadora"], hallazgos: ["datos", "hallazgos"],
  equipo: ["equipo", "puntos"], ultimas: ["datos", "ultima-vez"], jugadores: ["jugadores", "plantel"], ficha: ["jugadores", "ficha"],
  historia: ["equipo", "vs-2025"], tabla: ["equipo", "tabla"],
};

const secciones = new Map();   // id de grupo -> <section>

const paneles = (sec) => [...sec.querySelectorAll(":scope > [data-tab]")];
const vacio = (panel) => [...panel.children].every(c => c.hidden || c.classList.contains("page-head"));

export function montar(app) {
  app.textContent = "";
  const nav = $("#nav"); nav.textContent = "";
  GRUPOS.forEach(g => {
    const sec = el("section", "view"); sec.dataset.view = g.id; sec.setAttribute("aria-label", g.nav);
    const cuerpo = el("div"); cuerpo.innerHTML = g.html; sec.append(...cuerpo.childNodes);
    app.append(sec); secciones.set(g.id, sec);

    const ps = paneles(sec);
    ps.forEach(p => {
      const cab = el("header", "page-head");
      cab.append(el("div", "crumb", g.nav), el("h1", null, p.dataset.label));
      if (p.dataset.desc) cab.append(el("p", null, p.dataset.desc));
      p.prepend(cab);
    });

    if (!ps.length) {   // grupo de una sola página (Inicio)
      const a = el("a", "n-solo"); a.href = "#/"; a.dataset.grupo = g.id;
      a.append(Object.assign(el("span", "ic", g.icono), {}), document.createTextNode(g.nav));
      if (g.id === "inicio") a.append(Object.assign(el("span", "nuevo", "NUEVO"), { id: "nav-hoy", hidden: true }));
      nav.append(a);
      return;
    }
    const caja = el("div", "n-grupo"); caja.dataset.grupo = g.id;
    const tit = el("div", "n-tit"); tit.append(el("span", "ic", g.icono), document.createTextNode(g.nav));
    caja.append(tit);
    ps.forEach(p => { const a = el("a", "n-pag", p.dataset.label); a.href = `#/${g.id}/${p.dataset.tab}`; a.dataset.grupo = g.id; a.dataset.pagina = p.dataset.tab; caja.append(a); });
    nav.append(caja);
  });
}

function parsear() {
  const h = location.hash;
  let partes = [];
  if (h.startsWith("#/")) partes = h.slice(2).split("/").filter((x, i) => i < 2 || x !== "");
  else if (h.length > 1) partes = ANCLAS_VIEJAS[h.slice(1)] || [];

  let [grupo, pagina, ...resto] = partes;
  let param = resto.join("/");
  const vieja = RUTAS_VIEJAS[grupo + "/" + pagina] || RUTAS_VIEJAS[grupo];
  if (vieja && !GRUPOS.some(g => g.id === grupo && paneles(secciones.get(g.id)).some(p => p.dataset.tab === pagina))) {
    [grupo, pagina] = vieja;
    // La ruta vieja temporada/tabla/<rival> era el filtro de resultados.
    if (grupo === "equipo" && pagina === "tabla" && param) pagina = "resultados";
    history.replaceState(null, "", `#/${grupo}/${pagina}${param ? "/" + param : ""}`);
  }
  const g = GRUPOS.find(x => x.id === grupo) || GRUPOS[0];
  return { g, pedida: pagina, param };
}

let previo = "";
function mostrar() {
  const { g, pedida, param } = parsear();
  const sec = secciones.get(g.id);
  GRUPOS.forEach(x => secciones.get(x.id).classList.toggle("on", x === g));

  const ps = paneles(sec);
  let pagina = null;
  if (ps.length) {
    const libres = ps.filter(p => !vacio(p));
    pagina = (libres.find(p => p.dataset.tab === pedida) || libres[0] || ps[0]).dataset.tab;
    ps.forEach(p => p.classList.toggle("on", p.dataset.tab === pagina));
    sec.dataset.pagina = pagina;
  }
  document.querySelectorAll("#nav a").forEach(a => {
    const activo = a.dataset.grupo === g.id && (a.dataset.pagina ? a.dataset.pagina === pagina : true);
    if (activo) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    if (a.dataset.pagina) { const p = paneles(secciones.get(a.dataset.grupo)).find(x => x.dataset.tab === a.dataset.pagina); a.hidden = !!p && vacio(p); }
  });
  document.querySelectorAll(".n-grupo").forEach(c => c.classList.toggle("activo", c.dataset.grupo === g.id));

  const etiqueta = pagina ? sec.querySelector(`:scope > [data-tab="${pagina}"]`).dataset.label : g.nav;
  document.title = (g.id === "inicio" ? "" : etiqueta + " · ") + "Ferro en números · Ferroweb";
  const clave = g.id + "/" + pagina;
  if (clave !== previo) window.scrollTo({ top: 0 });
  previo = clave;
  cerrarMenu();
  FEATURES.forEach(f => { if (f.onShow) f.onShow(g.id, pagina, param); });
}

// ---------- menú lateral: cajón en el celular, mostrar/ocultar en escritorio (se recuerda) ----------
const esMovil = () => matchMedia("(max-width: 900px)").matches;
const guardado = { leer: () => { try { return localStorage.getItem("fen_menu"); } catch (e) { return null; } }, poner: (v) => { try { localStorage.setItem("fen_menu", v); } catch (e) { /* sin almacenamiento */ } } };

function actualizarBoton() {
  const visible = esMovil() ? document.body.classList.contains("menu-abierto") : !document.body.classList.contains("menu-oculto");
  const dentro = $("#btn-menu"), movil = $("#btn-menu-movil");
  if (dentro) { dentro.setAttribute("aria-expanded", String(visible)); dentro.setAttribute("aria-label", visible ? "Ocultar el menú" : "Mostrar el menú"); }
  if (movil) { movil.setAttribute("aria-expanded", String(visible)); movil.setAttribute("aria-label", visible ? "Cerrar el menú" : "Abrir el menú"); }
}
function cerrarMenu() { document.body.classList.remove("menu-abierto"); actualizarBoton(); }

function iniciarMenu() {
  if (guardado.leer() === "oculto") document.body.classList.add("menu-oculto");
  const alternar = () => {
    if (esMovil()) document.body.classList.toggle("menu-abierto");
    else { const oculto = document.body.classList.toggle("menu-oculto"); guardado.poner(oculto ? "oculto" : "visible"); }
    actualizarBoton();
  };
  $("#btn-menu").addEventListener("click", alternar);
  $("#btn-menu-movil").addEventListener("click", alternar);
  $("#side-fondo").addEventListener("click", cerrarMenu);
  document.addEventListener("keydown", e => { if (e.key === "Escape" && document.body.classList.contains("menu-abierto")) { cerrarMenu(); $("#btn-menu-movil").focus(); } });
  matchMedia("(max-width: 900px)").addEventListener("change", () => { cerrarMenu(); });
  actualizarBoton();
}

export function iniciarRouter() {
  iniciarMenu();
  window.addEventListener("hashchange", mostrar);
  let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(mostrar, 200); });
  mostrar();
}
