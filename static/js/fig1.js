// Figure 1 walkthrough: steps light up one at a time with the paper's caption sentence for that step.
// Pretraining = the paper's Figure 1, steps (1)-(5); Steering = how the same channel is used at inference.
(function () {
  const fig = document.querySelector(".fig1[data-mode]");
  if (!fig) return;
  const CAPTION = {
    pretrain: [
      "We introduce conditional pretraining with a separate semantic control channel to build robustly controllable models.",
      "Documents are tokenized and divided into segments.",
      "Segments are spliced to encourage reliance on conditioning signals over previous token context.",
      "SAE activations are extracted independently for each segment and max-pooled over token positions; filtering, clustering and selection produce a curated vocabulary of conditioning features.",
      "Selected active and inactive conditioning features are encoded as positive and negative tokens, respectively; unselected features are omitted.",
      "A dedicated encoder processes these feature tokens and sends them to a decoder through cross-attention. Training combines next-token prediction with an auxiliary objective for predicting the next segment’s features.",
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
  const play = fig.querySelector(".fig1-play");
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let mode = "pretrain", step = 0, timer = null;
  const last = () => CAPTION[mode].length - 1;

  function render(scroll) {
    fig.dataset.mode = mode;
    fig.dataset.step = String(step);
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
    capText.textContent = CAPTION[mode][step];
    if (scroll && step) {
      const target = mode === "pretrain" ? pre.querySelector(`[data-step="${step}"]`) : steer;
      const r = target.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) target.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    }
  }
  function stop() { clearInterval(timer); timer = null; play.textContent = "▶ Walk me through it"; }
  function go(k, scroll = true) { step = Math.max(0, Math.min(last(), k)); render(scroll); }

  fig.querySelector(".fig1-prev").addEventListener("click", () => { stop(); go(step - 1); });
  fig.querySelector(".fig1-next").addEventListener("click", () => { stop(); go(step + 1); });
  play.addEventListener("click", () => {
    if (timer) return stop();
    play.textContent = "❚❚ Pause";
    go(step >= last() ? 1 : step + 1);
    timer = setInterval(() => {
      if (step >= last()) { stop(); go(0, false); return; }
      go(step + 1);
    }, 4500);
  });
  fig.querySelectorAll(".fig1-modes [data-mode]").forEach((b) => b.addEventListener("click", () => {
    stop(); mode = b.dataset.mode; step = 0; render(false);
  }));
  render(false);
})();
