/* Try it: which domain answers the question? (Lecture 2, advantages of each domain) */
(function () {
  'use strict';
  var TAU = 2 * Math.PI;
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
  function make(fs, dur, f) { var n = Math.round(fs * dur), x = new Float64Array(n); for (var i = 0; i < n; i++) x[i] = f(i / fs, i); return x; }
  function ecg(t, T) { var ph = ((t + T / 2) % T + T) % T - T / 2, W = [[0.15, -0.16, 0.022], [-0.12, -0.035, 0.01], [1.1, 0, 0.012], [-0.28, 0.035, 0.012], [0.32, 0.26, 0.042]], v = 0;
    for (var s = -1; s <= 1; s++) for (var j = 0; j < 5; j++) { var d = ph + s * T - W[j][1]; v += W[j][0] * Math.exp(-d * d / (2 * W[j][2] * W[j][2])); } return v; }

  /* ans: the best answer; ok: other answers that are also right. lesson goes into the summary list. */
  var TASKS = [
    { q: 'When did the hand clap happen in this 2-second recording?', ans: 'time', lesson: 'When events happen (timing, delays)',
      why: 'The clap is a spike at 1.3 s in the time plot. Its spectrum is spread over all frequencies and says nothing about when it happened.',
      gen: function () { var r = rng(1); return { fs: 8000, x: make(8000, 2, function (t) { var d = t - 1.3; return 0.02 * gauss(r) + (d >= 0 ? Math.exp(-d / 0.015) * gauss(r) : 0); }), tv: 2, tu: ['s', 1], fmax: 4000, fu: ['Hz', 1] }; } },
    { q: 'Which musical notes are being played in this chord?', ans: 'freq', lesson: 'Which tones or notes are present',
      why: 'Three spikes at 262, 330 and 392 Hz: the notes C, E and G. In time the three waves are added into one shape that hides them.',
      gen: function () { return { fs: 8000, x: make(8000, 0.5, function (t) { return 0.6 * Math.sin(TAU * 262 * t) + 0.5 * Math.sin(TAU * 330 * t + 1) + 0.45 * Math.sin(TAU * 392 * t + 2); }), tv: 0.05, tu: ['ms', 1000], fmax: 600, fu: ['Hz', 1], fm: [262, 330, 392] }; } },
    { q: 'Is the amplifier clipping (output stuck at its ±1 V limit)?', ans: 'time', lesson: 'Peak values, clipping, voltage limits',
      why: 'The flat tops at exactly ±1 V are visible at once in time. The spectrum shows new harmonics (600, 1,000 Hz …), but not the voltage limit itself.',
      gen: function () { return { fs: 8000, x: make(8000, 0.5, function (t) { return Math.max(-1, Math.min(1, 1.6 * Math.sin(TAU * 200 * t))); }), tv: 0.02, tu: ['ms', 1000], fmax: 2000, fu: ['Hz', 1], hl: [1, -1] }; } },
    { q: 'How much bandwidth does this signal need on a channel?', ans: 'freq', lesson: 'The bandwidth a signal needs',
      why: 'Bandwidth is read straight off the spectrum: highest − lowest = 4,000 − 1,000 = 3,000 Hz. The time plot gives no direct way to see it.',
      gen: function () { var r = rng(4); var c = []; for (var f = 1000; f <= 4000; f += 250) c.push([f, 0.3 + 0.7 * r(), TAU * r()]);
        return { fs: 16000, x: make(16000, 0.2, function (t) { var v = 0; c.forEach(function (q) { v += q[1] * Math.sin(TAU * q[0] * t + q[2]); }); return v; }), tv: 0.01, tu: ['ms', 1000], fmax: 6000, fu: ['Hz', 1], band: [1000, 4000] }; } },
    { q: 'Remove the 50 Hz mains hum from this ECG without harming the heartbeat.', ans: 'freq', lesson: 'Filtering out interference',
      why: 'The hum is one spike at 50 Hz, far from the heartbeat\'s lines, so a notch filter removes just that. In time the hum covers every beat.',
      gen: function () { return { fs: 250, x: make(250, 25 / 3, function (t) { return ecg(t, 5 / 6) + 0.2 * Math.sin(TAU * 50 * t); }), tv: 4, tu: ['s', 1], fmax: 60, fu: ['Hz', 1], fm: [50] }; } },
    { q: 'Read the bits sent on this cable (NRZ-L, 1 Mbps).', ans: 'time', lesson: 'Reading bits and bit timing',
      why: 'Each 1 µs slot is high or low: 1 0 1 1 0 0 1 0. The spectrum mixes all bits together and cannot give their order.',
      gen: function () { var b = '10110010'; return { fs: 20e6, x: make(20e6, 8e-6, function (t) { return b[Math.min(7, Math.floor(t * 1e6))] === '1' ? 1 : -1; }), tv: 8e-6, tu: ['µs', 1e6], fmax: 3e6, fu: ['MHz', 1e-6], bits: b }; } },
    { q: 'Carry three radio stations on one cable without mixing them up.', ans: 'freq', lesson: 'Sharing a link by frequency slots (FDM)',
      why: 'Give each station its own frequency slot (100, 200 and 300 kHz). This is FDM: the receiver picks a slot with a filter.',
      gen: function () { return { fs: 2e6, x: make(2e6, 0.001, function (t) { var v = 0; [1e5, 2e5, 3e5].forEach(function (f, k) { v += (1 + 0.6 * Math.sin(TAU * (3000 + 1000 * k) * t)) * Math.cos(TAU * f * t + k); }); return v; }), tv: 5e-5, tu: ['µs', 1e6], fmax: 4e5, fu: ['kHz', 1e-3], fm: [1e5, 2e5, 3e5] }; } },
    { q: 'Let four users take turns on one link.', ans: 'time', lesson: 'Sharing a link by time slots (TDM)',
      why: 'Each user owns a time slot: A, B, C, D, A, B … This is TDM. All four use the same frequencies, so the spectrum cannot tell them apart.',
      gen: function () { var r = rng(8), A = [1, 0.5, 0.8, 0.35]; return { fs: 8000, x: make(8000, 0.08, function (t) { var s = Math.floor(t / 0.01) % 4, tm = t % 0.01; return A[s] * Math.sin(Math.PI * tm / 0.01) * Math.sin(TAU * 1000 * t) + 0.01 * gauss(r); }), tv: 0.08, tu: ['ms', 1000], fmax: 3000, fu: ['Hz', 1], slots: 'ABCDABCD' }; } },
    { q: 'Store this music in far fewer bits (like MP3).', ans: 'freq', lesson: 'Compression: keep the strong parts (MP3, JPEG)',
      why: 'A few strong lines carry most of the power; the weak ones can be stored coarsely or dropped. MP3 and JPEG compress in the frequency domain.',
      gen: function () { var r = rng(9), c = []; [220, 330].forEach(function (f0, j) { for (var k = 1; k <= 10; k++) c.push([f0 * k, (j ? 0.6 : 1) / Math.pow(k, 1.3), TAU * r()]); }); for (var i = 0; i < 40; i++) c.push([100 + 3800 * r(), 0.02 * r(), TAU * r()]);
        return { fs: 8000, x: make(8000, 0.5, function (t) { var v = 0; for (var q = 0; q < c.length; q++) v += c[q][1] * Math.sin(TAU * c[q][0] * t + c[q][2]); return v; }), tv: 0.03, tu: ['ms', 1000], fmax: 4000, fu: ['Hz', 1] }; } },
    { q: 'How far away was this earthquake?', ans: 'time', lesson: 'Arrival times → distance (echoes, radar)',
      why: 'The S wave arrives 23.8 s after the P wave, so d ≈ 8.4 × 23.8 = 200 km. Only the time plot shows arrival times.',
      gen: function () { var r = rng(10); function bw(f1, f2, sd) { var q = rng(sd), c = []; for (var i = 0; i < 30; i++) c.push([f1 + (f2 - f1) * q(), TAU * q()]); return function (t) { var v = 0; c.forEach(function (p) { v += Math.sin(TAU * p[0] * t + p[1]); }); return v / 4; }; }
        var p = bw(3, 8, 1), s = bw(1, 4, 2), tP = 5 + 200 / 6, tS = 5 + 200 / 3.5;
        function env(t, a, tau) { return t < a ? 0 : (1 - Math.exp(-(t - a) / 0.4)) * Math.exp(-(t - a) / tau); }
        return { fs: 25, x: make(25, 120, function (t) { return 0.35 * env(t, tP, 5) * p(t) + env(t, tS, 9) * s(t) + 0.02 * gauss(r); }), tv: 120, tu: ['s', 1], fmax: 10, fu: ['Hz', 1], tm: [[tP, 'P'], [tS, 'S']] }; } },
    { q: 'Spot a small bearing fault hidden in this machine\'s vibration.', ans: 'freq', lesson: 'Weak periodic parts hidden in noise',
      why: 'The fault adds a small line at 87.7 Hz that stands out in the spectrum. In time it is buried under the random noise.',
      gen: function () { var r = rng(11); return { fs: 1024, x: make(1024, 4, function (t) { return Math.sin(TAU * 24.5 * t) + 0.35 * Math.sin(TAU * 87.7 * t) + 0.9 * gauss(r); }), tv: 0.5, tu: ['ms', 1000], fmax: 200, fu: ['Hz', 1], fm: [24.5, 87.7] }; } },
    { q: 'A whistle rises in pitch. What pitch is heard at each moment?', ans: 'both', lesson: 'Changing frequency: a spectrogram',
      why: 'Neither plot alone answers: time shows when but not the pitch; the spectrum shows 500 to 3,000 Hz but not when. A spectrogram (the "real sounds" slide) shows both.',
      gen: function () { return { fs: 8000, x: make(8000, 1, function (t) { return Math.sin(TAU * (500 * t + 1250 * t * t)); }), tv: 1, tu: ['s', 1], fmax: 4000, fu: ['Hz', 1], rect: true }; } },
    { q: 'What is the heart rate of this ECG?', ans: 'both', ok: ['time', 'freq'], lesson: 'Periodic signals: period T and f = 1/T',
      why: 'Both work: in time the R peaks are T = 0.833 s apart; in frequency the lines are f₀ = 1.2 Hz apart. f₀ = 1/T: 72 beats per minute either way.',
      gen: function () { return { fs: 250, x: make(250, 25 / 3, function (t) { return ecg(t, 5 / 6); }), tv: 4, tu: ['s', 1], fmax: 20, fu: ['Hz', 1], fm: [1.2] }; } }
  ];
  function spectrum(x, fs, fmax, M, rect) {
    var n = x.length, w = new Float64Array(n), sw = 0, mean = 0, i; for (i = 0; i < n; i++) mean += x[i]; mean /= n;
    var y = new Float64Array(n); for (i = 0; i < n; i++) { w[i] = rect ? 1 : 0.42 - 0.5 * Math.cos(TAU * i / (n - 1)) + 0.08 * Math.cos(2 * TAU * i / (n - 1)); sw += w[i]; y[i] = (x[i] - mean) * w[i]; }
    var out = [];
    for (var k = 0; k <= M; k++) { var f = fmax * k / M, c = Math.cos(TAU * f / fs), s = -Math.sin(TAU * f / fs), pr = 1, pi = 0, re = 0, im = 0;
      for (var j = 0; j < n; j++) { re += y[j] * pr; im += y[j] * pi; var t = pr * c - pi * s; pi = pr * s + pi * c; pr = t; } out.push([f, 2 * Math.hypot(re, im) / sw]); }
    return out;
  }

  if (typeof window === 'undefined' || !window.DCW) {
    if (typeof module !== 'undefined') module.exports = { TASKS: TASKS, spectrum: spectrum };
    return;
  }
  var D = window.DCW, h = D.h, C = D.C;

  D.register('whichdomain', function (root) {
    var st = { i: 0, got: TASKS.map(function () { return null; }), all: false };
    var cache = {};
    var cv = D.canvas(1080, 420), g = cv.g, W = cv.w, H = cv.h;
    var qEl = h('div', { style: 'font-size:30px;font-weight:600;color:' + C.navy + ';line-height:1.25' }), num = h('div', { style: 'font-size:22px;color:' + C.gray + ';font-weight:600' });
    var bT = D.btn('Time domain', function () { answer('time'); }), bF = D.btn('Frequency domain', function () { answer('freq'); }), bB = D.btn('Both together', function () { answer('both'); });
    var verdict = h('div', { cls: 'w-verdict', style: 'font-size:23px;padding:10px 16px;line-height:1.3;min-height:92px' });
    var chips = h('div', { cls: 'w-btns', style: 'gap:6px' });
    var prev = D.btn('◀', function () { go(st.i - 1); }), next = D.btn('Next ▶', function () { go(st.i + 1); });
    var sum = h('div', { cls: 'w-col', style: 'gap:6px' }), score = h('div', { style: 'font-size:22px;font-weight:600;color:' + C.navy });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:10px' }, [
        h('div', { cls: 'w-card', style: 'gap:4px;padding:12px 18px' }, [num, qEl]),
        cv.c,
        h('div', { cls: 'w-row', style: 'gap:12px;align-items:center' }, [h('span', { text: 'Which plot answers it?', style: 'font-size:23px;font-weight:600;color:' + C.navy }), h('div', { cls: 'w-btns', style: 'gap:8px' }, [bT, bF, bB])]),
        verdict,
        h('div', { cls: 'w-row', style: 'gap:10px;align-items:center;justify-content:space-between' }, [chips, h('div', { cls: 'w-btns', style: 'gap:8px' }, [prev, next])])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:10px' }, [
        h('div', { cls: 'w-card', style: 'gap:6px;padding:12px 18px' }, [h('div', { cls: 'w-row', style: 'justify-content:space-between;align-items:center' }, [h('h4', { text: 'What each domain is best for', style: 'margin:0' })]), sum,
          h('div', { cls: 'w-row', style: 'justify-content:space-between;align-items:center;margin-top:6px' }, [score, D.btn('Show all answers', function () { st.all = !st.all; render(); })])])])]));
    var cb = TASKS.map(function (t, k) { var b = D.btn(String(k + 1), function () { go(k); }); b.style.minWidth = '46px'; b.style.padding = '6px 8px'; chips.appendChild(b); return b; });

    function go(k) { st.i = Math.max(0, Math.min(TASKS.length - 1, k)); render(); }
    function answer(a) { if (st.got[st.i] == null) st.got[st.i] = a; render(); }
    function right(k, a) { var T = TASKS[k]; return a === T.ans || (T.ok && T.ok.indexOf(a) >= 0); }
    var NAME = { time: 'Time domain', freq: 'Frequency domain', both: 'Both together' };

    function data(k) { if (!cache[k]) { var d = TASKS[k].gen(); d.sp = spectrum(d.x, d.fs, d.fmax, 320, d.rect); cache[k] = d; } return cache[k]; }
    function fmt(v) { return D.fmtN(v, Math.abs(v) < 10 ? 1 : 0).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
    function draw() {
      var T = TASKS[st.i], d = data(st.i), a = st.got[st.i], shown = a != null;
      g.clearRect(0, 0, W, H);
      var P = [[0, 530], [550, 1080]], pt = 76, pb = H - 40;
      P.forEach(function (p, j) {
        var hi = shown && (T.ans === (j ? 'freq' : 'time') || T.ans === 'both');
        g.fillStyle = C.panel; g.fillRect(p[0], 0, p[1] - p[0], H); g.strokeStyle = hi ? C.orange : C.line; g.lineWidth = hi ? 4 : 1; g.strokeRect(p[0] + (hi ? 2 : 0.5), hi ? 2 : 0.5, p[1] - p[0] - (hi ? 4 : 1), H - (hi ? 4 : 1));
        g.font = '600 22px ' + D.SANS; g.fillStyle = j ? C.orange : C.blue; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(j ? 'Frequency domain' : 'Time domain', p[0] + 14, 30);
      });
      // time plot
      var x = d.x, n = Math.min(x.length, Math.round(d.tv * d.fs)), lo = Infinity, hi = -Infinity, i;
      for (i = 0; i < n; i++) { lo = Math.min(lo, x[i]); hi = Math.max(hi, x[i]); } var pad = (hi - lo) * 0.12 || 1; lo -= pad; hi += pad;
      var L = 20, R = 512, X = function (t) { return L + t / d.tv * (R - L); }, Y = function (v) { return pt + (hi - v) / (hi - lo) * (pb - pt); };
      g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath(); g.moveTo(L, Y(0)); g.lineTo(R, Y(0)); g.stroke();
      if (d.hl) d.hl.forEach(function (v) { g.strokeStyle = C.red; g.setLineDash([6, 5]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(R, Y(v)); g.stroke(); g.setLineDash([]); g.font = '600 20px ' + D.MONO; g.fillStyle = C.red; g.textAlign = 'right'; g.fillText((v > 0 ? '+' : '−') + '1 V', R, Y(v) + (v > 0 ? -6 : 20)); });
      if (n > 4 * (R - L)) { // dense: draw the min–max range in each pixel column (no moiré)
        g.strokeStyle = C.blue; g.lineWidth = 1.2; g.beginPath();
        for (var c = 0; c < R - L; c++) { var a0 = Math.floor(c / (R - L) * n), a1 = Math.floor((c + 1) / (R - L) * n), mn = Infinity, mx = -Infinity;
          for (i = a0; i < a1; i++) { mn = Math.min(mn, x[i]); mx = Math.max(mx, x[i]); } g.moveTo(L + c + 0.5, Y(mx)); g.lineTo(L + c + 0.5, Y(mn) + 0.5); }
        g.stroke();
      } else { g.strokeStyle = C.blue; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath(); for (i = 0; i < n; i++) { var px = X(i / d.fs), py = Y(x[i]); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
      g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'left'; g.fillText('0', L, H - 12); g.textAlign = 'right'; g.fillText(fmt(d.tv * d.tu[1]) + ' ' + d.tu[0], R, H - 12);
      g.font = '700 20px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'center';
      if (d.bits) for (i = 0; i < 8; i++) g.fillText(d.bits[i], X((i + 0.5) * 1e-6), pt - 10);
      if (d.slots) for (i = 0; i < 8; i++) g.fillText(d.slots[i], X((i + 0.5) * 0.01), pt - 10);
      if (d.tm) d.tm.forEach(function (m) { g.strokeStyle = C.navy; g.setLineDash([5, 5]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(m[0]), pt); g.lineTo(X(m[0]), pb); g.stroke(); g.setLineDash([]); g.textAlign = 'left'; g.fillText(m[1], X(m[0]) + 5, pt - 10); });
      // spectrum
      var sp = d.sp, amax = 0; sp.forEach(function (q) { amax = Math.max(amax, q[1]); });
      var FL = 570, FR = 1062, FX = function (f) { return FL + f / d.fmax * (FR - FL); }, FY = function (v) { return pb - v / (amax * 1.15) * (pb - pt); };
      if (d.band) { g.fillStyle = 'rgba(240,163,94,.2)'; g.fillRect(FX(d.band[0]), pt, FX(d.band[1]) - FX(d.band[0]), pb - pt); }
      g.fillStyle = 'rgba(166,79,21,.22)'; g.strokeStyle = C.orange; g.lineWidth = 2; g.beginPath(); g.moveTo(FX(0), pb); sp.forEach(function (q) { g.lineTo(FX(q[0]), FY(q[1])); }); g.lineTo(FX(d.fmax), pb); g.closePath(); g.fill();
      g.beginPath(); sp.forEach(function (q, k) { k ? g.lineTo(FX(q[0]), FY(q[1])) : g.moveTo(FX(q[0]), FY(q[1])); }); g.stroke();
      g.strokeStyle = C.gray; g.lineWidth = 1; g.beginPath(); g.moveTo(FL, pb); g.lineTo(FR, pb); g.stroke();
      g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'left'; g.fillText('0', FL, H - 12); g.textAlign = 'right'; g.fillText(fmt(d.fmax * d.fu[1]) + ' ' + d.fu[0], FR, H - 12);
      if (d.fm) d.fm.forEach(function (f) { var best = 0; sp.forEach(function (q) { if (Math.abs(q[0] - f) <= d.fmax / 150) best = Math.max(best, q[1]); }); g.font = '600 20px ' + D.MONO; g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(fmt(f * d.fu[1]), FX(f), Math.max(pt - 8, FY(best) - 8)); });
      if (d.band) { g.font = '600 20px ' + D.SANS; g.fillStyle = C.orange; g.textAlign = 'center'; g.fillText('1,000 to 4,000 Hz', (FX(d.band[0]) + FX(d.band[1])) / 2, pt - 10); }
    }
    function render() {
      var T = TASKS[st.i], a = st.got[st.i];
      num.textContent = 'Question ' + (st.i + 1) + ' of ' + TASKS.length; qEl.textContent = T.q;
      [[bT, 'time'], [bF, 'freq'], [bB, 'both']].forEach(function (p) { p[0].classList.toggle('on', a === p[1]); p[0].disabled = a != null; p[0].style.opacity = a != null && a !== p[1] ? 0.5 : 1; });
      if (a == null) { verdict.className = 'w-verdict'; verdict.style.background = C.panel; verdict.style.color = C.gray; verdict.textContent = 'Look at both plots. Which one gives the answer directly? Then click.'; }
      else { var ok = right(st.i, a); verdict.style.background = ''; verdict.style.color = ''; verdict.className = 'w-verdict ' + (ok ? 'ok' : 'bad');
        verdict.innerHTML = '<b>' + (a === T.ans ? 'Right: ' + NAME[a] + '.' : (ok ? 'Also right. Best answer: ' : 'Best answer: ') + NAME[T.ans] + '.') + '</b> ' + T.why; }
      cb.forEach(function (b, k) { var v = st.got[k]; b.classList.toggle('on', k === st.i); b.style.background = k === st.i ? '' : v == null ? '' : right(k, v) ? '#dcefe2' : '#f6dcd8'; b.style.color = k === st.i ? '' : v == null ? '' : right(k, v) ? C.green : C.red; });
      prev.disabled = st.i === 0; next.disabled = st.i === TASKS.length - 1;
      // summary
      sum.innerHTML = '';
      [['time', 'Time domain', C.blue], ['freq', 'Frequency domain', C.orange], ['both', 'Both together (time–frequency)', C.navy]].forEach(function (grp) {
        var items = TASKS.map(function (t, k) { return [t, k]; }).filter(function (p) { return p[0].ans === grp[0]; });
        var box = h('div', { style: 'border-left:5px solid ' + grp[2] + ';padding:2px 0 2px 12px' });
        box.appendChild(h('div', { text: grp[1], style: 'font-size:22px;font-weight:700;color:' + grp[2] }));
        items.forEach(function (p) { var seen = st.all || st.got[p[1]] != null;
          box.appendChild(h('div', { style: 'font-size:22px;line-height:1.3;color:' + (seen ? C.ink : '#b3bcc6') }, [(seen ? '• ' + p[0].lesson : '• … (question ' + (p[1] + 1) + ')')])); });
        sum.appendChild(box);
      });
      var done = st.got.filter(function (v) { return v != null; }).length, good = st.got.filter(function (v, k) { return v != null && right(k, v); }).length;
      score.textContent = 'Score: ' + good + ' / ' + done + (done < TASKS.length ? ' (' + (TASKS.length - done) + ' to go)' : '');
      draw();
    }
    render();
  });
})();
