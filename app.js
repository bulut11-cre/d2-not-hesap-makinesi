// ---------------- Weights ----------------
const WEIGHTS = {
  k1: 11,
  k2: 12,
  k3: 11,
  k4: 12,
  k5: 10,
  bil: 2,
  ihu: 2,
  final: 40
};
const YEAR_IN_TOTAL = 60; // 11+12+11+12+10+2+2

// Rounding thresholds requested
const PASS_TARGET_RAW = 59.51;   // year-end raw >= 59.51 counts as "round to 60" pass
const PASS_ROUND_TO = 60;

const FINALSIZ_TARGET_RAW = 79.51; // year-in normalized >= 79.51 counts as "round to 80" finalsiz
const FINALSIZ_ROUND_TO = 80;

// ---------------- Helpers ----------------
function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
function fmt(n, d = 2) { return Number.isFinite(n) ? n.toFixed(d) : "—"; }

function getInputs(prefix) {
  return {
    k1: document.getElementById(`${prefix}_k1`),
    k2: document.getElementById(`${prefix}_k2`),
    k3: document.getElementById(`${prefix}_k3`),
    k4: document.getElementById(`${prefix}_k4`),
    k5: document.getElementById(`${prefix}_k5`),
    bil: document.getElementById(`${prefix}_bil`),
    ihu: document.getElementById(`${prefix}_ihu`),
    final: document.getElementById(`${prefix}_final`) // may be null
  };
}

function readScore(inputEl) {
  if (!inputEl) return NaN;
  const n = toNum(inputEl.value);
  if (!Number.isFinite(n)) return NaN;
  return clamp(n, 0, 100);
}

function weightedYearIn60(scores) {
  // returns value in 0..60
  const sum =
    (WEIGHTS.k1 * scores.k1) +
    (WEIGHTS.k2 * scores.k2) +
    (WEIGHTS.k3 * scores.k3) +
    (WEIGHTS.k4 * scores.k4) +
    (WEIGHTS.k5 * scores.k5) +
    (WEIGHTS.bil * scores.bil) +
    (WEIGHTS.ihu * scores.ihu);

  return sum / 100; // 0..60
}

function normalizeYearIn100(yearIn60) {
  return (yearIn60 / YEAR_IN_TOTAL) * 100; // 0..100
}

function yearEnd100(yearIn60, finalScore) {
  // total = yi60 + (final*40/100)
  return yearIn60 + (WEIGHTS.final * finalScore) / 100; // 0..100
}

function letterAndGpa(score100) {
  if (score100 >= 90) return { letter: "AA", gpa: 4.0 };
  if (score100 >= 85) return { letter: "BA", gpa: 3.5 };
  if (score100 >= 80) return { letter: "BB", gpa: 3.0 };
  if (score100 >= 70) return { letter: "CB", gpa: 2.5 };
  if (score100 >= 60) return { letter: "CC", gpa: 2.0 };
  if (score100 >= 55) return { letter: "DC", gpa: 1.5 };
  if (score100 >= 50) return { letter: "DD", gpa: 1.0 };
  return { letter: "FF", gpa: 0.0 };
}

function show(el, html) {
  el.classList.remove("hidden");
  el.innerHTML = html;
}
function hide(el) {
  el.classList.add("hidden");
  el.innerHTML = "";
}

function resetInputs(prefix, includeFinal = false) {
  const ids = ["k1","k2","k3","k4","k5","bil","ihu"];
  for (const id of ids) {
    const el = document.getElementById(`${prefix}_${id}`);
    if (el) el.value = "";
  }
  if (includeFinal) {
    const f = document.getElementById(`${prefix}_final`);
    if (f) f.value = "";
  }
}

function hasAnyZero(scoresNoFinal) {
  return Object.values(scoresNoFinal).some(v => v === 0);
}

// ---------------- Navigation ----------------
const views = ["view-menu","view-calc1","view-calc2","view-calc3"];

function openView(id) {
  for (const v of views) {
    const el = document.getElementById(v);
    el.classList.toggle("active", v === id);
  }
  const hashMap = {
    "view-menu": "#",
    "view-calc1": "#calc1",
    "view-calc2": "#calc2",
    "view-calc3": "#calc3"
  };
  history.replaceState(null, "", hashMap[id] ?? "#");
}

document.querySelectorAll("[data-go]").forEach(btn => {
  btn.addEventListener("click", () => openView(btn.getAttribute("data-go")));
});
document.querySelectorAll("[data-back]").forEach(btn => {
  btn.addEventListener("click", () => openView("view-menu"));
});

function openFromHash() {
  const h = (location.hash || "#").toLowerCase();
  if (h === "#calc1") return openView("view-calc1");
  if (h === "#calc2") return openView("view-calc2");
  if (h === "#calc3") return openView("view-calc3");
  return openView("view-menu");
}
window.addEventListener("hashchange", openFromHash);
openFromHash();

// ---------------- Calc 1 ----------------
const out1 = document.getElementById("out1");
document.getElementById("btn_calc1").addEventListener("click", () => {
  const in1 = getInputs("c1");

  const scores = {
    k1: readScore(in1.k1),
    k2: readScore(in1.k2),
    k3: readScore(in1.k3),
    k4: readScore(in1.k4),
    k5: readScore(in1.k5),
    bil: readScore(in1.bil),
    ihu: readScore(in1.ihu),
    final: readScore(in1.final)
  };

  const fieldsOk = Object.values(scores).every(v => Number.isFinite(v));
  if (!fieldsOk) {
    return show(out1, `<span class="badge warn">Uyarı</span> Lütfen tüm alanlara 0–100 arası sayı gir.`);
  }

  const yi60 = weightedYearIn60(scores);
  const ysRaw = yearEnd100(yi60, scores.final);

  // rounding rule for pass
  const roundedTo60 = (ysRaw >= PASS_TARGET_RAW && ysRaw < PASS_ROUND_TO);
  const ysForRules = roundedTo60 ? PASS_ROUND_TO : ysRaw;
  const ysForDisplay = ysForRules;

  // pass/fail rules
  let badge = "";
  let sideText = "";

  if (scores.final < 50) {
    badge = `<span class="badge bad">KALDI</span>`;
    sideText = `Final notu 50'nin altında.`;
  } else if (ysForRules < 60) {
    badge = `<span class="badge bad">KALDI</span>`;
    sideText = `Yıl sonu notu 60'ın altında.`;
  } else {
    badge = `<span class="badge good">GEÇTİ</span>`;
    // only show extra message when rounded
    sideText = roundedTo60 ? `Yıl sonu notu 60’a yuvarlandı.` : ``;
  }

  const lg = letterAndGpa(ysForDisplay);

  const html = `
    ${badge}${sideText ? `<span class="inline-note">${sideText}</span>` : ``}
    <hr class="sep" />
    <div class="kv">
      <div class="kv-line"><div class="kv-key">Yıl Sonu Notu:</div><div class="kv-val">${fmt(ysForDisplay, 2)}</div></div>
      <div class="kv-line"><div class="kv-key">Harf Notu:</div><div class="kv-val">${lg.letter}</div></div>
    </div>
  `;
  show(out1, html);
});

document.getElementById("btn_reset1").addEventListener("click", () => {
  resetInputs("c1", true);
  hide(out1);
});

// ---------------- Calc 2 ----------------
const out2 = document.getElementById("out2");
document.getElementById("btn_calc2").addEventListener("click", () => {
  const in2 = getInputs("c2");
  const scores = {
    k1: readScore(in2.k1),
    k2: readScore(in2.k2),
    k3: readScore(in2.k3),
    k4: readScore(in2.k4),
    k5: readScore(in2.k5),
    bil: readScore(in2.bil),
    ihu: readScore(in2.ihu)
  };

  const fieldsOk = Object.values(scores).every(v => Number.isFinite(v));
  if (!fieldsOk) {
    return show(out2, `<span class="badge warn">Uyarı</span> Lütfen tüm alanlara sayı gir. Girmediysen 0 yaz.`);
  }

  const infoLine = `<div class="info-line">Hesaplama, yıl sonu notu 59,51 (60’a yuvarlanır) hedeflenerek yapılmıştır.</div>`;

  const anyZero = hasAnyZero(scores);

  // Mode A: no zeros => compute minimum final needed (target 59.51)
  if (!anyZero) {
    const yi60 = weightedYearIn60(scores);
    const rawNeed = (PASS_TARGET_RAW - yi60) / 0.40; // since ys = yi60 + 0.40*final
    const minFinal = Math.max(50, rawNeed);

    let html = "";
    if (minFinal > 100) {
      html = `
        <span class="badge bad">SIÇTIN</span>
        <span class="inline-note">Kurul notları çok düşük. Finalde 100 alsan bile geçemezsin.</span>
        <hr class="sep" />
        ${infoLine}
      `;
    } else if (rawNeed <= 50) {
      html = `
        <span class="badge good">RAHAT</span>
        <span class="inline-note">Finalden 50 alman yeter.</span>
        <hr class="sep" />
        ${infoLine}
      `;
    } else {
      html = `
        <span class="badge warn">SIKINTI</span>
        <span class="inline-note">Geçmek için finalden minimum <strong>${fmt(minFinal, 2)}</strong> alman gerekiyor.</span>
        <hr class="sep" />
        ${infoLine}
      `;
    }

    return show(out2, html);
  }

  // Mode B: some zeros => required average on remaining to "leave final to 50"
  // target year-end >= 59.51 with final fixed at 50 => yi60 >= 59.51 - 20 = 39.51
  const items = [
    { key: "k1", w: WEIGHTS.k1 },
    { key: "k2", w: WEIGHTS.k2 },
    { key: "k3", w: WEIGHTS.k3 },
    { key: "k4", w: WEIGHTS.k4 },
    { key: "k5", w: WEIGHTS.k5 },
    { key: "bil", w: WEIGHTS.bil },
    { key: "ihu", w: WEIGHTS.ihu }
  ];

  let S_done = 0; // 0..60 scale
  let W_left = 0; // remaining weights (sum in percent points, 0..60)

  for (const it of items) {
    const v = scores[it.key];
    if (v === 0) {
      W_left += it.w;
    } else {
      S_done += (it.w * v) / 100;
    }
  }

  // If somehow W_left becomes 0 (shouldn't in this mode), fallback to mode A
  if (W_left === 0) {
    return show(out2, `<span class="badge warn">Uyarı</span> Kurul notlarının hepsi girilmiş görünüyor. Lütfen tekrar kontrol et.`);
  }

  const yi60Needed = PASS_TARGET_RAW - (0.40 * 50); // 59.51 - 20 = 39.51
  const remainingNeeded60 = yi60Needed - S_done;
  let neededAvg = (remainingNeeded60 * 100) / W_left;

  // If already enough with entered scores (mathematically), clamp to 0
  if (neededAvg < 0) neededAvg = 0;

  let html = "";
  if (neededAvg > 100) {
    html = `
      <span class="badge bad">OLMAZ</span>
      <span class="inline-note">Kalan kurullarda 100 alsan bile finali 50'ye bırakamıyorsun.</span>
      <hr class="sep" />
      ${infoLine}
    `;
  } else {
    html = `
      <span class="badge good">OLUR</span>
      <span class="inline-note">Finali 50'ye bırakmak için kalan kurullarda en az <strong>${fmt(neededAvg, 2)}</strong> almalısın.</span>
      <hr class="sep" />
      ${infoLine}
    `;
  }
  show(out2, html);
});

document.getElementById("btn_reset2").addEventListener("click", () => {
  resetInputs("c2", false);
  hide(out2);
});

// ---------------- Calc 3 ----------------
const out3 = document.getElementById("out3");
document.getElementById("btn_calc3").addEventListener("click", () => {
  const in3 = getInputs("c3");
  const scores = {
    k1: readScore(in3.k1),
    k2: readScore(in3.k2),
    k3: readScore(in3.k3),
    k4: readScore(in3.k4),
    k5: readScore(in3.k5),
    bil: readScore(in3.bil),
    ihu: readScore(in3.ihu)
  };

  const ok = Object.values(scores).every(v => Number.isFinite(v));
  if (!ok) {
    return show(out3, `<span class="badge warn">Uyarı</span> Lütfen tüm alanlara sayı gir. Girmediysen 0 yaz.`);
  }

  const infoLine = `<div class="info-line">Hesaplama, yıl sonu notu 79,51 (80’e yuvarlanır) hedeflenerek yapılmıştır.</div>`;

  const anyZero = hasAnyZero(scores);

  // Mode A: all entered => finalsiz decision
  if (!anyZero) {
    const yi60 = weightedYearIn60(scores);
    const yiNorm = normalizeYearIn100(yi60); // "Kurul not ortalaması" shown as this number

    const isFinalsiz = yiNorm >= FINALSIZ_TARGET_RAW;

    const html = isFinalsiz
      ? `
        <span class="badge good">OLUR</span>
        <span class="inline-note">Kurul not ortalaması <strong>${fmt(yiNorm, 2)}</strong> Finalsiz geçtin.</span>
        <hr class="sep" />
        ${infoLine}
      `
      : `
        <span class="badge bad">OLMAZ</span>
        <span class="inline-note">Kurul not ortalaması <strong>${fmt(yiNorm, 2)}</strong> Finale gireceksin.</span>
        <hr class="sep" />
        ${infoLine}
      `;
    return show(out3, html);
  }

  // Mode B: some zeros => needed average on remaining to reach 79.51
  const items = [
    { key: "k1", w: WEIGHTS.k1 },
    { key: "k2", w: WEIGHTS.k2 },
    { key: "k3", w: WEIGHTS.k3 },
    { key: "k4", w: WEIGHTS.k4 },
    { key: "k5", w: WEIGHTS.k5 },
    { key: "bil", w: WEIGHTS.bil },
    { key: "ihu", w: WEIGHTS.ihu }
  ];

  let S_done = 0; // 0..60 scale
  let W_left = 0;

  for (const it of items) {
    const v = scores[it.key];
    if (v === 0) {
      W_left += it.w;
    } else {
      S_done += (it.w * v) / 100;
    }
  }

  if (W_left === 0) {
    return show(out3, `<span class="badge warn">Uyarı</span> Kurul notlarının hepsi girilmiş görünüyor. Lütfen tekrar kontrol et.`);
  }

  // Need year-in normalized >= 79.51  => need yi60 >= 60*(79.51/100)
  const yi60Target = (YEAR_IN_TOTAL * FINALSIZ_TARGET_RAW) / 100; // 47.706
  const remainingNeeded60 = yi60Target - S_done;
  let neededAvg = (remainingNeeded60 * 100) / W_left;

  if (neededAvg < 0) neededAvg = 0;

  let html = "";
  if (neededAvg > 100) {
    html = `
      <span class="badge bad">OLMAZ</span>
      <span class="inline-note">Kalan kurullardan 100 alsan bile finalsiz için yetmiyor.</span>
      <hr class="sep" />
      ${infoLine}
    `;
  } else {
    html = `
      <span class="badge good">OLUR</span>
      <span class="inline-note">Kalan kurullardan <strong>${fmt(neededAvg, 2)}</strong> alırsan finalsiz geçebilirsin.</span>
      <hr class="sep" />
      ${infoLine}
    `;
  }
  show(out3, html);
});

document.getElementById("btn_reset3").addEventListener("click", () => {
  resetInputs("c3", false);
  hide(out3);
});

// Minor inline styles for output (kept minimal, no extra debug)
(function injectSmallOutputStyles(){
  const style = document.createElement("style");
  style.textContent = `
    .inline-note{ color:#e5e7eb; font-weight:700; }
    .info-line{ color:#94a3b8; margin-top: 10px; }
  `;
  document.head.appendChild(style);
})();
