// Fichas de partido de AFA (Datafactory): info.afa.org.ar/deposito/html/v3/htmlCenter/data/deportes/futbol/nacionalb/events/<id>.json
// Tercera fuente para cruzar tarjetas. La lista de partidos de Ferro está en .../agendaMaM/agenda_131.json.
export const BASE_AFA = "https://info.afa.org.ar/deposito/html/v3/htmlCenter/data/deportes/futbol/nacionalb";
export const FERRO_AFA = 131;

// Devuelve { fecha, amarillas: [nombre], rojas: [nombre], sinNombre: n } de un equipo (por defecto Ferro), o null si no terminó.
export function parseEventoAFA(ev, equipo = FERRO_AFA) {
  if (!ev?.match) return null;
  const fecha = +((ev.match.week || "").match(/Fecha (\d+)/) || [])[1];
  const nombre = (id) => { const p = ev.players?.[id]; return p ? (p.name.shortName || `${p.name.first} ${p.name.last}`) : null; };
  const de = (tipo) => Object.values(ev.incidences?.[tipo] ?? {}).filter(x => x.team === equipo).map(x => ({ nombre: nombre(x.plyrId), id: x.plyrId, min: x.t?.m ?? null, tipo: x.type }));
  const am = de("yellowCards"), ro = de("redCards");
  return { fecha, finalizado: ev.status?.statusId === 2, amarillas: am.filter(x => x.nombre).map(x => x.nombre), rojas: ro.filter(x => x.nombre).map(x => x.nombre), sinNombre: [...am, ...ro].filter(x => !x.nombre).length };
}
