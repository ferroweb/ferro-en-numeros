export const cargarHtml2canvas = () => window.html2canvas ? Promise.resolve() : import("html2canvas-pro").then(m => { window.html2canvas = m.default; });
