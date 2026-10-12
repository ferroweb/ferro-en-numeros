// Mapa del sitio. Cada grupo es un bloque del menú lateral; sus páginas son los
// elementos con data-tab dentro de la plantilla HTML del grupo.
// La lógica (qué se dibuja y con qué datos) vive en src/features/.
import inicioHtml from "./inicio.html?raw";
import partidoHtml from "./partido.html?raw";
import equipoHtml from "./equipo.html?raw";
import jugadoresHtml from "./jugadores.html?raw";
import rivalesHtml from "./rivales.html?raw";
import herramientasHtml from "./herramientas.html?raw";
import comunidadHtml from "./comunidad.html?raw";
import datosHtml from "./datos.html?raw";

import inicio from "../features/inicio.js";
import partido from "../features/partido.js";
import temporada from "../features/temporada.js";
import jugadores from "../features/jugadores.js";
import hallazgos from "../features/hallazgos.js";
import laboratorio from "../features/laboratorio.js";
import prode from "../features/prode.js";
import rivales from "../features/rivales.js";
import asistente from "../features/asistente.js";
import redaccion from "../features/redaccion.js";

export const GRUPOS = [
  { id: "inicio", nav: "Inicio", icono: "🏠", html: inicioHtml },
  { id: "partido", nav: "Próximo partido", icono: "⚽", html: partidoHtml },
  { id: "equipo", nav: "El equipo", icono: "📈", html: equipoHtml },
  { id: "jugadores", nav: "Jugadores", icono: "👟", html: jugadoresHtml },
  { id: "rivales", nav: "Rivales", icono: "🆚", html: rivalesHtml },
  { id: "herramientas", nav: "Herramientas", icono: "🧰", html: herramientasHtml },
  { id: "comunidad", nav: "Comunidad", icono: "🎯", html: comunidadHtml },
  { id: "datos", nav: "Hallazgos y datos", icono: "💡", html: datosHtml },
];

// Módulos que dibujan el contenido. init() corre una vez; onShow(grupo, pagina, param) cada vez que cambia la ruta.
export const FEATURES = [inicio, partido, temporada, jugadores, rivales, hallazgos, laboratorio, prode, asistente, redaccion];
