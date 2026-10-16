// Cálculos que mezclan partidos de varias temporadas: laboratorio, árbitros, «la última vez que…», histórico y escenarios.
// Son funciones puras: reciben los partidos ya leídos de FerroWeb y devuelven exactamente la estructura que lee el sitio.
import { franjas as franjasDe } from "./derive.mjs";
import { mismoEquipo, norm, distancia } from "./texto.mjs";

const PTS = { G: 3, E: 1, P: 0 };
const redondear = (v, d = 2) => { const x = v * 10 ** d, r = Math.round(x); return (Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r) / 10 ** d; };
const resultado = (gf, gc) => gf > gc ? "G" : gf === gc ? "E" : "P";
const puntos = (r) => PTS[r];

// ---------- partidos unificados ----------
// Cada partido: { anio, fecha, n, rival, cond ("L"|"V"), gf, gc, res, arbitro, goles[], entradas{}, tarjetas[], participaciones[] }
export function unificar2026(partidos, participaciones, detalle) {
  return partidos.slice().sort((a, b) => a.n - b.n).map(p => ({
    anio: 2026, fecha: p.fecha, n: p.n, rival: p.rival, cond: p.condicion === "Local" ? "L" : "V", gf: p.gf, gc: p.gc, res: p.resultado, arbitro: p.arbitro,
    goles: detalle[p.fecha]?.goles ?? [], entradas: detalle[p.fecha]?.entradas ?? {}, tarjetas: detalle[p.fecha]?.tarjetas ?? [],
    participaciones: participaciones.filter(r => r.fecha === p.fecha),
  }));
}
export function unificarAnterior(registros) {
  return registros.slice().sort((a, b) => a.fecha - b.fecha).map(r => ({
    anio: r.anio, fecha: r.fecha, n: r.fecha, rival: r.rival, cond: r.cond, gf: r.gf, gc: r.gc, res: r.resultado, arbitro: r.arbitro,
    goles: r.goles ?? [], entradas: r.entradas ?? {}, tarjetas: r.tarjetas ?? [], participaciones: r.participaciones ?? [],
  }));
}

const suma = (xs, f) => xs.reduce((a, x) => a + f(x), 0);
const marcador = (r) => ({ g: r.filter(x => x.res === "G").length, e: r.filter(x => x.res === "E").length, p: r.filter(x => x.res === "P").length });
const golesA = (g, t) => g.filter(x => x.a === "f" && x.t <= t).length;
const golesEn = (g, t) => g.filter(x => x.a === "r" && x.t <= t).length;

// ---------- laboratorio ----------
export function labEstados(P) {
  const vacio = () => ({ G: 0, E: 0, P: 0 });
  const out = { 0: { ganando: vacio(), empatando: vacio(), perdiendo: vacio() }, 45: null, 60: null, 75: null };
  for (const c of [45, 60, 75]) out[c] = { ganando: vacio(), empatando: vacio(), perdiendo: vacio() };
  for (const p of P) {
    if (p.goles.length) out[0][p.goles[0].a === "f" ? "ganando" : "perdiendo"][p.res]++;
    for (const c of [45, 60, 75]) {
      const f = p.goles.filter(g => g.a === "f" && (c === 45 ? g.pt : g.t <= c)).length, r = p.goles.filter(g => g.a === "r" && (c === 45 ? g.pt : g.t <= c)).length;
      out[c][f > r ? "ganando" : f === r ? "empatando" : "perdiendo"][p.res]++;
    }
  }
  return out;
}

export function labForma(P) {
  return P.map((p, i) => ({ fecha: p.fecha, rival: p.rival, res: p.res, ult5: suma(P.slice(Math.max(0, i - 4), i + 1), x => puntos(x.res)) }));
}

// Forma del próximo rival a partir de sus últimos 5 resultados («1-1 vs Racing de Córdoba (L)», marcador desde su punto de vista).
export function labFormaRival(prox) {
  if (!prox || !prox.forma_rival || !prox.forma_rival.length) return null;
  const pts = prox.forma_rival.map(s => { const m = s.match(/(\d+)-(\d+)/); return m ? (+m[1] > +m[2] ? 3 : +m[1] === +m[2] ? 1 : 0) : 0; });
  return { rival: prox.rival, ult5: suma(pts, x => x), pj: pts.length, detalle: prox.forma_rival };
}

export function labMinutos(P26, P25) {
  const por = (P, anio) => { const f = franjasDe(P.map(p => ({ fecha: p.fecha })), Object.fromEntries(P.map(p => [p.fecha, p.goles]))); return { favor: f.map(x => x.a_favor), contra: f.map(x => x.en_contra), pj: P.length }; };
  return { 2026: por(P26), 2025: por(P25) };
}

function combinaciones(xs, k) {
  if (k === 0) return [[]];
  const out = [];
  xs.forEach((x, i) => combinaciones(xs.slice(i + 1), k - 1).forEach(c => out.push([x, ...c])));
  return out;
}
export function labDuplas(P) {
  const conteo = (k, minimo) => {
    const m = new Map();
    for (const p of P) {
      const tit = p.participaciones.filter(r => r.rol === "Titular").map(r => r.jugador).sort((a, b) => a.localeCompare(b, "es"));
      for (const c of combinaciones(tit, k)) { const key = c.join("|"); const x = m.get(key) ?? { jug: c, pj: 0, g: 0, e: 0, p: 0 }; x.pj++; x[p.res.toLowerCase()]++; m.set(key, x); }
    }
    return [...m.values()].filter(x => x.pj >= minimo).map(x => ({ ...x, ppp: redondear((3 * x.g + x.e) / x.pj) }));
  };
  const orden = (a, b) => b.ppp - a.ppp || b.pj - a.pj || a.jug.join().localeCompare(b.jug.join(), "es");
  const duplas = conteo(2, 10).sort(orden), tri = conteo(3, 8).sort(orden);
  return { mejores: duplas.slice(0, 8), peores: duplas.slice().sort((a, b) => a.ppp - b.ppp || b.pj - a.pj || a.jug.join().localeCompare(b.jug.join(), "es")).slice(0, 3), tridentes: tri.slice(0, 6), min_duplas: 10, min_tri: 8 };
}

export function labBanco(P) {
  const por = new Map();
  for (const p of P) for (const r of p.participaciones.filter(x => x.rol === "Suplente")) {
    const t = p.entradas[r.jugador]; if (t == null) continue;
    const f = golesA(p.goles, t - 1), c = golesEn(p.goles, t - 1);   // marcador justo antes de entrar
    const delta = puntos(p.res) - puntos(resultado(f, c));
    const x = por.get(r.jugador) ?? { jugador: r.jugador, entradas: 0, goles: 0, rescatados: 0, perdidos: 0, partidos: [] };
    x.entradas++; x.goles += r.goles; if (delta > 0) x.rescatados += delta; if (delta < 0) x.perdidos += -delta;
    if (delta > 0 || r.goles > 0) x.partidos.push(`F${p.fecha} ${p.rival}: entró ${f}-${c} al ${t}', terminó ${p.gf}-${p.gc}${r.goles ? ` (${r.goles} ${r.goles === 1 ? "gol suyo" : "goles suyos"})` : ""}`);
    por.set(r.jugador, x);
  }
  return [...por.values()].filter(x => x.entradas >= 3).map(x => ({ ...x, neto: x.rescatados - x.perdidos })).filter(x => x.neto > 0)
    .sort((a, b) => b.neto - a.neto || b.entradas - a.entradas || a.jugador.localeCompare(b.jugador, "es"));
}

export function labTalFecha(fecha, anteriores) {
  const lista = anteriores.flatMap(T => T.filter(p => p.fecha === fecha)).sort((a, b) => b.anio - a.anio)
    .map(p => ({ anio: p.anio, rival: p.rival, cond: p.cond, gf: p.gf, gc: p.gc, res: p.res, goles: p.goles.filter(g => g.a === "f" && !g.ec).map(g => g.nombre) }));
  return { fecha, lista };
}

export function labRivales(todasLasTemporadas, anios) {
  const por = new Map();
  for (const p of todasLasTemporadas) {
    const k = [...por.keys()].find(x => mismoEquipo(x, p.rival)) ?? p.rival;
    const x = por.get(k) ?? { rival: k, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, anios: new Set() };
    x.pj++; x[p.res.toLowerCase()]++; x.gf += p.gf; x.gc += p.gc; x.anios.add(p.anio); por.set(k, x);
  }
  const filas = [...por.values()].filter(x => x.pj >= 2).map(x => ({ rival: x.rival, pj: x.pj, g: x.g, e: x.e, p: x.p, gf: x.gf, gc: x.gc, anios: [...x.anios].sort(), ppp: redondear((3 * x.g + x.e) / x.pj) }));
  const dg = (x) => x.gf - x.gc;
  return {
    favoritos: filas.slice().sort((a, b) => b.ppp - a.ppp || dg(b) - dg(a) || a.gc - b.gc || b.pj - a.pj || a.rival.localeCompare(b.rival, "es")).slice(0, 5),
    bestias: filas.slice().sort((a, b) => a.ppp - b.ppp || dg(a) - dg(b) || b.gc - a.gc || b.pj - a.pj || a.rival.localeCompare(b.rival, "es")).slice(0, 5),
    temporadas: anios,
  };
}

export function labCabalas(P) {
  const filas = [
    ["Gol nuestro antes del minuto 15", p => p.goles.some(g => g.a === "f" && g.t < 15)],
    ["Amarilla nuestra antes del minuto 20", p => p.tarjetas.some(t => t.tipo === "a" && t.t < 20)],
    ["Ninguna amarilla en el primer tiempo", p => !p.tarjetas.some(t => t.tipo === "a" && t.pt)],
    ["Primer cambio antes del entretiempo", p => { const ts = Object.values(p.entradas); return ts.length > 0 && Math.min(...ts) < 45; }],
    ["Tres goles o más en el partido", p => p.gf + p.gc >= 3],
    ["Partido con expulsado nuestro", p => p.tarjetas.some(t => t.tipo === "r")],
  ];
  return filas.map(([cabala, cond]) => { const ps = P.filter(cond); const m = marcador(ps); return { cabala, pj: ps.length, ...m, ppp: ps.length ? redondear((3 * m.g + m.e) / ps.length) : 0 }; });
}

// ---------- «la última vez que…» ----------
export function ultimas(secuencia) {
  const S = secuencia;
  const dif = (p) => p.gf - p.gc;
  const vuelta = (p) => { if (p.res !== "G") return false; let f = 0, c = 0; for (const g of p.goles) { g.a === "f" ? f++ : c++; if (c > f) return true; } return false; };
  const racha = (tipo, n) => (p, i) => p.res === tipo && i >= n - 1 && S.slice(i - n + 1, i + 1).every(x => x.res === tipo);
  const defs = [
    ["Ganamos por dos goles", p => p.res === "G" && dif(p) === 2], ["Ganamos por tres goles", p => p.res === "G" && dif(p) === 3],
    ["Goleamos por cuatro o más", p => p.res === "G" && dif(p) >= 4], ["Perdimos por dos goles", p => p.res === "P" && dif(p) === -2],
    ["Perdimos por tres goles", p => p.res === "P" && dif(p) === -3], ["Nos golearon por cuatro o más", p => p.res === "P" && dif(p) <= -4],
    ["Metimos tres o más", p => p.gf >= 3], ["Metimos cuatro o más", p => p.gf >= 4], ["Nos hicieron tres o más", p => p.gc >= 3],
    ["Ganamos de visitante por dos o más", p => p.res === "G" && p.cond === "V" && dif(p) >= 2], ["Dimos vuelta un partido", vuelta],
    ["Ganamos por uno con un gol sobre la hora (después del 85')", p => { if (!(p.res === "G" && dif(p) === 1)) return false; const u = p.goles[p.goles.length - 1]; return !!u && u.a === "f" && u.t > 85; }],
    ["Empatamos 0-0", p => p.gf === 0 && p.gc === 0], ["Empatamos con goles (2-2 o más)", p => p.res === "E" && p.gf >= 2],
    ["Perdimos en Caballito", p => p.res === "P" && p.cond === "L"], ["Ganamos tres seguidos", racha("G", 3)], ["Perdimos dos seguidos", racha("P", 2)],
  ];
  return defs.map(([situacion, cond]) => {
    const idx = S.map((p, i) => cond(p, i) ? i : -1).filter(i => i >= 0);
    if (!idx.length) return { situacion, ultima: "No pasó desde 2025", hace: null, veces: 0, temporada: null };
    const i = idx[idx.length - 1], p = S[i];
    const partido = p.cond === "L" ? `Ferro ${p.gf}-${p.gc} ${p.rival}` : `${p.rival} ${p.gc}-${p.gf} Ferro`;
    return { situacion, ultima: `${p.anio} F${p.fecha}: ${partido}`, hace: S.length - 1 - i, veces: idx.length, temporada: p.anio };
  });
}

// ---------- árbitros ----------
// Los nombres de árbitros vienen con tipeos y acentos distintos entre síntesis: se unifican con los ya conocidos.
export function canonicoArbitro(nombre, conocidos) {
  const n = norm(nombre);
  return conocidos.find(c => norm(c) === n) ?? conocidos.find(c => distancia(norm(c), n) <= 1) ?? nombre;
}

const textoGoles = (goles, a) => goles.filter(g => g.a === a).map(g => g.ec ? `${g.nombre} ${g.min}${g.mitad} (e/c)` : `${g.nombre} ${g.min}${g.mitad}`);
export function arbitros(partidos, designado) {
  const con = partidos.map(p => ({ p, am: p.tarjetas.filter(t => t.tipo === "a").length, ro: p.tarjetas.filter(t => t.tipo === "r").length }));
  const por = new Map();
  for (const { p, am, ro } of con) {
    const x = por.get(p.arbitro) ?? { arbitro: p.arbitro, pj: 0, g: 0, e: 0, p: 0, gf: 0, gc: 0, am: 0, ro: 0 };
    x.pj++; x[p.res.toLowerCase()]++; x.gf += p.gf; x.gc += p.gc; x.am += am; x.ro += ro; por.set(p.arbitro, x);
  }
  const tabla = [...por.values()].map(x => ({ ...x, pts_p: redondear((3 * x.g + x.e) / x.pj), am_p: redondear(x.am / x.pj) }))
    .sort((a, b) => b.pj - a.pj || b.pts_p - a.pts_p || a.arbitro.localeCompare(b.arbitro, "es"));
  const totalAm = suma(con, x => x.am), totalPts = suma(con.filter(x => x.p.anio === 2026), x => puntos(x.p.res)), pj26 = con.filter(x => x.p.anio === 2026).length;
  const out = { tabla, prom_am: redondear(totalAm / con.length), prom_pts: redondear(totalPts / (pj26 || 1)) };
  if (designado) {
    const t = tabla.find(x => x.arbitro === designado);
    out.designado = t ? {
      ...t, partidos: con.filter(x => x.p.arbitro === designado).map(({ p, am }) => ({ temporada: p.anio, fecha: p.fecha, rival: p.rival, cond: p.cond, gf: p.gf, gc: p.gc, am, goles_ferro: textoGoles(p.goles, "f"), goles_rival: textoGoles(p.goles, "r") })),
    } : null;
  }
  return out;
}

// ---------- histórico 2025 contra 2026 ----------
const resumenTemporada = (anio, ps, alturaMaxima) => {
  const sub = (xs, pref) => { const m = marcador(xs), pts = 3 * m.g + m.e; return { [`${pref}pj`]: xs.length, [`${pref}g`]: m.g, [`${pref}e`]: m.e, [`${pref}p`]: m.p, [`${pref}gf`]: suma(xs, x => x.gf), [`${pref}gc`]: suma(xs, x => x.gc), [`${pref}pts`]: pts, [`${pref}ppp`]: xs.length ? redondear(pts / xs.length) : 0, [`${pref}vallas`]: xs.filter(x => x.gc === 0).length }; };
  return { temporada: anio, fechas_jugadas: ps.length, ...sub(ps, "total_"), ...sub(ps.filter(p => p.fecha <= alturaMaxima), "misma_altura_") };
};

export function historico(P26, P25, previo) {
  const altura = Math.max(...P26.map(p => p.fecha)), ev = [];
  const acum = (ps) => { let a = 0; return ps.map(p => (a += puntos(p.res))); };
  const a26 = acum(P26), a25 = acum(P25);
  for (let f = 1; f <= Math.max(P25.length, P26.length); f++) ev.push({ 2025: a25[f - 1] ?? null, 2026: a26[f - 1] ?? null, fecha: f });
  // rivales que aparecen en las dos temporadas
  const h2h = []; const vistos = [];
  for (const p of P26) {
    const k = vistos.find(v => mismoEquipo(v, p.rival)); if (k) continue; vistos.push(p.rival);
    const mios = [...P25, ...P26].filter(x => mismoEquipo(x.rival, p.rival));
    if (!mios.some(x => x.anio === 2025)) continue;
    const m = marcador(mios);
    h2h.push({ rival: p.rival, partidos: mios.length, ...m, gf: suma(mios, x => x.gf), gc: suma(mios, x => x.gc), detalle: mios.map(x => `${x.anio} F${x.fecha} ${x.cond} ${x.gf}-${x.gc}`).join(" · ") });
  }
  h2h.sort((a, b) => b.partidos - a.partidos);
  const jug = (ps, anio) => {
    const m = new Map();
    for (const p of ps) for (const r of p.participaciones) { const x = m.get(r.jugador) ?? { id: `${r.jugador}-${anio}`, jugador: r.jugador, temporada: anio, pj: 0, tit: 0, min: 0, goles: 0 }; x.pj++; if (r.rol === "Titular") x.tit++; x.min += r.minutos; x.goles += r.goles; m.set(r.jugador, x); }
    return [...m.values()].sort((a, b) => b.min - a.min);
  };
  return { temporadas: [resumenTemporada(2026, P26, altura), resumenTemporada(2025, P25, altura)], evolucion: ev, h2h, jugadores: [...(previo?.jugadores?.filter(j => j.temporada === 2025) ?? jug(P25, 2025)), ...jug(P26, 2026)] };
}

// ---------- escenarios del primer puesto ----------
export function escenarios(tabla, calendario, ultimaFecha, ferro) {
  const total = calendario.total_fechas;
  const quedan = (calendario.proximos ?? []).filter(x => x.fecha > ultimaFecha).map(x => ({ fecha: x.fecha, rival: x.rival, cond: x.cond }));
  const restan = total - ultimaFecha;
  const yo = tabla.find(x => x.equipo === ferro);
  const perseguidores = tabla.filter(x => x.equipo !== ferro).sort((a, b) => b.pts - a.pts || a.pos - b.pos).slice(0, 3)
    .map(x => ({ equipo: x.equipo, pts: x.pts, maximo: x.pts + 3 * (total - x.pj) }));
  const ferroMax = yo.pts + 3 * restan;
  return { restan, quedan, ferro: yo.pts, ferro_max: ferroMax, perseguidores, necesita_para_asegurar: Math.max(0, Math.max(...perseguidores.map(x => x.maximo)) - yo.pts + 1) };
}

// ---------- «Al límite»: amarillas acumuladas y suspensión ----------
// Regla: cada `tope` amarillas (5) se cumple una fecha de suspensión y el conteo vuelve a cero. La amarilla que forma parte de
// una doble amonestación (amarilla y roja al mismo jugador en el mismo partido) no suma.
// Fuente: las tarjetas de cada síntesis (detalle.json), incluidas las de jugadores en el banco, en ORDEN DE JUEGO (`n`, no
// el número de fecha: la F4 se jugó entre la 18 y la 19). Para cada suspensión controla si el jugador jugó el partido
// siguiente (`jugo_siguiente`): si jugó, el conteo de la síntesis no cierra y el dato se marca para confirmar.
export function limiteAmarillas(partidos, detalle, participaciones, { tope = 5, bajas = [], confirmadas = {}, cruce = [], hipotesis = true, alternativas = [] } = {}) {
  const orden = [...partidos].sort((a, b) => a.n - b.n);
  const jugo = (j, f) => participaciones.some(r => r.jugador === j && r.fecha === f && r.minutos > 0);
  const por = new Map();
  orden.forEach((p, i) => {
    const T = detalle[p.fecha]?.tarjetas ?? [];
    for (const j of new Set(T.map(t => t.k))) {
      const a = T.filter(t => t.k === j && t.tipo === "a").length, r = T.some(t => t.k === j && t.tipo === "r");
      if (!a || r) continue;   // sin amarilla, o doble amonestación (no suma)
      const x = por.get(j) ?? { jugador: j, amarillas: 0, fechas: [], suspensiones: [] };
      x.amarillas += 1; x.fechas.push(p.fecha);
      if (x.amarillas % tope === 0) {
        const sig = orden[i + 1]?.fecha ?? null;
        x.suspensiones.push({ fecha: p.fecha, siguiente: sig, jugo_siguiente: sig != null && jugo(j, sig) });
      }
      por.set(j, x);
    }
  });
  // Conteos confirmados (p. ej. con el club): pisan a la síntesis; se les suman las amarillas de partidos posteriores.
  const nDe = (f) => orden.find(p => p.fecha === f)?.n ?? Infinity;
  for (const [j, c] of Object.entries(confirmadas)) {
    if (j.startsWith("_")) continue;
    const x = por.get(j) ?? { jugador: j, amarillas: 0, fechas: [], suspensiones: [] };
    const despues = x.fechas.filter(f => nDe(f) > nDe(c.al_cierre_de_fecha)).length;
    por.set(j, { ...x, confirmado: { ciclo: c.ciclo, al_cierre_de_fecha: c.al_cierre_de_fecha, fuente: c.fuente, nota: c.nota ?? "" }, ciclo_confirmado: (c.ciclo + despues) % tope });
  }
  // Si la otra fuente no coincide, se marca y se recalcula el conteo entero con las amarillas de ella (ALT).
  let ALT = null;
  for (const d of cruce) if (!por.has(d.jugador)) por.set(d.jugador, { jugador: d.jugador, amarillas: 0, fechas: [], suspensiones: [] });
  return [...por.values()]
    .filter(x => !bajas.includes(x.jugador))
    .map(x => { const ciclo = x.ciclo_confirmado ?? x.amarillas % tope; const { ciclo_confirmado, ...resto } = x;
      const dif = cruce.filter(d => d.jugador === x.jugador);
      const alt = dif.length ? (ALT ??= limiteAmarillas(partidos, aplicarCruce(detalle, cruce), participaciones, { tope, hipotesis: false })).find(y => y.jugador === x.jugador) : null;
      const otra = dif.length ? { diferencias: dif.map(({ fecha, en }) => ({ fecha, en })), amarillas: alt?.amarillas ?? 0, ciclo: alt?.ciclo ?? 0, suspensiones: alt?.suspensiones ?? [] } : null;
      // «Jugó suspendido»: se prueba sacar cada amarilla anterior y se guardan los conteos con los que las cuentas cierran.
      const malo = hipotesis && !x.confirmado && x.suspensiones.find(y => y.jugo_siguiente);
      const sinUna = malo ? [...new Set(x.fechas.filter(f => nDe(f) <= nDe(malo.fecha)).map(f => {
        const y = limiteAmarillas(partidos, aplicarCruce(detalle, [{ fecha: f, jugador: x.jugador, en: "ferroweb" }]), participaciones, { tope, hipotesis: false }).find(z => z.jugador === x.jugador);
        return y && !y.suspensiones.some(z => z.jugo_siguiente) ? y.ciclo : null; }).filter(v => v != null))].sort((a, b) => a - b) : null;
      // Lecturas de la fuente en minoría (alternativas: amarillas a sacar o agregar): se guardan las que cierran y dan otro conteo.
      const otras = x.confirmado ? [] : alternativas.filter(c => c.jugador === x.jugador).map(c => {
        const y = limiteAmarillas(partidos, aplicarCruce(detalle, [c]), participaciones, { tope, hipotesis: false }).find(z => z.jugador === x.jugador);
        const ultima = y?.suspensiones[y.suspensiones.length - 1] ?? null;
        return y && !y.suspensiones.some(z => z.jugo_siguiente) && y.ciclo !== ciclo ? { fecha: c.fecha, ciclo: y.ciclo, suspension: ultima } : null; }).filter(Boolean);
      // Total que suma al acumulado (si el conteo confirmado difiere, se ajusta con la menor cantidad de amarillas que falten o sobren) y cuántas fechas costaría la próxima suspensión:
      // la primera vez que llega a 5, una fecha; la segunda (10), dos.
      const calc = x.amarillas % tope, dd = (((ciclo - calc) % tope) + tope) % tope, total = x.amarillas + (dd > tope / 2 ? dd - tope : dd);   // el ajuste más chico (falta o sobra alguna)
      return { ...resto, ciclo, faltan: tope - ciclo, total, proxima_sancion: Math.floor(total / tope) + 1, ...(otra ? { cruce: otra } : {}), ...(sinUna ? { si_sobra_una: sinUna } : {}), ...(otras.length ? { otras_lecturas: otras } : {}) }; })
    .sort((a, b) => a.faltan - b.faltan || b.amarillas - a.amarillas || a.jugador.localeCompare(b.jugador, "es"));
}

// Cruce de amarillas entre dos fuentes, partido por partido. Solo cuentan las amarillas que suman al acumulado
// (si el jugador terminó expulsado en ese partido, no se cuenta en ninguna de las dos).
// detalle: el de FerroWeb ({ fecha: { tarjetas } }); otra: { fecha: { amarillas: [clave], rojas: [clave] } } (solo las fechas que tiene la otra fuente).
// Devuelve [{ fecha, jugador, en: "ferroweb" | "otra" }] con las amarillas que figuran en una sola fuente.
export function cruceAmarillas(detalle, otra) {
  const dif = [];
  for (const [f, o] of Object.entries(otra)) {
    const T = detalle[f]?.tarjetas; if (!T) continue;
    const rojasFW = new Set(T.filter(t => t.tipo === "r").map(t => t.k)), rojasO = new Set(o.rojas ?? []);
    const fw = new Set(T.filter(t => t.tipo === "a" && !rojasFW.has(t.k) && !rojasO.has(t.k)).map(t => t.k));
    const ot = new Set((o.amarillas ?? []).filter(k => !rojasFW.has(k) && !rojasO.has(k)));
    for (const k of fw) if (!ot.has(k)) dif.push({ fecha: +f, jugador: k, en: "ferroweb" });
    for (const k of ot) if (!fw.has(k)) dif.push({ fecha: +f, jugador: k, en: "otra" });
  }
  return dif.sort((a, b) => a.fecha - b.fecha || a.jugador.localeCompare(b.jugador, "es"));
}

// El detalle de FerroWeb con las amarillas corregidas según la otra fuente (para calcular cómo quedaría el conteo con ella).
export function aplicarCruce(detalle, cruce) {
  const d = structuredClone(detalle);
  for (const c of cruce) {
    const T = d[c.fecha]?.tarjetas; if (!T) continue;
    if (c.en === "ferroweb") { const i = T.findIndex(t => t.k === c.jugador && t.tipo === "a"); if (i >= 0) T.splice(i, 1); }
    else T.push({ k: c.jugador, tipo: "a" });
  }
  return d;
}

// Amarillas que no coinciden entre FerroWeb y otras fuentes, con lo que dice cada una y la mayoría.
// fuentes: { nombre: { fecha: { amarillas: [clave], rojas: [clave] } } }. Una fuente sin esa fecha cuenta como «sin dato» (null).
// La mayoría se decide entre las fuentes con dato; si empatan, queda lo de FerroWeb.
export function amarillasPorFuente(detalle, fuentes) {
  const filas = new Map();
  for (const [nombre, datos] of Object.entries(fuentes))
    for (const d of cruceAmarillas(detalle, datos)) {
      const k = `${d.fecha}|${d.jugador}`;
      filas.set(k, filas.get(k) ?? { fecha: d.fecha, jugador: d.jugador, ferroweb: d.en === "ferroweb" });
    }
  return [...filas.values()].map(f => {
    const fila = { ...f };
    for (const [nombre, datos] of Object.entries(fuentes)) {
      if (!datos[f.fecha]) { fila[nombre] = null; continue; }
      const otra = cruceAmarillas(detalle, { [f.fecha]: datos[f.fecha] }).some(d => d.jugador === f.jugador);
      fila[nombre] = otra ? !f.ferroweb : f.ferroweb;
    }
    const votos = [f.ferroweb, ...Object.keys(fuentes).map(n => fila[n])].filter(v => v != null);
    const si = votos.filter(Boolean).length, no = votos.length - si;
    fila.mayoria = si === no ? f.ferroweb : si > no;
    return fila;
  }).sort((a, b) => a.fecha - b.fecha || a.jugador.localeCompare(b.jugador, "es"));
}
// Las filas donde la mayoría contradice a FerroWeb, en el formato de aplicarCruce.
// Lo contrario: qué cambiar (sobre el detalle ya corregido) para seguir a la fuente en minoría.
export const lecturasEnMinoria = (filas) => filas.map(f => ({ fecha: f.fecha, jugador: f.jugador, en: f.mayoria ? "ferroweb" : "otra" }));
export const correccionPorMayoria = (filas) => filas.filter(f => f.mayoria !== f.ferroweb).map(f => ({ fecha: f.fecha, jugador: f.jugador, en: f.ferroweb ? "ferroweb" : "otra" }));

// Para los jugadores con conteo oficial: qué lectura de cada amarilla en disputa es la que da ese conteo.
// Devuelve las filas con «informe»: true/false (la amarilla existió o no, según el conteo oficial) o null si no lo define.
export function filasSegunInforme(partidos, detalleMayoria, participaciones, filas, confirmadas, tope = 5) {
  const cicloCon = (det, j) => limiteAmarillas(partidos, det, participaciones, { tope, hipotesis: false }).find(x => x.jugador === j)?.ciclo ?? 0;
  return filas.map(f => {
    const c = confirmadas[f.jugador]; if (!c) return { ...f, informe: null };
    const base = cicloCon(detalleMayoria, f.jugador) === c.ciclo;
    const giro = cicloCon(aplicarCruce(detalleMayoria, [{ fecha: f.fecha, jugador: f.jugador, en: f.mayoria ? "ferroweb" : "otra" }]), f.jugador) === c.ciclo;
    return { ...f, informe: base && !giro ? f.mayoria : giro && !base ? !f.mayoria : null };
  });
}
