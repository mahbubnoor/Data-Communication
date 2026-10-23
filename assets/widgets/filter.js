/* Try it: ideal low-, high- and band-pass filters on a spectrum (Lecture 2, after slide "bandwidth") */
(function () {
  'use strict';
  var TAU = 2 * Math.PI;

  /* ---------- pure signal model (frequencies in kHz, time in ms) ----------
     Each component is a·sin(2πft + ph); the DC component has f = 0 and value a.
     Power: DC a², sine a²/2. Square and sawtooth have infinitely many harmonics:
     'total' is their exact power and 'tail' says the harmonics above the listed ones exist. */
  function mkSquare() { // unipolar 0/1 V square wave, f = 1 kHz: 0.5 + Σ odd k (2/πk) sin 2πkft
    var c = [{ f: 0, a: 0.5, ph: 0 }];
    for (var k = 1; k <= 16; k += 2) c.push({ f: k, a: 2 / (Math.PI * k), ph: 0, k: k });
    return { key: 'sq', name: 'square wave 0/1 V, f = 1 kHz', comps: c, total: 0.5, tail: true, f0: 1, fax: 16.5, emax: 16.2, step: 0.1, span: 2,
      ideal: function (t) { return (t - Math.floor(t)) < 0.5 ? 1 : 0; }, base: [-0.75, 1.3], def: [0.5, 4], hz: false };
  }
  function mkSaw() { // rising sawtooth 0→1 V, f = 1 kHz: 0.5 − Σ (1/πk) sin 2πkft
    var c = [{ f: 0, a: 0.5, ph: 0 }];
    for (var k = 1; k <= 16; k++) c.push({ f: k, a: 1 / (Math.PI * k), ph: Math.PI, k: k });
    return { key: 'saw', name: 'sawtooth 0 to 1 V, f = 1 kHz', comps: c, total: 1 / 3, tail: true, f0: 1, fax: 16.5, emax: 16.2, step: 0.1, span: 2,
      ideal: function (t) { return t - Math.floor(t); }, base: [-0.75, 1.3], def: [0.5, 4], hz: false };
  }
  function mkThree() {
    var c = [{ f: 1, a: 1, ph: 0 }, { f: 5, a: 0.5, ph: 0 }, { f: 9, a: 0.3, ph: 0 }];
    return { key: 'three', name: '3 tones: 1, 5 and 9 kHz', comps: c, tail: false, fax: 12, emax: 12, step: 0.1, span: 2, def: [3, 7], hz: false };
  }
  function mkSlide() { // bandwidth slide figure: 41 lines, 1,000 to 5,000 Hz every 100 Hz, peak at 3,000 Hz (heights as in the SVG)
    var c = [];
    for (var i = 0; i <= 40; i++) { var f = 1 + i / 10; c.push({ f: f, a: 0.4 * (1 - 0.632 * Math.abs(f - 3) / 2), ph: Math.PI / 2 - TAU * f * 5 }); }
    return { key: 'slide', name: 'bandwidth slide: 1,000 to 5,000 Hz', comps: c, tail: false, fax: 6, emax: 6, step: 0.05, span: 10, def: [2, 4], hz: true };
  }
  function mkVoice() { // voice-like: harmonics of 200 Hz up to 6 kHz with three formant bumps
    var c = [], mx = 0;
    for (var k = 1; k <= 30; k++) {
      var f = 0.2 * k, e = 0.55 * Math.exp(-Math.pow((f - 0.2) / 0.25, 2)) + Math.exp(-Math.pow((f - 0.7) / 0.35, 2)) +
        0.65 * Math.exp(-Math.pow((f - 1.6) / 0.45, 2)) + 0.4 * Math.exp(-Math.pow((f - 2.8) / 0.55, 2)) + 0.18 * Math.exp(-f / 3);
      c.push({ f: f, a: e, ph: (k * k * 0.7) % TAU, k: k }); mx = Math.max(mx, e);
    }
    c.forEach(function (q) { q.a = +(q.a / mx).toFixed(4); });
    return { key: 'voice', name: 'voice-like: harmonics of 200 Hz to 6 kHz', comps: c, tail: false, fax: 6, emax: 6, step: 0.05, span: 10, def: [0.3, 3.4], hz: true };
  }
  var MAKERS = { sq: mkSquare, saw: mkSaw, three: mkThree, slide: mkSlide, voice: mkVoice };

  function passes(type, lo, hi, f) {
    var e = 1e-9;
    if (type === 'lp') return f <= hi + e;
    if (type === 'hp') return f >= lo - e && (f > 0 || lo <= 0);
    return f >= lo - e && f <= hi + e && (f > 0 || lo <= 0);
  }
  function powerOf(c) { return c.f === 0 ? c.a * c.a : c.a * c.a / 2; }
  /* result of the ideal filter: kept components, power, band before and after */
  function apply(sig, type, lo, hi) {
    var kept = [], removed = [], pAll = 0, pKept = 0, pRem = 0;
    sig.comps.forEach(function (c) { var p = powerOf(c); pAll += p; if (passes(type, lo, hi, c.f)) { kept.push(c); pKept += p; } else { removed.push(c); pRem += p; } });
    var total = sig.tail ? sig.total : pAll, tailKept = sig.tail && type === 'hp';
    var kp = tailKept ? total - pRem : pKept;
    var fs = sig.comps.map(function (c) { return c.f; });
    var inLo = Math.min.apply(null, fs), inHi = sig.tail ? Infinity : Math.max.apply(null, fs);
    var kf = kept.map(function (c) { return c.f; });
    var outLo = kf.length ? Math.min.apply(null, kf) : (tailKept ? sig.comps[sig.comps.length - 1].f + sig.f0 : NaN);
    var outHi = tailKept ? Infinity : (kf.length ? Math.max.apply(null, kf) : NaN);
    return { kept: kept, removed: removed, total: total, pKept: kp, frac: kp / total, tailKept: tailKept, inLo: inLo, inHi: inHi, outLo: outLo, outHi: outHi };
  }
  function sumAt(cs, t) { var v = 0; for (var i = 0; i < cs.length; i++) { var c = cs[i]; v += c.f === 0 ? c.a : c.a * Math.sin(TAU * c.f * t + c.ph); } return v; }
  function inputAt(sig, t) { return sig.ideal ? sig.ideal(t * sig.f0) : sumAt(sig.comps, t); }
  function outputAt(sig, r, t) { return r.tailKept ? sig.ideal(t * sig.f0) - sumAt(r.removed, t) : sumAt(r.kept, t); }

  if (typeof window === 'undefined' || !window.DCW) {
    if (typeof module !== 'undefined') module.exports = { MAKERS: MAKERS, apply: apply, sumAt: sumAt, inputAt: inputAt, outputAt: outputAt, passes: passes };
    return;
  }
  var D = window.DCW, h = D.h, C = D.C;
  var GREY = '#c3cad2';

  D.register('filter', function (root) {
    var st = { sig: 'sq', type: 'lp', lo: 0.5, hi: 4, drag: null };
    var S = MAKERS.sq();
    var cv = D.canvas(1080, 610), g = cv.g, W = cv.w, H = cv.h, TOP = 300;
    var fl = 70, fr = 26, sTop = TOP + 54, sBot = H - 44;
    var tab = h('table', { cls: 'w-tab', style: 'width:100%' }), pw = h('div', { cls: 'w-f' }), teach = h('div', { cls: 'w-verdict warn', style: 'font-size:23px;padding:10px 16px;line-height:1.3' });
    function fu(f, unit) { // frequency text in the signal's unit
      if (!isFinite(f)) return '∞';
      return S.hz ? Math.round(f * 1000).toLocaleString('en-US') + (unit === false ? '' : ' Hz') : D.fmtN(f, 2) + (unit === false ? '' : ' kHz');
    }
    var loSl = D.slider('Lower edge f_L', 0, S.emax, S.step, st.lo, function (v) { return fu(v); }, function (v) { st.lo = v; fixOrder('lo'); draw(); });
    var hiSl = D.slider('Upper edge f_H', 0, S.emax, S.step, st.hi, function (v) { return fu(v); }, function (v) { st.hi = v; fixOrder('hi'); draw(); });
    var sigSeg = D.seg([['sq', 'Square'], ['saw', 'Sawtooth'], ['three', '1, 5, 9 kHz'], ['slide', 'Slide: 1–5 kHz'], ['voice', 'Voice-like']], st.sig, function (k) { setSig(k, true); draw(); });
    var typeSeg = D.seg([['lp', 'Low-pass'], ['hp', 'High-pass'], ['bp', 'Band-pass']], st.type, function (k) { st.type = k; fixOrder('hi'); draw(); });
    function fixOrder(which) {
      if (st.type !== 'bp') return;
      var gap = S.step;
      if (st.lo > st.hi - gap) { if (which === 'lo') st.hi = Math.min(S.emax, st.lo + gap); else st.lo = Math.max(0, st.hi - gap); if (st.lo > st.hi - gap) st.lo = st.hi - gap; }
      loSl.set(st.lo); hiSl.set(st.hi);
    }
    function setSig(k, useDef) {
      st.sig = k; S = MAKERS[k](); sigSeg.set(k);
      loSl.range(0, S.emax, S.step); hiSl.range(0, S.emax, S.step);
      if (useDef) { st.lo = S.def[0]; st.hi = S.def[1]; }
      st.lo = Math.min(st.lo, S.emax); st.hi = Math.min(st.hi, S.emax); loSl.set(st.lo); hiSl.set(st.hi);
    }
    function pre(sig, type, lo, hi) { return function () { setSig(sig, false); st.type = type; typeSeg.set(type); st.lo = lo; st.hi = hi; loSl.set(lo); hiSl.set(hi); draw(); }; }
    cv.c.style.touchAction = 'none';
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:12px' }, [cv.c, h('div', { cls: 'w-card', style: 'padding:10px 16px' }, [tab])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:10px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 18px' }, [h('h4', { text: 'Input signal' }), sigSeg.el, h('h4', { text: 'Ideal filter (the channel)', style: 'margin-top:4px' }), typeSeg.el]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:6px 18px 2px' }, [loSl.el, hiSl.el]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 18px' }, [h('h4', { text: 'Presets' }), h('div', { cls: 'w-btns', style: 'gap:8px' }, [
          D.btn('Telephone channel', pre('voice', 'bp', 0.3, 3.4)), D.btn('Keep only f', pre('sq', 'lp', 0, 2)),
          D.btn('Keep f, 3f, 5f', pre('sq', 'lp', 0, 6)), D.btn('Remove DC', pre('sq', 'hp', 0.5, 4))])]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding:10px 18px' }, [pw, teach])])]));

    /* ---------- spectrum geometry and dragging ---------- */
    function FX(f) { return fl + f / S.fax * (W - fl - fr); }
    function XF(x) { return (x - fl) / (W - fl - fr) * S.fax; }
    function edges() { return st.type === 'lp' ? ['hi'] : st.type === 'hp' ? ['lo'] : ['lo', 'hi']; }
    function snap(f) { return Math.max(0, Math.min(S.emax, Math.round(f / S.step) * S.step)); }
    function local(e) { var r = cv.c.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
    function nearest(x) { var best = null, bd = 1e9; edges().forEach(function (k) { var d = Math.abs(FX(st[k]) - x); if (d < bd) { bd = d; best = k; } }); return { k: best, d: bd }; }
    cv.c.addEventListener('pointerdown', function (e) {
      var p = local(e); if (p.y < TOP) return;
      var n = nearest(p.x), f = XF(p.x);
      if (n.d < 34) st.drag = { k: n.k };
      else if (st.type === 'bp' && f > st.lo && f < st.hi) st.drag = { k: 'band', f0: f, lo: st.lo, hi: st.hi };
      else { st.drag = { k: n.k }; moveTo(p.x); }
      cv.c.setPointerCapture(e.pointerId); e.preventDefault(); draw();
    });
    function moveTo(x) {
      var d = st.drag, f = XF(x);
      if (d.k === 'band') {
        var w = d.hi - d.lo, lo = Math.max(0, Math.min(S.emax - w, d.lo + f - d.f0));
        st.lo = snap(lo); st.hi = snap(st.lo + w);
      } else { st[d.k] = snap(f); fixOrder(d.k); }
      loSl.set(st.lo); hiSl.set(st.hi);
    }
    cv.c.addEventListener('pointermove', function (e) {
      var p = local(e);
      if (st.drag) { moveTo(p.x); draw(); return; }
      cv.c.style.cursor = p.y >= TOP && nearest(p.x).d < 34 ? 'ew-resize' : (p.y >= TOP ? 'pointer' : 'default');
    });
    function up() { if (st.drag) { st.drag = null; draw(); } }
    cv.c.addEventListener('pointerup', up); cv.c.addEventListener('pointercancel', up);

    function draw() {
      var r = apply(S, st.type, st.lo, st.hi);
      loSl.input.disabled = st.type === 'lp'; hiSl.input.disabled = st.type === 'hp';
      loSl.el.style.opacity = st.type === 'lp' ? 0.45 : 1; hiSl.el.style.opacity = st.type === 'hp' ? 0.45 : 1;
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      // ---- time domain
      var N = 1100, span = S.span, xs = [], vin = [], vout = [], i, lo = Infinity, hi = -Infinity;
      for (i = 0; i <= N; i++) { var t = i / N * span; xs.push(t); vin.push(inputAt(S, t)); vout.push(outputAt(S, r, t)); }
      if (S.base) { lo = S.base[0]; hi = S.base[1]; }
      else { vin.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); }); var pad = (hi - lo) * 0.12; lo -= pad; hi += pad; }
      vout.forEach(function (v) { lo = Math.min(lo, v); hi = Math.max(hi, v); });
      var pl = 70, pr = 18, pt = 46, pb = 40;
      var X = function (t) { return pl + t / span * (W - pl - pr); }, Y = function (v) { return pt + (hi - v) / (hi - lo) * (TOP - pt - pb); };
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Time domain', 14, 30);
      g.font = '600 20px ' + D.SANS; g.fillStyle = C.blue; g.fillText('— input', 160, 30); g.fillStyle = C.orange; g.fillText('— output of the filter', 260, 30);
      g.fillStyle = C.gray; g.textAlign = 'right'; g.font = '500 20px ' + D.SANS; g.fillText(S.name, W - pr, 30);
      g.strokeStyle = C.gray; g.lineWidth = 1; g.beginPath(); g.moveTo(pl, Y(0)); g.lineTo(W - pr, Y(0)); g.stroke();
      g.fillStyle = C.gray; g.font = '500 20px ' + D.MONO; g.textAlign = 'right'; g.textBaseline = 'middle'; g.fillText('0', pl - 8, Y(0));
      if (S.base) { g.strokeStyle = C.grid; g.beginPath(); g.moveTo(pl, Y(1)); g.lineTo(W - pr, Y(1)); g.stroke(); g.fillText('1 V', pl - 8, Y(1)); }
      g.textBaseline = 'alphabetic'; g.textAlign = 'center';
      for (var q = 0; q <= 4; q++) { var tq = q / 4 * span; g.textAlign = q === 4 ? 'right' : (q === 0 ? 'left' : 'center'); g.fillText(D.fmtN(tq, 2) + (q === 4 ? ' ms' : ''), X(tq), TOP - 12); }
      function path(vs, col, lw) { g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = 'round'; g.beginPath(); vs.forEach(function (v, j) { j ? g.lineTo(X(xs[j]), Y(v)) : g.moveTo(X(xs[j]), Y(v)); }); g.stroke(); }
      path(vin, 'rgba(47,109,181,.75)', 2.5); path(vout, C.orange, 4);
      // ---- spectrum
      g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(10, TOP); g.lineTo(W - 10, TOP); g.stroke();
      var amax = 0; S.comps.forEach(function (c) { amax = Math.max(amax, c.a); });
      var FY = function (a) { return sBot - a / (amax * 1.12) * (sBot - sTop); };
      // pass band shading and stop band grey
      var pL = st.type === 'lp' ? 0 : st.lo, pH = st.type === 'hp' ? S.fax : st.hi;
      g.fillStyle = 'rgba(160,170,180,.13)'; g.fillRect(fl, sTop - 6, W - fr - fl, sBot - sTop + 6);
      g.fillStyle = 'rgba(240,163,94,.24)'; g.fillRect(FX(pL), sTop - 6, FX(pH) - FX(pL), sBot - sTop + 6);
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Frequency domain: drag the orange filter edges', 14, TOP + 30);
      g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right';
      g.fillText('kept ', W - fr - 120, TOP + 30); g.fillStyle = C.orange; g.fillRect(W - fr - 116, TOP + 14, 14, 18);
      g.fillStyle = C.gray; g.fillText('removed ', W - fr - 10, TOP + 30); g.fillStyle = GREY; g.fillRect(W - fr - 8, TOP + 14, 14, 18);
      g.strokeStyle = C.gray; g.lineWidth = 1.5; g.beginPath(); g.moveTo(fl, sBot); g.lineTo(W - fr, sBot); g.stroke();
      // frequency ticks
      var tick = S.fax > 10 ? 2 : 1; g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'center';
      for (var tf = 0; tf <= S.fax + 1e-9; tf += tick) { g.fillText(D.fmtN(tf, 1), FX(tf), sBot + 24); g.strokeStyle = C.gray; g.beginPath(); g.moveTo(FX(tf), sBot); g.lineTo(FX(tf), sBot + 5); g.stroke(); }
      g.textAlign = 'right'; g.fillText('kHz', fl - 16, sBot + 24);
      var bw = Math.max(3, Math.min(14, (FX(S.comps.length > 20 ? 0.1 : 1) - FX(0)) * 0.55));
      if (S.key === 'voice') bw = 7;
      S.comps.forEach(function (c) {
        var on = passes(st.type, st.lo, st.hi, c.f);
        g.fillStyle = on ? C.orange : GREY; g.fillRect(FX(c.f) - bw / 2, FY(c.a), bw, sBot - FY(c.a));
      });
      if (S.tail) { g.font = '600 20px ' + D.SANS; g.fillStyle = r.tailKept ? C.orange : '#9aa5b1'; g.textAlign = 'right'; g.fillText('… harmonics go on forever →', W - fr, FY(0.16) - 6); }
      if (S.comps.length <= 4) S.comps.forEach(function (c) { g.font = '500 20px ' + D.MONO; g.fillStyle = C.ink; g.textAlign = 'center'; g.fillText(D.fmtN(c.a, 2), FX(c.f), FY(c.a) - 8); });
      if (S.key === 'sq' || S.key === 'saw') { g.font = '600 20px ' + D.MONO; g.fillStyle = C.ink; g.textAlign = 'left'; g.textAlign = 'center'; g.fillText('DC', FX(0), FY(S.comps[0].a) - 8); }
      // edges with grips
      edges().forEach(function (k) {
        var x = FX(st[k]), act = st.drag && (st.drag.k === k || st.drag.k === 'band');
        g.strokeStyle = C.orange; g.lineWidth = act ? 5 : 3.5; g.beginPath(); g.moveTo(x, sTop - 6); g.lineTo(x, sBot); g.stroke();
        g.fillStyle = act ? C.orange : '#fff'; g.strokeStyle = C.orange; g.lineWidth = 3; g.beginPath(); g.arc(x, sTop + 6, 13, 0, TAU); g.fill(); g.stroke();
        g.fillStyle = act ? '#fff' : C.orange; g.font = '700 18px ' + D.SANS; g.textAlign = 'center'; g.fillText('↔', x, sTop + 12);
        var lab = (k === 'lo' ? 'f_L = ' : 'f_H = ') + fu(st[k]);
        g.font = '600 20px ' + D.MONO; var tw = g.measureText(lab).width, lx = k === 'lo' ? x - 20 - tw : x + 20;
        if (lx < fl) lx = x + 20; if (lx + tw > W - fr) lx = x - 20 - tw;
        g.fillStyle = 'rgba(251,250,247,.9)'; g.fillRect(lx - 4, sTop - 4, tw + 8, 26); g.fillStyle = C.orange; g.textAlign = 'left'; g.fillText(lab, lx, sTop + 15);
      });
      // ---- numbers
      var tName = { lp: 'low-pass', hp: 'high-pass', bp: 'band-pass' }[st.type];
      function band(a, b) { return isNaN(a) ? 'nothing' : fu(a, false) + ' to ' + fu(b); }
      function bwTxt(a, b) {
        if (isNaN(a)) return 'B = 0';
        if (!isFinite(b)) return 'B = ∞ − ' + fu(a, false) + ' = <b>∞</b>';
        return 'B = ' + fu(b, false) + ' − ' + fu(a, false) + ' = <b>' + fu(b - a) + '</b>';
      }
      var cL = st.type === 'lp' ? 0 : st.lo, cH = st.type === 'hp' ? Infinity : st.hi;
      function row(lab, col, a2, b2) { return '<tr><td class="rh" style="color:' + col + '">' + lab + '</td><td>' + band(a2, b2) + '</td><td style="text-align:left">' + bwTxt(a2, b2) + '</td></tr>'; }
      tab.innerHTML = '<tr><th class="rh"></th><th>frequencies</th><th>bandwidth = highest − lowest</th></tr>' +
        row('Channel (' + tName + ')', C.navy, cL, cH) + row('Signal in', C.blue, r.inLo, r.inHi) + row('Signal out', C.orange, r.outLo, r.outHi);
      pw.innerHTML = 'power kept = ' + D.fmtN(r.pKept, 3) + ' / ' + D.fmtN(r.total, 3) + ' = <b>' + D.fmtN(r.frac * 100, 1) + '%</b>';
      var dcIn = S.comps[0].f === 0, dcKept = dcIn && passes(st.type, st.lo, st.hi, 0);
      var msg;
      if (st.type === 'lp') msg = '<b>Low-pass</b> keeps 0 to f_H. Cutting the high harmonics <b>rounds the corners</b>: fewer harmonics, slower edges.';
      else if (st.type === 'hp') msg = '<b>High-pass</b> keeps f_L and above. It ' + (dcIn && !dcKept ? '<b>removes DC</b> (the output is centred on 0) and ' : '') + 'removes the <b>slow trend</b>; only fast changes such as edges remain.';
      else msg = '<b>Band-pass</b> keeps just one band, like the <b>telephone channel 300 to 3,400 Hz</b> (B = 3,400 − 300 = 3,100 Hz): everything outside is lost.';
      teach.innerHTML = msg;
    }
    draw();
  });
})();
