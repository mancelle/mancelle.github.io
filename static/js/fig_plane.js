// Static overview charts redrawn from the paper data: concept score vs quality, one curve per method.
// <div class="pl" data-kind="clean|negative">: clean = paper Figure 2 (tabs: host of the baselines);
// negative = appendix negative steering, negated positive signal (tabs: comparison), each series from its unsteered point.
(function () {
  const tr = window.tr || ((s) => s);
  const NS = "http://www.w3.org/2000/svg";
  const BLUE = "#2a78d6", ORANGE = "#eb6834", AQUA = "#1baf7a", GRAY = "#8a8f98";
  const STYLE = {
    "Conditioning": { color: BLUE }, "NL Steering": { color: BLUE, dash: "6 4" }, "NL Steering (retrieval)": { color: BLUE, dash: "2 3" },
    "DiffMean": { color: ORANGE }, "LinearProbe": { color: AQUA },
    "Prompting": { color: GRAY, shape: "diamond" }, "LoRA": { color: GRAY, shape: "square" }, "Prompt SFT": { color: GRAY, shape: "triangle" },
    "SteerLM SFT": { color: GRAY, shape: "cross" }, "Suppression prompt": { color: GRAY, shape: "diamond" },
  };
  const el = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const fmt = (v) => (v == null ? "–" : v.toFixed(2));
  function shape(kind, x, y, parent, fill) {
    const s = 5.5;
    const d = kind === "square" ? `M${x - s},${y - s}h${2 * s}v${2 * s}h${-2 * s}Z`
      : kind === "triangle" ? `M${x},${y - s - 1}L${x + s + 1},${y + s}L${x - s - 1},${y + s}Z`
      : kind === "cross" ? `M${x - s},${y - 2}h${s - 2}v${-(s - 2)}h4v${s - 2}h${s - 2}v4h${-(s - 2)}v${s - 2}h-4v${-(s - 2)}h${-(s - 2)}Z`
      : `M${x},${y - s - 1}L${x + s + 1},${y}L${x},${y + s + 1}L${x - s - 1},${y}Z`;
    return el("path", { d, fill, stroke: "#fff", "stroke-width": 1.5 }, parent);
  }

  function init(root) {
    const kind = root.dataset.kind;
    const svg = root.querySelector("svg");
    const legend = root.querySelector(".pl-legend");
    const tip = root.querySelector(".ifig-tip");
    let data, panel = root.querySelector("[data-panel].is-active")?.dataset.panel;

    function showTip(evt, title, rows) {
      tip.textContent = "";
      const add = (cls, t) => { const d = document.createElement("div"); d.className = cls; d.textContent = t; tip.appendChild(d); };
      add("ifig-tip-title", title); rows.forEach(([c, t]) => add(c, t));
      const b = root.getBoundingClientRect(); tip.hidden = false;
      tip.style.left = Math.max(4, Math.min(evt.clientX - b.left + 14, b.width - tip.offsetWidth - 8)) + "px";
      tip.style.top = Math.max(evt.clientY - b.top - tip.offsetHeight - 12, 4) + "px";
    }
    const hide = () => (tip.hidden = true);

    // Normalize both datasets to [{label, model, points:[{x,y,strength,extra}], unsteered?}]
    function series() {
      if (kind === "clean") {
        const out = [];
        for (const k of ["Conditioning", "NL Steering"]) out.push({ label: k, model: "Mancelle-3B", points: data.mancelle[k] });
        for (const [k, v] of Object.entries(data.baselines[panel])) out.push({ label: k, model: data.panels[panel], points: v });
        return out.map((s) => ({ ...s, points: s.points.map((p) => ({ x: p.hm, y: p.concept, strength: p.factor, fl: p.fluency, ins: p.instruction })) }));
      }
      const P = data.panels.find((p) => p.key === panel);
      return P.series.map((s) => ({ label: s.method, model: s.model, unsteered: { x: s.unsteered.quality, y: s.unsteered.concept },
        points: s.points.map((p) => ({ x: p.quality, y: p.concept, strength: p.strength, fl: p.fluency, ins: p.instruction })) }));
    }

    function draw() {
      hide();
      svg.textContent = "";
      const narrow = root.clientWidth > 0 && root.clientWidth < 560;
      const W = narrow ? 360 : 620, H = narrow ? 320 : 400, M = { l: narrow ? 44 : 52, r: 12, t: 12, b: 46 };
      svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
      // Negative steering is zoomed to the fluent region; curves that collapse leave the frame.
      const R = kind === "negative" ? { x: [0.8, 2.0], y: [0.4, 1.3], dx: 0.2, dy: 0.1 } : { x: [0, 2], y: [0, 2], dx: 0.5, dy: 0.5 };
      const X = (v) => M.l + ((v - R.x[0]) / (R.x[1] - R.x[0])) * (W - M.l - M.r);
      const Y = (v) => H - M.b - ((v - R.y[0]) / (R.y[1] - R.y[0])) * (H - M.t - M.b);
      for (let v = R.y[0]; v <= R.y[1] + 1e-9; v += R.dy) {
        el("line", { x1: X(R.x[0]), x2: X(R.x[1]), y1: Y(v), y2: Y(v), class: "ifig-grid" }, svg);
        el("text", { x: M.l - 8, y: Y(v) + 4, class: "ifig-tick", "text-anchor": "end" }, svg).textContent = v.toFixed(1);
      }
      for (let v = R.x[0]; v <= R.x[1] + 1e-9; v += R.dx) {
        el("line", { x1: X(v), x2: X(v), y1: Y(R.y[0]), y2: Y(R.y[1]), class: "ifig-grid" }, svg);
        el("text", { x: X(v), y: H - M.b + 18, class: "ifig-tick", "text-anchor": "middle" }, svg).textContent = v.toFixed(1);
      }
      const clipId = `pl-clip-${kind}`;
      el("rect", { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b }, el("clipPath", { id: clipId }, el("defs", {}, svg)));
      const plot = el("g", { "clip-path": `url(#${clipId})` }, svg);
      el("text", { x: (X(R.x[0]) + X(R.x[1])) / 2, y: H - 8, class: "ifig-axis", "text-anchor": "middle" }, svg).textContent = tr(narrow ? "Quality →" : "Quality (harmonic mean of fluency and instruction relevance) →");
      const yl = tr(kind === "negative" ? "Concept score (lower = stronger suppression)" : "Concept score →");
      const ym = (Y(R.y[0]) + Y(R.y[1])) / 2;
      el("text", { x: 14, y: ym, class: "ifig-axis", "text-anchor": "middle", transform: `rotate(-90 14 ${ym})` }, svg).textContent = yl;

      const S = series().filter((s) => s.label !== "NL Steering (retrieval)");
      const ours = (s) => s.model.startsWith("Mancelle");
      // baselines first so our curves sit on top
      for (const s of [...S.filter((x) => !ours(x)), ...S.filter(ours)]) {
        const st = STYLE[s.label] || { color: GRAY };
        if (s.unsteered) {
          const u = el("circle", { cx: X(s.unsteered.x), cy: Y(s.unsteered.y), r: 5, fill: "#fff", stroke: ours(s) ? BLUE : "#52514e", "stroke-width": 1.5 }, plot);
          u.addEventListener("pointermove", (e) => showTip(e, `${s.model} · ${tr("unsteered")}`, [["ifig-tip-row", tr("Concept {c} · Quality {q}", { c: fmt(s.unsteered.y), q: fmt(s.unsteered.x) })]]));
          u.addEventListener("pointerleave", hide);
        }
        if (s.points.length > 1 || st.shape == null) {
          const pts = (s.unsteered ? [s.unsteered] : []).concat(s.points);
          el("polyline", { points: pts.map((p) => `${X(p.x)},${Y(p.y)}`).join(" "), fill: "none", stroke: st.color, "stroke-width": 2, "stroke-dasharray": st.dash, "stroke-linejoin": "round", "stroke-linecap": "round" }, plot);
        }
        s.points.forEach((p, i) => {
          const last = i === s.points.length - 1;
          const g = el("g", { class: "ifig-point", tabindex: 0 }, plot);
          el("circle", { cx: X(p.x), cy: Y(p.y), r: 10, fill: "transparent" }, g);
          if (st.shape && s.points.length === 1) shape(st.shape, X(p.x), Y(p.y), g, st.color);
          else el("circle", { cx: X(p.x), cy: Y(p.y), r: last ? 5 : 2.6, fill: st.color, stroke: "#fff", "stroke-width": last ? 2 : 1 }, g);
          const rows = [["ifig-tip-row", tr("Concept {c} · Quality {q}", { c: fmt(p.y), q: fmt(p.x) })], ["ifig-tip-row muted", tr("Fluency {f} · Instruction {i}", { f: fmt(p.fl), i: fmt(p.ins) })],
                        ["ifig-tip-sub", p.strength == null ? tr("single strength") : tr("strength {s}", { s: p.strength })]];
          g.addEventListener("pointermove", (e) => showTip(e, `${s.model} · ${s.label}`, rows));
          g.addEventListener("pointerleave", hide);
          g.addEventListener("focus", () => { const b = g.getBoundingClientRect(); showTip({ clientX: b.x + b.width / 2, clientY: b.y }, `${s.model} · ${s.label}`, rows); });
          g.addEventListener("blur", hide);
        });
      }
      // legend
      legend.textContent = "";
      const seen = new Set();
      for (const s of S) {
        const key = `${ours(s) ? "Mancelle" : s.model}|${s.label}`;
        if (seen.has(key)) continue; seen.add(key);
        const st = STYLE[s.label] || { color: GRAY };
        const item = document.createElement("span"); item.className = "pl-key";
        const k = el("svg", { width: 24, height: 12, "aria-hidden": "true" }, item);
        if (st.shape && s.points.length === 1) shape(st.shape, 12, 6, k, st.color);
        else { el("line", { x1: 1, x2: 23, y1: 6, y2: 6, stroke: st.color, "stroke-width": 2, "stroke-dasharray": st.dash }, k); el("circle", { cx: 12, cy: 6, r: 3.5, fill: st.color }, k); }
        item.appendChild(document.createTextNode(`${ours(s) ? s.model.replace("Mancelle-", "Mancelle-") : s.model.split(" ")[0]} · ${s.label}`));
        legend.appendChild(item);
      }
      if (kind === "negative") { const u = document.createElement("span"); u.className = "pl-key pl-key-note"; u.textContent = "○ unsteered (curves start there) · zoomed to quality ≥ 0.8; curves that leave the frame continue to lower quality"; legend.appendChild(u); }
    }

    root.querySelectorAll("[data-panel]").forEach((t) => t.addEventListener("click", () => {
      root.querySelectorAll("[data-panel]").forEach((u) => { u.classList.toggle("is-active", u === t); u.setAttribute("aria-selected", u === t ? "true" : "false"); });
      panel = t.dataset.panel; draw();
    }));
    let t = null;
    window.addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => data && draw(), 200); });
    fetch(kind === "clean" ? "static/data/fig_clean.json" : "static/data/fig_negative.json").then((r) => r.json())
      .then((d) => { data = d; draw(); }).catch(() => { svg.replaceWith(document.createTextNode(tr("The figure could not be loaded."))); });
  }
  document.querySelectorAll(".pl[data-kind]").forEach(init);
})();
