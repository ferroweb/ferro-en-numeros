// Los nombres de un mismo equipo varían según la fuente: «Racing (Córdoba)», «Racing de Córdoba», «Estudiantes (Caseros)»,
// «Estudiantes de Caseros». Se comparan sin paréntesis ni acentos.
const sinAcentos = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
export const baseEquipo = (s) => sinAcentos(String(s).replace(/\([^)]*\)/g, "")).toLowerCase().replace(/\s+/g, " ").trim();
export function mismoEquipo(a, b) {
  const x = baseEquipo(a), y = baseEquipo(b);
  return x === y || x.startsWith(y + " ") || y.startsWith(x + " ");
}
