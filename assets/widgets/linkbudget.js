(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;

  /* ---- pure functions (slide pathloss: d in km, f in MHz) ---- */
  function fspl(dkm, fMHz) { return 20 * Math.log10(dkm) + 20 * Math.log10(fMHz) + 32.44; }
  function budget(p) {
    var L = fspl(p.d / 1000, p.f), Pr = p.Pt + p.Gt + p.Gr - L, M = Pr - p.S;
    var Lmax = p.Pt + p.Gt + p.Gr - p.S, dmax = Math.pow(10, (Lmax - 20 * Math.log10(p.f) - 32.44) / 20); // km
    return { L: L, Pr: Pr, M: M, Lmax: Lmax, dmax: dmax };
  }
  function f1(x) { return (Math.abs(x) < 0.05 ? 0 : x).toFixed(1).replace('-', '−'); }
  function sgn(x) { return (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1); }
  function dstr(m) { return m >= 1000 ? fmtN(m / 1000, 3) + ' km' : fmtN(m, m < 10 ? 2 : 1) + ' m'; }
  function sig3(x) { var p = Math.pow(10, Math.floor(Math.log10(x)) - 2); return Math.round(x / p) * p; }
  if (typeof module !== 'undefined') module.exports = { fspl: fspl, budget: budget };

  var PRE = {
    wifi: { Pt: 20, Gt: 2, Gr: 2, f: 2400, d: 100, S: -82 },
    w200: { Pt: 20, Gt: 2, Gr: 2, f: 2400, d: 200, S: -82 },
    w5: { Pt: 20, Gt: 2, Gr: 2, f: 5000, d: 100, S: -82 },
    p23: { Pt: 23, Gt: 2, Gr: 2, f: 2400, d: 100, S: -82 },
    edge: { Pt: 20, Gt: 2, Gr: 2, f: 2400, d: 1990, S: -82 }
  };

  D.register('linkbudget', function (root) {
    var st = JSON.parse(JSON.stringify(PRE.wifi));
    var cv = D.canvas(1080, 560), rc = D.canvas(1080, 290);
    function clr() { pre.set(''); }
    function compact(sl) { sl.el.style.gap = '0'; sl.input.style.margin = '8px 0 10px'; return sl; }
    var pSl = compact(D.slider('Tx power Pt', 0, 30, 1, st.Pt, function (v) { return v + ' dBm'; }, function (v) { st.Pt = v; clr(); draw(); }));
    var gtSl = compact(D.slider('Gt', 0, 20, 1, st.Gt, function (v) { return v + ' dBi'; }, function (v) { st.Gt = v; clr(); draw(); }));
    var grSl = compact(D.slider('Gr', 0, 20, 1, st.Gr, function (v) { return v + ' dBi'; }, function (v) { st.Gr = v; clr(); draw(); }));
    var fSl = compact(D.slider('Frequency f', 100, 6000, 100, st.f, function (v) { return fmtN(v, 0) + ' MHz'; }, function (v) { st.f = v; clr(); draw(); }));
    var dSl = compact(D.slider('Distance d', 0, 5, 0.005, Math.log10(st.d), function () { return ''; }, function (v) { st.d = sig3(Math.pow(10, v)); clr(); draw(); }));
    var sSl = compact(D.slider('Rx sensitivity', -110, -50, 1, st.S, function (v) { return fmtN(v, 0) + ' dBm'; }, function (v) { st.S = v; clr(); draw(); }));
    var pre = D.seg([['wifi', 'Wi-Fi 100 m'], ['w200', '200 m'], ['w5', '5 GHz'], ['p23', 'Pt 23 dBm'], ['edge', 'Max range']], 'wifi', function (k) {
      st = JSON.parse(JSON.stringify(PRE[k])); sync(); draw();
    });
    [].forEach.call(pre.el.children, function (b) { b.style.cssText = 'font-size:22px;padding:6px 12px'; });
    function sync() { pSl.set(st.Pt); gtSl.set(st.Gt); grSl.set(st.Gr); fSl.set(st.f); dSl.set(Math.log10(st.d)); sSl.set(st.S); }
    var dbl = h('div', { cls: 'w-btns', style: 'gap:8px' }, [
      D.btn('d × 2', function () { st.d = Math.min(1e5, st.d * 2); dSl.set(Math.log10(st.d)); clr(); draw(); }, 'acc'),
      D.btn('d ÷ 2', function () { st.d = Math.max(1, st.d / 2); dSl.set(Math.log10(st.d)); clr(); draw(); })]);
    [].forEach.call(dbl.children, function (b) { b.style.cssText = 'font-size:22px;padding:6px 14px'; });
    var form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.45' });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:12px' }, [cv.c, rc.c]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:10px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:10px 16px' }, [pre.el]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:6px 18px 2px' }, [pSl.el,
          h('div', { style: 'display:flex;gap:24px' }, [h('div', { style: 'flex:1' }, [gtSl.el]), h('div', { style: 'flex:1' }, [grSl.el])]),
          fSl.el, h('div', { style: 'display:flex;gap:14px;align-items:flex-end' }, [h('div', { style: 'flex:1' }, [dSl.el]), h('div', { style: 'padding-bottom:6px' }, [dbl])]), sSl.el]),
        h('div', { cls: 'w-card', style: 'padding:10px 18px' }, [form])])
    ]));

    function draw() {
      var b = budget(st), g = cv.g, w = cv.w, hh = cv.h;
      dSl.label.textContent = dstr(st.d);
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      var lv = [st.Pt, st.Pt + st.Gt, st.Pt + st.Gt - b.L, b.Pr];
      var top = Math.max(st.Pt + st.Gt, st.Pt) + 8, bot = Math.min(b.Pr, st.S, st.Pt + st.Gt - b.L) - 14;
      var y0 = 50, y1 = hh - 70, Y = function (p) { return y0 + (top - p) / (top - bot) * (y1 - y0); };
      // grid
      g.font = '500 20px ' + MONO; g.textAlign = 'right'; g.textBaseline = 'middle';
      var stp = (top - bot) > 120 ? 20 : 10;
      for (var p = Math.ceil(bot / stp) * stp; p <= top; p += stp) {
        g.strokeStyle = C.grid; g.beginPath(); g.moveTo(96, Y(p)); g.lineTo(w - 16, Y(p)); g.stroke();
        g.fillStyle = C.gray; g.fillText(fmtN(p, 0), 86, Y(p));
      }
      g.save(); g.translate(22, (y0 + y1) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.font = '600 20px ' + SANS; g.fillText('power level, dBm', 0, 0); g.restore();
      // stages
      var xs = [110, 280, 450, 720, 870], ws = 120;
      var names = ['Tx (Pt)', '+ Gt', '− FSPL', '+ Gr', 'Rx (Pr)'];
      var levels = [st.Pt, st.Pt + st.Gt, st.Pt + st.Gt - b.L, b.Pr, b.Pr];
      // sensitivity line
      g.strokeStyle = C.red; g.lineWidth = 2.5; g.setLineDash([12, 8]); g.beginPath(); g.moveTo(96, Y(st.S)); g.lineTo(w - 16, Y(st.S)); g.stroke(); g.setLineDash([]);
      g.fillStyle = C.red; g.font = '600 21px ' + SANS; g.textAlign = 'left'; g.fillText('sensitivity ' + fmtN(st.S, 0) + ' dBm', 106, Y(st.S) + (b.Pr > st.S ? 20 : -20));
      // steps
      for (var i = 0; i < 5; i++) {
        var x = xs[i], L = levels[i], col = i === 4 ? (b.M >= 0 ? C.green : C.red) : C.navy;
        g.strokeStyle = col; g.lineWidth = 7; g.beginPath(); g.moveTo(x, Y(L)); g.lineTo(x + ws, Y(L)); g.stroke();
        if (i < 4) { // connector to next stage
          var nx = xs[i + 1], nl = levels[i + 1];
          g.strokeStyle = i === 1 ? C.orange : C.blue; g.lineWidth = 3; g.setLineDash(i === 3 ? [5, 5] : []);
          g.beginPath(); g.moveTo(x + ws, Y(L)); g.lineTo(nx, Y(L)); g.lineTo(nx, Y(nl)); g.stroke(); g.setLineDash([]);
          if (Math.abs(Y(nl) - Y(L)) > 14) { // arrow head
            var dir = nl < L ? 1 : -1; g.fillStyle = g.strokeStyle; g.beginPath(); g.moveTo(nx, Y(nl)); g.lineTo(nx - 9, Y(nl) - dir * 16); g.lineTo(nx + 9, Y(nl) - dir * 16); g.fill();
          }
        }
        g.fillStyle = C.ink; g.font = '600 21px ' + SANS; g.textAlign = 'center';
        g.fillText(names[i], x + ws / 2, hh - 42);
        g.font = '600 21px ' + MONO; g.fillStyle = col;
        var ly = Y(L) - 18; if (i === 2 && Y(L) - 18 < Y(levels[1]) + 20) ly = Y(L) + 22;
        if (i === 4) ly = Y(L) + (b.Pr > st.S ? -18 : 22);
        if (i !== 3) g.fillText(f1(L) + ' dBm', x + ws / 2 + (i === 2 ? 22 : 0), ly);
      }
      // step size labels
      g.font = '600 21px ' + MONO; g.textAlign = 'left';
      g.fillStyle = C.blue; g.fillText('+' + st.Gt + ' dBi', xs[1] + 10, Y(levels[1]) + 22);
      g.fillStyle = C.orange; g.fillText('−' + f1(b.L) + ' dB path loss', xs[2] + 14, (Y(levels[1]) + Y(levels[2])) / 2);
      g.fillStyle = C.blue; g.fillText('+' + st.Gr + ' dBi', xs[3] + 10, Y(levels[3]) - 18);
      g.fillStyle = C.gray; g.font = '500 20px ' + SANS; g.fillText('(free space, ' + dstr(st.d) + ', ' + fmtN(st.f, 0) + ' MHz)', xs[2] + 14, (Y(levels[1]) + Y(levels[2])) / 2 + 28);
      // margin arrow
      var mx = xs[4] + ws + 18, ya = Y(b.Pr), yb = Y(st.S), mc = b.M >= 0 ? C.green : C.red;
      g.strokeStyle = mc; g.lineWidth = 3; g.beginPath(); g.moveTo(mx, ya); g.lineTo(mx, yb); g.stroke();
      [[ya, yb > ya ? 1 : -1], [yb, yb > ya ? -1 : 1]].forEach(function (q) { if (Math.abs(yb - ya) > 20) { g.fillStyle = mc; g.beginPath(); g.moveTo(mx, q[0]); g.lineTo(mx - 8, q[0] + q[1] * 14); g.lineTo(mx + 8, q[0] + q[1] * 14); g.fill(); } });
      g.save(); g.translate(mx + 24, (ya + yb) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillStyle = mc; g.font = '700 22px ' + SANS;
      g.fillText('margin ' + sgn(b.M) + ' dB', 0, 0); g.restore();
      g.textAlign = 'left'; g.font = '600 21px ' + SANS; g.fillStyle = C.navy; g.fillText('Link budget: each step adds or subtracts dB', 16, 24);
      drawRange(b);
      // formulas
      var Lcl = fspl(st.d / 1000, st.f), L2 = fspl(2 * st.d / 1000, st.f);
      form.innerHTML = 'L = 20log(' + fmtN(st.d / 1000, 4) + ') + 20log(' + fmtN(st.f, 0) + ') + 32.44\n' +
        '  = ' + sgn(20 * Math.log10(st.d / 1000)) + ' + ' + f1(20 * Math.log10(st.f)) + ' + 32.44 = <b>' + f1(Lcl) + ' dB</b>\n' +
        'Pr = ' + st.Pt + ' + ' + st.Gt + ' + ' + st.Gr + ' − ' + f1(Lcl) + ' = <b>' + f1(b.Pr) + ' dBm</b>\n' +
        'Margin = ' + f1(b.Pr) + ' − (' + fmtN(st.S, 0) + ') = ' + (b.M >= 0 ? '<span class="ok">' : '<span class="bad">') + sgn(b.M) + ' dB</span>\n' +
        'Max L = ' + st.Pt + '+' + st.Gt + '+' + st.Gr + '+' + fmtN(-st.S, 0) + ' = ' + fmtN(b.Lmax, 0) + ' dB → <b>' + dstr(b.dmax * 1000) + '</b>\n' +
        '2d: L = ' + f1(L2) + ' dB (<b>+' + fmtN(L2 - Lcl, 2) + ' dB</b>)';
    }
    function drawRange(b) {
      var g = rc.g, w = rc.w, hh = rc.h, x0 = 96, x1 = w - 20, y0 = 44, y1 = hh - 50;
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      var X = function (d) { return x0 + Math.log10(d) / 5 * (x1 - x0); };
      var Pr = function (d) { return st.Pt + st.Gt + st.Gr - fspl(d / 1000, st.f); };
      var top = Pr(1) + 4, bot = Math.min(Pr(1e5), st.S) - 6, Y = function (p) { return y0 + (top - p) / (top - bot) * (y1 - y0); };
      g.font = '500 20px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'top'; g.fillStyle = C.gray;
      ['1 m', '10 m', '100 m', '1 km', '10 km', '100 km'].forEach(function (s, k) {
        g.strokeStyle = C.grid; g.beginPath(); g.moveTo(X(Math.pow(10, k)), y0); g.lineTo(X(Math.pow(10, k)), y1); g.stroke();
        g.fillText(s, Math.max(x0 + 24, Math.min(x1 - 40, X(Math.pow(10, k)))), y1 + 8);
      });
      g.textBaseline = 'middle'; g.textAlign = 'right';
      [top - 4, bot + 6].forEach(function (p) { g.fillText(fmtN(Math.round(p), 0), x0 - 10, Y(p)); });
      // sensitivity
      g.strokeStyle = C.red; g.lineWidth = 2; g.setLineDash([10, 7]); g.beginPath(); g.moveTo(x0, Y(st.S)); g.lineTo(x1, Y(st.S)); g.stroke(); g.setLineDash([]);
      // curve
      g.strokeStyle = C.orange; g.lineWidth = 3.5; g.beginPath();
      for (var i = 0; i <= 200; i++) { var d = Math.pow(10, i / 40); i ? g.lineTo(X(d), Y(Pr(d))) : g.moveTo(X(d), Y(Pr(d))); }
      g.stroke();
      // max range
      var dm = b.dmax * 1000;
      if (dm >= 1 && dm <= 1e5) {
        g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(X(dm), y0); g.lineTo(X(dm), y1); g.stroke();
        g.fillStyle = C.navy; g.font = '600 21px ' + SANS; g.textAlign = X(dm) > x1 - 260 ? 'right' : 'left';
        g.fillText('max range ' + dstr(dm), X(dm) + (X(dm) > x1 - 260 ? -10 : 10), y0 + 14);
      }
      // current distance and 2d
      [[st.d, C.green], [2 * st.d, C.gray]].forEach(function (q, k) {
        if (q[0] > 1e5) return;
        var col = k ? C.gray : (b.M >= 0 ? C.green : C.red);
        g.fillStyle = k ? '#fff' : col; g.strokeStyle = col; g.lineWidth = 3; g.beginPath(); g.arc(X(q[0]), Y(Pr(q[0])), 8, 0, 7); g.fill(); g.stroke();
      });
      g.font = '600 21px ' + SANS; g.textAlign = 'left'; g.fillStyle = C.navy;
      g.fillText('Received power (dBm) against distance, log scale: each doubling of d costs 6 dB', 16, 22);
      if (2 * st.d <= 1e5) { g.fillStyle = C.gray; g.font = '500 20px ' + SANS; g.textAlign = X(2 * st.d) > x1 - 120 ? 'right' : 'left'; g.fillText('2d', X(2 * st.d) + (g.textAlign === 'right' ? -14 : 12), Y(Pr(2 * st.d)) + 20); }
    }
    draw();
  });
})();
