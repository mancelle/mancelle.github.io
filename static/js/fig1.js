// Figure 1 walkthrough: steps light up one at a time with the paper's caption sentence for that step.
// Pretraining = the paper's Figure 1, steps (1)-(5); Steering = how the same channel is used at inference.
(function () {
  const tr = window.tr || ((s) => s);
  const fig = document.querySelector(".fig1[data-mode]");
  if (!fig) return;
  const CAPTION = {
    pretrain: [
      "Press ▶ to step through how Mancelle is trained, or switch to see how it is steered.",
      "Documents are tokenized and divided into segments.",
      "Segments are spliced to encourage reliance on conditioning signals over previous token context.",
      "SAE activations are extracted independently for each segment and max-pooled over token positions; filtering, clustering and selection produce a curated vocabulary of conditioning features.",
      "Selected active and inactive conditioning features are encoded as positive and negative tokens, respectively; unselected features are omitted.",
      "A dedicated encoder processes these feature tokens and sends them to a decoder through cross-attention. Training combines next-token prediction with an auxiliary objective for predicting the next segment’s features.",
      "Post-training for our models is supervised finetuning (SFT). Then, we generate 140M tokens of steered synthetic data based on SmolTalk to provide more diversity and examples of steering in a more natural, conversational context.",
    ],
    steer: [
      "At inference, we have the model self-condition so that it can autoregressively generate while still enabling this steering interface.",
      "At inference the model conditions on its own next-segment feature predictions.",
      "To steer, we move the conditioning toward a target concept, either as a vector in the feature space (Conditioning) or from a natural-language description of the concept (NL Steering).",
      "We evaluate robustness against an adversary who controls model inputs through optimized black-box prompts and white-box soft prompts.",
    ],
  };
  const pre = fig.querySelector(".fig1-pre"), steer = fig.querySelector(".fig1-steer");
  const capStep = fig.querySelector(".fig1-cap-step"), capText = fig.querySelector(".fig1-cap-text");
  const plays = fig.querySelectorAll(".fig1-play"), cap = fig.querySelector(".fig1-caption");
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let mode = "pretrain", step = 0, timer = null;
  const last = () => CAPTION[mode].length - 1;

  function render(scroll) {
    fig.dataset.mode = mode;
    fig.dataset.step = String(step);
    document.body.classList.toggle("fig1-walking", step > 0);  // hides the scroll-to-top button behind the pinned caption
    pre.hidden = mode !== "pretrain";
    steer.hidden = mode !== "steer";
    pre.querySelectorAll("[data-step]").forEach((el) => el.classList.toggle("is-active", step > 0 && el.dataset.step === String(step)));
    steer.querySelectorAll(".s-part").forEach((el) => el.classList.toggle("is-active", step > 0 && el.dataset.s === String(step)));
    fig.querySelectorAll("[data-mode]").forEach((b) => {
      if (b === fig) return;
      b.classList.toggle("is-active", b.dataset.mode === mode);
      b.setAttribute("aria-selected", b.dataset.mode === mode ? "true" : "false");
    });
    capStep.textContent = step ? `${step} / ${last()}` : "";
    capText.textContent = tr(CAPTION[mode][step]);
    // While walking, the caption is pinned to the bottom of the screen; keep the active card in the space above it.
    if (scroll && step) {
      const target = mode === "pretrain" ? pre.querySelector(`[data-step="${step}"]`) : steer;
      // the contents bar, when shown, covers the top of the screen
      const top = document.body.classList.contains("toc-shown") ? document.querySelector(".toc")?.offsetHeight || 0 : 0;
      const r = target.getBoundingClientRect(), room = window.innerHeight - cap.offsetHeight - 24;
      if (r.top < top || r.bottom > room) {
        const y = window.scrollY + r.top - (r.height > room - top ? top + 12 : room - r.height);
        window.scrollTo({ top: Math.max(0, y), behavior: reduce ? "auto" : "smooth" });
      }
    }
  }
  const label = (b, on) => (b.textContent = b.classList.contains("fig1-cap-btn") ? (on ? "❚❚" : "▶") : (on ? tr("❚❚ Pause") : tr("▶ Walk me through it")));
  function stop() { clearInterval(timer); timer = null; plays.forEach((b) => label(b, false)); }
  function go(k, scroll = true) { step = Math.max(0, Math.min(last(), k)); render(scroll); }

  fig.querySelectorAll(".fig1-prev").forEach((b) => b.addEventListener("click", () => { stop(); go(step - 1); }));
  fig.querySelectorAll(".fig1-next").forEach((b) => b.addEventListener("click", () => { stop(); go(step + 1); }));
  plays.forEach((p) => p.addEventListener("click", () => {
    if (timer) return stop();
    plays.forEach((b) => label(b, true));
    go(step >= last() ? 1 : step + 1);
    timer = setInterval(() => {
      if (step >= last()) { stop(); go(0, false); return; }
      go(step + 1);
    }, 4500);
  }));
  fig.querySelectorAll(".fig1-modes [data-mode]").forEach((b) => b.addEventListener("click", () => {
    stop(); mode = b.dataset.mode; step = 0; render(false);
  }));
  // Steering view: the strength slider recolors the steered signals and swaps in the real reply at that strength.
  const sva = fig.querySelector(".sv-a[data-src]");
  if (sva) {
    const slider = sva.querySelector(".sva-strength input"), val = sva.querySelector(".sva-strength b");
    const score = sva.querySelector(".sva-score"), cells = [...sva.querySelectorAll(".sva-txt.is-reply")];
    let steerData = null;
    const show = () => {
      const k = slider.value;
      sva.style.setProperty("--t", k / 6);
      val.textContent = k;
      const how = tr(k == 0 ? "the head’s prediction" : k == 6 ? "set by the target concept" : "prediction, moved toward the target");
      sva.querySelectorAll(".sva-sig.is-steered em").forEach((e) => (e.textContent = how));
      if (!steerData) return;
      steerData.parts[k].forEach((t, i) => (cells[i].textContent = t));
      const cs = steerData.concept_score?.[k];
      score.textContent = cs == null ? "" : tr("concept score {v} / 2", { v: cs.toFixed(2) });
    };
    slider.addEventListener("input", show);
    fetch(sva.dataset.src).then((r) => r.json()).then((d) => { steerData = d; show(); }).catch(() => {});
  }
  render(false);
})();
