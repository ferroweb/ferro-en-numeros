// Estado compartido: los datos cargados y lo que se deriva de ellos. Se completa una sola vez en initCtx().
import { FERRO } from "./lib/consts.js";

// Una novedad está vigente mientras no se jugó otra fecha desde que se escribió («al_cierre_de»: "Fecha N").
// Las viejas sin ese campo se toman como vigentes solo si son de los últimos 3 días.
export function novedadVigente(n) {
  if (!n || /diferencia a verificar/i.test(n.titulo || "")) return false;
  const m = /(\d+)/.exec(n.al_cierre_de || "");
  if (m) return +m[1] === DATA.ultima_fecha;
  const hoy = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  return !!n.fecha && (new Date(hoy) - new Date(n.fecha)) / 864e5 <= 3;
}
export let DATA, prox, ult, ferroT, segundo, TODOS, nombres, previaAlDia, escenariosAlDia;
export let FOTOS_JUG = {}, FOTOS_FW = {}, PRODE_CFG = {}, PRODE_HASH = {};

const conBase = (m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, import.meta.env.BASE_URL + v]));

export function initCtx({ data, fotosJug, fotosFw, prodeCfg, prodeHash }) {
  DATA = data; FOTOS_JUG = conBase(fotosJug); FOTOS_FW = conBase(fotosFw); PRODE_CFG = prodeCfg; PRODE_HASH = prodeHash;
  ferroT = DATA.tabla.find(r => r.equipo === FERRO);
  segundo = DATA.tabla.filter(r => r.equipo !== FERRO).sort((a, b) => b.pts - a.pts)[0];
  ult = DATA.partidos.slice().sort((a, b) => b.n - a.n)[0];
  prox = DATA.calendario && DATA.calendario.proximos && DATA.calendario.proximos.find(p => p.fecha > DATA.ultima_fecha);
  nombres = DATA.jugadores.map(j => j.jugador);
  // El pronóstico, los escenarios y las claves los prepara una tarea aparte. Si la tabla ya avanzó una fecha y esa
  // tarea todavía no corrió, esos datos son del partido anterior: no hay que mostrarlos como si fueran del próximo.
  previaAlDia = !!(prox && DATA.fw && DATA.fw.fecha === prox.fecha);
  // Los escenarios del primer puesto se calculan solos y traen la fecha a la que corresponden.
  escenariosAlDia = !!(DATA.escenarios && DATA.escenarios.tras_fecha === DATA.ultima_fecha);
  TODOS = [
    ...(DATA.novedades || []).map(n => ({ tipo: "novedad", titulo: n.titulo, detalle: n.detalle, extra: n.fecha, url: n.url, fuente: n.fuente, desarrollo: n.desarrollo, datos: n.datos })),
    ...DATA.hallazgos.map(h => ({ tipo: h.tipo, titulo: h.titulo, detalle: h.detalle, jugador: h.jugador, rel: h.relevancia })),
  ];
}
