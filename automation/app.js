(() => {
  "use strict";

  const QS = window.QUESTIONS;
  const TOPICS = window.TOPICS;
  const byId = Object.fromEntries(QS.map(q => [q.id, q]));
  const topicByKey = Object.fromEntries(TOPICS.map(t => [t.key, t]));
  const STORE = "autoexam-v1";
  const LETTERS = "ABCD";
  const $ = sel => document.querySelector(sel);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // Notes section titles, used for "Review" links.
  const noteTitle = id => document.getElementById(id)?.querySelector("h3")?.textContent || "Study notes";

  /* ───────────── storage ───────────── */
  const load = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };

  /* ───────────── theme ───────────── */
  const setTheme = t => { if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme; };
  setTheme(load("autoexam-theme", null));
  $("#theme-btn").addEventListener("click", () => {
    const cur = document.documentElement.dataset.theme
      || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = cur === "dark" ? "light" : "dark";
    setTheme(next); save("autoexam-theme", next);
  });

  /* ───────────── math ───────────── */
  const typeset = el => {
    if (window.renderMathInElement) {
      renderMathInElement(el, { delimiters: [{ left: "$$", right: "$$", display: true }, { left: "\\(", right: "\\)", display: false }], throwOnError: false });
    } else {
      // KaTeX is loaded with defer; retry once it arrives.
      setTimeout(() => typeset(el), 120);
    }
  };

  /* ───────────── exam state ───────────── */
  // state = { ids:[qid], perms:{qid:[origIndex…]}, idx, answers:{qid: origIndexChosen}, done, label }
  let state = load(STORE, null);
  if (state && !(Array.isArray(state.ids) && state.ids.every(id => byId[id]))) state = null;
  const persist = () => save(STORE, state);

  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  function newExam(ids, shuffleQs, label) {
    const list = shuffleQs ? shuffle(ids) : ids.slice();
    state = {
      ids: list,
      perms: Object.fromEntries(list.map(id => [id, shuffle(byId[id].opts.map((_, i) => i))])),
      idx: 0, answers: {}, done: false, label,
    };
    persist();
  }

  const answeredCount = () => Object.keys(state.answers).length;
  const correctCount = () => Object.entries(state.answers).filter(([, a]) => a === 0).length;

  /* ───────────── rendering: exam ───────────── */
  const root = $("#exam-root");
  let slideDir = "next";

  function renderStart() {
    const counts = Object.fromEntries(TOPICS.map(t => [t.key, 0]));
    QS.forEach(q => counts[q.topic]++);
    const resume = state && !state.done && answeredCount() > 0;
    const last = load("autoexam-last", null);
    root.innerHTML = `
      <section class="hero">
        <span class="pill">Part 1 · Practice exam</span>
        <h1>Automation Technology 1 — Final practice exam</h1>
        <p>${QS.length} multiple-choice questions built from the Week 11–16 lecture slides: robot inverse kinematics, sensors and smart sensors, interface systems, Node-RED, FX5U SLMP and Modbus TCP.</p>
      </section>
      <ul class="how">
        <li><b>One question per slide</b>Pick an answer — the correct answer and explanation appear right away.</li>
        <li><b>Review the concept</b>Each question links to the matching section in Part 2 and brings you back.</li>
        <li><b>Evaluation at the end</b>A topic-by-topic breakdown of what to fix before the exam.</li>
      </ul>
      <div class="row">
        ${resume ? `<button class="btn primary" id="resume">Resume — question ${state.idx + 1} of ${state.ids.length}</button>` : ""}
        <button class="btn ${resume ? "" : "primary"}" id="start">Start ${resume ? "over" : "the exam"} (${QS.length} questions)</button>
        <label class="check"><input type="checkbox" id="shuf" ${load("autoexam-shuffle", true) ? "checked" : ""}> Shuffle question order</label>
      </div>
      ${last ? `<p class="sec-sub" style="margin-top:14px">Last result: <b>${last.score}/${last.total}</b> (${Math.round(100 * last.score / last.total)}%) · ${esc(last.when)}</p>` : ""}
      <h2 class="sec">Topics covered</h2>
      <div class="topic-grid">
        ${TOPICS.map(t => `<div><span><span class="pill wk">${t.week}</span> ${esc(t.name)}</span><span>${counts[t.key]} Q</span></div>`).join("")}
      </div>`;
    $("#shuf").addEventListener("change", e => save("autoexam-shuffle", e.target.checked));
    $("#start").addEventListener("click", () => {
      newExam(QS.map(q => q.id), $("#shuf").checked, "Full exam");
      slideDir = "next"; render();
    });
    $("#resume")?.addEventListener("click", () => { slideDir = "next"; render(); });
  }

  function renderQuestion() {
    const id = state.ids[state.idx];
    const q = byId[id];
    const perm = state.perms[id];
    const chosen = state.answers[id];
    const answered = chosen !== undefined;
    const total = state.ids.length;
    const isLast = state.idx === total - 1;
    const t = topicByKey[q.topic];

    root.innerHTML = `
      <div class="qhead">
        <span class="qcount">Question ${state.idx + 1} / ${total}</span>
        <span class="pill wk">${t.week}</span><span class="pill">${esc(t.name)}</span>
        <span class="score">✓ ${correctCount()} of ${answeredCount()} answered</span>
      </div>
      <div class="bar" aria-hidden="true"><i style="width:${(100 * (state.idx + (answered ? 1 : 0)) / total).toFixed(1)}%"></i></div>
      <article class="slide in-${slideDir}" aria-live="polite">
        <p class="qtext">${q.q}</p>
        ${q.img ? `<img class="qimg" src="${q.img}" alt="Lecture slide for this question" data-zoom>` : ""}
        <ul class="opts" role="list">
          ${perm.map((orig, pos) => {
            let cls = "opt";
            if (answered) {
              if (orig === 0) cls += " correct";
              else if (orig === chosen) cls += " wrong";
              else cls += " dim";
            }
            return `<li><button class="${cls}" data-orig="${orig}" ${answered ? "disabled" : ""}>
              <span class="k">${LETTERS[pos]}</span><span class="t">${q.opts[orig]}</span></button></li>`;
          }).join("")}
        </ul>
        ${answered ? feedbackHTML(q, chosen, perm) : ""}
      </article>
      <div class="nav">
        <button class="btn" id="prev" ${state.idx === 0 ? "disabled" : ""}>← Previous</button>
        <button class="btn" id="quit" title="Back to start screen (progress is saved)">Exit</button>
        <button class="btn primary" id="next" ${answered ? "" : "disabled"}>${isLast ? "See my evaluation →" : "Next →"}</button>
      </div>
      <p class="hint"><kbd>A</kbd>–<kbd>D</kbd> answer · <kbd>Enter</kbd> / <kbd>→</kbd> next · <kbd>←</kbd> previous</p>`;

    typeset(root);
    root.querySelectorAll(".opt").forEach(b => b.addEventListener("click", () => choose(+b.dataset.orig)));
    $("#prev").addEventListener("click", prev);
    $("#next").addEventListener("click", next);
    $("#quit").addEventListener("click", () => { persist(); renderStart(); window.scrollTo({ top: 0 }); });
    root.querySelector(".review")?.addEventListener("click", () => { returnTo = { idx: state.idx }; });
  }

  function feedbackHTML(q, chosen, perm) {
    const ok = chosen === 0;
    const correctLetter = LETTERS[perm.indexOf(0)];
    return `<div class="feedback ${ok ? "" : "bad"}">
      <h3>${ok ? "✓ Correct" : `✗ Not quite — the answer is ${correctLetter}`}</h3>
      <p>${q.ex}</p>
      <a class="review" href="#notes/${q.ref}">📖 Review: ${esc(noteTitle(q.ref))} →</a>
    </div>`;
  }

  function choose(orig) {
    const id = state.ids[state.idx];
    if (state.answers[id] !== undefined) return;
    state.answers[id] = orig;
    persist();
    slideDir = "none";
    renderQuestion();
    root.querySelector(".feedback")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    $("#next")?.focus({ preventScroll: true });
  }

  function next() {
    const id = state.ids[state.idx];
    if (state.answers[id] === undefined) return;
    if (state.idx === state.ids.length - 1) {
      state.done = true; persist();
      save("autoexam-last", { score: correctCount(), total: state.ids.length, when: new Date().toLocaleString() });
      window.scrollTo({ top: 0 });
      renderResults();
      return;
    }
    state.idx++; persist(); slideDir = "next"; renderQuestion(); window.scrollTo({ top: 0 });
  }
  function prev() {
    if (state.idx === 0) return;
    state.idx--; persist(); slideDir = "prev"; renderQuestion(); window.scrollTo({ top: 0 });
  }

  /* ───────────── rendering: evaluation ───────────── */
  function renderResults() {
    const total = state.ids.length;
    const score = correctCount();
    const pct = Math.round((100 * score) / total);

    // per-topic stats (only topics that appeared in this attempt)
    const stats = TOPICS.map(t => {
      const qs = state.ids.filter(id => byId[id].topic === t.key);
      const right = qs.filter(id => state.answers[id] === 0).length;
      const missed = qs.filter(id => state.answers[id] !== 0).map(id => byId[id]);
      return { t, n: qs.length, right, pct: qs.length ? Math.round((100 * right) / qs.length) : null, missed };
    }).filter(s => s.n > 0);

    const level = p => (p < 60 ? "fix" : p < 80 ? "review" : "ready");
    const levelLabel = { fix: "Fix first", review: "Review", ready: "Ready" };
    const color = p => (p < 60 ? "var(--bad)" : p < 80 ? "var(--warn)" : "var(--good)");
    const weak = stats.filter(s => s.pct < 80).sort((a, b) => a.pct - b.pct || b.n - a.n);
    const missedAll = state.ids.filter(id => state.answers[id] !== 0).map(id => byId[id]);

    const verdict =
      pct >= 85 ? "Exam-ready. Skim the notes for the few you missed." :
      pct >= 70 ? "Solid base — close the gaps below before the exam." :
      pct >= 50 ? "Getting there — work through the priority list below." :
                  "Start with the “Fix first” topics and re-read those notes.";

    root.innerHTML = `
      <div class="result-top">
        <div class="ring" style="--p:${pct}; --ring-c:${color(pct)}"><div><b>${pct}%</b><span>${score} / ${total}</span></div></div>
        <div>
          <span class="pill">Evaluation · ${esc(state.label || "Exam")}</span>
          <h1>${verdict}</h1>
          <p>Topics under 60% are marked <b>Fix first</b>, and 60–79% are <b>Review</b>. The concepts you missed link straight to the notes.</p>
        </div>
      </div>

      <h2 class="sec">What to fix before the exam</h2>
      <p class="sec-sub">Ordered by priority — weakest topic first.</p>
      ${weak.length ? `<div class="fix">${weak.map((s, i) => `
        <div class="fix-item lvl-${level(s.pct)}">
          <header>
            <h3>${i + 1}. ${esc(s.t.name)}</h3>
            <span class="badge ${level(s.pct)}">${levelLabel[level(s.pct)]}</span>
            <span class="frac">${s.right}/${s.n} correct · ${s.pct}%</span>
          </header>
          <ul>${uniqueBy(s.missed, q => q.concept).map(q =>
            `<li>${esc(q.concept)} — <a href="#notes/${q.ref}" data-back="results">${esc(noteTitle(q.ref))}</a></li>`).join("")}</ul>
        </div>`).join("")}</div>`
      : `<div class="empty-good">🎉 Every topic is at 80% or above. Retry any misses below and you're set.</div>`}

      <h2 class="sec">Score by topic</h2>
      <div class="tbl-wrap"><table>
        <thead><tr><th>Topic</th><th>Week</th><th>Score</th><th></th><th>Status</th></tr></thead>
        <tbody>${stats.map(s => `
          <tr>
            <td>${esc(s.t.name)}</td><td>${s.t.week}</td>
            <td class="num">${s.right}/${s.n}</td>
            <td><div class="mini"><i style="width:${s.pct}%; background:${color(s.pct)}"></i></div></td>
            <td><span class="badge ${level(s.pct)}">${levelLabel[level(s.pct)]}</span></td>
          </tr>`).join("")}</tbody>
      </table></div>

      ${missedAll.length ? `
      <h2 class="sec">Questions you missed (${missedAll.length})</h2>
      <p class="sec-sub">Open one to see your answer, the correct answer and why.</p>
      ${missedAll.map(q => `
        <details class="miss">
          <summary><span>${q.q}</span></summary>
          <div class="body">
            <div class="yours">✗ Your answer: ${q.opts[state.answers[q.id]]}</div>
            <div class="right">✓ Correct: ${q.opts[0]}</div>
            <div>${q.ex}</div>
            <a href="#notes/${q.ref}" data-back="results">📖 Review: ${esc(noteTitle(q.ref))} →</a>
          </div>
        </details>`).join("")}` : ""}

      <div class="row" style="margin-top:28px">
        ${missedAll.length ? `<button class="btn primary" id="retry">Retry the ${missedAll.length} missed question${missedAll.length > 1 ? "s" : ""}</button>` : ""}
        <button class="btn" id="again">Restart full exam</button>
        <a class="btn" href="#notes">Open study notes</a>
      </div>`;

    typeset(root);
    root.querySelectorAll("[data-back='results']").forEach(a => a.addEventListener("click", () => { returnTo = { results: true }; }));
    $("#retry")?.addEventListener("click", () => {
      newExam(missedAll.map(q => q.id), true, "Retry missed");
      slideDir = "next"; render(); window.scrollTo({ top: 0 });
    });
    $("#again").addEventListener("click", () => {
      newExam(QS.map(q => q.id), load("autoexam-shuffle", true), "Full exam");
      slideDir = "next"; render(); window.scrollTo({ top: 0 });
    });
  }

  const uniqueBy = (arr, key) => { const seen = new Set(); return arr.filter(x => !seen.has(key(x)) && seen.add(key(x))); };

  function render() {
    if (!state) return renderStart();
    if (state.done) return renderResults();
    return renderQuestion();
  }

  /* ───────────── keyboard (exam) ───────────── */
  document.addEventListener("keydown", e => {
    if ($("#view-exam").hidden || !state || state.done || !root.querySelector(".slide")) return;
    if (e.ctrlKey || e.metaKey || e.altKey || e.target.matches("input, textarea, select")) return;
    const k = e.key.toLowerCase();
    const letter = "abcd".indexOf(k), digit = "1234".indexOf(k);
    const pos = letter >= 0 ? letter : digit;
    if (pos >= 0) {
      const btn = root.querySelectorAll(".opt")[pos];
      if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
    } else if (k === "enter" || k === "arrowright") {
      if (e.target.matches("a, button:not(#next)") && k === "enter") return;
      e.preventDefault(); next();
    } else if (k === "arrowleft") {
      e.preventDefault(); prev();
    }
  });

  /* ───────────── image zoom ───────────── */
  const zoom = $("#zoom");
  document.addEventListener("click", e => {
    const img = e.target.closest("[data-zoom], .fig img");
    if (img) { zoom.querySelector("img").src = img.currentSrc || img.src; zoom.showModal(); }
  });
  zoom.addEventListener("click", () => zoom.close());

  /* ───────────── routing ───────────── */
  let returnTo = null; // { idx } or { results: true } when user jumps from exam to notes
  const backBtn = $("#back-to-q");
  let notesTyped = false;

  backBtn.addEventListener("click", () => {
    if (returnTo && state && returnTo.idx !== undefined && !state.done) state.idx = returnTo.idx;
    slideDir = "none";
    location.hash = "#exam";
  });

  function route() {
    const hash = location.hash || "#exam";
    const [view, sub] = hash.slice(1).split("/");
    const isNotes = view === "notes";

    $("#view-exam").hidden = isNotes;
    $("#view-notes").hidden = !isNotes;
    document.querySelectorAll(".tabs a").forEach(a => a.setAttribute("aria-current", a.dataset.tab === (isNotes ? "notes" : "exam") ? "page" : "false"));

    if (isNotes) {
      if (!notesTyped) { typeset($("#notes-root")); notesTyped = true; }
      if (returnTo) {
        backBtn.textContent = returnTo.results ? "← Back to my evaluation" : `← Back to question ${returnTo.idx + 1}`;
        backBtn.hidden = false;
      }
      const target = sub && document.getElementById(sub);
      requestAnimationFrame(() => {
        if (target) target.scrollIntoView({ block: "start" });
        else window.scrollTo({ top: 0 });
      });
      $("#toc").classList.remove("open");
      $("#toc-toggle").setAttribute("aria-expanded", "false");
      document.title = sub && target ? `${noteTitle(sub)} · Study Notes` : "Study Notes · Automation Tech 1";
    } else {
      backBtn.hidden = true;
      returnTo = null;
      document.title = "Practice Exam · Automation Tech 1";
      render();
      if (slideDir === "none") slideDir = "next";
    }
  }
  window.addEventListener("hashchange", route);

  /* ───────────── notes: TOC highlight + mobile toggle ───────────── */
  $("#toc-toggle").addEventListener("click", () => {
    const open = $("#toc").classList.toggle("open");
    $("#toc-toggle").setAttribute("aria-expanded", String(open));
  });
  const tocLinks = [...document.querySelectorAll(".toc a")];
  const spy = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      tocLinks.forEach(a => a.classList.toggle("on", a.getAttribute("href") === `#notes/${en.target.id}`));
    });
  }, { rootMargin: "-20% 0px -70% 0px" });
  document.querySelectorAll(".note").forEach(n => spy.observe(n));

  route();
})();
