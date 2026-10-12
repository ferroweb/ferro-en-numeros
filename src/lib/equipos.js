// Los nombres de un mismo equipo varían según la fuente: «Racing (Córdoba)», «Racing de Córdoba», «Estudiantes (Caseros)»,
// «Estudiantes de Caseros». Se comparan sin paréntesis ni acentos.
const sinAcentos = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
// FútbolTotal escribe «Racing Cordoba», «CA Estudiantes», «Atletico Mitre»: se ignoran las palabras que cada fuente agrega o saca.
const RELLENO = /\b(de|del|la|el|club|ca|cd|sd|atletico|deportivo)\b/g;
export const baseEquipo = (s) => sinAcentos(String(s).replace(/\([^)]*\)/g, "")).toLowerCase().replace(RELLENO, " ").replace(/\s+/g, " ").trim();
export function mismoEquipo(a, b) {
  const x = baseEquipo(a), y = baseEquipo(b);
  return x === y || x.startsWith(y + " ") || y.startsWith(x + " ");
}
