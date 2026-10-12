// Tema claro/oscuro: por defecto sigue al sistema; el botón fija una elección y la recuerda.
const guardar = (v) => { try { localStorage.setItem("fen_tema", v); } catch (e) { /* sin almacenamiento */ } };

export function initTema() {
  const raiz = document.documentElement;
  const efectivo = () => raiz.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.querySelector("#btn-tema").addEventListener("click", () => {
    const nuevo = efectivo() === "dark" ? "light" : "dark";
    raiz.setAttribute("data-theme", nuevo); guardar(nuevo);
  });
}
