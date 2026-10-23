/* Try it: the short-time Fourier transform (STFT) builds a spectrogram (Lecture 2, after the Fourier family) */
(function () {
  'use strict';
  var TAU = 2 * Math.PI, FS = 8000, DUR = 2, NS = FS * DUR;
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gauss(r) { var u = Math.max(1e-12, r()), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v); }
  function env(t, a, b, ramp) { if (t < a || t > b) return 0; return Math.min(1, (t - a) / ramp, (b - t) / ramp); }
  function formant(f, F) { var g = 0; F.forEach(function (q) { g += q[1] * Math.exp(-Math.pow((f - q[0]) / q[2], 2)); }); return g; }

  /* ---------- the four test signals (8,000 samples/s, 2 s) ---------- */
  var SIG = {
    speech: { name: 'Speech-like', gen: function () {
      var x = new Float64Array(NS), r = rng(3), ph = 0, i, t;
      var V = [[0.10, 0.62, [[730, 1, 90], [1090, 0.7, 110], [2440, 0.35, 160]]], [0.80, 1.30, [[270, 1, 60], [2290, 0.6, 140], [3010, 0.45, 180]]]];
      for (i = 0; i < NS; i++) { t = i / FS; var f0 = 135 - 15 * t, v = 0; ph += TAU * f0 / FS;
        V.forEach(function (s) { var e = env(t, s[0], s[1], 0.04); if (!e) return; for (var k = 1; k * f0 < 3800; k++) v += e * formant(k * f0, s[2]) * Math.sin(k * ph) * 0.35; });
        x[i] = v; }
      // "s": hiss between 2.5 and 3.9 kHz from 1.45 to 1.75 s
      var c = []; for (var q = 0; q < 70; q++) c.push([2500 + 1400 * r(), TAU * r()]);
      for (i = Math.floor(1.45 * FS); i < 1.75 * FS; i++) { t = i / FS; var s = 0; for (q = 0; q < c.length; q++) s += Math.sin(TAU * c[q][0] * t + c[q][1]); x[i] += env(t, 1.45, 1.75, 0.03) * s * 0.06; }
      for (i = 0; i < NS; i++) x[i] += 0.004 * gauss(r);
      return { x: x, marks: [[0.36, 'vowel "aa"'], [1.05, 'vowel "ee"'], [1.6, '"s"']] }; } },
    melody: { name: 'Melody', gen: function () {
      var x = new Float64Array(NS), notes = [[523, 'C5'], [659, 'E5'], [784, 'G5'], [1047, 'C6']], r = rng(5);
      for (var i = 0; i < NS; i++) { var t = i / FS, j = Math.min(3, Math.floor(t / 0.5)), tn = t - j * 0.5, e = Math.min(1, tn / 0.01) * Math.exp(-tn / 0.35) * (tn < 0.48 ? 1 : 0), f = notes[j][0];
        x[i] = e * (Math.sin(TAU * f * t) + 0.4 * Math.sin(TAU * 2 * f * t) + 0.2 * Math.sin(TAU * 3 * f * t)) * 0.5 + 0.003 * gauss(r); }
      return { x: x, marks: notes.map(function (n, j) { return [j * 0.5 + 0.25, n[1] + ' ' + n[0] + ' Hz']; }) }; } },
    chirp: { name: 'Chirp', gen: function () {
      var x = new Float64Array(NS); for (var i = 0; i < NS; i++) { var t = i / FS; x[i] = 0.8 * Math.sin(TAU * (300 * t + 800 * t * t)); } // f(t) = 300 + 1,600 t Hz
      return { x: x, marks: [[0.25, '700 Hz'], [1, '1,900 Hz'], [1.75, '3,100 Hz']] }; } },
    cough: { name: 'Hum + cough', gen: function () {
      var x = new Float64Array(NS), r = rng(9), lp = 0;
      for (var i = 0; i < NS; i++) { var t = i / FS, n = gauss(r); lp += 0.35 * (n - lp);
        x[i] = 0.3 * Math.sin(TAU * 100 * t) + 0.15 * Math.sin(TAU * 200 * t + 1) + 0.1 * Math.sin(TAU * 300 * t + 2) + 0.08 * Math.sin(TAU * 1200 * t) + env(t, 1.1, 1.38, 0.02) * Math.exp(-(t - 1.1) / 0.12) * 1.1 * (0.5 * n + lp); }
      return { x: x, marks: [[0.5, 'hum 100, 200, 300 Hz + fan 1,200 Hz'], [1.2, 'cough']] }; } }
  };

  function fft(re, im) {
    var n = re.length, i, j, k, l, t;
    for (i = 1, j = 0; i < n; i++) { var bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (l = 2; l <= n; l <<= 1) { var a = -TAU / l, wr = Math.cos(a), wi = Math.sin(a);
      for (i = 0; i < n; i += l) { var cr = 1, ci = 0; for (k = 0; k < l / 2; k++) { var p = i + k, q = p + l / 2, xr = re[q] * cr - im[q] * ci, xi = re[q] * ci + im[q] * cr;
        re[q] = re[p] - xr; im[q] = im[p] - xi; re[p] += xr; im[p] += xi; t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } }
  }
  /* one windowed frame starting at sample s: amplitude of bins 0 … N/2 (Hann window, scaled so a sine of amplitude A reads A) */
  function frame(x, s, N) {
    var re = new Float64Array(N), im = new Float64Array(N), sw = 0;
    for (var n = 0; n < N; n++) { var w = 0.5 - 0.5 * Math.cos(TAU * n / N); sw += w; re[n] = (x[s + n] || 0) * w; }
    fft(re, im); var a = new Float64Array(N / 2 + 1); for (var k = 0; k <= N / 2; k++) a[k] = 2 * Math.hypot(re[k], im[k]) / sw; return a;
  }
  function stft(x, N) { var hop = N / 4, F = [], s; for (s = 0; s + N <= x.length; s += hop) F.push(frame(x, s, N)); return { hop: hop, frames: F }; }
  function whole(x) { var M = 16384, re = new Float64Array(M), im = new Float64Array(M); for (var i = 0; i < x.length; i++) re[i] = x[i]; fft(re, im); var a = new Float64Array(M / 2 + 1); for (var k = 0; k <= M / 2; k++) a[k] = 2 * Math.hypot(re[k], im[k]) / x.length; return a; }

  if (typeof window === 'undefined' || !window.DCW) {
    if (typeof module !== 'undefined') module.exports = { SIG: SIG, frame: frame, stft: stft, whole: whole, FS: FS };
    return;
  }
  var D = window.DCW, h = D.h, C = D.C;
  var CMAP = [[16, 24, 48], [33, 64, 120], [47, 109, 181], [166, 79, 21], [240, 163, 94], [255, 244, 214]];
  function cmap(v) { v = Math.max(0, Math.min(1, v)) * (CMAP.length - 1); var i = Math.min(CMAP.length - 2, Math.floor(v)), f = v - i, a = CMAP[i], b = CMAP[i + 1]; return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
  var NS_LIST = [64, 128, 256, 512, 1024, 2048];

  D.register('stft', function (root) {
    var st = { sig: 'speech', ni: 2, pos: 0.36, playing: false };
    var S, X, SP, WH, gmax;
    var cv = D.canvas(1080, 770), g = cv.g, W = cv.w, H = cv.h;
    var off = document.createElement('canvas'), og = off.getContext('2d');
    var fbox = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.42' }), verdict = h('div', { cls: 'w-verdict warn', style: 'font-size:22px;padding:8px 14px;line-height:1.3' });
    var sigSeg = D.seg(Object.keys(SIG).map(function (k) { return [k, SIG[k].name]; }), st.sig, function (k) { setSig(k); });
    var nSl = D.slider('Window length N', 0, NS_LIST.length - 1, 1, st.ni, function (v) { return NS_LIST[v] + ' samples = ' + D.fmtN(NS_LIST[v] / FS * 1000, 0) + ' ms'; }, function (v) { st.ni = v; recompute(); });
    var pSl = D.slider('Window position t', 0, 2, 0.01, st.pos, function (v) { return D.fmtN(v, 2) + ' s'; }, function (v) { stopPlay(); st.pos = v; draw(); });
    var playB = D.btn('▶ Play and scan', function () { st.playing ? stopPlay() : startPlay(); }, 'acc');
    var note = h('p', { cls: 'w-note', style: 'margin:0' });
    var TAB = [['Steady: tone, hum, bandwidth', 'one FFT'], ['Changing: speech, music', 'STFT → spectrogram'], ['A whole image', '2-D FFT'], ['Where in an image', 'block DCT, Gabor, wavelets'], ['Compression: MP3, JPEG', 'DCT / MDCT']];
    var tab = h('table', { cls: 'w-tab', style: 'width:100%;font-size:21px' }, [h('tr', {}, [h('th', { text: 'Task', style: 'text-align:left;width:52%' }), h('th', { text: 'Use', style: 'text-align:left' })])].concat(TAB.map(function (r) { var cs = 'white-space:normal;text-align:left;font-family:' + D.SANS + ';padding:5px 8px;line-height:1.25'; return h('tr', {}, [h('td', { text: r[0], style: cs }), h('td', { html: '<b>' + r[1] + '</b>', style: cs + ';color:' + C.orange })]); })));
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:10px' }, [cv.c, verdict]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:10px' }, [
        h('div', { cls: 'w-card', style: 'gap:6px;padding:10px 18px' }, [sigSeg.el, nSl.el, pSl.el, h('div', { cls: 'w-row', style: 'gap:10px;align-items:center' }, [playB, note])]),
        h('div', { cls: 'w-card', style: 'gap:4px;padding:10px 18px' }, [fbox]),
        h('div', { cls: 'w-card', style: 'gap:6px;padding:10px 14px' }, [h('h4', { text: 'Which transform when?' }), tab])])]));

    function setSig(k) { st.sig = k; sigSeg.set(k); S = SIG[k].gen(); X = S.x; WH = whole(X); stopPlay(); recompute(); }
    function recompute() {
      var N = NS_LIST[st.ni]; SP = stft(X, N); gmax = 1e-9; SP.frames.forEach(function (a) { for (var k = 0; k < a.length; k++) if (a[k] > gmax) gmax = a[k]; });
      var nf = SP.frames.length, nb = N / 2; off.width = nf; off.height = nb;
      var id = og.createImageData(nf, nb), d = id.data;
      for (var c = 0; c < nf; c++) for (var k = 0; k < nb; k++) { var db = 20 * Math.log10(SP.frames[c][k] / gmax + 1e-12), col = cmap((db + 70) / 70), p = 4 * ((nb - 1 - k) * nf + c); d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2]; d[p + 3] = 255; }
      og.putImageData(id, 0, 0); draw();
    }

    /* ---------- sound + scan ---------- */
    var au = { ctx: null, src: null, t0: 0, raf: 0, poll: null };
    function startPlay() {
      st.playing = true; playB.textContent = '■ Stop'; var start = st.pos >= 1.95 ? 0 : st.pos;
      try {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) throw 0;
        if (!au.ctx) au.ctx = new AC(); if (au.ctx.state === 'suspended') au.ctx.resume();
        var buf = au.ctx.createBuffer(1, NS, FS), ch = buf.getChannelData(0), pk = 0, i; for (i = 0; i < NS; i++) pk = Math.max(pk, Math.abs(X[i])); for (i = 0; i < NS; i++) ch[i] = X[i] / pk * 0.8;
        var s = au.ctx.createBufferSource(), gn = au.ctx.createGain(); gn.gain.value = 0.35; s.buffer = buf; s.connect(gn); gn.connect(au.ctx.destination); s.start(0, start); au.src = s;
        au.t0 = au.ctx.currentTime - start; note.textContent = '';
      } catch (e) { au.src = null; au.t0 = performance.now() / 1000 - start; note.textContent = 'No sound here: scanning silently.'; }
      if (!au.poll) au.poll = setInterval(function () { if (!root.isConnected || !root.getClientRects().length) stopPlay(); }, 500);
      tick();
    }
    function now() { return au.src ? au.ctx.currentTime : performance.now() / 1000; }
    function tick() { if (!st.playing) return; st.pos = Math.min(2, now() - au.t0); pSl.set(st.pos); draw(); if (st.pos >= 2) { stopPlay(); return; } au.raf = requestAnimationFrame(tick); }
    function stopPlay() { st.playing = false; playB.textContent = '▶ Play and scan'; cancelAnimationFrame(au.raf); if (au.src) { try { au.src.stop(); } catch (e) { /* done */ } au.src = null; } if (au.poll) { clearInterval(au.poll); au.poll = null; } }
    if (window.IntersectionObserver) new IntersectionObserver(function (es) { es.forEach(function (e) { if (!e.isIntersecting && st.playing) stopPlay(); }); }).observe(root);

    /* ---------- drawing ---------- */
    var pl = 64, pr = 18;
    function TX(t) { return pl + t / DUR * (W - pl - pr); }
    function title(txt, x, y, col) { g.font = '600 22px ' + D.SANS; g.fillStyle = col || C.navy; g.textAlign = 'left'; g.textBaseline = 'alphabetic'; g.fillText(txt, x, y); }
    function draw() {
      var N = NS_LIST[st.ni], s0 = Math.max(0, Math.min(NS - N, Math.round(st.pos * FS - N / 2))), i;
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      // waveform
      var y0 = 40, y1 = 150, mid = (y0 + y1) / 2, pk = 0; for (i = 0; i < NS; i++) pk = Math.max(pk, Math.abs(X[i]));
      title('Signal in time (2 s): the orange window slides along', 14, 28, C.blue);
      g.strokeStyle = C.blue; g.lineWidth = 1; g.beginPath();
      for (var c = 0; c < W - pl - pr; c++) { var a0 = Math.floor(c / (W - pl - pr) * NS), a1 = Math.floor((c + 1) / (W - pl - pr) * NS), mn = 0, mx = 0; for (i = a0; i < a1; i++) { mn = Math.min(mn, X[i]); mx = Math.max(mx, X[i]); } g.moveTo(pl + c + 0.5, mid - mx / pk * (y1 - y0) / 2); g.lineTo(pl + c + 0.5, mid - mn / pk * (y1 - y0) / 2 + 0.5); }
      g.stroke();
      var wx0 = TX(s0 / FS), wx1 = Math.max(wx0 + 3, TX((s0 + N) / FS));
      g.fillStyle = 'rgba(240,163,94,.3)'; g.fillRect(wx0, y0 - 4, wx1 - wx0, y1 - y0 + 8); g.strokeStyle = C.orange; g.lineWidth = 2.5; g.strokeRect(wx0, y0 - 4, wx1 - wx0, y1 - y0 + 8);
      g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'center'; for (var tt = 0; tt <= 2; tt += 0.5) { g.textAlign = tt === 2 ? 'right' : 'center'; g.fillText(D.fmtN(tt, 1) + (tt === 2 ? ' s' : ''), TX(tt) + (tt === 2 ? 6 : 0), y1 + 24); }
      // two spectra
      var sy0 = 214, sy1 = 370, half = (W - 30) / 2;
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(10, 184); g.lineTo(W - 10, 184); g.stroke();
      title('FFT of this window only (t = ' + D.fmtN((s0 + N / 2) / FS, 2) + ' s)', 14, 208, C.orange);
      title('One FFT of the whole 2 s', 24 + half, 208, C.navy);
      function spec(arr, df, x0, w, col, mx) {
        var FX = function (f) { return x0 + 40 + f / 4000 * (w - 50); }, FY = function (v) { return sy1 - Math.min(1, v / mx) * (sy1 - sy0 - 10); }, k;
        g.fillStyle = col === C.orange ? 'rgba(166,79,21,.22)' : 'rgba(22,50,79,.15)'; g.strokeStyle = col; g.lineWidth = 1.6; g.beginPath(); g.moveTo(FX(0), sy1);
        var kmax = Math.min(arr.length - 1, Math.floor(4000 / df)), step = Math.max(1, Math.floor(kmax / (w - 50)));
        for (k = 0; k <= kmax; k += step) { var v = 0; for (var j = k; j < Math.min(kmax + 1, k + step); j++) v = Math.max(v, arr[j]); g.lineTo(FX(k * df), FY(v)); }
        g.lineTo(FX(kmax * df), sy1); g.closePath(); g.fill(); g.stroke();
        g.strokeStyle = C.gray; g.lineWidth = 1; g.beginPath(); g.moveTo(FX(0), sy1); g.lineTo(FX(4000), sy1); g.stroke();
        g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'center'; [0, 1000, 2000, 3000].forEach(function (f) { g.fillText(f ? (f / 1000) + 'k' : '0', FX(f), sy1 + 22); }); g.textAlign = 'right'; g.fillText('4k Hz', FX(4000) + 6, sy1 + 22);
      }
      var wm = 0; for (i = 1; i < WH.length && i * FS / 16384 <= 4000; i++) wm = Math.max(wm, WH[i]);
      spec(SP.frames[Math.min(SP.frames.length - 1, Math.round(s0 / SP.hop))], FS / N, 0, half, C.orange, gmax);
      spec(WH, FS / 16384, half + 10, half, C.navy, wm);
      g.font = '600 20px ' + D.SANS; g.fillStyle = C.red; g.textAlign = 'right'; g.fillText('which parts happen when? lost', W - 20, 236);
      // spectrogram
      var gy0 = 452, gy1 = H - 40;
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(10, 400); g.lineTo(W - 10, 400); g.stroke();
      title('Spectrogram = one FFT per window, side by side (colour = level, dB)', 14, 428);
      g.imageSmoothingEnabled = false; g.drawImage(off, TX(N / 2 / FS), gy0, TX((NS - N / 2) / FS) - TX(N / 2 / FS), gy1 - gy0);
      g.imageSmoothingEnabled = true;
      g.fillStyle = 'rgba(16,24,48,.55)'; if (st.playing) g.fillRect(TX(st.pos), gy0, TX(2) - TX(st.pos), gy1 - gy0);
      g.strokeStyle = C.light; g.lineWidth = 2; g.strokeRect(wx0, gy0, wx1 - wx0, gy1 - gy0);
      g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'right'; g.textBaseline = 'middle';
      [0, 1000, 2000, 3000, 4000].forEach(function (f) { g.fillText(f ? (f / 1000) + 'k' : '0', pl - 8, gy1 - f / 4000 * (gy1 - gy0)); });
      g.textBaseline = 'alphabetic'; g.textAlign = 'center'; for (tt = 0; tt <= 2; tt += 0.5) { g.textAlign = tt === 2 ? 'right' : 'center'; g.fillText(D.fmtN(tt, 1) + (tt === 2 ? ' s' : ''), TX(tt) + (tt === 2 ? 6 : 0), gy1 + 24); }
      g.save(); g.translate(16, (gy0 + gy1) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.font = '500 20px ' + D.SANS; g.fillText('Hz', 0, 0); g.restore();
      S.marks.forEach(function (m) { g.font = '600 20px ' + D.SANS; var tw = g.measureText(m[1]).width, x = Math.max(pl + 4, Math.min(W - pr - tw - 8, TX(m[0]) - tw / 2)); g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(x - 4, gy0 + 6, tw + 8, 26); g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText(m[1], x, gy0 + 26); });
      // readout
      var hop = SP.hop, df = FS / N, dt = N / FS * 1000;
      fbox.innerHTML = 'Δt = N / fs = ' + N + ' / 8,000 = <b>' + D.fmtN(dt, 0) + ' ms</b><br>Δf = fs / N = 8,000 / ' + N + ' = <b>' + D.fmtN(df, 2) + ' Hz</b><br>Δt × Δf = ' + D.fmtN(dt / 1000, 3) + ' × ' + D.fmtN(df, 2) + ' = <b>1</b><br>hop N/4 = ' + hop + ' → ' + SP.frames.length.toLocaleString('en-US') + ' FFTs of ' + N + ' points';
      var V = N <= 128 ? 'Short window: sharp in time (onsets, the cough, syllable edges) but blurry in frequency: harmonics closer than ' + D.fmtN(df, 0) + ' Hz merge.' :
        N >= 1024 ? 'Long window: sharp frequency lines, but anything shorter than ' + D.fmtN(dt, 0) + ' ms smears in time (notes and syllables run together).' :
        'Balanced: speech systems use windows of about 20–30 ms, short enough to follow the sounds, long enough to separate the harmonics.';
      verdict.innerHTML = '<b>Trade-off:</b> ' + V;
    }
    setSig('speech');
  });
})();
