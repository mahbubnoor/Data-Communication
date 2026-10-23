/* Try it: the Fourier family (FS, FT, DTFT, DFT) and the FFT (Lecture 2, after "which domain") */
(function () {
  'use strict';
  var TAU = 2 * Math.PI;
  /* Example used in every cell: a pulse 4 sample periods wide; the periodic versions repeat every 16. Frequencies in units of fs. */
  var L = 4, N = 16;
  function sinc(x) { return Math.abs(x) < 1e-9 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x); }
  function ftMag(f) { return Math.abs(sinc(f * L)); }                                  // |X(f)| / L of a continuous pulse of width L
  function dtftMag(f) { var s = Math.sin(Math.PI * f); return Math.abs(s) < 1e-9 ? 1 : Math.abs(Math.sin(Math.PI * f * L) / (L * s)); } // Dirichlet
  function fftOps(n) { return n / 2 * Math.log2(n); }

  var CELL = {
    fs: { name: 'Fourier series', tag: 'FS', row: 0, col: 0, time: 'continuous, periodic', spec: 'discrete lines at n/T, not periodic',
      f: 'x(t) = Σ cₙ e^(j2πnt/T),  n = 0, ±1 …<br>cₙ = (1/T) ∫₀ᵀ x(t) e^(−j2πnt/T) dt',
      use: 'Periodic signals worked by hand: the harmonics of a square wave, mains distortion (150, 250 Hz …), the harmonics slides of this lecture.',
      comp: ['warn', 'Not directly: a computer approximates it with the DFT of one period.'] },
    ft: { name: 'Fourier transform', tag: 'FT', row: 0, col: 1, time: 'continuous, not periodic', spec: 'continuous, not periodic',
      f: 'X(f) = ∫ x(t) e^(−j2πft) dt,  all t<br>x(t) = ∫ X(f) e^(j2πft) df',
      use: 'Theory of analog signals: the bandwidth of a pulse (first zero at 1/τ), AM and FM spectra, analog filters. The "big idea" behind all the others.',
      comp: ['bad', 'No: infinite time and continuous frequency. Theory and pen-and-paper only.'] },
    dtft: { name: 'Discrete-time FT', tag: 'DTFT', row: 1, col: 1, time: 'discrete samples, not periodic', spec: 'continuous, repeats every fs',
      f: 'X(f) = Σ x[n] e^(−j2πfn/fs),  all n<br>X(f + fs) = X(f): copies every fs',
      use: 'Theory of sampling and digital filters: why the spectrum repeats every fs and why fs > 2B (Nyquist, Lecture 5).',
      comp: ['warn', 'Not exactly: f is continuous, so there are infinitely many values to compute.'] },
    dft: { name: 'Discrete Fourier transform', tag: 'DFT', row: 1, col: 0, time: 'N samples (treated as one period)', spec: 'N values, fs/N apart, repeat every fs',
      f: 'X[k] = Σ x[n] e^(−j2πkn/N)<br>n, k = 0 … N−1;  bin k at f = k·fs/N',
      use: 'Everything digital: MATLAB fft, NumPy np.fft, spectrum analysers, OFDM in Wi-Fi and 4G/5G, every spectrum on these slides.',
      comp: ['ok', 'Yes, exactly: N numbers in, N numbers out. Computed with the FFT algorithm.'] }
  };
  var PATH = [
    { cell: null, t: 'Press ▶ to follow a real signal from the analog world into a computer.' },
    { cell: 'ft', t: '1. A real sound is continuous and one-off: its spectrum is the Fourier transform X(f), continuous.' },
    { cell: 'dtft', t: '2. Sample it every 1/fs: the spectrum becomes the DTFT and repeats every fs. Copies must not overlap: fs > 2B (Nyquist).' },
    { cell: 'dft', t: '3. Keep N samples and compute N frequencies, fs/N apart: the DFT. These are samples of the DTFT, so this is what a computer can store.' },
    { cell: 'dft', t: '4. Compute the DFT with the FFT algorithm: the same N numbers, but (N/2)·log₂N operations instead of N².', fft: true }
  ];

  if (typeof window === 'undefined' || !window.DCW) {
    if (typeof module !== 'undefined') module.exports = { ftMag: ftMag, dtftMag: dtftMag, fftOps: fftOps, L: L, N: N };
    return;
  }
  var D = window.DCW, h = D.h, C = D.C;

  D.register('fourierfamily', function (root) {
    var st = { sel: 'dft', step: 0, n: 10 };
    var cv = D.canvas(1080, 730), g = cv.g, W = cv.w, H = cv.h, HD = 40, RL = 48, GAP = 14;
    var cw = (W - RL - GAP) / 2, ch = (H - HD - GAP) / 2;
    var title = h('h4', { style: 'margin:0;font-size:26px' }), sub = h('p', { cls: 'w-note', style: 'margin:0' }), form = h('div', { cls: 'w-f', style: 'font-size:21px;line-height:1.5' }), use = h('p', { style: 'margin:0;font-size:22px;line-height:1.35' }), comp = h('div', { cls: 'w-verdict', style: 'font-size:22px;padding:8px 14px;line-height:1.3' });
    var pathTxt = h('p', { style: 'margin:0;font-size:22px;line-height:1.35;min-height:90px' });
    var pPrev = D.btn('◀', function () { setStep(st.step - 1); }), pNext = D.btn('▶ Next step', function () { setStep(st.step + 1); }, 'acc');
    var nSl = D.slider('Number of samples N', 3, 16, 1, 10, function (v) { return Math.pow(2, v).toLocaleString('en-US'); }, function (v) { st.n = v; fftBox(); });
    var fftF = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.45' });
    var rule = h('div', { cls: 'w-verdict warn', style: 'font-size:23px;padding:10px 16px;line-height:1.3', html: '<b>The rule:</b> discrete in one domain ⇔ periodic in the other. Periodic in time → lines 1/T apart; sampled in time → copies every fs. The DFT is both: N numbers on each side.' });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:12px' }, [cv.c, rule]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:10px' }, [
        h('div', { cls: 'w-card', style: 'gap:6px;padding:12px 18px' }, [title, form, use, comp]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 18px' }, [h('h4', { text: 'From the real world to a computer' }), pathTxt, h('div', { cls: 'w-btns', style: 'gap:8px' }, [pPrev, pNext])]),
        h('div', { cls: 'w-card', style: 'gap:2px;padding:8px 18px 12px' }, [h('h4', { text: 'Multiplications: DFT formula vs FFT' }), nSl.el, fftF])])]));

    function setStep(k) { st.step = Math.max(0, Math.min(PATH.length - 1, k)); if (PATH[st.step].cell) st.sel = PATH[st.step].cell; render(); }
    function cellRect(c) { return { x: RL + c.col * (cw + GAP), y: HD + c.row * (ch + GAP) }; }
    function local(e) { var r = cv.c.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
    cv.c.addEventListener('click', function (e) { var p = local(e); Object.keys(CELL).forEach(function (k) { var r = cellRect(CELL[k]); if (p.x >= r.x && p.x <= r.x + cw && p.y >= r.y && p.y <= r.y + ch) { st.sel = k; render(); } }); });
    cv.c.style.cursor = 'pointer';

    function fftBox() {
      var n = Math.pow(2, st.n), a = n * n, b = fftOps(n), fmt = function (v) { return Math.round(v).toLocaleString('en-US'); };
      function tm(ops) { var s = ops * 1e-9; return s < 1e-3 ? D.fmtN(s * 1e6, 1) + ' µs' : s < 1 ? D.fmtN(s * 1e3, 2) + ' ms' : D.fmtN(s, 2) + ' s'; }
      fftF.innerHTML = 'DFT: N² = ' + fmt(a) + '<br>FFT: (N/2)·log₂N = ' + fmt(n / 2) + ' × ' + Math.log2(n) + ' = ' + fmt(b) + '<br><b>' + fmt(a / b) + ' × faster</b>, same numbers<br><span style="color:' + C.gray + '">at 1 ns per multiply: ' + tm(a) + ' vs ' + tm(b) + '</span>';
    }

    /* ---------- mini plots ---------- */
    function axis(x0, y0, w) { g.strokeStyle = C.gray; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x0 + w, y0); g.stroke(); }
    function timePlot(c, x0, y0, w, hh) {
      var base = y0 + hh, top = y0 + 30, span = 40, X = function (t) { return x0 + (t + 20) / span * w; }, Y = function (v) { return base - v * (base - top); };
      var periodic = c.col === 0, discrete = c.row === 1, i;
      axis(x0, base, w);
      function pulseOn(t) { if (periodic) { var m = ((t % N) + N) % N; return m < L; } return t >= 0 && t < L; }
      if (!discrete) { g.strokeStyle = C.blue; g.lineWidth = 2.5; g.beginPath(); for (i = 0; i <= 400; i++) { var t = -20 + i / 400 * span, v = pulseOn(t) ? 1 : 0; i ? g.lineTo(X(t), Y(v)) : g.moveTo(X(t), Y(v)); } g.stroke(); }
      else {
        for (var n = -20; n < 20; n++) {
          var inWin = c.tag === 'DFT' ? (n >= 0 && n < N) : true, v2 = pulseOn(n) ? 1 : 0;
          g.globalAlpha = inWin ? 1 : 0.28; g.strokeStyle = C.blue; g.fillStyle = C.blue; g.lineWidth = 2;
          g.beginPath(); g.moveTo(X(n), base); g.lineTo(X(n), Y(v2)); g.stroke(); g.beginPath(); g.arc(X(n), Y(v2), 3.2, 0, TAU); g.fill(); g.globalAlpha = 1;
        }
        if (c.tag === 'DFT') { g.strokeStyle = C.orange; g.setLineDash([5, 4]); g.lineWidth = 1.5; g.strokeRect(X(-0.5), top - 4, X(N - 0.5) - X(-0.5), base - top + 8); g.setLineDash([]);
          g.font = '600 18px ' + D.SANS; g.fillStyle = C.orange; g.textAlign = 'center'; g.fillText('N = 16 kept', (X(-0.5) + X(N - 0.5)) / 2, top - 10); }
      }
      g.font = '500 18px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText(discrete ? 'n' : 't', x0 + w, base + 20);
      if (periodic && !discrete) { g.fillStyle = C.navy; g.textAlign = 'center'; g.font = '600 18px ' + D.SANS; g.fillText('T', (X(0) + X(N)) / 2, top - 20); g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X(0), top - 6); g.lineTo(X(0), top - 14); g.lineTo(X(N), top - 14); g.lineTo(X(N), top - 6); g.stroke(); }
    }
    function specPlot(c, x0, y0, w, hh) {
      var base = y0 + hh, top = y0 + 30, F = 1.5, X = function (f) { return x0 + (f + F) / (2 * F) * w; }, Y = function (v) { return base - v * (base - top); };
      var periodic = c.col === 0, discrete = c.row === 1, i, f;
      axis(x0, base, w);
      var mag = discrete ? dtftMag : ftMag;
      if (periodic) { // lines
        var df = 1 / N;
        for (f = -F; f <= F + 1e-9; f += df) { var k = Math.round(f / df), ff = k * df, v = mag(ff); if (v < 0.02) continue;
          g.strokeStyle = C.orange; g.fillStyle = C.orange; g.lineWidth = 2; g.beginPath(); g.moveTo(X(ff), base); g.lineTo(X(ff), Y(v)); g.stroke(); g.beginPath(); g.arc(X(ff), Y(v), 2.6, 0, TAU); g.fill(); }
        g.strokeStyle = 'rgba(166,79,21,.4)'; g.setLineDash([4, 4]); g.lineWidth = 1.2; g.beginPath(); for (i = 0; i <= 300; i++) { f = -F + i / 300 * 2 * F; i ? g.lineTo(X(f), Y(mag(f))) : g.moveTo(X(f), Y(mag(f))); } g.stroke(); g.setLineDash([]);
      } else {
        g.fillStyle = 'rgba(166,79,21,.22)'; g.strokeStyle = C.orange; g.lineWidth = 2.2; g.beginPath(); g.moveTo(X(-F), base);
        for (i = 0; i <= 400; i++) { f = -F + i / 400 * 2 * F; g.lineTo(X(f), Y(mag(f))); } g.lineTo(X(F), base); g.closePath(); g.fill();
        g.beginPath(); for (i = 0; i <= 400; i++) { f = -F + i / 400 * 2 * F; i ? g.lineTo(X(f), Y(mag(f))) : g.moveTo(X(f), Y(mag(f))); } g.stroke();
      }
      g.font = '500 18px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'center';
      if (discrete) { [-1, 0, 1].forEach(function (q) { g.fillText(q === 0 ? '0' : (q > 0 ? 'fs' : '−fs'), X(q), base + 20); g.strokeStyle = C.gray; g.beginPath(); g.moveTo(X(q), base); g.lineTo(X(q), base + 5); g.stroke(); });
        g.font = '600 18px ' + D.SANS; g.fillStyle = C.red; g.fillText('copies repeat every fs', X(0), top - 12); }
      else { g.fillText('0', X(0), base + 20); }
      g.font = '500 18px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText('f', x0 + w, base + 20);
    }
    function arrow(x1, y1, x2, y2, label) {
      g.strokeStyle = C.orange; g.fillStyle = C.orange; g.lineWidth = 4; g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
      var a = Math.atan2(y2 - y1, x2 - x1); g.beginPath(); g.moveTo(x2, y2); g.lineTo(x2 - 16 * Math.cos(a - 0.45), y2 - 16 * Math.sin(a - 0.45)); g.lineTo(x2 - 16 * Math.cos(a + 0.45), y2 - 16 * Math.sin(a + 0.45)); g.closePath(); g.fill();
      g.font = '700 20px ' + D.SANS; var tw = g.measureText(label).width, mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      g.fillStyle = C.orange; g.fillRect(mx - tw / 2 - 10, my - 17, tw + 20, 32); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(label, mx, my + 6);
    }
    function draw() {
      g.clearRect(0, 0, W, H);
      g.font = '700 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillText('Periodic in time', RL + cw / 2, 30); g.fillText('Not periodic (one pulse)', RL + cw + GAP + cw / 2, 30);
      ['Continuous time', 'Sampled (discrete) time'].forEach(function (t, r) { g.save(); g.translate(26, HD + r * (ch + GAP) + ch / 2); g.rotate(-Math.PI / 2); g.fillText(t, 0, 0); g.restore(); });
      var step = PATH[st.step];
      Object.keys(CELL).forEach(function (k) {
        var c = CELL[k], r = cellRect(c), sel = st.sel === k, onPath = step.cell === k;
        g.fillStyle = sel ? '#fff7ef' : C.panel; g.fillRect(r.x, r.y, cw, ch);
        g.strokeStyle = sel ? C.orange : C.line; g.lineWidth = sel ? 4 : 1.2; g.strokeRect(r.x + (sel ? 2 : 0.5), r.y + (sel ? 2 : 0.5), cw - (sel ? 4 : 1), ch - (sel ? 4 : 1));
        g.textAlign = 'left'; g.font = '700 24px ' + D.SANS; g.fillStyle = C.navy; g.fillText(c.name, r.x + 16, r.y + 34);
        var nw = g.measureText(c.name).width; g.font = '600 20px ' + D.MONO; g.fillStyle = C.orange; g.fillText('(' + c.tag + ')', r.x + 24 + nw, r.y + 34);
        if (k === 'dft') { var lab = step.fft ? 'computed by the FFT' : 'computers use this'; g.font = '700 18px ' + D.SANS; var bw = g.measureText(lab).width + 20; g.fillStyle = step.fft ? C.orange : C.green; g.fillRect(r.x + cw - bw - 12, r.y + 48, bw, 28); g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(lab, r.x + cw - 12 - bw / 2, r.y + 68); }
        var pw = (cw - 64) / 2, py = r.y + 70, ph = ch - 150;
        timePlot(c, r.x + 16, py, pw, ph); specPlot(c, r.x + 48 + pw, py, pw, ph);
        g.fillStyle = C.gray; g.font = '700 26px ' + D.SANS; g.textAlign = 'center'; g.fillText('→', r.x + 32 + pw, py + ph / 2 + 8);
        g.font = '500 19px ' + D.SANS; g.textAlign = 'left'; g.fillStyle = C.blue; g.fillText('time: ' + c.time, r.x + 16, r.y + ch - 40);
        g.fillStyle = C.orange; g.fillText('spectrum: ' + c.spec, r.x + 16, r.y + ch - 14);
        if (onPath && !sel) { g.strokeStyle = C.orange; g.lineWidth = 3; g.strokeRect(r.x + 1.5, r.y + 1.5, cw - 3, ch - 3); }
      });
      [['ft', '1'], ['dtft', '2'], ['dft', '3 4']].forEach(function (b) { if (st.step === 0) return; var r = cellRect(CELL[b[0]]), on = step.cell === b[0], txt = 'step ' + b[1];
        g.font = '700 18px ' + D.SANS; var bw = g.measureText(txt).width + 20, bx = r.x + cw - bw - 12, by = r.y + 14;
        g.fillStyle = on ? C.orange : '#e9d3c0'; g.fillRect(bx, by, bw, 28); g.fillStyle = on ? '#fff' : C.orange; g.textAlign = 'center'; g.fillText(txt, bx + bw / 2, by + 20); });
    }
    function render() {
      var c = CELL[st.sel];
      title.innerHTML = c.name + ' <span style="color:' + C.orange + ';font-family:' + D.MONO + '">(' + c.tag + ')</span>';
      sub.textContent = 'Time: ' + c.time + '. Spectrum: ' + c.spec + '.';
      form.innerHTML = c.f; use.innerHTML = '<b>Used for:</b> ' + c.use;
      comp.className = 'w-verdict ' + c.comp[0]; comp.innerHTML = '<b>Can a computer calculate it?</b> ' + c.comp[1];
      pathTxt.textContent = PATH[st.step].t; pPrev.disabled = st.step === 0; pNext.disabled = st.step === PATH.length - 1;
      fftBox(); draw();
    }
    render();
  });
})();
