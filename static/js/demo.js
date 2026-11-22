// "Try it": attack the steering. Calls the Space's /attack endpoint: Mancelle-3B (control channel) vs
// Qwen2.5-3B-Instruct steered by the paper's Prompting baseline, both with the same kind of adversarial suffix.
import { Client } from "https://cdn.jsdelivr.net/npm/@gradio/client@2.7.2/dist/index.min.js";

const EXAMPLES = [
  { label: "Oil to gasoline · academic papers", instruction: "How is oil turned into gasoline?", concept: 3 },
  { label: "Interview tips · chemistry", instruction: "Give me three tips for a job interview.", concept: 10 },
  { label: "How a bill becomes law · C/C++ code", instruction: "Explain how a bill becomes a law.", concept: 2 },
];
const SOURCE = {
  paper: (a) => `found by the paper’s ${a} attacker against this model`,
  release_rerun_not_in_paper: (a) => `found by the ${a} attacker against this model (public-release rerun)`,
  custom: () => "your text, the same for both models",
  none: () => "no suffix",
};

const $ = (id) => document.getElementById(id);
const root = $("demo-app");
if (root) init();

async function init() {
  const ui = {
    instruction: $("demo-instruction"), chips: $("demo-examples"), concept: $("demo-concept"), modes: root.querySelectorAll("[data-attack]"),
    custom: $("demo-custom"), clean: $("demo-clean"), go: $("demo-go"), status: $("demo-status"),
  };
  const cards = { mancelle: card("mancelle"), qwen: card("qwen") };
  let data;
  try { data = await (await fetch("static/data/demo.json")).json(); }
  catch { return setStatus(ui, "The demo could not be loaded.", true); }
  for (const c of data.concepts.filter((c) => c.id < 50)) {
    const o = document.createElement("option");
    o.value = String(c.id); o.textContent = `${c.id + 1}. ${c.text}`; ui.concept.appendChild(o);
  }
  let mode = "rl";
  const setMode = (m) => {
    mode = m;
    ui.modes.forEach((b) => b.classList.toggle("is-active", b.dataset.attack === m));
    ui.custom.hidden = m !== "custom";
  };
  ui.modes.forEach((b) => b.addEventListener("click", () => setMode(b.dataset.attack)));
  for (const ex of EXAMPLES) {
    const chip = document.createElement("button");
    chip.type = "button"; chip.className = "demo-chip"; chip.textContent = ex.label;
    chip.addEventListener("click", () => { ui.instruction.value = ex.instruction; ui.concept.value = String(ex.concept); ui.instruction.focus(); });
    ui.chips.appendChild(chip);
  }

  // Start from a reply pair recorded on the live demo, so the section is not empty before the first request.
  const ex = data.example;
  ui.instruction.value = ex.args.instruction;
  ui.concept.value = String(ex.args.concept_id);
  setMode(ex.args.attack_mode);
  ui.custom.value = ex.args.custom_suffix;
  show(cards, ex.info, { mancelle: [ex.mancelle_attacked, ex.mancelle_clean], qwen: [ex.qwen_attacked, ex.qwen_clean] });
  setStatus(ui, `Example recorded from the live demo (${ex.recorded}). Press Generate to run your own.`);

  let client = null;
  ui.go.addEventListener("click", async () => {
    const instruction = ui.instruction.value.trim();
    const suffix = ui.custom.value.trim();
    if (!instruction) return setStatus(ui, "Type an instruction first.", true);
    if (mode === "custom" && !suffix) return setStatus(ui, "Type the suffix to append, or pick another attack.", true);
    const seed = 1 + Math.floor(Math.random() * 100000);
    busy(ui, cards, true);
    const t0 = performance.now();
    try {
      client ??= await Client.connect(data.space, { events: ["data", "status"] });
      const args = [instruction, Number(ui.concept.value), mode, suffix, seed, ui.clean.checked];
      for await (const msg of client.submit("/attack", args)) {
        if (msg.type === "status") {
          if (msg.stage === "error") throw new Error(msg.message || "The demo returned an error.");
          if (msg.stage === "pending") setStatus(ui, `Waiting for a GPU${msg.position > 0 ? ` (${msg.position} ahead of you)` : ""}…`);
          else if (msg.stage === "generating") setStatus(ui, "Generating…");
        } else if (msg.type === "data") {
          const [ma, qa, mc, qc, info] = msg.data;
          show(cards, JSON.parse(info), { mancelle: [ma, mc], qwen: [qa, qc] });
          setStatus(ui, `Done in ${((performance.now() - t0) / 1000).toFixed(0)} s · seed ${seed}. Replies are sampled, so each run differs.`);
        }
      }
    } catch (e) {
      client = null;
      for (const c of Object.values(cards)) c.reply.textContent = "";
      const msg = (e?.message || "Could not reach the demo.").trim();
      setStatus(ui, `${msg}${/[.!?]$/.test(msg) ? "" : "."} You can also try it on Hugging Face.`, true);
    } finally {
      busy(ui, cards, false);
    }
  });
}

function card(key) {
  const box = $(`demo-card-${key}`);
  return { box, suffix: box.querySelector(".demo-suffix"), suffixText: box.querySelector(".demo-suffix code"), source: box.querySelector(".demo-suffix-source"),
           reply: box.querySelector(".demo-reply"), cleanWrap: box.querySelector(".demo-clean"), clean: box.querySelector(".demo-clean .demo-reply-clean") };
}

function show(cards, info, replies) {
  const attack = info.attack_mode === "gepa" ? "GEPA" : "RL";
  for (const key of ["mancelle", "qwen"]) {
    const c = cards[key], d = info[key];
    c.suffix.hidden = !d.suffix;
    c.suffixText.textContent = d.suffix || "";
    c.source.textContent = (SOURCE[d.source_tag] || (() => d.source_tag))(attack);
    c.reply.textContent = replies[key][0];
    c.reply.classList.remove("is-loading");
    c.cleanWrap.hidden = !replies[key][1];
    c.clean.textContent = replies[key][1] || "";
  }
}

function busy(ui, cards, on) {
  ui.go.disabled = on;
  ui.go.classList.toggle("is-loading", on);
  if (on) {
    for (const c of Object.values(cards)) { c.reply.textContent = "Generating…"; c.reply.classList.add("is-loading"); c.cleanWrap.hidden = true; }
    setStatus(ui, "Connecting to the demo…");
  }
}

function setStatus(ui, text, isError = false) {
  ui.status.textContent = text;
  ui.status.classList.toggle("is-error", isError);
}
