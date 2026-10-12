// Temporadas anteriores (2025 y parte de 2024) leídas de las mismas síntesis de FerroWeb y procesadas con la misma lógica
// que 2026. Se guardan una sola vez en datos-fuente/temporadas.json y alimentan los cruces que mezclan años
// (árbitros, rivales favoritos, historial, «tal fecha como esta», «la última vez que…», histórico 2025 vs 2026).
import { bajarSintesis, parseSintesis, corregir, FERRO } from "./ferroweb.mjs";
import { procesarPartido } from "./derive.mjs";
import { equipoCanonico, mismoEquipo, norm } from "./texto.mjs";

// Número de síntesis de cada fecha: view = base + fecha. (Verificado: 2025 reproduce exacto 41 pts, 10G 11E 13P, 24 a 33.)
export const TEMPORADAS = {
  2025: { base: 724, fechas: [1, 34] },       // F1 = síntesis 725 … F34 = 758
  2024: { base: 686, fechas: [15, 38] },      // FerroWeb conserva desde la F15 (síntesis 701 … 724)
};

// Lee una temporada entera. `conocidos`: apellidos de jugadores ya usados (para corregir tipeos); `rivales`: nombres de rivales ya usados.
export async function bajarTemporada(anio, { conocidos = [], rivales = [], correcciones = {}, alias = {}, aviso = () => {} } = {}) {
  const aliasN = Object.fromEntries(Object.entries(alias).filter(([k]) => !k.startsWith("_")).map(([k, v]) => [norm(k), v]));
  const { base, fechas: [a, b] } = TEMPORADAS[anio], out = [];
  for (let f = a; f <= b; f++) {
    const view = base + f;
    const s0 = parseSintesis(await bajarSintesis(view));
    if (!s0) { aviso(`${anio} F${f} (síntesis ${view}): sin síntesis publicada`); continue; }
    const s = corregir(s0, correcciones[view]);
    const ferroLocal = mismoEquipo(s.local, FERRO);
    const crudo = ferroLocal ? s.visitante : s.local;
    const rival = aliasN[norm(crudo)] ?? equipoCanonico(crudo, rivales) ?? crudo;
    const r = procesarPartido(s, { fecha: f, rival, n: f, view, conocidos });
    const problemas = r.errores;
    if (problemas.length) aviso(`${anio} F${f} (síntesis ${view}): ${problemas.join("; ")}`);
    out.push({
      anio, fecha: f, view, rival, cond: ferroLocal ? "L" : "V", gf: r.partido.gf, gc: r.partido.gc, resultado: r.partido.resultado,
      arbitro: r.partido.arbitro, sistema: r.partido.sistema, goles: r.goles, entradas: r.entradas, tarjetas: r.tarjetas, participaciones: r.participaciones,
      ...(problemas.length ? { problemas } : {}),
    });
    await new Promise(z => setTimeout(z, 200));
  }
  return out;
}
