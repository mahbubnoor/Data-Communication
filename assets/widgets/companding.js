/* Try it: companding, small sounds get more levels (Lecture 5, after slide "companding"). Slides "quantize", "sqnr", "companding". */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C;

  /*PURE*/
  // μ-law compressor on the normalised range −1..+1 (slide "companding", μ = 255); μ = 0 means uniform (F(x) = x).
  function F(x, mu) { return mu <= 0 ? x : (x < 0 ? -1 : 1) * Math.log(1 + mu * Math.abs(x)) / Math.log(1 + mu); }
  function Finv(y, mu) { return mu <= 0 ? y : (y < 0 ? -1 : 1) * (Math.pow(1 + mu, Math.abs(y)) - 1) / mu; }
  // quantiser as on slide "quantize": L = 2^n equal zones on −1..+1, value = middle of the zone; applied to F(x), then expanded.
  function quant(x, n, mu) {
    var L = Math.pow(2, n), d = 2 / L, i = Math.floor((F(x, mu) + 1) / d);
    if (i < 0) i = 0; if (i > L - 1) i = L - 1;
    return Finv(-1 + (i + 0.5) * d, mu);
  }
  function levels(n, mu) { var L = Math.pow(2, n), d = 2 / L, out = []; for (var i = 0; i < L; i++) out.push(Finv(-1 + (i + 0.5) * d, mu)); return out; }
  // SQNR of a sine of peak A (1 = full range), measured over one densely sampled cycle
  function sqnr(A, n, mu) {
    var s = 0, e = 0, M = 4000;
    for (var k = 0; k < M; k++) { var x = A * Math.sin(2 * Math.PI * (k + 0.37) / M), d = quant(x, n, mu) - x; s += x * x; e += d * d; }
    return 10 * Math.log10(s / Math.max(e, 1e-30));
  }
  /*END*/

  function num(x, d) { return D.fmtN(x, d === undefined ? 2 : d); }

  D.register('companding', function (root) {
    var st = { n: 4, mu: 255, db: -30 };
    var cv = D.canvas(1080, 820);
    var form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' });
    var tab = h('table', { cls: 'w-tab', style: 'font-size:23px;width:100%' });
    var verdict = h('div', { cls: 'w-verdict', style: 'font-size:24px' });
    var sN = D.slider('Bits per sample n', 2, 8, 1, st.n, function (v) { return v + ' bits (L = ' + Math.pow(2, v) + ')'; }, function (v) { st.n = v; draw(); });
    var sM = D.slider('μ (0 = uniform)', 0, 255, 1, st.mu, function (v) { return 'μ = ' + v; }, function (v) { st.mu = v; draw(); });
    var sQ = D.slider('Quiet signal level', -50, -6, 1, st.db, function (v) { return num(v, 0) + ' dB (A = ' + num(Math.pow(10, v / 20), 3) + ')'; }, function (v) { st.db = v; draw(); });
    function pre(n, mu, db) { return function () { st.n = n; st.mu = mu; st.db = db; sN.set(n); sM.set(mu); sQ.set(db); draw(); }; }
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px;align-items:flex-start' }, [
      cv.c,
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-btns', style: 'gap:8px' }, [D.btn('4 bits, μ = 255', pre(4, 255, -30)), D.btn('G.711: 8 bits', pre(8, 255, -30), 'acc'), D.btn('8 bits, μ = 0', pre(8, 0, -30))]),
        h('div', { cls: 'w-card', style: 'gap:0;padding-top:8px;padding-bottom:0' }, [sN.el, sM.el, sQ.el]),
        h('div', { cls: 'w-card', style: 'padding:12px 18px;gap:8px' }, [form, tab]), verdict])]));

    function frame(g, x, y, w, hh) { g.fillStyle = C.panel; g.fillRect(x, y, w, hh); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, hh - 1); }
    function txt(g, s, x, y, col, font, al) { g.font = font || '600 22px ' + D.SANS; g.fillStyle = col || C.navy; g.textAlign = al || 'left'; g.textBaseline = 'middle'; g.fillText(s, x, y); }

    function draw() {
      var n = st.n, mu = st.mu, Aq = Math.pow(10, st.db / 20), L = Math.pow(2, n), g = cv.g;
      var lvU = levels(n, 0), lvM = levels(n, mu), muName = mu ? 'μ-law, μ = ' + mu : 'μ = 0 (uniform)';
      g.clearRect(0, 0, cv.w, cv.h);
      // ---------- compressor curve
      frame(g, 0, 0, 420, 400);
      txt(g, 'Compressor y = F(x)', 18, 24);
      var cx0 = 60, cx1 = 400, cy0 = 380, cy1 = 54, CX = function (x) { return (cx0 + cx1) / 2 + x * (cx1 - cx0) / 2; }, CY = function (y) { return (cy0 + cy1) / 2 - y * (cy0 - cy1) / 2; };
      g.fillStyle = 'rgba(47,109,181,0.13)'; g.fillRect(CX(-Aq), cy1, CX(Aq) - CX(-Aq), cy0 - cy1);
      g.fillStyle = 'rgba(166,79,21,0.10)'; g.fillRect(cx0, CY(F(Aq, mu)), cx1 - cx0, CY(-F(Aq, mu)) - CY(F(Aq, mu)));
      g.strokeStyle = C.line; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx0, CY(0)); g.lineTo(cx1, CY(0)); g.moveTo(CX(0), cy0); g.lineTo(CX(0), cy1); g.stroke();
      // zone boundaries on the y axis, projected through the curve down to x (shows where the levels land)
      if (n <= 5) {
        g.strokeStyle = 'rgba(22,50,79,0.22)'; g.lineWidth = 1;
        for (var i = 1; i < L; i++) { var yb = -1 + i * 2 / L, xb = Finv(yb, mu); g.beginPath(); g.moveTo(cx0, CY(yb)); g.lineTo(CX(xb), CY(yb)); g.lineTo(CX(xb), cy0); g.stroke(); }
      }
      g.setLineDash([6, 6]); g.strokeStyle = C.gray; g.lineWidth = 2; g.beginPath(); g.moveTo(CX(-1), CY(-1)); g.lineTo(CX(1), CY(1)); g.stroke(); g.setLineDash([]);
      g.strokeStyle = C.orange; g.lineWidth = 4; g.beginPath();
      for (i = 0; i <= 800; i++) { var xx = -1 + 2 * i / 800; if (i) g.lineTo(CX(xx), CY(F(xx, mu))); else g.moveTo(CX(xx), CY(F(xx, mu))); }
      g.stroke();
      txt(g, '+1', cx1 - 4, cy0 - 14, C.gray, '500 20px ' + D.MONO, 'right'); txt(g, 'x', cx1 - 4, CY(0) + 16, C.gray, 'italic 600 22px ' + D.SANS, 'right');
      txt(g, '+1', CX(0) - 8, cy1 + 10, C.gray, '500 20px ' + D.MONO, 'right');
      txt(g, '−1', cx0 - 6, CY(-1) + 2, C.gray, '500 20px ' + D.MONO, 'right');
      txt(g, 'quiet ±A', CX(0) + 8, cy0 - 14, C.blue, '600 20px ' + D.SANS);
      txt(g, '→ ' + num(100 * F(Aq, mu), 1) + ' % of y', cx0 + 6, CY(0) - 18, C.orange, '600 20px ' + D.SANS);
      // ---------- level rulers on the original scale
      frame(g, 436, 0, 644, 400);
      txt(g, 'The ' + L + ' levels, drawn on the original scale', 454, 24);
      var rx0 = 470, rx1 = 1046, RX = function (x) { return (rx0 + rx1) / 2 + x * (rx1 - rx0) / 2; };
      function ruler(y0, lv, col, label) {
        txt(g, label, rx0, y0 - 22, col, '600 22px ' + D.SANS);
        g.fillStyle = 'rgba(47,109,181,0.15)'; g.fillRect(RX(-Aq), y0, RX(Aq) - RX(-Aq), 56);
        g.strokeStyle = C.navy; g.lineWidth = 1.5; g.beginPath(); g.moveTo(rx0, y0 + 56); g.lineTo(rx1, y0 + 56); g.stroke();
        g.strokeStyle = col; g.lineWidth = L > 64 ? 1 : 2.5;
        lv.forEach(function (v) { g.beginPath(); g.moveTo(RX(v), y0 + 6); g.lineTo(RX(v), y0 + 56); g.stroke(); });
        var inside = lv.filter(function (v) { return Math.abs(v) <= Aq; }).length;
        txt(g, inside + ' inside ±A', rx1, y0 - 22, inside >= 4 ? C.green : C.red, '600 22px ' + D.SANS, 'right');
        return inside;
      }
      ruler(84, lvU, C.gray, 'Uniform (μ = 0)');
      ruler(204, lvM, C.orange, mu ? 'μ-law (μ = ' + mu + ')' : 'Companded (μ = 0: same as uniform)');
      [-1, -0.5, 0, 0.5, 1].forEach(function (v) { txt(g, (v > 0 ? '+' : '') + num(v, 1), RX(v), 280, C.gray, '500 20px ' + D.MONO, 'center'); });
      txt(g, 'Blue band = the quiet signal ±' + num(Aq, 3) + '. Ticks crowd near 0', 454, 330, C.ink, '500 20px ' + D.SANS);
      txt(g, 'when μ is large: small sounds get more levels.', 454, 358, C.ink, '500 20px ' + D.SANS);
      // ---------- four waveforms
      var rows = [['Quiet signal (' + num(st.db, 0) + ' dB)', Aq], ['Loud signal (0 dB, full range)', 1]], cols = [['Uniform', 0, lvU], [mu ? 'μ-law, μ = ' + mu : 'μ = 0', mu, lvM]];
      var res = {};
      rows.forEach(function (r, ri) {
        var A = r[1], zoomR = A, outs = cols.map(function (c) { var o = []; for (var k = 0; k <= 400; k++) { var xv = A * Math.sin(2 * Math.PI * k / 400); o.push([xv, quant(xv, n, c[1])]); } return o; });
        outs.forEach(function (o) { o.forEach(function (p) { zoomR = Math.max(zoomR, Math.abs(p[1])); }); });
        zoomR *= 1.15;
        cols.forEach(function (c, ci) {
          var px = ci * 548, py = 416 + ri * 204, pw = 532, ph = 194, s = sqnr(A, n, c[1]);
          res[ri + '' + ci] = s;   // row: 0 quiet, 1 loud; col: 0 uniform, 1 companded
          frame(g, px, py, pw, ph);
          var top = py + 46, bot = py + ph - 10, mid = (top + bot) / 2, Y = function (v) { return mid - v / zoomR * (bot - top) / 2; }, X = function (k) { return px + 14 + k / 400 * (pw - 28); };
          g.save(); g.beginPath(); g.rect(px + 1, top - 4, pw - 2, bot - top + 8); g.clip();
          g.strokeStyle = 'rgba(22,50,79,0.16)'; g.lineWidth = 1;
          var vis = c[2].filter(function (v) { return Math.abs(v) <= zoomR; });
          if (vis.length <= 40) vis.forEach(function (v) { { g.beginPath(); g.moveTo(px + 1, Y(v)); g.lineTo(px + pw - 1, Y(v)); g.stroke(); } });
          g.strokeStyle = C.blue; g.lineWidth = 2.5; g.beginPath(); outs[ci].forEach(function (p, k) { if (k) g.lineTo(X(k), Y(p[0])); else g.moveTo(X(k), Y(p[0])); }); g.stroke();
          g.strokeStyle = C.orange; g.lineWidth = 3; g.beginPath(); outs[ci].forEach(function (p, k) { if (k) { g.lineTo(X(k), Y(outs[ci][k - 1][1])); g.lineTo(X(k), Y(p[1])); } else g.moveTo(X(k), Y(p[1])); }); g.stroke();
          g.restore();
          txt(g, (A < 1 ? 'Quiet ×' + num(1 / zoomR, 0) + ' zoom' : 'Loud') + ', ' + c[0], px + 14, py + 22, ci ? C.orange : C.navy, '600 21px ' + D.SANS);
          txt(g, 'SQNR ' + num(s, 1) + ' dB', px + pw - 12, py + 22, s >= 20 ? C.green : C.red, '600 21px ' + D.MONO, 'right');
        });
      });
      // ---------- formulas and table
      var FA = F(Aq, mu);
      form.innerHTML = mu
        ? 'F(x) = sgn(x)·ln(1+μ|x|) / ln(1+μ)\nF(' + num(Aq, 4) + ') = ln(1+' + mu + '×' + num(Aq, 4) + ') / ln ' + (1 + mu) + '\n  = ' + num(Math.log(1 + mu * Aq), 3) + ' / ' + num(Math.log(1 + mu), 3) + ' = <b>' + num(FA, 3) + '</b>\nquiet sound uses <b>' + num(100 * FA, 1) + ' %</b> of y\n  (uniform: only ' + num(100 * Aq, 1) + ' %)\nuniform, loud: 6.02n + 1.76\n  = 6.02 × ' + n + ' + 1.76 = <b>' + num(6.02 * n + 1.76, 1) + ' dB</b>'
        : 'μ = 0: F(x) = x (plain uniform)\nquiet sound uses only <b>' + num(100 * Aq, 1) + ' %</b> of y\nuniform, loud: 6.02n + 1.76\n  = 6.02 × ' + n + ' + 1.76 = <b>' + num(6.02 * n + 1.76, 1) + ' dB</b>';
      var sU = res['10'] - res['00'], sM2 = res['11'] - res['01'];
      function cell(v) { return '<td style="text-align:right">' + num(v, 1) + ' dB</td>'; }
      tab.innerHTML = '<tr><th>SQNR</th><th style="text-align:right">uniform</th><th style="text-align:right">' + (mu ? 'μ-law' : 'μ = 0') + '</th></tr>' +
        '<tr><td class="rh">quiet ' + num(st.db, 0) + ' dB</td>' + cell(res['00']) + cell(res['01']) + '</tr>' +
        '<tr><td class="rh">loud 0 dB</td>' + cell(res['10']) + cell(res['11']) + '</tr>' +
        '<tr class="cur"><td class="rh">loud − quiet</td>' + cell(sU) + cell(sM2) + '</tr>';
      if (!mu) { verdict.className = 'w-verdict warn'; verdict.textContent = 'μ = 0: SQNR falls 1 dB for every dB the signal gets quieter.'; }
      else if (Math.abs(sM2) < Math.abs(sU) / 2) { verdict.className = 'w-verdict ok'; verdict.textContent = 'Companding: SQNR spread ' + num(sM2, 1) + ' dB instead of ' + num(sU, 1) + ' dB. Same ' + n + ' bits.'; }
      else { verdict.className = 'w-verdict warn'; verdict.textContent = 'Small μ: only a little companding. Spread ' + num(sM2, 1) + ' vs ' + num(sU, 1) + ' dB.'; }
    }
    draw();
  });
})();
