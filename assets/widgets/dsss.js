(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, fx = D.fx, SANS = D.SANS, MONO = D.MONO;
  var BARKER = '10110111000', NC = 11, FI = 0.1, PHI = Math.PI; // interferer: FI cycles per bit, slowly varying = narrowband

  function gauss(rnd) { var u = rnd() || 1e-9, v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function mkRnd(seed) { var s = seed >>> 0; return function () { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
  function sim(bits, J, sigma, noise) { // noise: array of N(0,1), one per chip
    var chips = '', out = [];
    for (var b = 0; b < bits.length; b++) {
      var sd = 0, su = 0, inter = 0, ch = [];
      for (var k = 0; k < NC; k++) {
        var i = b * NC + k, c = D.xor(bits[b], BARKER[k]), pm = BARKER[k] === '1' ? 1 : -1;
        var I = J * Math.cos(2 * Math.PI * FI * (i + 0.5) / NC + PHI), n = sigma * (noise[i] || 0);
        var r = (c === '1' ? 1 : -1) + I + n;
        chips += c; ch.push({ c: c, r: r, I: I, d: r * pm });
        sd += r * pm; inter += I * pm; su += (bits[b] === '1' ? 1 : -1) + I + n;
      }
      out.push({ bit: bits[b], ch: ch, sum: sd, dec: sd > 0 ? '0' : '1', isum: inter, usum: su, udec: su > 0 ? '1' : '0' });
    }
    return { chips: chips, bits: out };
  }

  D.register('dsss', function (root) {
    var st = { bits: '10', J: 0, sigma: 0, seed: 7 }, noise = [];
    function regen() { var r = mkRnd(st.seed); noise = []; for (var i = 0; i < 6 * NC; i++) noise.push(gauss(r)); }
    regen();
    var cv = D.canvas(1080, 770), sp = D.canvas(560, 290), form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' }), verdict = h('div', { cls: 'w-verdict', style: 'font-size:24px' });
    var row = D.bitRow(st, 6, draw);
    var jSl = D.slider('Narrowband interference J', 0, 4, 0.1, 0, function (v) { return fmtN(v, 1) + ' × signal'; }, function (v) { st.J = v; draw(); });
    var nSl = D.slider('White noise σ', 0, 4, 0.05, 0, function (v) { return fmtN(v, 2); }, function (v) { st.sigma = v; draw(); });
    function setBits(b) { st.bits = b; row.render(); draw(); }
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:10px' }, [
        h('div', { cls: 'w-row', style: 'gap:16px;align-items:center' }, [h('span', { text: 'Data:', style: 'font-weight:600' }), row.el,
          D.btn('Slide: 10', function () { setBits('10'); }), D.btn('Random 6', function () { setBits(D.randBits(6)); })]),
        cv.c]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:10px' }, [
        h('div', { cls: 'w-card', style: 'gap:0;padding:2px 20px 10px' }, [jSl.el, nSl.el,
          h('div', { cls: 'w-btns' }, [D.btn('Jammer J = 2.5', function () { st.J = 2.5; jSl.set(2.5); draw(); }), D.btn('New noise', function () { st.seed = (st.seed * 31 + 17) % 100003; regen(); draw(); })])]),
        sp.c, h('div', { cls: 'w-card', style: 'padding:8px 18px' }, [form]), verdict])]));

    function levels(g, x0, cw, y, a, vals, col, lw) {
      g.strokeStyle = col; g.lineWidth = lw; g.beginPath();
      vals.forEach(function (v, i) { var yy = y - v * a; if (i === 0) g.moveTo(x0, yy); else g.lineTo(x0 + i * cw, yy); g.lineTo(x0 + (i + 1) * cw, yy); });
      g.stroke();
    }
    function draw() {
      var S = sim(st.bits, st.J, st.sigma, noise), nb = st.bits.length, N = nb * NC, g = cv.g, w = cv.w, H = cv.h;
      g.clearRect(0, 0, w, H); g.fillStyle = C.panel; g.fillRect(0, 0, w, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, H - 1);
      var x0 = 230, x1 = w - 20, cw = (x1 - x0) / N, bw = cw * NC;
      // bit boundaries
      for (var b = 0; b <= nb; b++) { g.strokeStyle = b === 0 || b === nb ? C.line : '#b9c3cd'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(x0 + b * bw, 10); g.lineTo(x0 + b * bw, H - 10); g.stroke(); }
      g.setLineDash([]);
      var rows = [['Data bits', 48], ['Barker code', 140], ['Chips sent', 232], ['Received', 362], ['× code', 514], ['Σ per bit', 664]];
      g.font = '600 22px ' + SANS; g.textAlign = 'left';
      rows.forEach(function (r) { g.fillStyle = C.navy; g.fillText(r[0], 16, r[1] + 8); });
      g.font = '500 20px ' + SANS; g.fillStyle = C.gray;
      g.fillText('(repeats every bit)', 16, 140 + 34); g.fillText('= data XOR code', 16, 232 + 34);
      if (st.J > 0) g.fillStyle = C.red; g.fillText(st.J > 0 ? '+ interference (red)' : '+ interference', 16, 362 + 34); g.fillStyle = C.gray; g.fillText('+ noise', 16, 362 + 60);
      g.fillText('code: 1 → +1,', 16, 514 + 34); g.fillText('0 → −1', 16, 514 + 60);
      // digital rows
      var dv = [], kv = [], cvv = [];
      for (var i = 0; i < N; i++) { dv.push(st.bits[Math.floor(i / NC)] === '1' ? 1 : -1); kv.push(BARKER[i % NC] === '1' ? 1 : -1); cvv.push(S.chips[i] === '1' ? 1 : -1); }
      levels(g, x0, cw, 48, 22, dv, C.blue, 4); levels(g, x0, cw, 140, 22, kv, C.green, 3); levels(g, x0, cw, 232, 22, cvv, C.orange, 3);
      g.font = '700 24px ' + MONO; g.fillStyle = C.blue; g.textAlign = 'center';
      for (b = 0; b < nb; b++) g.fillText(st.bits[b], x0 + (b + 0.5) * bw, 57);
      if (cw >= 22) {
        g.font = '600 20px ' + MONO;
        for (i = 0; i < N; i++) { g.fillStyle = C.green; g.fillText(BARKER[i % NC], x0 + (i + 0.5) * cw, 140 + 46); g.fillStyle = C.orange; g.fillText(S.chips[i], x0 + (i + 0.5) * cw, 232 + 46); }
      }
      // received (analog)
      var aR = 22, yR = 362, yD = 514;
      g.strokeStyle = C.grid; g.lineWidth = 1; [yR, yD].forEach(function (y) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); });
      if (st.J > 0) {
        g.strokeStyle = C.red; g.lineWidth = 2; g.setLineDash([8, 6]); g.beginPath();
        for (var p = 0; p <= 400; p++) { var t = p / 400 * N, yy = yR - st.J * Math.cos(2 * Math.PI * FI * t / NC + PHI) * aR; p ? g.lineTo(x0 + t * cw, yy) : g.moveTo(x0 + t * cw, yy); }
        g.stroke(); g.setLineDash([]);
      }
      var clip = function (v) { return Math.max(-2.6, Math.min(2.6, v)); };
      levels(g, x0, cw, yR, aR, S.bits.reduce(function (a, B) { return a.concat(B.ch.map(function (c) { return clip(c.r); })); }, []), C.navy, 2.5);
      levels(g, x0, cw, yD, aR, S.bits.reduce(function (a, B) { return a.concat(B.ch.map(function (c) { return clip(c.d); })); }, []), C.orange, 2.5);
      g.font = '500 20px ' + SANS; g.textAlign = 'right'; g.fillStyle = C.red;
      // integrate
      var yI = 664, aI = 3.6;
      g.strokeStyle = C.gray; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, yI); g.lineTo(x1, yI); g.stroke();
      S.bits.forEach(function (B, b) {
        var cx = x0 + (b + 0.5) * bw, hh = Math.max(-16, Math.min(16, B.sum)) * aI, ok = B.dec === B.bit;
        g.fillStyle = ok ? C.green : C.red; g.fillRect(cx - Math.min(40, bw * 0.25), yI - Math.max(0, hh), Math.min(80, bw * 0.5), Math.abs(hh));
        var uok = B.udec === B.bit, lines = [[(bw > 150 ? 'Σ = ' : '') + fx(B.sum, 1), ok ? C.green : C.red], ['→ ' + B.dec + (ok ? ' ✓' : ' ✗'), ok ? C.green : C.red],
          ['plain ' + B.udec + (uok ? ' ✓' : ' ✗'), uok ? C.gray : C.red]];
        g.textAlign = 'center';
        lines.forEach(function (L, j) { g.font = (j < 2 ? '600 ' : '500 ') + '20px ' + SANS; g.fillStyle = L[1]; g.fillText(L[0], cx, B.sum >= 0 ? yI + 24 + j * 22 : yI - 52 + j * 22); });
      });
      g.font = '500 20px ' + SANS; g.fillStyle = C.gray; g.textAlign = 'left';
      g.fillText('+11 → 0', 16, 664 + 34); g.fillText('−11 → 1', 16, 664 + 60);
      // ---- spectrum (dB): before and after despreading
      var s = sp.g, sw = sp.w, sh = sp.h;
      s.clearRect(0, 0, sw, sh); s.fillStyle = C.panel; s.fillRect(0, 0, sw, sh); s.strokeStyle = C.line; s.lineWidth = 1; s.strokeRect(0.5, 0.5, sw - 1, sh - 1);
      var px0 = 14, px1 = sw - 14, FM = 14, X = function (f) { return (px0 + px1) / 2 + f / FM * (px1 - px0) / 2; };
      function panel(y0, hh, title, spread) {
        var dbMin = -24, dbMax = 10, Y = function (db) { return y0 + hh - (Math.max(dbMin, Math.min(dbMax, db)) - dbMin) / (dbMax - dbMin) * (hh - 26); };
        s.fillStyle = C.navy; s.font = '600 20px ' + SANS; s.textAlign = 'left'; s.fillText(title, px0, y0 + 18);
        s.strokeStyle = C.gray; s.beginPath(); s.moveTo(px0, y0 + hh); s.lineTo(px1, y0 + hh); s.stroke();
        function curve(fn, col, lw, dash) {
          s.strokeStyle = col; s.lineWidth = lw; s.setLineDash(dash || []); s.beginPath();
          for (var q = 0; q <= 500; q++) { var f = -FM + 2 * FM * q / 500, v = fn(f), db = 10 * Math.log10(Math.max(v, 1e-6)); q ? s.lineTo(X(f), Y(db)) : s.moveTo(X(f), Y(db)); }
          s.stroke(); s.setLineDash([]);
        }
        var sinc2 = function (x) { if (Math.abs(x) < 1e-9) return 1; var a = Math.PI * x; return Math.pow(Math.sin(a) / a, 2); };
        if (spread) { curve(function (f) { return sinc2(f); }, C.sky, 2, [6, 5]); curve(function (f) { return sinc2(f / NC) / NC; }, C.orange, 3); }
        else curve(function (f) { return sinc2(f); }, C.blue, 3);
        if (st.J > 0) {
          var pw = st.J * st.J / 2;
          if (spread) { s.strokeStyle = C.red; s.lineWidth = 4; s.beginPath(); s.moveTo(X(FI), y0 + hh); s.lineTo(X(FI), Y(10 * Math.log10(pw))); s.stroke(); }
          else curve(function (f) { return pw * sinc2((f - FI) / NC) / NC; }, C.red, 2.5);
        }
        return Y;
      }
      panel(6, 124, 'On the air: data spread 11 × wider', true);
      panel(140, 120, 'After × code: data back, jammer spread', false);
      s.font = '500 20px ' + SANS; s.fillStyle = C.gray; s.textAlign = 'right'; s.fillText('power, dB', sw - 12, 24);
      s.font = '500 20px ' + MONO; s.fillStyle = C.gray; s.textAlign = 'center';
      [-11, 0, 11].forEach(function (f) { s.fillText(f === 0 ? '0' : (f > 0 ? '+' : '−') + '11 MHz', X(f), 284); });
      // formulas
      var errD = S.bits.filter(function (B) { return B.dec !== B.bit; }).length, errU = S.bits.filter(function (B) { return B.udec !== B.bit; }).length;
      var B0 = S.bits[0];
      form.innerHTML = 'Chips = 11 × 1 Mbps = <b>11 Mchips/s</b>\nBandwidth ≈ 2 × 11 MHz = 22 MHz\nGain = 10 log₁₀ 11 = <b>10.4 dB</b>\n' +
        'Jammer in Σ, bit 1: <b>' + fx(B0.isum, 1) + '</b> (plain ' + fx(B0.ch.reduce(function (a, c) { return a + c.I; }, 0), 1) + ')';
      verdict.className = 'w-verdict ' + (errD ? 'bad' : errU ? 'ok' : 'ok');
      verdict.textContent = 'Bit errors: DSSS ' + errD + ' of ' + nb + ', without spreading ' + errU + ' of ' + nb + '.' +
        (st.J > 0 && errU > errD ? ' Despreading scatters the jammer.' : st.sigma > 0 && !st.J ? ' White noise is not reduced by spreading.' : '');
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { sim: sim, BARKER: BARKER };
})();
