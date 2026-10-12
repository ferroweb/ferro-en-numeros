// De la síntesis de un partido a los datos que usa el sitio: fila del partido, participación de cada jugador,
// goles por minuto y, con todos los partidos juntos, estadísticas del plantel, rendimiento y franjas.
import { buscar, FERRO, urlSintesis } from "./ferroweb.mjs";
import { mismoEquipo } from "./texto.mjs";

const PTS = { G: 3, E: 1, P: 0 };
const redondear = (v, d = 2) => {   // mitad hacia el par, igual que los datos ya cargados (1,125 → 1,12)
  const x = v * 10 ** d, r = Math.round(x);
  return (Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r) / 10 ** d;
};

// Procesa UNA síntesis. Devuelve { partido, participaciones, goles, avisos, errores }.
// `errores` impide guardar el partido (datos incompletos o incoherentes); `avisos` se informan pero no frenan.
export function procesarPartido(s, { fecha, rival, n, view, conocidos = [] }) {
  const avisos = [], errores = [];
  const ferroLocal = mismoEquipo(s.local, FERRO);
  if (!ferroLocal && !mismoEquipo(s.visitante, FERRO)) errores.push(`La síntesis ${view} no es de Ferro (${s.local} - ${s.visitante})`);
  const lado = ferroLocal ? "local" : "visitante", otro = ferroLocal ? "visitante" : "local";
  const gf = ferroLocal ? s.gl : s.gv, gc = ferroLocal ? s.gv : s.gl;
  const pl = s.plantel[lado], ev = s.eventos[lado], evR = s.eventos[otro];

  if (pl.jugadores.length !== 11) errores.push(`Ferro tiene ${pl.jugadores.length} titulares en la formación (deberían ser 11)`);
  // FerroWeb a veces escribe mal un apellido en la formación: se lo lleva al nombre que ya usa el sitio.
  const canonico = (k) => { const c = buscar(k, conocidos); if (!c && conocidos.length) avisos.push(`Jugador nuevo o nombre dudoso: «${k}»`); return c ?? k; };
  const titulares = pl.jugadores.map(j => canonico(j.clave)), banco = ev.suplentes.map(canonico);
  const todos = [...titulares, ...banco];
  const clave = (nombre, contexto) => {
    const k = buscar(nombre, todos);
    if (!k) avisos.push(`${contexto}: no se encontró a «${nombre}» en el plantel de Ferro`);
    return k;
  };

  // goles: el total de cada columna tiene que coincidir con el marcador
  const nGoles = (e) => e.goles.filter(g => !g.error).length;
  [...ev.goles, ...evR.goles].filter(g => g.error).forEach(g => errores.push(`Gol ilegible: «${g.error}»`));
  if (nGoles(ev) !== gf) errores.push(`El marcador dice ${gf} goles de Ferro pero la síntesis lista ${nGoles(ev)}`);
  if (nGoles(evR) !== gc) errores.push(`El marcador dice ${gc} goles del rival pero la síntesis lista ${nGoles(evR)}`);

  // cambios, en orden de tiempo, con el estado de la cancha
  const enCancha = new Set(titulares), entrada = {}, salida = {};
  for (const c of [...ev.cambios].sort((a, b) => a.t - b.t)) {
    const entran = [], salen = [];
    for (const nombre of c.nombres) {
      const k = clave(nombre, `Cambio ${c.min}${c.mitad}`); if (!k) { errores.push(`Cambio con un nombre desconocido: «${nombre}»`); continue; }
      if (enCancha.has(k)) salen.push(k); else entran.push(k);
    }
    if (entran.length !== salen.length) errores.push(`Cambio ${c.min}${c.mitad}: entran ${entran.length} y salen ${salen.length} (${c.nombres.join(", ")})`);
    entran.forEach((k, i) => { entrada[k] = c.t; if (salen[i]) salida[salen[i]] = c.t; });
    salen.forEach(k => enCancha.delete(k)); entran.forEach(k => enCancha.add(k));
  }

  const amarilla = new Set(), rojaT = {};
  const tarjetas = [];
  ev.amonestados.forEach(t => { if (t.error) errores.push(`Tarjeta ilegible: «${t.error}»`); else { const k = clave(t.nombre, "Amonestado"); if (k) { amarilla.add(k); tarjetas.push({ t: t.t, pt: t.mitad === "pt", k, tipo: "a" }); } } });
  const esDT = (nombre) => buscar(nombre, [pl.dt.split(/\s+/).slice(-1)[0], ...pl.dt.split(/\s+/)]) !== null && !buscar(nombre, todos);
  ev.expulsados.forEach(t => { if (t.error) errores.push(`Tarjeta ilegible: «${t.error}»`); else if (!esDT(t.nombre)) { const k = clave(t.nombre, "Expulsado"); if (k) { rojaT[k] = t.t; tarjetas.push({ t: t.t, pt: t.mitad === "pt", k, tipo: "r" }); } } });

  const goles = {};
  ev.goles.filter(g => !g.error && !g.ec).forEach(g => { const k = clave(g.nombre, "Gol"); if (k) goles[k] = (goles[k] || 0) + 1; });

  const resultado = gf > gc ? "G" : gf === gc ? "E" : "P";
  const participaciones = [];
  const fila = (k, rol, minutos) => participaciones.push({ jugador: k, fecha, rival, res: resultado, gf, gc, rol, minutos, goles: goles[k] || 0, amarilla: amarilla.has(k) ? 1 : 0, roja: k in rojaT ? 1 : 0 });
  // Los minutos se cuentan hasta el cambio o la roja; sin eso, hasta el 90. Un cambio en tiempo agregado (ej. 47' del ST)
  // pasa de 90, y el que entra suma como mínimo 1 minuto.
  const hasta = (k) => { const h = Math.min(salida[k] ?? Infinity, rojaT[k] ?? Infinity); return h === Infinity ? 90 : h; };
  for (const k of titulares) fila(k, "Titular", Math.max(0, hasta(k)));
  for (const k of Object.keys(entrada).sort((a, b) => entrada[a] - entrada[b] || banco.indexOf(a) - banco.indexOf(b))) {
    fila(k, "Suplente", Math.max(1, hasta(k) - entrada[k]));
  }

  const texto = ev.goles.filter(g => !g.error).sort((a, b) => a.t - b.t).map(g => {
    if (g.ec) return `${g.nombre} ${g.min}${g.mitad} (e/c)`;
    return `${buscar(g.nombre, todos) ?? g.nombre} ${g.min}${g.mitad}`;
  });

  const partido = {
    n, fecha, rival, condicion: ferroLocal ? "Local" : "Visitante", gf, gc, resultado, pts_acum: 0,
    sistema: s.sistema[lado] || "", goleadores: texto.length ? texto.join(", ") : "—",
    arbitro: s.arbitro, sintesis: urlSintesis(view), nota: "",
  };
  const golesCronologia = [
    ...ev.goles.filter(g => !g.error).map(g => ({ t: g.t, min: g.min, mitad: g.mitad, a: "f", pt: g.mitad === "pt", nombre: g.ec ? g.nombre : (buscar(g.nombre, todos) ?? g.nombre), ec: !!g.ec })),
    ...evR.goles.filter(g => !g.error).map(g => ({ t: g.t, min: g.min, mitad: g.mitad, a: "r", pt: g.mitad === "pt", nombre: g.nombre, ec: !!g.ec })),
  ].sort((a, b) => a.t - b.t);
  return { partido, participaciones, goles: golesCronologia, entradas: { ...entrada }, tarjetas: tarjetas.sort((a, b) => a.t - b.t), avisos, errores };
}

// ---------- con todos los partidos ----------
export function acumularPuntos(partidos) {
  let acum = 0;
  return partidos.slice().sort((a, b) => a.n - b.n).map(p => ({ ...p, pts_acum: (acum += PTS[p.resultado]) }));
}

export function estadisticasJugadores(partidos, participaciones, existentes = []) {
  const ptsPartido = new Map(partidos.map(p => [p.fecha, PTS[p.resultado]]));
  const porJug = new Map();
  for (const r of participaciones) { if (!porJug.has(r.jugador)) porJug.set(r.jugador, []); porJug.get(r.jugador).push(r); }
  const prom = (xs) => xs.length ? redondear(xs.reduce((a, b) => a + b, 0) / xs.length) : null;
  const previos = new Map(existentes.map(j => [j.jugador, j]));
  const filas = [...porJug].map(([nombre, rs]) => {
    const tit = rs.filter(r => r.rol === "Titular"), sup = rs.filter(r => r.rol !== "Titular");
    const minutos = rs.reduce((a, r) => a + r.minutos, 0), goles = rs.reduce((a, r) => a + r.goles, 0);
    const fechasTit = new Set(tit.map(r => r.fecha));
    return {
      ...(previos.get(nombre) ?? {}),
      jugador: nombre, pj: rs.length, titular: tit.length, suplente: sup.length, minutos, goles,
      goles_suplente: sup.reduce((a, r) => a + r.goles, 0), minutos_por_gol: goles ? redondear(minutos / goles, 0) : null,
      amarillas: rs.reduce((a, r) => a + r.amarilla, 0), rojas: rs.reduce((a, r) => a + r.roja, 0),
      pts_partido_titular: prom(tit.map(r => ptsPartido.get(r.fecha))),
      pts_partido_sin_el: prom(partidos.filter(p => !fechasTit.has(p.fecha)).map(p => ptsPartido.get(p.fecha))),
    };
  });
  return filas.sort((a, b) => b.minutos - a.minutos);
}

const resumen = (corte, ps) => {
  const g = ps.filter(p => p.resultado === "G").length, e = ps.filter(p => p.resultado === "E").length, p_ = ps.filter(p => p.resultado === "P").length;
  const pts = g * 3 + e;
  return { corte, pj: ps.length, g, e, p: p_, gf: ps.reduce((a, p) => a + p.gf, 0), gc: ps.reduce((a, p) => a + p.gc, 0), pts, ppp: ps.length ? redondear(pts / ps.length) : 0, vallas: ps.filter(p => p.gc === 0).length };
};

export function rendimiento(partidos, golesPorFecha) {
  const orden = partidos.slice().sort((a, b) => a.n - b.n);
  const ultima = Math.max(...partidos.map(p => p.fecha));
  const primero = (p) => { const g = golesPorFecha[p.fecha]; return g && g.length ? g[0].a : null; };
  const sistemas = [...new Set(orden.map(p => p.sistema).filter(Boolean))]
    .map(s => [s, orden.filter(p => p.sistema === s)]).sort((a, b) => b[1].length - a[1].length);
  return [
    resumen("Total", orden),
    resumen("Local", orden.filter(p => p.condicion === "Local")),
    resumen("Visitante", orden.filter(p => p.condicion === "Visitante")),
    resumen("Primera rueda (F1-18)", orden.filter(p => p.fecha <= 18)),
    resumen(`Segunda rueda (F19-${ultima})`, orden.filter(p => p.fecha > 18)),
    resumen("Últimos 5", orden.slice(-5)),
    resumen("Abriendo el marcador", orden.filter(p => primero(p) === "f")),
    resumen("Recibiendo el primer gol", orden.filter(p => primero(p) === "r")),
    ...sistemas.map(([s, ps]) => resumen(`Sistema ${s}`, ps)),
  ];
}

export function franjas(partidos, golesPorFecha) {
  const filas = [["0-15'", 0, 15], ["16-30'", 16, 30], ["31-45+'", 31, 46], ["46-60'", 46, 60], ["61-75'", 61, 75], ["76-90+'", 76, 999]]
    .map(([franja]) => ({ franja, a_favor: 0, en_contra: 0 }));
  const idx = (t) => t <= 15 ? 0 : t <= 30 ? 1 : t <= 45 || t === 45.5 ? 2 : t <= 60 ? 3 : t <= 75 ? 4 : 5;
  for (const p of partidos) for (const g of golesPorFecha[p.fecha] ?? []) {
    // los goles del primer tiempo con minuto > 45 (adición) quedan en la franja 31-45+
    const f = filas[g.pt && g.t > 45 ? 2 : idx(g.t)];
    f[g.a === "f" ? "a_favor" : "en_contra"]++;
  }
  return filas;
}
