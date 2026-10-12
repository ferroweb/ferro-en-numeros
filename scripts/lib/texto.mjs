// Utilidades de texto y de nombres, compartidas por el parser y el cálculo.

export const sinAcentos = (s) => String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "");
export const norm = (s) => sinAcentos(s).toLowerCase().replace(/\s+/g, " ").trim();

// Distancia de edición con transposiciones (para tolerar «Khim» por «Kihm», «Parisii» por «Parisi», «Garcí» por «García»).
export function distancia(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return Math.max(m, n);
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 1; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[m][n];
}

// Busca un nombre dentro de una lista de claves (apellidos). Devuelve la clave o null si no hay una única coincidencia.
export function resolver(nombre, claves) {
  const n = norm(nombre).replace(/[.,]/g, "").trim();
  if (!n) return null;
  const N = claves.map(k => [k, norm(k)]);
  const exacto = N.filter(([, x]) => x === n);
  if (exacto.length === 1) return exacto[0][0];
  const prefijo = N.filter(([, x]) => x.startsWith(n + " ") || n.startsWith(x + " "));
  if (prefijo.length === 1) return prefijo[0][0];
  if (n.length >= 4) {
    const cerca = N.map(([k, x]) => [k, distancia(n, x)]).filter(([, d]) => d <= 1).sort((a, b) => a[1] - b[1]);
    if (cerca.length === 1 || (cerca.length > 1 && cerca[0][1] < cerca[1][1])) return cerca[0][0];
  }
  return null;
}

// «Racing (Córdoba)», «Racing de Córdoba» y «Racing Cordoba» (FútbolTotal) son el mismo rival; también «CA Estudiantes» y
// «Estudiantes de Caseros», o «Atletico Mitre» y «Mitre (SdE)». Se comparan sin paréntesis, sin acentos y sin las palabras
// que cada fuente agrega o saca (de, club, CA, atlético, deportivo…).
const RELLENO = /\b(de|del|la|el|club|ca|cd|sd|atletico|deportivo)\b/g;
const base = (s) => norm(String(s).replace(/\([^)]*\)/g, "")).replace(RELLENO, " ").replace(/\s+/g, " ").trim();
export function mismoEquipo(a, b) {
  const x = base(a), y = base(b);
  return x === y || x.startsWith(y + " ") || y.startsWith(x + " ");
}
export function equipoCanonico(nombre, conocidos) {
  return conocidos.find(c => mismoEquipo(nombre, c)) ?? null;
}

// Fecha y hora en Argentina con el formato que usa el sitio: «11/10/2026 09:51».
export function ahoraArgentina(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(d).map(x => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year} ${p.hour === "24" ? "00" : p.hour}:${p.minute}`;
}
