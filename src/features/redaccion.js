// «De la redacción»: las novedades que carga el equipo de Ferroweb en la planilla de Google aparecen en el sitio al instante,
// sin publicar nada. Si todavía no hay planilla configurada (public/data/redaccion-config.json), no se muestra nada.
import { $, el } from "../lib/dom.js";
import { tarjeta } from "../components/tarjeta.js";
import { filasDePlanilla, novedadesVisibles } from "../lib/planilla.js";

const BASE = import.meta.env.BASE_URL + "data/";

export default {
  async init() {
    try {
      const cfg = await (await fetch(BASE + "redaccion-config.json", { cache: "no-cache" })).json();
      const enlaces = [["#as-planilla", cfg.planilla]];
      enlaces.forEach(([sel, url]) => { const a = $(sel); if (a && url) { a.href = url; a.hidden = false; } });
      if (!cfg.csv) return;
      const r = await fetch(cfg.csv + (cfg.csv.includes("?") ? "&" : "?") + "t=" + Date.now(), { cache: "no-store" });
      if (!r.ok) return;
      const novedades = novedadesVisibles(filasDePlanilla(await r.text()));
      if (!novedades.length) return;
      const nueva = (n) => tarjeta({
        tipo: "novedad", titulo: n.titulo, detalle: n.texto, url: n.link || undefined, fuente: "Ferroweb",
        extra: n.fecha ? n.fecha.toLocaleDateString("es-AR", { day: "numeric", month: "numeric" }) : "",
        desarrollo: n.texto ? n.texto.split(/\n+/) : undefined,
      });
      const lista = $("#redaccion-l"); novedades.forEach(n => lista.append(nueva(n))); lista.hidden = false;
      const portada = $("#inicio-redaccion-l"); novedades.slice(0, 3).forEach(n => portada.append(nueva(n))); $("#inicio-redaccion").hidden = false;
      window.dispatchEvent(new HashChangeEvent("hashchange"));   // para que el menú muestre la página nueva
    } catch (e) { console.warn("No se pudo leer la planilla de la redacción", e); }
  },
};
