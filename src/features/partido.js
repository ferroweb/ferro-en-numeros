import { previa } from "./partido/previa.js";
import { initPizarra } from "./partido/pizarra.js";
import { initArbitro } from "./partido/arbitro.js";
import { initRival } from "./partido/rival.js";
import { initResumen } from "./partido/resumen.js";

export default {
  init() { previa(); initPizarra(); initArbitro(); initRival(); initResumen(); },
  onShow(grupo) { if (grupo === "partido") previa(); },
};
