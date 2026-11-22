// Robustness overviews redrawn for the site: per method, the concept score without the attack (hollow) and with it
// (filled), and the share kept. <div class="db" data-src="static/data/fig_blackbox.json"> with host tabs and attack toggle.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const OURS = "#2a78d6", BASE = "#6b7280";
  const el = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const txt = (parent, attrs, s) => { const t = el("text", attrs, parent); t.textContent = s; return t; };

  function init(root) {
    const svg = root.querySelector("svg");
    const tip = root.querySelector(".ifig-tip");
    let data, host = root.querySelector("[data-panel].is-active")?.dataset.panel, attack = root.querySelector("[data-attack-kind].is-active")?.dataset.attackKind;

    function showTip(evt, r) {
      tip.textContent = "";
      const add = (cls, t) => { const d = document.createElement("div"); d.className = cls; d.textContent = t; tip.appendChild(d); };
      add("ifig-tip-title", r.label);
      add("ifig-tip-row", `Concept ${r.before.toFixed(2)} → ${r.after.toFixed(2)}`);
      add("ifig-tip-row", `Kept ${r.kept.toFixed(0)}%${r.kept_lo != null ? ` [${r.kept_lo.toFixed(0)}, ${r.kept_hi.toFixed(0)}]` : ""}`);
      add("ifig-tip-sub", data.attacks[attack].label);
      const b = root.getBoundingClientRect(); tip.hidden = false;
      tip.style.left = Math.max(4, Math.min(evt.clientX - b.left + 14, b.width - tip.offsetWidth - 8)) + "px";
      tip.style.top = Math.max(evt.clientY - b.top - tip.offsetHeight - 12, 4) + "px";
    }

    function draw() {
      tip.hidden = true;
      svg.textContent = "";
      const rows = data.attacks[attack].panels[host];
      // Narrow screens: method names sit above their bar so the drawing keeps readable text sizes.
      const narrow = root.clientWidth > 0 && root.clientWidth < 560;
      const W = narrow ? 320 : 660, L = narrow ? 16 : 235, R = narrow ? 44 : 90, rowH = narrow ? 50 : 34, top = narrow ? 30 : 26;
      const X = (v) => L + (v / 2) * (W - L - R);
      const H = top + rows.length * rowH + 40;
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const yEnd = top + rows.length * rowH;
      for (const v of [0, 0.5, 1, 1.5, 2]) {
        el("line", { x1: X(v), x2: X(v), y1: top - 6, y2: yEnd, class: v === 0 ? "ifig-base" : "ifig-grid" }, svg);
        txt(svg, { x: X(v), y: yEnd + 16, class: "ifig-tick", "text-anchor": "middle" }, v.toFixed(1));
      }
      txt(svg, { x: (X(0) + X(2)) / 2, y: yEnd + 34, class: "ifig-axis", "text-anchor": "middle" }, "Concept score (mean over 50 concepts, 0–2)");
      // legend for the two dot styles
      const lx = narrow ? 6 : L + 6, lx2 = narrow ? 140 : L + 170;
      el("circle", { cx: lx, cy: 10, r: 5, fill: "#fff", stroke: "#52514e", "stroke-width": 1.5 }, svg);
      txt(svg, { x: lx + 10, y: 14, class: "ifig-tick" }, "without the attack");
      el("circle", { cx: lx2, cy: 10, r: 5, fill: "#52514e" }, svg);
      txt(svg, { x: lx2 + 10, y: 14, class: "ifig-tick" }, "with the attack");
      txt(svg, { x: W - 4, y: 14, class: "ifig-tick", "text-anchor": "end" }, "kept");
      rows.forEach((r, i) => {
        const cy = top + i * rowH + rowH / 2, color = r.ours ? OURS : BASE;
        const label = r.ours ? `Mancelle-3B · ${r.method}` : `${data.hosts[host]} · ${r.method}`;
        const g = el("g", { class: "ifig-point", tabindex: 0 }, svg);
        if (i > 0 && r.ours !== rows[i - 1].ours) el("line", { x1: 0, x2: W, y1: cy - rowH / 2, y2: cy - rowH / 2, class: "db-sep" }, svg);
        el("rect", { x: 0, y: cy - rowH / 2, width: W, height: rowH, fill: "transparent" }, g);
        const ly = narrow ? cy - 9 : cy + 4, by = narrow ? cy + 10 : cy;
        txt(g, { x: narrow ? 0 : L - 12, y: ly, class: "ifig-label" + (r.ours ? " is-ours" : ""), "text-anchor": narrow ? "start" : "end" }, label);
        el("line", { x1: X(r.before), x2: X(r.after), y1: by, y2: by, stroke: color, "stroke-width": 3, "stroke-opacity": 0.35, "stroke-linecap": "round" }, g);
        el("circle", { cx: X(r.before), cy: by, r: 6, fill: "#fff", stroke: color, "stroke-width": 2 }, g);
        el("circle", { cx: X(r.after), cy: by, r: 6, fill: color, stroke: "#fff", "stroke-width": 1.5 }, g);
        txt(g, { x: W - 4, y: by + 4, class: "db-kept" + (r.ours ? " is-ours" : ""), "text-anchor": "end" }, `${r.kept.toFixed(0)}%`);
        const rr = { ...r, label };
        g.addEventListener("pointermove", (e) => showTip(e, rr));
        g.addEventListener("pointerleave", () => (tip.hidden = true));
        g.addEventListener("focus", () => { const b = g.getBoundingClientRect(); showTip({ clientX: b.x + 200, clientY: b.y }, rr); });
        g.addEventListener("blur", () => (tip.hidden = true));
      });
    }

    const group = (sel, set) => root.querySelectorAll(sel).forEach((b) => b.addEventListener("click", () => {
      root.querySelectorAll(sel).forEach((u) => { u.classList.toggle("is-active", u === b); u.setAttribute("aria-selected", u === b ? "true" : "false"); });
      set(b); draw();
    }));
    group("[data-panel]", (b) => (host = b.dataset.panel));
    group("[data-attack-kind]", (b) => (attack = b.dataset.attackKind));
    let t = null;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => data && draw(), 200); });
    fetch(root.dataset.src).then((r) => r.json()).then((d) => { data = d; draw(); })
      .catch(() => { svg.replaceWith(document.createTextNode("The figure could not be loaded.")); });
  }
  document.querySelectorAll(".db[data-src]").forEach(init);
})();
