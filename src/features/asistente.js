// Asistente de redacción: arma el pedido para la IA (Claude, ChatGPT…) con los datos reales del sitio ya incluidos.
// La persona elige qué quiere escribir, copia el pedido, lo pega en la IA y revisa el resultado. No hay nada que instalar.
import { DATA, prox, ult, ferroT, TODOS, previaAlDia, escenariosAlDia } from "../ctx.js";
import { $, el } from "../lib/dom.js";
import { fechaLarga } from "../lib/fmt.js";
import { mismoEquipo } from "../lib/equipos.js";
import { copiar } from "../components/compartir.js";

const num = (v) => v.toLocaleString("es-AR");
const f2 = (v) => v == null ? "—" : v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const partidoTexto = (p) => `F${p.fecha}: ${p.condicion === "Local" ? `Ferro ${p.gf}-${p.gc} ${p.rival}` : `${p.rival} ${p.gc}-${p.gf} Ferro`}`;
const res = { G: "ganamos", E: "empatamos", P: "perdimos" };
const sitio = () => location.origin + location.pathname;
const pl = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const lineas = (xs) => xs.filter(Boolean).map(x => `- ${x}`).join("\n");

// ---------- bloques de datos ----------
function datosJugador(nombre) {
  const j = DATA.jugadores.find(x => x.jugador === nombre); if (!j) return "";
  const rows = DATA.participaciones.filter(r => r.jugador === nombre).sort((a, b) => b.fecha - a.fecha);
  const ultimos = rows.slice(0, 5).map(r => `F${r.fecha} ${r.rival} (${r.res}, ${r.rol === "Titular" ? "titular" : "suplente"}, ${r.minutos}')${r.goles ? `, ${r.goles} ${r.goles === 1 ? "gol" : "goles"}` : ""}${r.amarilla ? ", amarilla" : ""}${r.roja ? ", roja" : ""}`);
  const tray = (j.trayectoria || []).map(([club, d, h, n]) => `${club} ${d && h ? (d === h ? d : `${d}-${h}`) : d ? `${d}-hoy` : h ? `hasta ${h}` : ""}${n ? ` (${n})` : ""}`).join("; ");
  const hall = TODOS.filter(x => x.jugador === nombre).slice(0, 5).map(x => x.titulo);
  return lineas([
    `Jugador: ${nombre}`, `Partidos jugados: ${j.pj} (${j.titular} de titular y ${j.suplente} desde el banco)`, `Minutos: ${num(j.minutos)}`,
    `Goles: ${j.goles}${j.goles_suplente ? ` (${j.goles_suplente} entrando desde el banco)` : ""}${j.minutos_por_gol ? `; un gol cada ${num(j.minutos_por_gol)} minutos` : ""}`,
    `Tarjetas: ${j.amarillas} amarillas y ${j.rojas} rojas`,
    `Puntos por partido de Ferro cuando arranca de titular: ${f2(j.pts_partido_titular)}; en los partidos que no arranca: ${f2(j.pts_partido_sin_el)}`,
    ultimos.length && `Últimos partidos: ${ultimos.join(" | ")}`, tray && `Trayectoria: ${tray}`, hall.length && `Datos destacados del sitio sobre él: ${hall.join(" | ")}`,
  ]);
}

function datosTabla() {
  const f = ferroT, seg = DATA.tabla.filter(r => r !== f).sort((a, b) => b.pts - a.pts)[0];
  return lineas([
    f && `Posición de Ferro: ${f.pos}° con ${f.pts} puntos en ${f.pj} partidos (${pl(f.g, "ganado", "ganados")}, ${pl(f.e, "empatado", "empatados")}, ${pl(f.p, "perdido", "perdidos")}; goles ${f.gf} a favor y ${f.gc} en contra)`,
    seg && f && `El que lo sigue: ${seg.equipo} con ${seg.pts} puntos (${f.pts - seg.pts > 0 ? "+" : ""}${f.pts - seg.pts} de ventaja para Ferro)`,
    DATA.calendario && `Fechas del torneo: ${DATA.calendario.total_fechas}; se jugaron ${DATA.ultima_fecha}`,
  ]);
}

function datosUltimoPartido() {
  const p = ult; if (!p) return "";
  const rows = DATA.participaciones.filter(r => r.fecha === p.fecha);
  const tarj = rows.filter(r => r.amarilla || r.roja).map(r => `${r.jugador}${r.roja ? " (roja)" : " (amarilla)"}`);
  const cambios = rows.filter(r => r.rol === "Suplente").map(r => `${r.jugador} (${r.minutos}')`);
  return lineas([
    `Partido: ${partidoTexto(p)} — ${res[p.resultado]}`, `Goles de Ferro: ${p.goleadores === "—" ? "ninguno" : p.goleadores.replace(/(\d+)(pt|st)/g, "$1' $2").replace(/ pt/g, " 1T").replace(/ st/g, " 2T")}`,
    `Árbitro: ${p.arbitro}`, p.sistema && `Esquema de Ferro: ${p.sistema}`, `Puntos acumulados: ${p.pts_acum}`,
    cambios.length && `Ingresaron desde el banco: ${cambios.join(", ")}`, tarj.length && `Tarjetas de Ferro: ${tarj.join(", ")}`,
    `Titulares: ${rows.filter(r => r.rol === "Titular").map(r => r.jugador).join(", ")}`,
  ]) + "\n" + datosTabla();
}

function datosRival(nombre) {
  const t = DATA.tabla.find(x => mismoEquipo(x.equipo, nombre));
  const jugados = DATA.partidos.filter(p => mismoEquipo(p.rival, nombre));
  const h = DATA.historico && DATA.historico.h2h && DATA.historico.h2h.find(x => mismoEquipo(x.rival, nombre));
  const goleadores = {}; DATA.participaciones.filter(r => r.goles && mismoEquipo(r.rival, nombre)).forEach(r => { goleadores[r.jugador] = (goleadores[r.jugador] || 0) + r.goles; });
  const R = DATA.lab && DATA.lab.rivales, fav = R && R.favoritos.find(x => mismoEquipo(x.rival, nombre)), bes = R && R.bestias.find(x => mismoEquipo(x.rival, nombre));
  return lineas([
    `Rival: ${nombre}`, t && `En la tabla: ${t.pos}° con ${t.pts} puntos en ${t.pj} partidos (goles ${t.gf} a favor y ${t.gc} en contra)`,
    jugados.length && `Cómo nos fue este año contra ellos: ${jugados.map(partidoTexto).join(" | ")}`,
    h && `Historial 2025-26: ${pl(h.g, "ganado", "ganados")}, ${pl(h.e, "empatado", "empatados")} y ${pl(h.p, "perdido", "perdidos")} (${h.detalle})`,
    Object.keys(goleadores).length && `Nuestros goleadores contra ellos: ${Object.entries(goleadores).map(([n, v]) => `${n} ${v}`).join(", ")}`,
    fav && `Es un rival que nos sienta bien (${fav.ppp} puntos por partido)`, bes && `Es una bestia negra (${bes.ppp} puntos por partido)`,
  ]);
}

function datosProximo() {
  if (!prox) return "Todavía no está cargado el próximo partido.";
  const arbitro = prox.arbitro && DATA.arbitros && DATA.arbitros.designado_nombre === prox.arbitro ? DATA.arbitros.designado : null;
  const E = escenariosAlDia ? DATA.escenarios : null;
  const W = previaAlDia ? DATA.fw : null;
  return lineas([
    `Próximo partido: fecha ${prox.fecha}, ${prox.cond === "L" ? `Ferro vs ${prox.rival} en Caballito` : `${prox.rival} vs Ferro de visitante`}`,
    `Cuándo: ${prox.dia ? fechaLarga(prox.dia) + (prox.hora ? ` ${prox.hora} hs` : " (horario a confirmar)") : "a confirmar"}${prox.estadio ? `; dónde: ${prox.estadio}` : ""}`,
    prox.arbitro && `Árbitro: ${prox.arbitro}${arbitro ? ` — nos dirigió ${arbitro.pj} ${arbitro.pj === 1 ? "vez" : "veces"}: ${arbitro.g}G ${arbitro.e}E ${arbitro.p}P` : ""}`,
    prox.forma_rival && prox.forma_rival.length && `Últimos partidos del rival (marcador desde su punto de vista): ${prox.forma_rival.join(" | ")}`,
    E && `Escenario del primer puesto: Ferro tiene ${E.ferro} puntos y quedan ${E.restan} fechas; para asegurar el 1° sin depender de nadie necesita ${E.necesita_para_asegurar} puntos más`,
    W && `Pronóstico FW: ${prox.cond === "L" ? `Ferro ${W.gf}-${W.gc}` : `${W.gc}-${W.gf} Ferro`}; chances de ganar ${W.ganar}%, empatar ${W.empatar}% y perder ${W.perder}%`,
  ]) + "\n" + datosRival(prox.rival) + "\n" + datosTabla();
}

function datosTemporada() {
  const r = Object.fromEntries((DATA.rendimiento || []).map(x => [x.corte, x]));
  const top = DATA.jugadores.slice().sort((a, b) => b.goles - a.goles).slice(0, 4).map(j => `${j.jugador} ${j.goles}`).join(", ");
  const rec = (DATA.ultimas || []).filter(u => u.veces > 0).slice(0, 5).map(u => `${u.situacion}: ${u.ultima} (hace ${u.hace} partidos)`);
  const v = (c) => r[c] ? `${r[c].g}G ${r[c].e}E ${r[c].p}P, ${f2(r[c].ppp)} puntos por partido` : null;
  return lineas([
    v("Total") && `Total: ${v("Total")}; vallas invictas: ${r.Total.vallas}`, v("Local") && `De local: ${v("Local")}`, v("Visitante") && `De visitante: ${v("Visitante")}`,
    v("Últimos 5") && `Últimos 5 partidos: ${v("Últimos 5")}`, v("Abriendo el marcador") && `Cuando abrimos el marcador: ${v("Abriendo el marcador")}`, v("Recibiendo el primer gol") && `Cuando nos hacen el primer gol: ${v("Recibiendo el primer gol")}`,
    `Goleadores: ${top}`, rec.length && `La última vez que…: ${rec.join(" | ")}`,
  ]) + "\n" + datosTabla();
}

function datosNovedades() {
  const nov = (DATA.novedades || []).slice(0, 3).map(n => `${n.titulo}: ${n.detalle}`);
  const hall = TODOS.filter(x => x.tipo !== "tabla" && x.tipo !== "novedad").slice(0, 5).map(x => x.titulo);
  return lineas([nov.length && `Novedades recientes del sitio: ${nov.join(" | ")}`, hall.length && `Hallazgos destacados: ${hall.join(" | ")}`]);
}

// ---------- qué se puede pedir ----------
const PLANTILLAS = [
  { id: "jugador", titulo: "Tuit sobre un jugador", pide: ["jugador"], largo: "tuit",
    tarea: (o) => `Escribí 3 opciones de tuit sobre ${o.jugador}, cada una con un enfoque distinto (su momento, un número que sorprenda y una comparación).`, datos: (o) => datosJugador(o.jugador) },
  { id: "previa", titulo: "Previa del próximo partido", pide: [], largo: "hilo",
    tarea: () => "Escribí la previa del próximo partido de Ferro para publicar en las redes antes de que se juegue: contexto, cómo llega el rival, qué nos juega a favor y qué cuidar.", datos: () => datosProximo() },
  { id: "resumen", titulo: "Resumen del último partido", pide: [], largo: "hilo",
    tarea: () => "Escribí el resumen del último partido de Ferro para publicar después del final: qué pasó, qué número lo explica y qué viene.", datos: () => datosUltimoPartido() },
  { id: "rival", titulo: "Todo sobre un rival", pide: ["rival"], largo: "hilo",
    tarea: (o) => `Escribí un hilo corto sobre ${o.rival}: cómo nos fue contra ellos, qué tienen y qué hay que mirar.`, datos: (o) => datosRival(o.rival) },
  { id: "temporada", titulo: "Hilo de datos de la temporada", pide: [], largo: "hilo",
    tarea: () => "Escribí un hilo de datos sobre cómo viene Ferro en el torneo, ordenado de lo más importante a lo más curioso.", datos: () => datosTemporada() },
  { id: "programa", titulo: "Guion de datos para el programa", pide: [], largo: "nota",
    tarea: () => "Armá un guion de 8 datos para tirar al aire en «Hablemos de Ferro»: cada dato en una o dos frases fáciles de decir en voz alta, con una frase corta para pasar al siguiente.",
    datos: () => [datosProximo(), datosUltimoPartido(), datosTemporada(), datosNovedades()].join("\n") },
  { id: "novedad", titulo: "Novedad para cargar en la web", pide: ["idea"], largo: "novedad",
    tarea: (o) => `Redactá una novedad para publicar en la página a partir de esta idea: «${o.idea || "(escribí la idea arriba)"}».\nDevolvé exactamente dos líneas:\nTítulo: (hasta 90 caracteres)\nTexto: (hasta 300 caracteres)`, datos: () => [datosTabla(), datosUltimoPartido(), datosNovedades()].join("\n") },
];
const TONOS = { hincha: "de hincha, cercano y con humor", serio: "serio y analítico, de periodista deportivo", epico: "épico, de tribuna, para emocionar" };
const LARGOS = {
  tuit: "Cada opción tiene que entrar en un tuit (hasta 250 caracteres).", hilo: "Armalo como un hilo de 3 a 5 tuits numerados; cada tuit hasta 250 caracteres.",
  nota: "Entregalo como lista numerada, un dato por renglón.", novedad: "Respetá el formato de dos líneas y los límites de caracteres.",
};

export function armarPedido(plantilla, o) {
  const tono = TONOS[o.tono] ?? TONOS.hincha;
  const extra = o.extra && o.extra.trim() ? `\nAdemás, quiero que destaques: ${o.extra.trim()}` : "";
  return `Sos parte de la redacción de Ferroweb («Hablemos de Ferro»), la página de los socios de Ferro Carril Oeste. Escribís en español rioplatense, en tono ${tono}, sin groserías y sin inventar nada.

TAREA
${plantilla.tarea(o)}${extra}

REGLAS
- Usá SOLO los datos de la sección DATOS. Si algo no está ahí, no lo uses ni lo estimes.
- Cuando cites un número, tiene que ser exactamente el de los datos.
- ${LARGOS[plantilla.largo]}
- Si falta información para hacer bien la tarea, decímelo en vez de inventar.
- Cerrá con la fuente: «Datos: Ferro en números (${sitio()})».

DATOS (al cierre de la fecha ${DATA.ultima_fecha}; actualizado ${DATA.actualizado})
${plantilla.datos(o)}`;
}

// ---------- pantalla ----------
export default {
  init() {
    const form = $("#as-form"); if (!form) return;
    const campo = (rotulo, control) => { const d = el("label", "as-campo"); d.append(el("span", null, rotulo), control); return d; };
    const sel = (id, opciones) => { const s = el("select"); s.id = id; opciones.forEach(([v, t]) => s.append(new Option(t, v))); return s; };
    const tipo = sel("as-tipo", PLANTILLAS.map(p => [p.id, p.titulo]));
    const jugador = sel("as-jugador", DATA.jugadores.slice().sort((a, b) => a.jugador.localeCompare(b.jugador, "es")).map(j => [j.jugador, j.jugador]));
    const rivales = [...new Set([...DATA.tabla.map(t => t.equipo).filter(e => e !== "Ferro Carril Oeste"), ...DATA.partidos.map(p => p.rival)])].sort((a, b) => a.localeCompare(b, "es"));
    const rival = sel("as-rival", rivales.map(r => [r, r])); if (prox) rival.value = rivales.find(r => mismoEquipo(r, prox.rival)) ?? rival.value;
    const idea = el("textarea"); idea.id = "as-idea"; idea.rows = 2; idea.placeholder = "Ej.: Reniero metió su primer gol en el torneo en Salta";
    const tono = sel("as-tono", [["hincha", "De hincha, con humor"], ["serio", "Serio y analítico"], ["epico", "Épico, de tribuna"]]);
    const extra = el("textarea"); extra.id = "as-extra"; extra.rows = 2; extra.placeholder = "Opcional. Ej.: Que se note lo bien que juega de visitante";
    const cJug = campo("¿Sobre qué jugador?", jugador), cRiv = campo("¿Sobre qué rival?", rival), cIdea = campo("¿Cuál es la idea?", idea);
    form.append(campo("¿Qué querés escribir?", tipo), cJug, cRiv, cIdea, campo("Tono", tono), campo("¿Querés destacar algo?", extra));
    const salida = $("#as-salida");
    const actualizar = () => {
      const p = PLANTILLAS.find(x => x.id === tipo.value);
      cJug.hidden = !p.pide.includes("jugador"); cRiv.hidden = !p.pide.includes("rival"); cIdea.hidden = !p.pide.includes("idea");
      salida.value = armarPedido(p, { jugador: jugador.value, rival: rival.value, idea: idea.value, tono: tono.value, extra: extra.value });
    };
    [tipo, jugador, rival, tono].forEach(c => c.addEventListener("change", actualizar)); [idea, extra].forEach(c => c.addEventListener("input", actualizar));
    $("#as-copiar").addEventListener("click", () => copiar(salida.value, "Pedido copiado: pegalo en la IA"));
    actualizar();
  },
};
