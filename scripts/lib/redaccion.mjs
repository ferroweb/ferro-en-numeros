// Lo que carga la redacción en la planilla y que se aplica solo: árbitro y horario de cada fecha, y pedidos para la IA.
import { filasDePlanilla } from "../../src/lib/planilla.js";
import { norm, distancia } from "./texto.mjs";

export async function bajarPlanilla(url) {
  const r = await fetch(url + (url.includes("?") ? "&" : "?") + "t=" + Date.now(), { signal: AbortSignal.timeout(30000), redirect: "follow" });
  if (!r.ok) throw new Error(`La planilla respondió HTTP ${r.status}`);
  return filasDePlanilla(await r.text());
}

const numeroDeFecha = (t) => { const m = String(t).match(/\d+/); return m ? +m[0] : null; };

// «2026-10-17 17:00», «17/10 17:00», «17/10/2026 17:00», «sábado 17/10 17:00», «17:00»
export function parsearHorario(texto, anioPorDefecto) {
  const t = String(texto).trim(); let dia = null, hora = null, m;
  if ((m = t.match(/(\d{4})-(\d{2})-(\d{2})/))) dia = `${m[1]}-${m[2]}-${m[3]}`;
  else if ((m = t.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/))) { const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : anioPorDefecto; dia = `${y}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`; }
  if ((m = t.match(/(\d{1,2})[:.hH](\d{2})/))) hora = `${String(m[1]).padStart(2, "0")}:${m[2]}`;
  return { dia, hora };
}

// Aplica árbitro y horario al calendario. Si hay varias filas de la misma fecha, vale la última de la planilla.
// Devuelve { calendario, designado_nombre, avisos }.
export function aplicarArbitroYHorario(calendario, filas, { ultimaFecha, arbitrosConocidos = [], designadoActual = null }) {
  const avisos = [], proximos = calendario.proximos.map(p => ({ ...p }));
  const ultimaPor = new Map();
  for (const f of filas.filter(x => x.activo && (x.tipo === "arbitro" || x.tipo === "horario"))) ultimaPor.set(`${f.tipo}|${numeroDeFecha(f.titulo)}`, f);
  let designado = designadoActual;
  for (const f of ultimaPor.values()) {
    const fecha = numeroDeFecha(f.titulo), p = proximos.find(x => x.fecha === fecha);
    if (!fecha || !p) { avisos.push(`Planilla (línea ${f.linea}): no encuentro la fecha «${f.titulo}» en el calendario`); continue; }
    if (f.tipo === "arbitro") {
      const crudo = f.texto.trim(); if (!crudo) continue;
      const n = norm(crudo), nombre = arbitrosConocidos.find(a => norm(a) === n) ?? arbitrosConocidos.find(a => distancia(norm(a), n) <= 1) ?? crudo;
      p.arbitro = nombre; p.arbitro_fuente = "Planilla de la redacción";
      if (fecha === ultimaFecha + 1) designado = nombre;
    } else {
      const { dia, hora } = parsearHorario(f.texto, Number((p.dia ?? "").slice(0, 4)) || new Date().getFullYear());
      if (!dia && !hora) { avisos.push(`Planilla (línea ${f.linea}): no entiendo el horario «${f.texto}» (usá por ejemplo 17/10 17:00)`); continue; }
      if (dia) p.dia = dia; if (hora) { p.hora = hora; p.confirmado = true; delete p.nota_hora; } p.fuente_hora = "Planilla de la redacción";
    }
  }
  return { calendario: { ...calendario, proximos }, designado_nombre: designado, avisos };
}

// Observaciones tácticas de la redacción (para las claves de la previa): Título = rival o jugador, Texto = la observación, Autor = quién la hizo.
export function observacionesTacticas(filas) {
  return filas.filter(f => f.tipo === "observacion" && f.activo).map(f => ({ id: f.id, fecha: f.fechaTexto, sobre: f.titulo, texto: f.texto, autor: f.autor || "redacción", link: f.link || "" }));
}

// Pedidos para la IA que todavía no se atendieron.
export function pedidosPendientes(filas, atendidos = []) {
  return filas.filter(f => f.tipo === "pedido" && f.activo && !atendidos.includes(f.id)).map(f => ({ id: f.id, fecha: f.fechaTexto, titulo: f.titulo, texto: f.texto }));
}
