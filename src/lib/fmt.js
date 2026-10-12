export function fechaLarga(iso) { const d = new Date(iso + "T12:00:00"); return d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "numeric" }); }
