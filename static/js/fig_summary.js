// Summary scatter at the top of Results: per method, the AxBench score without the attack (x) against the concept score
// (y), hollow without the attack and filled under it. <div class="sm" data-src="static/data/fig_summary.json"> with
// attack and host tabs; method names are placed next to their points, nudged until they do not overlap.
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const BLUE = "#2a78d6", ORANGE = "#eb6834", AQUA = "#1baf7a", GRAY = "#8a8f98";
  const STYLE = {
    "Conditioning": { color: BLUE }, "NL Steering": { color: "#7fb0ea" },
    "DiffMean": { color: ORANGE }, "LinearProbe": { color: AQUA },
    "Prompting": { color: GRAY, shape: "diamond" }, "LoRA": { color: GRAY, shape: "square" },
    "Prompt SFT": { color: GRAY, shape: "triangle" }, "SteerLM SFT": { color: GRAY, shape: "cross" },
  };
  // both axes on the judge's full 0-2 scale, drawn with equal unit lengths
  const X0 = 0, X1 = 2, Y0 = 0, Y1 = 2;
  const el = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const txt = (parent, attrs, s) => { const t = el("text", attrs, parent); t.textContent = s; return t; };
  function marker(st, x, y, parent) {
    const fill = st.hollow ? "#fff" : st.color, s = 6;
    if (!st.shape) return el("circle", { cx: x, cy: y, r: 6.5, fill, stroke: st.hollow ? st.color : "#fff", "stroke-width": st.hollow ? 2.2 : 1.5 }, parent);
    const d = st.shape === "square" ? `M${x - s},${y - s}h${2 * s}v${2 * s}h${-2 * s}Z`
      : st.shape === "triangle" ? `M${x},${y - s - 1}L${x + s + 1},${y + s}L${x - s - 1},${y + s}Z`
      : st.shape === "cross" ? `M${x - s},${y - 2}h${s - 2}v${-(s - 2)}h4v${s - 2}h${s - 2}v4h${-(s - 2)}v${s - 2}h-4v${-(s - 2)}h${-(s - 2)}Z`
      : `M${x},${y - s - 1}L${x + s + 1},${y}L${x},${y + s + 1}L${x - s - 1},${y}Z`;
    return el("path", { d, fill, stroke: "#fff", "stroke-width": 1.5 }, parent);
  }
  const overlaps = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  function init(root) {
    const svg = root.querySelector("svg");
    const tip = root.querySelector(".ifig-tip");
    let data, host = root.querySelector("[data-panel].is-active")?.dataset.panel, attack = root.querySelector("[data-attack-kind].is-active")?.dataset.attackKind;

    function showTip(evt, p, label) {
      tip.textContent = "";
      const add = (cls, t) => { const d = document.createElement("div"); d.className = cls; d.textContent = t; tip.appendChild(d); };
      add("ifig-tip-title", label);
      add("ifig-tip-row", `AxBench score without the attack ${p.x.toFixed(2)}`);
      add("ifig-tip-row muted", `concept ${p.clean.concept.toFixed(2)} · instruction ${p.clean.instruction.toFixed(2)} · fluency ${p.clean.fluency.toFixed(2)}`);
      add("ifig-tip-row", `Concept ${p.before.toFixed(2)} → ${p.y.toFixed(2)} under the attack (kept ${p.kept.toFixed(0)}%)`);
      add("ifig-tip-sub", data.attacks[attack].label);
      const b = root.getBoundingClientRect(); tip.hidden = false;
      tip.style.left = Math.max(4, Math.min(evt.clientX - b.left + 14, b.width - tip.offsetWidth - 8)) + "px";
      tip.style.top = Math.max(evt.clientY - b.top - tip.offsetHeight - 12, 4) + "px";
    }

    function draw() {
      tip.hidden = true;
      svg.textContent = "";
      const pts = data.attacks[attack].panels[host];
      const narrow = root.clientWidth > 0 && root.clientWidth < 560;
      const W = narrow ? 340 : 540, L = narrow ? 40 : 52, R = narrow ? 10 : 24, T = 30, B = narrow ? 62 : 56, H = T + B + (W - L - R);
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      const X = (v) => L + ((v - X0) / (X1 - X0)) * (W - L - R), Y = (v) => T + (1 - (v - Y0) / (Y1 - Y0)) * (H - T - B);
      for (let v = X0; v <= X1 + 1e-9; v += 0.5) {
        el("line", { x1: X(v), x2: X(v), y1: Y(Y1), y2: Y(Y0), class: "ifig-grid" }, svg);
        txt(svg, { x: X(v), y: Y(Y0) + 16, class: "ifig-tick", "text-anchor": "middle" }, v.toFixed(1));
      }
      for (let v = Y0; v <= Y1 + 1e-9; v += 0.5) {
        el("line", { x1: X(X0), x2: X(X1), y1: Y(v), y2: Y(v), class: v === 0 ? "ifig-base" : "ifig-grid" }, svg);
        txt(svg, { x: X(X0) - 8, y: Y(v) + 4, class: "ifig-tick", "text-anchor": "end" }, v.toFixed(1));
      }
      txt(svg, { x: (X(X0) + X(X1)) / 2, y: H - B + 36, class: "ifig-axis", "text-anchor": "middle" }, "AxBench score without the attack →");
      txt(svg, { x: (X(X0) + X(X1)) / 2, y: H - B + 51, class: "ifig-tick", "text-anchor": "middle" }, "harmonic mean of concept, instruction and fluency");
      txt(svg, { x: 12, y: (Y(Y0) + Y(Y1)) / 2, class: "ifig-axis", "text-anchor": "middle", transform: `rotate(-90 12 ${(Y(Y0) + Y(Y1)) / 2})` }, "Concept score →");
      txt(svg, { x: X(X1) - 4, y: Y(Y1) + 14, class: "sm-better", "text-anchor": "end" }, "better ↗");
      // key for the two marks
      el("circle", { cx: L + 6, cy: 12, r: 5, fill: "#fff", stroke: "#52514e", "stroke-width": 1.5 }, svg);
      txt(svg, { x: L + 16, y: 16, class: "ifig-tick" }, "without the attack");
      el("circle", { cx: L + (narrow ? 132 : 146), cy: 12, r: 5, fill: "#52514e" }, svg);
      txt(svg, { x: L + (narrow ? 142 : 156), y: 16, class: "ifig-tick" }, "under the attack");

      // obstacles for label placement: every mark and drop line, plus the "better" note
      const boxes = [{ x: X(X1) - 60, y: Y(Y1), w: 60, h: 20 }];
      const pos = pts.map((p) => ({ p, st: STYLE[p.method] || { color: GRAY }, cx: X(p.x), cy: Y(p.y), by: Y(p.before) }));
      for (const q of pos) {
        boxes.push({ x: q.cx - 8, y: q.cy - 8, w: 16, h: 16 }, { x: q.cx - 6, y: q.by - 6, w: 12, h: 12 });
        boxes.push({ x: q.cx - 2, y: Math.min(q.cy, q.by), w: 4, h: Math.abs(q.cy - q.by) });
      }
      const layer = el("g", {}, svg), labels = el("g", {}, svg);
      for (const q of pos) {
        const { p, st, cx, cy, by } = q;
        const label = p.ours ? `Mancelle-3B · ${p.method}` : `${data.hosts[host]} · ${p.method}`;
        const g = el("g", { class: "ifig-point", tabindex: 0 }, layer);
        el("rect", { x: cx - 12, y: Math.min(cy, by) - 12, width: 24, height: Math.abs(cy - by) + 24, fill: "transparent" }, g);
        el("line", { x1: cx, x2: cx, y1: by, y2: cy, stroke: st.color, "stroke-width": 2, "stroke-opacity": 0.3 }, g);
        el("circle", { cx, cy: by, r: 4.5, fill: "#fff", stroke: st.color, "stroke-width": 1.5, "stroke-opacity": 0.8 }, g);
        marker(st, cx, cy, g);
        g.addEventListener("pointermove", (e) => showTip(e, p, label));
        g.addEventListener("pointerleave", () => (tip.hidden = true));
        g.addEventListener("focus", () => { const b = g.getBoundingClientRect(); showTip({ clientX: b.x + 20, clientY: b.y }, p, label); });
        g.addEventListener("blur", () => (tip.hidden = true));
      }
      // ours first, so their labels get the best spots
      for (const q of [...pos].sort((a, b) => b.p.ours - a.p.ours)) {
        const name = q.p.ours ? `Mancelle · ${q.p.method}` : q.p.method;
        const t = txt(labels, { class: "sm-label" + (q.p.ours ? " is-ours" : "") }, name);
        const w = t.getComputedTextLength(), h = 13;
        const cand = [[11, 4, "start"], [-11, 4, "end"], [11, -9, "start"], [11, 16, "start"], [-11, -9, "end"], [-11, 16, "end"], [0, -13, "middle"], [0, 22, "middle"], [11, -22, "start"], [11, 29, "start"]];
        // first in-bounds spot with no overlap; failing that, the in-bounds spot with the fewest
        let pick = null, best = null;
        for (const [dx, dy, anchor] of cand) {
          const x0 = anchor === "start" ? q.cx + dx : anchor === "end" ? q.cx + dx - w : q.cx - w / 2;
          const bb = { x: x0 - 2, y: q.cy + dy - h + 2, w: w + 4, h };
          if (bb.x < 0 || bb.x + bb.w > W || bb.y < T - 6 || bb.y + bb.h > Y(Y0)) continue;
          const n = boxes.filter((o) => overlaps(bb, o)).length;
          if (!best || n < best.n) best = { dx, dy, anchor, bb, n };
          if (n === 0) { pick = best; break; }
        }
        pick ??= best ?? { dx: 11, dy: 4, anchor: "start", bb: { x: q.cx + 9, y: q.cy - 9, w: w + 4, h } };
        t.setAttribute("x", q.cx + pick.dx); t.setAttribute("y", q.cy + pick.dy); t.setAttribute("text-anchor", pick.anchor);
        boxes.push(pick.bb);
      }
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
  document.querySelectorAll(".sm[data-src]").forEach(init);
})();
