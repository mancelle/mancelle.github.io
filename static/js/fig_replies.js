// Reply explorer: drag steering strength (or attack step) and read two systems' actual replies with their judge scores.
// Markup: <div class="rx" data-src="static/data/....json" data-step-label="Steering strength"> (see index.html).
// Data: {meta, steps:[...], step_labels?:[...], systems:[{key,label,role}], items:[{concept, instruction, cells:[{<key>:{reply,concept,fluency,instruction,suffix?}}]}],
//        curves:{<key>:[{concept, fluency}]}}  (cells and curves are indexed like steps)
(function () {
  const tr = window.tr || ((s) => s);
  const NS = "http://www.w3.org/2000/svg";
  const COLORS = { ours: "#2a78d6", base: "#eb6834" };
  const el = (name, attrs, parent) => {
    const n = document.createElementNS(NS, name);
    for (const [k, v] of Object.entries(attrs || {})) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const h = (tag, cls, text, parent) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  };

  function meter(parent, label, v) {
    const m = h("div", "rx-meter", null, parent);
    h("span", "rx-meter-label", label, m);
    const track = h("span", "rx-meter-track", null, m);
    for (let i = 1; i <= 4; i++) h("span", "rx-meter-seg" + (v != null && v >= i / 2 - 1e-9 ? " is-on" : ""), null, track);
    h("span", "rx-meter-value", v == null ? "–" : v.toFixed(1), m);
    return m;
  }

  function init(root) {
    // Optional attack switch: data-alts='[{"label":"RL attacker","src":"...","step":"...","desc":"..."}, ...]' re-initializes on click.
    if (root._rxStop) root._rxStop();
    root.textContent = "";
    if (root.dataset.alts) {
      const alts = JSON.parse(root.dataset.alts);
      const sw = h("div", "rx-switch", null, root);
      for (const a of alts) {
        const b = h("button", a.src === root.dataset.src ? "is-active" : null, tr(a.label), sw);
        b.type = "button";
        b.addEventListener("click", () => {
          if (root.dataset.src === a.src) return;
          root.dataset.src = a.src; root.dataset.stepLabel = a.step; init(root);
        });
      }
      // what the selected attack does, right under the switch
      const cur = alts.find((a) => a.src === root.dataset.src);
      if (cur?.desc) h("p", "rx-desc", tr(cur.desc), root);
    }
    const src = root.dataset.src;
    const stepLabel = tr(root.dataset.stepLabel || "Strength");
    const head = h("div", "rx-head", null, root);
    const pick = h("div", "rx-pick", null, head);
    const conceptEl = h("div", "rx-concept", null, head);
    const instrEl = h("div", "rx-instruction", null, head);
    const ctl = h("div", "rx-control", null, root);
    const lab = h("label", "rx-step-label", null, ctl);
    lab.appendChild(document.createTextNode(stepLabel + " "));
    const stepOut = h("b", null, null, lab);
    const play = h("button", "rx-play", tr("▶ Play"), lab);
    play.type = "button";
    const slider = h("input", null, null, ctl);
    slider.type = "range"; slider.min = "0"; slider.step = "1";
    const ticks = h("div", "rx-ticks", null, ctl);
    const body = h("div", "rx-body", null, root);
    const cards = h("div", "rx-cards", null, body);
    const side = h("div", "rx-side", null, body);
    const mini = el("svg", { class: "rx-mini", viewBox: "0 0 260 190", role: "img" }, side);
    const legend = h("div", "rx-legend", null, side);
    const note = h("p", "rx-note", null, root);
    let data, item = 0;

    function color(sys) { return sys.role === "ours" ? COLORS.ours : COLORS.base; }

    function drawMini(idx) {
      mini.textContent = "";
      const W = 260, H = 190, M = { l: 30, r: 8, t: 10, b: 30 };
      const n = data.steps.length;
      const X = (i) => M.l + (i / (n - 1)) * (W - M.l - M.r), Y = (v) => H - M.b - (v / 2) * (H - M.t - M.b);
      for (const v of [0, 1, 2]) {
        el("line", { x1: X(0), x2: X(n - 1), y1: Y(v), y2: Y(v), class: "rx-grid" }, mini);
        el("text", { x: M.l - 6, y: Y(v) + 4, class: "rx-tick", "text-anchor": "end" }, mini).textContent = v;
      }
      el("line", { x1: X(idx), x2: X(idx), y1: Y(0), y2: Y(2), class: "rx-cursor" }, mini);
      for (const sys of data.systems) {
        const c = data.curves[sys.key];
        if (!c) continue;
        el("polyline", { points: c.map((p, i) => `${X(i)},${Y(p.concept)}`).join(" "), fill: "none", stroke: color(sys), "stroke-width": 2, "stroke-linejoin": "round" }, mini);
        el("polyline", { points: c.map((p, i) => `${X(i)},${Y(p.fluency)}`).join(" "), fill: "none", stroke: color(sys), "stroke-width": 1.5, "stroke-dasharray": "3 3", "stroke-opacity": 0.8 }, mini);
        el("circle", { cx: X(idx), cy: Y(c[idx].concept), r: 5, fill: color(sys), stroke: "#fff", "stroke-width": 2 }, mini);
      }
      el("text", { x: (X(0) + X(n - 1)) / 2, y: H - 6, class: "rx-axis", "text-anchor": "middle" }, mini).textContent = `${stepLabel} →`;
    }

    function render() {
      const idx = Number(slider.value);
      const it = data.items[item];
      conceptEl.textContent = it.concept;
      instrEl.textContent = it.instruction;
      stepOut.textContent = tr(String((data.step_labels || data.steps)[idx]));
      [...pick.children].forEach((b, i) => b.classList.toggle("is-active", i === item));
      cards.textContent = "";
      for (const sys of data.systems) {
        const cell = it.cells[idx]?.[sys.key];
        const card = h("div", "rx-card" + (sys.role === "ours" ? " is-ours" : ""), null, cards);
        card.style.setProperty("--rx-color", color(sys));
        const top = h("div", "rx-card-top", null, card);
        h("div", "rx-card-title", sys.label, top);
        const meters = h("div", "rx-meters", null, top);
        meter(meters, tr("Concept"), cell?.concept);
        meter(meters, tr("Fluency"), cell?.fluency);
        if (cell?.suffix) {
          const s = h("div", "rx-suffix", null, card);
          h("span", "rx-suffix-label", tr(data.suffix_label || "Attacker’s suffix") + (cell.suffix_tag ? ` · ${tr(cell.suffix_tag)}` : ""), s);
          h("span", "rx-suffix-text", cell.suffix, s);
        }
        if (cell?.cmean) h("div", "rx-cmean", tr("This concept, all 10 instructions: concept {c} · fluency {f}", { c: cell.cmean.concept.toFixed(1), f: cell.cmean.fluency.toFixed(1) }), top);
        h("div", "rx-reply-label", tr("Reply"), card);
        h("div", "rx-reply", cell ? cell.reply : tr("No reply saved for this setting."), card);
      }
      drawMini(idx);
    }

    fetch(src).then((r) => r.json()).then((d) => {
      data = d;
      slider.max = String(d.steps.length - 1);
      // Two positions read better as a toggle than as a slider.
      if (d.steps.length <= 2) {
        slider.hidden = true; ticks.hidden = true; play.hidden = true;
        const seg = h("div", "rx-toggle", null, ctl);
        (d.step_labels || d.steps).forEach((t, i) => {
          const b = h("button", null, tr(String(t)), seg);
          b.type = "button";
          b.addEventListener("click", () => { slider.value = String(i); [...seg.children].forEach((x, j) => x.classList.toggle("is-active", j === i)); render(); });
        });
        lab.hidden = true;
        setTimeout(() => [...seg.children].forEach((x, j) => x.classList.toggle("is-active", j === Number(slider.value))), 0);
      }
      slider.value = root.dataset.start === "max" ? slider.max : "0";
      const labels = d.step_labels || d.steps;
      labels.forEach((t, i) => { const s = h("span", null, tr(String(t)), ticks); s.style.left = `${(i / (labels.length - 1)) * 100}%`; });
      d.items.forEach((it, i) => {
        const b = h("button", "rx-chip", it.short || it.concept, pick);
        b.type = "button"; b.title = it.concept;
        b.addEventListener("click", () => { item = i; render(); });
      });
      for (const sys of d.systems) {
        const k = h("span", "rx-key", null, legend);
        k.style.setProperty("--rx-color", color(sys));
        h("i", null, null, k);
        k.appendChild(document.createTextNode(sys.label));
      }
      h("span", "rx-key-note", tr("solid: mean concept score · dashed: mean fluency"), legend);
      note.textContent = tr(d.meta.rule || "");
      render();
    }).catch(() => { root.textContent = tr("The examples could not be loaded."); });
    slider.addEventListener("input", render);
    let timer = null;
    const stop = () => { clearInterval(timer); timer = null; play.textContent = tr("▶ Play"); };
    root._rxStop = stop;
    play.addEventListener("click", () => {
      if (timer) return stop();
      slider.value = "0"; render(); play.textContent = tr("❚❚ Pause");
      timer = setInterval(() => {
        if (Number(slider.value) >= Number(slider.max)) return stop();
        slider.value = String(Number(slider.value) + 1); render();
      }, 1100);
    });
  }

  document.querySelectorAll(".rx[data-src]").forEach(init);
})();
