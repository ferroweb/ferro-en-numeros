// Estado compartido: los datos cargados y lo que se deriva de ellos. Se completa una sola vez en initCtx().
import { FERRO } from "./lib/consts.js";

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
