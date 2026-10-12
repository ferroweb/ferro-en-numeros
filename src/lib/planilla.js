// La planilla de la redacción: una hoja de Google que carga cualquier persona de FerroWeb, sin tocar código.
// Este módulo lo usan el sitio (para mostrar las novedades al instante) y los scripts de actualización (árbitro, horario y pedidos para la IA).

// Lee un CSV (con comillas, comas y saltos de línea dentro de una celda) y devuelve filas de textos.
export function parseCSV(texto) {
  const filas = []; let fila = [], celda = "", comillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (comillas) {
      if (c === '"') { if (texto[i + 1] === '"') { celda += '"'; i++; } else comillas = false; } else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === ",") { fila.push(celda); celda = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && texto[i + 1] === "\n") i++; fila.push(celda); celda = ""; if (fila.some(x => x.trim() !== "")) filas.push(fila); fila = []; }
    else celda += c;
  }
  fila.push(celda); if (fila.some(x => x.trim() !== "")) filas.push(fila);
  return filas;
}

const sinAcentos = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const clave = (s) => sinAcentos(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// «11/10/2026 20:15:00», «11/10/2026», «2026-10-11 20:15»
export function parsearFecha(t) {
  const s = String(t ?? "").trim(); let m;
  if ((m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/))) return new Date(+m[3], +m[2] - 1, +m[1], +(m[4] ?? 12), +(m[5] ?? 0));
  if ((m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/))) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 12), +(m[5] ?? 0));
  return null;
}

const TIPOS = { novedad: "novedad", novedades: "novedad", "pedido para la ia": "pedido", pedido: "pedido", "pedido ia": "pedido", arbitro: "arbitro", horario: "horario" };
const COLUMNAS = [["fecha", ["marca temporal", "fecha"]], ["tipo", ["tipo", "que queres cargar"]], ["titulo", ["titulo"]], ["texto", ["texto", "detalle", "descripcion"]], ["link", ["link", "enlace", "url"]], ["activo", ["activo", "estado"]]];

// Convierte el CSV de la planilla en una lista de pedidos de carga. Reconoce las columnas por su nombre (no por su posición),
// así que sirve tanto la planilla armada a mano como las respuestas de un formulario de Google.
export function filasDePlanilla(csv) {
  const filas = parseCSV(csv); if (filas.length < 2) return [];
  const cab = filas[0].map(clave), idx = {};
  for (const [campo, nombres] of COLUMNAS) { const i = cab.findIndex(c => nombres.some(n => c === n || c.startsWith(n))); if (i >= 0) idx[campo] = i; }
  return filas.slice(1).map((f, n) => {
    const v = (campo) => (idx[campo] != null ? (f[idx[campo]] ?? "").trim() : "");
    const tipo = TIPOS[clave(v("tipo"))] ?? null;
    const activo = !/^(no|archivado|archivada|inactivo|0|falso|borrar)$/i.test(sinAcentos(v("activo")).trim());
    const base = { fechaTexto: v("fecha"), fecha: parsearFecha(v("fecha")), tipo, titulo: v("titulo"), texto: v("texto"), link: v("link"), activo, linea: n + 2 };
    return { ...base, id: huella(`${base.fechaTexto}|${base.tipo}|${base.titulo}|${base.texto}`) };
  }).filter(f => f.tipo && (f.titulo || f.texto));
}

function huella(s) { let h = 0; for (const c of s) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0; return (h >>> 0).toString(36); }

// Novedades que se muestran en el sitio: las activas de los últimos `dias` días (las más nuevas primero).
export function novedadesVisibles(filas, ahora = new Date(), dias = 10) {
  return filas.filter(f => f.tipo === "novedad" && f.activo && f.titulo && (!f.fecha || (ahora - f.fecha) / 864e5 <= dias))
    .sort((a, b) => (b.fecha?.getTime() ?? 0) - (a.fecha?.getTime() ?? 0));
}
