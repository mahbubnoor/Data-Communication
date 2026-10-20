/* Try it: a decibel chain (Lecture 3, after slide "cascade") */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C;

  function chain(P1, dbs) {               // P1 in mW
    var pts = [P1]; dbs.forEach(function (d) { pts.push(pts[pts.length - 1] * Math.pow(10, d / 10)); });
    var tot = dbs.reduce(function (a, d) { return a + d; }, 0);
    return { pts: pts, tot: tot, P2: pts[pts.length - 1], check: 10 * Math.log10(pts[pts.length - 1] / P1) };
  }
  function dBm(mW) { return 10 * Math.log10(mW); }
  function sig(x, n) { return D.fmtN(+x.toPrecision(n || 4), 9); }
  function pw(mW, unit) {               // power string
    if (unit === 'W') { var w = mW / 1000; return (Math.abs(w) >= 1e-6 ? D.fmtN(+w.toPrecision(4), 12) : w.toExponential(3).replace('e', '×10^').replace('+', '')) + ' W'; }
    return (mW >= 0.001 && mW < 1e5 ? sig(mW, 4) : mW.toExponential(3).replace('e', '×10^').replace('+', '')) + ' mW';
  }
  function sgn(d) { return (d > 0 ? '+' : d < 0 ? '−' : '') + D.fmtN(Math.abs(d), 2); }

  D.register('dbchain', function (root) {
    var st = { P1: 2, unit: 'mW', st: [{ db: -3 }, { db: 7 }, { db: -3 }] };
    var cv = D.canvas(1080, 560), g = cv.g, W = cv.w, H = cv.h;
    var form = h('div', { cls: 'w-f' }), stageBox = h('div', { cls: 'w-col', style: 'gap:0' });
    var pPos = function (mW) { return Math.round((Math.log10(mW) + 3) * 100); };
    var pOf = function (p) { return +Math.pow(10, p / 100 - 3).toPrecision(2); };
    var pSl = D.slider('Input power P₁', 0, 700, 1, pPos(st.P1), function (p) { return pw(pOf(p), st.unit); }, function (p) { st.P1 = pOf(p); draw(); });
    var uSeg = D.seg([['mW', 'mW'], ['W', 'W']], 'mW', function (k) { st.unit = k; pSl.set(pPos(st.P1)); pSl.label.textContent = pw(st.P1, st.unit); draw(); });
    var addB = D.btn('+ stage', function () { if (st.st.length < 4) { st.st.push({ db: -3 }); build(); draw(); } });
    var delB = D.btn('− stage', function () { if (st.st.length > 1) { st.st.pop(); build(); draw(); } });
    var sliders = [];
    function kind(d) { return d < 0 ? 'cable (loss)' : d > 0 ? 'amplifier (gain)' : 'no change'; }
    function build() {
      stageBox.innerHTML = ''; sliders = [];
      st.st.forEach(function (s, i) {
        var sl = D.slider('', -30, 30, 0.5, s.db, function (v) { return (v > 0 ? '+' : '') + D.fmtN(v, 1) + ' dB'; }, function (v) { s.db = v; s.note = null; name(); draw(); });
        var nm = sl.el.querySelector('.lab span');
        function name() { nm.textContent = (i + 1) + ' · ' + (s.note || kind(s.db)); }
        name(); sliders.push(sl); stageBox.appendChild(sl.el);
      });
      addB.disabled = st.st.length >= 4; delB.disabled = st.st.length <= 1;
    }
    function pre(P1, stages) { return function () { st.P1 = P1; st.st = stages.map(function (x) { return typeof x === 'number' ? { db: x } : x; }); pSl.set(pPos(P1)); pSl.label.textContent = pw(P1, st.unit); build(); draw(); }; }
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [cv.c, h('div', { cls: 'w-card', style: 'padding:14px 22px' }, [form])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:0;padding:10px 20px 10px' }, [pSl.el, uSeg.el]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:10px 20px 12px' }, [h('h4', { text: 'Stages (dB)' }), stageBox, h('div', { cls: 'w-btns', style: 'margin-top:6px' }, [addB, delB])]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 20px' }, [h('h4', { text: 'Slide examples' }), h('div', { cls: 'w-btns', style: 'gap:8px' }, [
          D.btn('−3 +7 −3 dB', pre(1, [-3, 7, -3])), D.btn('5 km × −0.3, 2 mW', pre(2, [{ db: -1.5, note: 'cable 5 km × −0.3 dB/km' }])),
          D.btn('Halve: −3 dB', pre(1, [-3])), D.btn('×10: +10 dB', pre(1, [10])),
          D.btn('100 m × 0.2 dB/m', pre(1, [{ db: -20, note: 'cable 100 m × −0.2 dB/m' }])), D.btn('0.001 mW', pre(0.001, [30]))])])])]));

    function draw() {
      var dbs = st.st.map(function (s) { return s.db; }), R = chain(st.P1, dbs), n = dbs.length;
      var lv = R.pts.map(dBm), lo = Math.min.apply(null, lv), hi = Math.max.apply(null, lv);
      var y0 = Math.floor((lo - 3) / 5) * 5, y1 = Math.ceil((hi + 3) / 5) * 5; if (y1 - y0 < 15) y1 = y0 + 15;
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      var pl = 86, pr = 40, pt = 50, pb = 162, X = function (i) { return pl + 30 + i / n * (W - pl - pr - 60); }, Y = function (d) { return pt + (y1 - d) / (y1 - y0) * (H - pt - pb); };
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Level diagram: power in dBm along the link', 14, 30);
      g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText('dBm = 10 log₁₀(P / 1 mW)', W - 14, 30);
      var step = (y1 - y0) > 40 ? 10 : 5;
      g.font = '500 20px ' + D.MONO; g.textBaseline = 'middle';
      for (var d = y0; d <= y1; d += step) {
        g.strokeStyle = d === 0 ? C.gray : C.grid; g.lineWidth = 1; g.beginPath(); g.moveTo(pl, Y(d)); g.lineTo(W - pr + 20, Y(d)); g.stroke();
        g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText(sgn(d), pl - 10, Y(d));
      }
      g.textBaseline = 'alphabetic';
      // level path: cable = slope, amplifier = jump
      for (var i = 0; i < n; i++) {
        var gain = dbs[i] > 0;
        g.strokeStyle = gain ? C.green : (dbs[i] < 0 ? C.red : C.gray); g.lineWidth = 5; g.beginPath();
        if (gain) { var xm = (X(i) + X(i + 1)) / 2; g.moveTo(X(i), Y(lv[i])); g.lineTo(xm, Y(lv[i])); g.lineTo(xm, Y(lv[i + 1])); g.lineTo(X(i + 1), Y(lv[i + 1])); }
        else { g.moveTo(X(i), Y(lv[i])); g.lineTo(X(i + 1), Y(lv[i + 1])); }
        g.stroke();
      }
      R.pts.forEach(function (p, i) {
        var x = X(i), y = Y(lv[i]), first = i === 0, last = i === n;
        g.fillStyle = first ? C.blue : (last ? C.orange : C.navy); g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill();
        g.font = '600 20px ' + D.MONO; g.textAlign = first ? 'left' : (last ? 'right' : 'center');
        var ly = y + 34, ox = first ? -10 : (last ? 10 : 0); if (ly + 24 > H - pb + 12) ly = y - 44;
        g.fillText(pw(p, st.unit), x + ox, ly); g.fillStyle = C.gray; g.font = '500 20px ' + D.MONO; g.fillText(sgn(+lv[i].toFixed(2)) + ' dBm', x + ox, ly + 24);
      });
      // chain diagram
      var cy = H - 70;
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(10, H - pb + 22); g.lineTo(W - 10, H - pb + 22); g.stroke();
      for (var k = 0; k < n; k++) {
        var xa = X(k) + 16, xb = X(k + 1) - 16, xc = (xa + xb) / 2;
        if (dbs[k] > 0) {
          g.strokeStyle = C.navy; g.lineWidth = 3; g.beginPath(); g.moveTo(xa, cy); g.lineTo(xc - 34, cy); g.moveTo(xc + 34, cy); g.lineTo(xb, cy); g.stroke();
          g.fillStyle = C.green; g.beginPath(); g.moveTo(xc - 34, cy - 32); g.lineTo(xc + 34, cy); g.lineTo(xc - 34, cy + 32); g.closePath(); g.fill();
          g.fillStyle = C.ink; g.font = '500 20px ' + D.SANS; g.textAlign = 'center'; g.fillText('amplifier', xc, cy + 58); g.font = '600 22px ' + D.MONO; g.fillStyle = C.green; g.fillText(sgn(dbs[k]) + ' dB', xc, cy - 42);
        } else {
          g.strokeStyle = dbs[k] < 0 ? '#8d6e63' : C.gray; g.lineWidth = 10; g.lineCap = 'round'; g.beginPath(); g.moveTo(xa, cy); g.lineTo(xb, cy); g.stroke(); g.lineCap = 'butt';
          g.fillStyle = C.ink; g.font = '500 20px ' + D.SANS; g.textAlign = 'center'; g.fillText(dbs[k] < 0 ? 'cable' : 'no change', xc, cy + 40); g.font = '600 22px ' + D.MONO; g.fillStyle = dbs[k] < 0 ? C.red : C.gray; g.fillText(sgn(dbs[k]) + ' dB', xc, cy - 22);
        }
      }
      for (var q = 0; q <= n; q++) {
        g.fillStyle = q === 0 ? C.blue : (q === n ? C.orange : C.navy); g.beginPath(); g.arc(X(q), cy, 13, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.font = '600 18px ' + D.SANS; g.textAlign = 'center'; g.fillText(q + 1, X(q), cy + 6);
        g.fillStyle = C.gray; g.font = '500 20px ' + D.SANS; g.fillText('Point ' + (q + 1), X(q), cy - 26);
      }
      // formulas
      var ratios = dbs.map(function (d) { return Math.pow(10, d / 10); });
      var ok = Math.abs(R.check - R.tot) < 1e-6, P2 = R.P2;
      var t = 'Total = ' + dbs.map(function (d, i) { return (i ? (d < 0 ? ' − ' : ' + ') : (d < 0 ? '−' : '')) + D.fmtN(Math.abs(d), 2); }).join('') + ' = <b>' + sgn(R.tot) + ' dB</b>';
      t += n > 1 ? '\nRatios multiply: ' + ratios.map(function (r) { return sig(r, 3); }).join(' × ') + ' = ' + sig(Math.pow(10, R.tot / 10), 4) + '\n' : '   (ratio ' + sig(Math.pow(10, R.tot / 10), 4) + ')\n';
      t += 'P₂ = P₁ × 10^(dB/10) = ' + pw(st.P1, st.unit) + ' × 10^(' + sgn(R.tot) + '/10) = <b>' + pw(P2, st.unit) + '</b>\n';
      t += 'Check: 10 log₁₀(P₂/P₁) = 10 log₁₀(' + pw(P2, st.unit).split(' ')[0] + '/' + pw(st.P1, st.unit).split(' ')[0] + ') = ' + sgn(+R.check.toFixed(2)) + ' dB <span class="' + (ok ? 'ok' : 'bad') + '">' + (ok ? '✓' : '✗') + '</span>\n';
      t += 'dBm: 10 log₁₀(' + sig(st.P1, 4) + ' mW / 1 mW) = ' + sgn(+dBm(st.P1).toFixed(2)) + ' dBm → ' + sgn(+dBm(st.P1).toFixed(2)) + ' ' + (R.tot < 0 ? '− ' : '+ ') + D.fmtN(Math.abs(R.tot), 2) + ' = <b>' + sgn(+dBm(P2).toFixed(2)) + ' dBm</b>\n';
      t += '<span style="color:' + C.gray + '">Voltage: V₂/V₁ = √(P₂/P₁) = ' + sig(Math.sqrt(P2 / st.P1), 4) + ', and 20 log₁₀ ' + sig(Math.sqrt(P2 / st.P1), 4) + ' = ' + sgn(+R.tot.toFixed(2)) + ' dB too</span>';
      form.innerHTML = t;
    }
    build(); draw();
  });
  if (typeof module !== 'undefined') module.exports = { chain: chain, dBm: dBm };
})();
