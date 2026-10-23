/* Try it: unmix a signal by cutting in time or in frequency (Lecture 2, after the filter slide) */
(function () {
  'use strict';
  var TAU = 2 * Math.PI;
  var FS = 16000, WIN = 0.04, N = Math.round(FS * WIN), DF = FS / N, FMAX = 4000, KMAX = Math.round(FMAX / DF);

  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(n, sd, seed) { var r = rng(seed), out = new Float64Array(n); for (var i = 0; i < n; i += 2) { var u = Math.max(1e-12, r()), v = r(), m = Math.sqrt(-2 * Math.log(u)) * sd; out[i] = m * Math.cos(TAU * v); if (i + 1 < n) out[i + 1] = m * Math.sin(TAU * v); } return out; }
  function hann(t, a, b) { return t < a || t > b ? 0 : 0.5 - 0.5 * Math.cos(TAU * (t - a) / (b - a)); }
  function tones(list) { return function (t) { var v = 0; for (var i = 0; i < list.length; i++) v += list[i][1] * Math.sin(TAU * list[i][0] * t + (list[i][2] || 0)); return v; }; }
  function burst(a, b, list) { var f = tones(list); return function (t) { var tm = ((t % WIN) + WIN) % WIN; return hann(tm, a, b) * f(t); }; }

  /* ---------- scenarios (times in s, frequencies in Hz) ---------- */
  var PURPLE = '#7b4fa0', TEAL = '#1f8a80', NOISE = '#8a96a3';
  var SCN = {
    freq: { name: 'Different frequencies', srcs: [
      { key: 'voice', name: 'Voice', col: '#2f6db5', f: tones([[200, 0.5, 0.3], [400, 0.7, 1.9], [600, 0.45, 4.1], [800, 0.3, 2.6], [1000, 0.15, 0.8]]) },
      { key: 'hum', name: 'Mains hum', col: PURPLE, f: tones([[50, 0.5, 0], [150, 0.2, 1.2]]) },
      { key: 'whistle', name: 'Whistle', col: TEAL, f: tones([[3000, 0.35, 0.5]]) }],
      band: { voice: [175, 1100], hum: [0, 175], whistle: [2000, 4000] }, gate: { voice: [0, 40], hum: [0, 40], whistle: [0, 40] }, def: { tgt: 'voice', m: 'time', gate: [10, 30], band: [175, 1100] } },
    time: { name: 'Different times', srcs: [
      { key: 'A', name: 'Speaker A', col: '#2f6db5', f: burst(0.001, 0.019, [[1000, 0.8, 0], [2000, 0.4, 0.7]]) },
      { key: 'B', name: 'Speaker B', col: PURPLE, f: burst(0.021, 0.039, [[1000, 0.4, 1.1], [2000, 0.8, 2.3]]) }],
      band: { A: [800, 1200], B: [1800, 2200] }, gate: { A: [0, 20], B: [20, 40] }, def: { tgt: 'A', m: 'freq', gate: [0, 20], band: [800, 1200] } },
    noise: { name: 'Overlap: voice + noise', srcs: [
      { key: 'voice', name: 'Voice', col: '#2f6db5', f: tones([[200, 0.5, 0.3], [400, 0.7, 1.9], [600, 0.45, 4.1], [800, 0.3, 2.6], [1000, 0.15, 0.8]]) },
      { key: 'noise', name: 'Noise', col: NOISE, noise: 0.25, seed: 7 }],
      band: { voice: [175, 1025], noise: [1100, 4000] }, gate: { voice: [0, 40], noise: [0, 40] }, def: { tgt: 'voice', m: 'freq', gate: [0, 40], band: [175, 1025] } }
  };

  /* sample one source over n samples at rate fs */
  function sample(s, n, fs) {
    if (s.noise) return gauss(n, s.noise, s.seed + (n === N ? 0 : 99));
    var x = new Float64Array(n); for (var i = 0; i < n; i++) x[i] = s.f(i / fs); return x;
  }
  var COS = new Float64Array(N), SIN = new Float64Array(N);
  for (var q = 0; q < N; q++) { COS[q] = Math.cos(TAU * q / N); SIN[q] = Math.sin(TAU * q / N); }
  function dft(x) { // bins 0..N/2
    var re = new Float64Array(N / 2 + 1), im = new Float64Array(N / 2 + 1);
    for (var k = 0; k <= N / 2; k++) { var a = 0, b = 0; for (var n = 0, p = 0; n < N; n++, p = (p + k) % N) { a += x[n] * COS[p]; b -= x[n] * SIN[p]; } re[k] = a; im[k] = b; }
    return { re: re, im: im };
  }
  function keepBins(X, lo, hi) { // inverse DFT of the bins whose frequency lies in [lo, hi]
    var y = new Float64Array(N), e = 1e-9;
    for (var k = 0; k <= N / 2; k++) {
      var f = k * DF; if (f < lo - e || f > hi + e) continue;
      var w = (k === 0 || k === N / 2) ? 1 / N : 2 / N, a = X.re[k] * w, b = X.im[k] * w;
      if (a === 0 && b === 0) continue;
      for (var n = 0, p = 0; n < N; n++, p = (p + k) % N) y[n] += a * COS[p] - b * SIN[p];
    }
    return y;
  }
  function gateOp(x, a, b, fs) { var y = new Float64Array(x.length), T = WIN * fs; for (var n = 0; n < x.length; n++) { var tm = (n % T) / fs * 1000; y[n] = tm >= a && tm < b ? x[n] : 0; } return y; }
  function pow(x) { var s = 0; for (var i = 0; i < x.length; i++) s += x[i] * x[i]; return s; }
  function add(a, b) { var y = new Float64Array(a.length); for (var i = 0; i < a.length; i++) y[i] = a[i] + b[i]; return y; }

  /* the whole model for the 40 ms display window */
  function model(sk) {
    var S = SCN[sk], xs = S.srcs.map(function (s) { return sample(s, N, FS); });
    var mix = xs.reduce(add, new Float64Array(N));
    return { S: S, xs: xs, mix: mix, X: xs.map(dft), MX: dft(mix) };
  }
  function run(M, tgt, m, gate, band) {
    var ti = M.S.srcs.map(function (s) { return s.key; }).indexOf(tgt);
    var parts = M.xs.map(function (x, i) { return m === 'time' ? gateOp(x, gate[0], gate[1], FS) : keepBins(M.X[i], band[0], band[1]); });
    var out = parts.reduce(add, new Float64Array(N)), t = M.xs[ti], d = new Float64Array(N);
    for (var i = 0; i < N; i++) d[i] = out[i] - t[i];
    var pe = pow(d), pt = pow(t);
    return { out: out, ti: ti, pe: pe, pt: pt, E: Math.sqrt(pe / pt), frac: parts.map(function (p, i) { return pow(p) / pow(M.xs[i]); }) };
  }

  if (typeof window === 'undefined' || !window.DCW) {
    if (typeof module !== 'undefined') module.exports = { SCN: SCN, model: model, run: run, N: N, DF: DF };
    return;
  }
  var D = window.DCW, h = D.h, C = D.C;

  D.register('separate', function (root) {
    var st = { sc: 'freq', tgt: 'voice', m: 'time', gate: [10, 30], band: [175, 1100], drag: null };
    var M = model('freq'), R;
    var cv = D.canvas(1080, 640), g = cv.g, W = cv.w, H = cv.h;
    var P1 = [0, 196], P2 = [196, 392], P3 = [392, 640], pl = 70, pr = 20;
    var fbox = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.45;flex:1' }), verdict = h('div', { cls: 'w-verdict', style: 'font-size:22px;padding:10px 16px;line-height:1.3;flex:1.15' });
    var scSeg = D.seg([['freq', 'Different frequencies'], ['time', 'Different times'], ['noise', 'Overlap: voice + noise']], st.sc, function (k) { setScenario(k); draw(); });
    var tgtBox = h('div'), tgtSeg;
    var mSeg = D.seg([['time', 'Cut in time'], ['freq', 'Cut in frequency']], st.m, function (k) { st.m = k; draw(); });
    var aSl = D.slider('Keep from t =', 0, 40, 1, 10, function (v) { return v + ' ms'; }, function (v) { st.gate[0] = Math.min(v, st.gate[1] - 1); aSl.set(st.gate[0]); draw(); });
    var bSl = D.slider('… up to t =', 0, 40, 1, 30, function (v) { return v + ' ms'; }, function (v) { st.gate[1] = Math.max(v, st.gate[0] + 1); bSl.set(st.gate[1]); draw(); });
    var lSl = D.slider('Keep from f =', 0, FMAX, 25, 175, function (v) { return v.toLocaleString('en-US') + ' Hz'; }, function (v) { st.band[0] = Math.min(v, st.band[1] - 25); lSl.set(st.band[0]); draw(); });
    var hSl = D.slider('… up to f =', 0, FMAX, 25, 1100, function (v) { return v.toLocaleString('en-US') + ' Hz'; }, function (v) { st.band[1] = Math.max(v, st.band[0] + 25); hSl.set(st.band[1]); draw(); });
    var tCtl = h('div', { cls: 'w-col', style: 'gap:0' }, [aSl.el, bSl.el]), fCtl = h('div', { cls: 'w-col', style: 'gap:0' }, [lSl.el, hSl.el]);
    var bestT = D.btn('Best time cut', function () { var gt = M.S.gate[st.tgt]; st.m = 'time'; mSeg.set('time'); st.gate = gt.slice(); aSl.set(gt[0]); bSl.set(gt[1]); draw(); });
    var bestF = D.btn('Best frequency cut', function () { var b = M.S.band[st.tgt]; st.m = 'freq'; mSeg.set('freq'); st.band = b.slice(); lSl.set(b[0]); hSl.set(b[1]); draw(); });
    var au = { ctx: null, src: null, gain: null, what: null, timer: null, poll: null, err: null };
    var pMix = D.btn('▶ Mix', function () { play('mix'); }), pOut = D.btn('▶ Output', function () { play('out'); }), pTgt = D.btn('▶ True', function () { play('tgt'); }), pStop = D.btn('■ Stop', function () { stopSound(); });
    var sndNote = h('p', { cls: 'w-note', style: 'margin:0' });

    function setScenario(k) {
      st.sc = k; M = model(k); var d = M.S.def;
      st.tgt = d.tgt; st.m = d.m; st.gate = d.gate.slice(); st.band = d.band.slice();
      mSeg.set(st.m); aSl.set(st.gate[0]); bSl.set(st.gate[1]); lSl.set(st.band[0]); hSl.set(st.band[1]);
      tgtSeg = D.seg(M.S.srcs.map(function (s) { return [s.key, s.name]; }), st.tgt, function (key) { st.tgt = key; draw(); });
      tgtBox.innerHTML = ''; tgtBox.appendChild(tgtSeg.el);
      if (au.what) stopSound();
    }

    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:12px' }, [cv.c, h('div', { cls: 'w-card', style: 'flex-direction:row;gap:18px;padding:12px 16px;align-items:stretch' }, [fbox, verdict])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:10px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 18px' }, [h('h4', { text: 'The mixture' }), scSeg.el, h('h4', { text: 'Goal: recover only…', style: 'margin-top:4px' }), tgtBox]),
        h('div', { cls: 'w-card', style: 'gap:6px;padding:12px 18px' }, [h('h4', { text: 'How do we cut?' }), mSeg.el, tCtl, fCtl, h('div', { cls: 'w-btns', style: 'gap:8px' }, [bestT, bestF])]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 18px' }, [h('h4', { text: 'Listen' }), h('div', { cls: 'w-btns', style: 'gap:8px' }, [pMix, pOut, pTgt, pStop]), sndNote])])]));
    setScenario('freq'); st.m = 'time'; mSeg.set('time');

    /* ---------- geometry and dragging ---------- */
    function TX(ms) { return pl + ms / 40 * (W - pl - pr); }
    function XT(x) { return (x - pl) / (W - pl - pr) * 40; }
    function FX(f) { return pl + f / FMAX * (W - pl - pr); }
    function XF(x) { return (x - pl) / (W - pl - pr) * FMAX; }
    function local(e) { var r = cv.c.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
    cv.c.style.touchAction = 'none';
    cv.c.addEventListener('pointerdown', function (e) {
      var p = local(e);
      if (p.y < P1[1]) { st.m = 'time'; mSeg.set('time'); var v = Math.round(Math.max(0, Math.min(40, XT(p.x)))); st.drag = Math.abs(v - st.gate[0]) < Math.abs(v - st.gate[1]) ? 'a' : 'b'; }
      else if (p.y >= P3[0]) { st.m = 'freq'; mSeg.set('freq'); var f = XF(p.x); st.drag = Math.abs(f - st.band[0]) < Math.abs(f - st.band[1]) ? 'lo' : 'hi'; }
      else return;
      cv.c.setPointerCapture(e.pointerId); e.preventDefault(); move(p.x); draw();
    });
    function move(x) {
      if (st.drag === 'a' || st.drag === 'b') {
        var v = Math.round(Math.max(0, Math.min(40, XT(x))));
        if (st.drag === 'a') st.gate[0] = Math.min(v, st.gate[1] - 1); else st.gate[1] = Math.max(v, st.gate[0] + 1);
        aSl.set(st.gate[0]); bSl.set(st.gate[1]);
      } else {
        var f = Math.round(Math.max(0, Math.min(FMAX, XF(x))) / 25) * 25;
        if (st.drag === 'lo') st.band[0] = Math.min(f, st.band[1] - 25); else st.band[1] = Math.max(f, st.band[0] + 25);
        lSl.set(st.band[0]); hSl.set(st.band[1]);
      }
    }
    cv.c.addEventListener('pointermove', function (e) {
      var p = local(e);
      if (st.drag) { move(p.x); draw(); return; }
      cv.c.style.cursor = (p.y < P1[1] || p.y >= P3[0]) ? 'ew-resize' : 'default';
    });
    function up() { if (st.drag) { st.drag = null; draw(); } }
    cv.c.addEventListener('pointerup', up); cv.c.addEventListener('pointercancel', up);

    /* ---------- sound: 2 s loop at 16,384 samples/s, processed with the same cut ---------- */
    var AFS = 16384, AN = 32768;
    function fft(re, im, inv) {
      var n = re.length, i, j, k, l;
      for (i = 1, j = 0; i < n; i++) { var bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
      for (l = 2; l <= n; l <<= 1) {
        var ang = (inv ? 2 : -2) * Math.PI / l, wr = Math.cos(ang), wi = Math.sin(ang);
        for (i = 0; i < n; i += l) { var cr = 1, ci = 0; for (k = 0; k < l / 2; k++) {
          var a = i + k, b = a + l / 2, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
      }
      if (inv) for (i = 0; i < n; i++) { re[i] /= n; im[i] /= n; }
    }
    function audioData(what) {
      var xs = M.S.srcs.map(function (s) { return sample(s, AN, AFS); }), mix = xs.reduce(add, new Float64Array(AN)), y;
      if (what === 'mix') y = mix;
      else if (what === 'tgt') y = xs[R.ti];
      else if (st.m === 'time') y = gateOp(mix, st.gate[0], st.gate[1], AFS);
      else {
        var re = Float64Array.from(mix), im = new Float64Array(AN); fft(re, im, false);
        for (var k = 0; k < AN; k++) { var f = (k <= AN / 2 ? k : AN - k) * AFS / AN; if (f < st.band[0] - 1e-9 || f > st.band[1] + 1e-9) { re[k] = 0; im[k] = 0; } }
        fft(re, im, true); y = re;
      }
      var pk = 0; for (var i = 0; i < AN; i++) pk = Math.max(pk, Math.abs(mix[i]));
      var out = new Float32Array(AN), sc = 0.9 / (pk || 1); for (i = 0; i < AN; i++) out[i] = y[i] * sc; // same scale for all three: loudness can be compared
      return out;
    }
    function play(what) {
      try {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) throw new Error('no Web Audio');
        if (!au.ctx) au.ctx = new AC();
        if (au.ctx.state === 'suspended') au.ctx.resume();
        var ctx = au.ctx, buf = ctx.createBuffer(1, AN, AFS); buf.getChannelData(0).set(audioData(what));
        var src = ctx.createBufferSource(), gn = ctx.createGain(), now = ctx.currentTime;
        src.buffer = buf; src.loop = true; gn.gain.setValueAtTime(0, now); gn.gain.linearRampToValueAtTime(0.3, now + 0.05);
        src.connect(gn); gn.connect(ctx.destination); src.start(now);
        fade(); au.src = src; au.gain = gn; au.what = what; au.err = null;
        if (!au.poll) au.poll = setInterval(function () { if (!root.isConnected || !root.getClientRects().length) stopSound(); }, 500);
      } catch (err) { au.err = 'Sound is not available in this browser.'; au.what = null; }
      note();
    }
    function fade() {
      if (!au.src) return; var s = au.src, gn = au.gain, now = au.ctx.currentTime;
      try { gn.gain.cancelScheduledValues(now); gn.gain.setValueAtTime(gn.gain.value, now); gn.gain.linearRampToValueAtTime(0, now + 0.05); s.stop(now + 0.06); } catch (e) { /* stopped */ }
      au.src = null; au.gain = null;
    }
    function stopSound() { fade(); au.what = null; if (au.poll) { clearInterval(au.poll); au.poll = null; } note(); }
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting && au.what) stopSound(); }); }).observe(root);
    function note() {
      [[pMix, 'mix'], [pOut, 'out'], [pTgt, 'tgt']].forEach(function (p) { p[0].classList.toggle('on', au.what === p[1]); });
      sndNote.innerHTML = au.err ? '<span style="color:' + C.red + '">' + au.err + '</span>' :
        'Same volume scale for all three: a quieter output really has less in it.';
    }

    /* ---------- drawing ---------- */
    function frame(y0, y1, title, sub) {
      g.strokeStyle = C.line; g.lineWidth = 1; if (y0 > 0) { g.beginPath(); g.moveTo(10, y0); g.lineTo(W - 10, y0); g.stroke(); }
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(title, 14, y0 + 30);
      if (sub) { g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText(sub, W - pr, y0 + 30); }
    }
    function wave(x, y0, y1, lim, col, lw, dash) {
      var Y = function (v) { return (y0 + y1) / 2 - v / lim * (y1 - y0) / 2; };
      g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []); g.lineJoin = 'round'; g.beginPath();
      for (var i = 0; i < N; i++) { var px = TX(i / FS * 1000), py = Y(x[i]); i ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke(); g.setLineDash([]);
    }
    function axisT(y0, y1, lim, ticks) {
      var mid = (y0 + y1) / 2; g.strokeStyle = C.gray; g.lineWidth = 1; g.beginPath(); g.moveTo(pl, mid); g.lineTo(W - pr, mid); g.stroke();
      g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'right'; g.textBaseline = 'middle';
      g.fillText('0', pl - 8, mid); g.fillText(D.fmtN(lim, 1), pl - 8, y0 + 4); g.fillText(D.fmtN(-lim, 1), pl - 8, y1 - 4);
      g.textBaseline = 'alphabetic';
      if (ticks) { g.textAlign = 'center'; for (var t = 0; t <= 40; t += 10) { g.textAlign = t === 40 ? 'right' : 'center'; g.fillText(t + (t === 40 ? ' ms' : ''), TX(t) + (t === 40 ? 6 : 0), y1 + 24); } }
    }
    function lc(n) { return /^Speaker/.test(n) ? n : n.toLowerCase(); }
    function draw() {
      tCtl.style.display = st.m === 'time' ? '' : 'none'; fCtl.style.display = st.m === 'freq' ? '' : 'none';
      R = run(M, st.tgt, st.m, st.gate, st.band);
      var tS = M.S.srcs[R.ti];
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      var lim = 0; for (var i = 0; i < N; i++) lim = Math.max(lim, Math.abs(M.mix[i])); lim = Math.ceil(lim * 1.1 * 2) / 2;
      // P1: mixture
      frame(P1[0], P1[1], 'Mixture in time: what the microphone records', st.m === 'time' ? 'drag here to set the time cut' : 'click here to cut in time');
      var a1 = P1[0] + 46, b1 = P1[1] - 34;
      if (st.m === 'time') { g.fillStyle = 'rgba(160,170,180,.16)'; g.fillRect(pl, a1, W - pl - pr, b1 - a1); g.fillStyle = 'rgba(240,163,94,.28)'; g.fillRect(TX(st.gate[0]), a1, TX(st.gate[1]) - TX(st.gate[0]), b1 - a1);
        [0, 1].forEach(function (j) { var x = TX(st.gate[j]); g.strokeStyle = C.orange; g.lineWidth = 3; g.beginPath(); g.moveTo(x, a1); g.lineTo(x, b1); g.stroke(); }); }
      axisT(a1, b1, lim, true); wave(M.mix, a1, b1, lim, C.navy, 2);
      // P2: output vs true
      var a2 = P2[0] + 46, b2 = P2[1] - 34;
      frame(P2[0], P2[1], 'Output (orange) against the true ' + lc(tS.name) + ' (dashed)', 'error E = ' + D.fmtN(R.E * 100, 1) + ' %');
      axisT(a2, b2, lim, true); wave(M.xs[R.ti], a2, b2, lim, tS.col === NOISE ? '#5b6672' : tS.col, 3, [9, 6]); wave(R.out, a2, b2, lim, C.orange, 2.5);
      // P3: spectrum
      frame(P3[0], P3[1], 'Frequency domain: amplitude spectrum of the mixture', st.m === 'freq' ? 'drag here to set the band' : 'click here to cut in frequency');
      var a3 = P3[0] + 76, b3 = P3[1] - 40, amax = 0, amp = [], k;
      for (k = 0; k <= KMAX; k++) { var w = k === 0 ? 1 / N : 2 / N; amp.push(Math.hypot(M.MX.re[k], M.MX.im[k]) * w); amax = Math.max(amax, amp[k]); }
      var FY = function (v) { return b3 - v / (amax * 1.1) * (b3 - a3); };
      if (st.m === 'freq') { g.fillStyle = 'rgba(160,170,180,.16)'; g.fillRect(pl, a3, W - pl - pr, b3 - a3); g.fillStyle = 'rgba(240,163,94,.28)'; g.fillRect(FX(st.band[0]), a3, FX(st.band[1]) - FX(st.band[0]), b3 - a3); }
      for (k = 0; k <= KMAX; k++) {
        var f = k * DF, best = -1, bp = 0, tot = 0;
        M.X.forEach(function (X, j) { var p = X.re[k] * X.re[k] + X.im[k] * X.im[k]; tot += p; if (p > bp) { bp = p; best = j; } });
        var col = best >= 0 && bp > 0.8 * tot ? M.S.srcs[best].col : '#9aa5b1';
        var kept = st.m !== 'freq' || (f >= st.band[0] - 1e-9 && f <= st.band[1] + 1e-9);
        g.globalAlpha = kept ? 1 : 0.28; g.fillStyle = col; g.fillRect(FX(f) - 2.5, FY(amp[k]), 5, b3 - FY(amp[k])); g.globalAlpha = 1;
      }
      if (st.sc === 'time') M.X.forEach(function (X, j) { // each speaker's own spectrum, dashed: they overlap
        g.strokeStyle = M.S.srcs[j].col; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath();
        for (k = 0; k <= KMAX; k++) { var v = Math.hypot(X.re[k], X.im[k]) * (k ? 2 : 1) / N; k ? g.lineTo(FX(k * DF), FY(v)) : g.moveTo(FX(0), FY(v)); }
        g.stroke(); g.setLineDash([]);
      });
      if (st.m === 'freq') [0, 1].forEach(function (j) { var x = FX(st.band[j]); g.strokeStyle = C.orange; g.lineWidth = 3; g.beginPath(); g.moveTo(x, a3); g.lineTo(x, b3); g.stroke(); });
      g.strokeStyle = C.gray; g.lineWidth = 1.5; g.beginPath(); g.moveTo(pl, b3); g.lineTo(W - pr, b3); g.stroke();
      g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textBaseline = 'alphabetic';
      for (var tf = 0; tf <= FMAX; tf += 500) { g.textAlign = tf === FMAX ? 'right' : 'center'; g.fillText(tf === 0 ? '0' : (tf / 1000) + 'k' + (tf === FMAX ? ' Hz' : ''), FX(tf) + (tf === FMAX ? 6 : 0), b3 + 26); }
      // legend
      var lx = pl; g.font = '600 20px ' + D.SANS; g.textAlign = 'left';
      M.S.srcs.concat(st.sc === 'time' ? [{ name: 'shared', col: '#9aa5b1' }] : []).forEach(function (s) { g.fillStyle = s.col; g.fillRect(lx, P3[0] + 44, 16, 16); g.fillText(s.name, lx + 22, P3[0] + 59); lx += g.measureText(s.name).width + 50; });

      // ---- readout
      var names = M.S.srcs.map(function (s) { return lc(s.name); });
      var leak = M.S.srcs.map(function (s, j) { return j === R.ti ? null : names[j] + ' ' + D.fmtN(R.frac[j] * 100, 0) + ' %'; }).filter(Boolean).join(', ');
      fbox.innerHTML = 'E = √(Σ(out − true)² / Σ true²)<br>&nbsp;&nbsp;= √(' + D.fmtN(R.pe, 1) + ' / ' + D.fmtN(R.pt, 1) + ') = <b>' + D.fmtN(R.E * 100, 1) + ' %</b><br>' +
        'kept of the ' + names[R.ti] + ': <span class="ok">' + D.fmtN(R.frac[R.ti] * 100, 0) + ' %</span><br>let through: <span class="' + (R.frac.some(function (v, j) { return j !== R.ti && v > 0.005; }) ? 'bad' : 'ok') + '">' + leak + '</span>';
      var E = R.E, cls = E < 0.02 ? 'ok' : (E < 0.25 ? 'warn' : 'bad');
      var head = E < 0.02 ? 'Separated.' : (E < 0.25 ? 'Partly separated.' : 'Not separated.');
      var why = {
        freq: { time: 'All three sound at every instant, so any time cut removes the voice together with the hum. In time they overlap completely.',
          freq: 'They sit at different frequencies, so one band keeps one source and drops the rest. Radio tuning, filters and FDM work this way.' },
        time: { time: 'The speakers take turns, so each owns a time slot and a time cut separates them. TDM works this way.',
          freq: 'Both speakers use the same frequencies (1 and 2 kHz), so every band keeps parts of both. Frequency cannot separate them.' },
        noise: { time: 'Noise is present at every instant, so a time cut cannot remove it.',
          freq: 'The band removes the noise outside the voice\'s range, but the noise inside the band stays. Removing that part needs smarter methods (speech enhancement).' } };
      verdict.className = 'w-verdict ' + cls; verdict.innerHTML = '<b>' + head + '</b> ' + why[st.sc][st.m];
      note();
    }
    draw();
  });
})();
