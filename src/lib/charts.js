import { $, el } from "./dom.js";

// ---------- tooltip ----------
export function tip(box) { let t = box.querySelector(".tip"); if (!t) { t = el("div", "tip"); box.append(t); } return t; }
export function showTip(t, box, x, y, head, lines) {
  t.textContent = ""; t.append(el("b", null, head)); lines.forEach(l => t.append(el("div", null, l)));
  t.style.opacity = 1; const w = t.offsetWidth; t.style.left = Math.max(0, Math.min(box.clientWidth - w, x - w / 2)) + "px"; t.style.top = Math.max(0, y - t.offsetHeight - 10) + "px";
}
export const hideTip = (t) => () => { t.style.opacity = 0; };

// ---------- tablas genéricas ----------
export function tabla(sel, cols, rows, opts = {}) {
  const t = $(sel); t.textContent = "";
  const thead = el("thead"), tr = el("tr");
  let st = opts.sort || null;
  cols.forEach(c => { const th = el("th", [c.l ? "l" : "", c.x ? "x" : ""].filter(Boolean).join(" ") || null); if (opts.sortable) { const b = el("button", null, c.h); b.addEventListener("click", () => { st = st && st.k === c.k ? { k: c.k, d: -st.d } : { k: c.k, d: c.l ? 1 : -1 }; draw(); }); th.append(b); th.setAttribute("aria-sort", "none"); } else th.textContent = c.h; tr.append(th); });
  thead.append(tr); t.append(thead); const tb = el("tbody"); t.append(tb);
  function draw() {
    tb.textContent = "";
    let rs = rows.slice();
    if (st) rs.sort((a, b) => { const x = a[st.k], y = b[st.k]; if (x == null) return 1; if (y == null) return -1; return (typeof x === "string" ? x.localeCompare(y) : x - y) * st.d; });
    [...thead.querySelectorAll("th")].forEach((th, i) => th.setAttribute("aria-sort", st && cols[i].k === st.k ? (st.d > 0 ? "ascending" : "descending") : "none"));
    rs.forEach(r => { const tr = el("tr"); if (opts.yo && opts.yo(r)) tr.className = "yo"; cols.forEach(c => { const td = el("td", [c.l ? "l" : "", c.x ? "x" : ""].filter(Boolean).join(" ") || null); const v = r[c.k]; if (c.render) c.render(td, v, r); else td.textContent = c.f ? c.f(v, r) : (v == null ? "—" : v); tr.append(td); }); tb.append(tr); });
  }
  draw();
}
