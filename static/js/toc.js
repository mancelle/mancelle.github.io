// Contents bar: slides in once the reader has scrolled past the problem / approach / result strip, and highlights
// the section in view.
(function () {
  const nav = document.querySelector(".toc");
  if (!nav) return;
  const links = [...nav.querySelectorAll("a[href^='#']")];
  const targets = links.map((a) => document.getElementById(a.getAttribute("href").slice(1)));
  const gist = document.querySelector(".gist");
  let active = null;
  function update() {
    const show = gist ? gist.getBoundingClientRect().bottom < 0 : window.scrollY > 400;
    nav.classList.toggle("is-shown", show);
    document.body.classList.toggle("toc-shown", show);
    const y = nav.offsetHeight + 24;
    let cur = 0;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top <= y) cur = i; });
    if (cur === active) return;
    active = cur;
    links.forEach((a, i) => a.classList.toggle("is-active", i === cur));
    // keep the active link visible when the bar scrolls sideways on phones
    const a = links[cur];
    nav.scrollLeft = a.offsetLeft - (nav.clientWidth - a.offsetWidth) / 2;
  }
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
  update();
})();
