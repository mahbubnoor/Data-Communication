(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;

  /* ---- pure functions ---- */
  function Sp(G) { return G * Math.exp(-2 * G); }   // pure ALOHA
  function Ss(G) { return G * Math.exp(-G); }       // slotted ALOHA
  function rng(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  var T = 20, LANES = 7;
  function simulate(G, mode, seed) {
    var r = rng(seed), t = -1, arr = [];
    while (true) { t += -Math.log(1 - r()) / G; if (t > T - 1) break; arr.push(t); }
    var fr = arr.map(function (a) { return { gen: a, s: mode === 'pure' ? a : Math.ceil(a) }; });
    fr.forEach(function (f, i) {
      f.ok = !fr.some(function (o, j) { return j !== i && (mode === 'pure' ? Math.abs(o.s - f.s) < 1 : o.s === f.s); });
    });
    var ends = []; for (var k = 0; k < LANES; k++) ends.push(-9);
    fr.forEach(function (f) {
      var free = []; for (var k = 0; k < LANES; k++) if (ends[k] <= f.s + 1e-9) free.push(k);
      var L; if (free.length) L = free[Math.floor(r() * free.length)];
      else { L = 0; for (k = 1; k < LANES; k++) if (ends[k] < ends[L]) L = k; }
      f.lane = L; ends[L] = f.s + 1;
    });
    return fr;
  }
  if (typeof module !== 'undefined') module.exports = { Sp: Sp, Ss: Ss, simulate: simulate };

  D.register('aloha', function (root) {
    var st = { G: 0.5, mode: 'pure', seed: 7, sel: -1, fps: 500, frames: [] };
    var TFR = 0.001; // 200 bits / 200 kbps
    var cv = D.canvas(1080, 420), tl = D.canvas(1080, 404);
    var modeSeg = D.seg([['pure', 'Pure ALOHA'], ['slot', 'Slotted ALOHA']], 'pure', function (k) { st.mode = k; run(false); });
    var gSl = D.slider('Offered load G', 0.05, 3, 0.05, 0.5, function (v) { return 'G = ' + fmtN(v, 2); }, function (v) { st.G = v; st.fps = null; preSeg.set(''); run(false); });
    var preSeg = D.seg([['1000', '1000 /s'], ['500', '500 /s'], ['250', '250 /s'], ['2000', '2000 /s']], '500', function (k) {
      st.fps = +k; st.G = st.fps * TFR; gSl.set(st.G); run(false);
    });
    var form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' });
    var note = h('p', { cls: 'w-note' });
    var verdict = h('div', { cls: 'w-verdict' });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [cv.c, tl.c]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding-top:12px;padding-bottom:10px' }, [modeSeg.el, gSl.el,
          D.btn('New random run', function () { st.seed = (st.seed * 7919 + 13) % 2147483647; run(true); }, 'acc')]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding-top:12px;padding-bottom:12px' }, [h('h4', { text: 'Ex. 12.3 / 12.4: 200 bits, 200 kbps' }), preSeg.el]),
        h('div', { cls: 'w-card', style: 'gap:6px;padding-top:12px;padding-bottom:12px' }, [form, note]),
        verdict])
    ]));

    /* drag the G marker on the curve plot */
    var P = { l: 86, r: 30, t: 24, b: 58 }, Gmax = 3, Smax = 0.4;
    function X(G) { return P.l + G / Gmax * (cv.w - P.l - P.r); }
    function Y(S) { return P.t + (1 - S / Smax) * (cv.h - P.t - P.b); }
    var dragging = false;
    function fromEvent(e) {
      var r = cv.c.getBoundingClientRect(), x = (e.clientX - r.left) * cv.w / r.width;
      var G = Math.round(((x - P.l) / (cv.w - P.l - P.r) * Gmax) / 0.05) * 0.05;
      G = Math.max(0.05, Math.min(3, G)); st.G = +G.toFixed(2); st.fps = null; preSeg.set(''); gSl.set(st.G); run(false);
    }
    cv.c.style.cursor = 'ew-resize'; cv.c.style.touchAction = 'none';
    cv.c.addEventListener('pointerdown', function (e) { dragging = true; try { cv.c.setPointerCapture(e.pointerId); } catch (x) {} fromEvent(e); });
    cv.c.addEventListener('pointermove', function (e) { if (dragging) fromEvent(e); });
    cv.c.addEventListener('pointerup', function () { dragging = false; });
    /* click a frame on the timeline to show its vulnerable time */
    var TL = { l: 92, r: 20, top: 84, lane: 34 };
    function TX(t) { return TL.l + t / T * (tl.w - TL.l - TL.r); }
    tl.c.addEventListener('click', function (e) {
      var r = tl.c.getBoundingClientRect(), x = (e.clientX - r.left) * tl.w / r.width, y = (e.clientY - r.top) * tl.h / r.height;
      st.frames.forEach(function (f, i) { var y0 = TL.top + f.lane * TL.lane; if (x >= TX(f.s) && x <= TX(f.s + 1) && y >= y0 && y <= y0 + TL.lane - 6) st.sel = i; });
      draw();
    });

    function run(newSel) {
      st.frames = simulate(st.G, st.mode, st.seed);
      if (newSel || st.sel < 0 || st.sel >= st.frames.length || !newSel) {
        st.sel = -1; for (var i = 0; i < st.frames.length; i++) if (st.frames[i].s >= 4) { st.sel = i; break; }
      }
      draw();
    }

    function draw() {
      var G = st.G, sp = Sp(G), ss = Ss(G), g = cv.g, w = cv.w, hh = cv.h;
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      g.font = '500 20px ' + MONO; g.fillStyle = C.gray; g.textBaseline = 'middle';
      for (var s = 0; s <= 0.4001; s += 0.1) {
        g.strokeStyle = C.grid; g.beginPath(); g.moveTo(P.l, Y(s)); g.lineTo(w - P.r, Y(s)); g.stroke();
        g.textAlign = 'right'; g.fillText(Math.round(s * 100) + '%', P.l - 10, Y(s));
      }
      g.textAlign = 'center'; g.textBaseline = 'top';
      for (var k = 0; k <= 3; k += 0.5) { g.strokeStyle = C.grid; g.beginPath(); g.moveTo(X(k), P.t); g.lineTo(X(k), Y(0)); g.stroke(); g.fillText(fmtN(k, 1), X(k), Y(0) + 6); }
      g.font = '600 20px ' + SANS; g.fillText('offered load G (frames per frame time)', (P.l + w - P.r) / 2, hh - 26);
      g.save(); g.translate(20, (P.t + Y(0)) / 2); g.rotate(-Math.PI / 2); g.fillText('throughput S', 0, -8); g.restore();
      function curve(f, col, wd) { g.strokeStyle = col; g.lineWidth = wd; g.beginPath(); for (var i = 0; i <= 300; i++) { var x = i / 100; i ? g.lineTo(X(x), Y(f(x))) : g.moveTo(X(x), Y(f(x))); } g.stroke(); }
      curve(Sp, C.orange, st.mode === 'pure' ? 4.5 : 3); curve(Ss, C.blue, st.mode === 'slot' ? 4.5 : 3);
      // maxima (small labels above the peaks)
      g.font = '600 20px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'bottom';
      [[0.5, Sp(0.5), C.orange, '18.4%'], [1, Ss(1), C.blue, '36.8%']].forEach(function (m) {
        g.fillStyle = m[2]; g.beginPath(); g.arc(X(m[0]), Y(m[1]), 6, 0, 7); g.fill(); g.fillText(m[3], X(m[0]), Y(m[1]) - 12);
      });
      function box(x, y, wd, ht) { g.fillStyle = 'rgba(251,250,247,.92)'; g.fillRect(x, y, wd, ht); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, wd, ht); }
      // G marker
      g.strokeStyle = C.navy; g.lineWidth = 2; g.setLineDash([7, 6]); g.beginPath(); g.moveTo(X(G), P.t); g.lineTo(X(G), Y(0)); g.stroke(); g.setLineDash([]);
      g.fillStyle = C.navy; g.beginPath(); g.moveTo(X(G) - 10, Y(0)); g.lineTo(X(G) + 10, Y(0)); g.lineTo(X(G), Y(0) - 14); g.fill();
      // legend (formulas and maxima)
      box(640, 246, 404, 66); g.font = '600 20px ' + MONO; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillStyle = C.blue; g.fillText('slotted S = G·e^(−G), max G=1', 652, 264);
      g.fillStyle = C.orange; g.fillText('pure    S = G·e^(−2G),max G=½', 652, 294);
      // readout of the two S values at this G (top right, above the curves)
      box(774, 30, 270, 92); g.font = '600 21px ' + MONO; g.textAlign = 'left';
      g.fillStyle = C.navy; g.fillText('at G = ' + fmtN(G, 2) + ':', 786, 48);
      g.fillStyle = C.blue; g.fillText('slotted S = ' + (ss * 100).toFixed(1) + '%', 786, 76);
      g.fillStyle = C.orange; g.fillText('pure    S = ' + (sp * 100).toFixed(1) + '%', 786, 104);
      [[sp, C.orange], [ss, C.blue]].forEach(function (p) { g.fillStyle = '#fff'; g.strokeStyle = p[1]; g.lineWidth = 4; g.beginPath(); g.arc(X(G), Y(p[0]), 9, 0, 7); g.fill(); g.stroke(); });
      g.fillStyle = C.navy; g.textAlign = 'center'; g.font = '600 20px ' + SANS; g.textBaseline = 'top';
      var dx = Math.min(w - P.r - 30, Math.max(P.l + 30, X(G)));
      if (dx < 740) g.fillText('drag', dx, P.t + 2);
      drawTimeline();
      // formulas
      var e2 = fmtN(2 * G, 2), mPure = sp / TFR, mSlot = ss / TFR, fps = G / TFR;
      form.innerHTML = 'T<sub>fr</sub> = 200 b / 200 kbps = 1 ms\nG = ' + fmtN(fps, 0) + ' /s × 1 ms = <b>' + fmtN(G, 2) + '</b>\n' +
        '<span style="color:' + C.orange + '">Pure</span>  S = ' + fmtN(G, 2) + '·e^(−' + e2 + ')\n      = <b>' + sp.toFixed(3) + '</b> → ' + Math.round(mPure) + ' frames/s\n' +
        '<span style="color:' + C.blue + '">Slot</span>  S = ' + fmtN(G, 2) + '·e^(−' + fmtN(G, 2) + ')\n      = <b>' + ss.toFixed(3) + '</b> → ' + Math.round(mSlot) + ' frames/s\n' +
        'survive/s = S / T<sub>fr</sub> = S × 1000';
      var bookP = fps * sp, bookS = fps * ss;
      note.textContent = G === 1 ? 'At G = 1 the book\'s "rate × S" happens to give the right count.' :
        'Book/slide multiply S by ' + fmtN(fps, 0) + ' frames/s (' + fmtN(bookP, 0) + ' and ' + fmtN(bookS, 0) + '): wrong unless G = 1. S counts frames per frame time.';
      var Sm = st.mode === 'pure' ? sp : ss, peak = st.mode === 'pure' ? 0.5 : 1;
      if (Math.abs(G - peak) < 0.13) { verdict.className = 'w-verdict ok'; verdict.textContent = 'Near the best load: ' + (Sm * 100).toFixed(1) + '% of the channel carries good frames.'; }
      else if (G < peak) { verdict.className = 'w-verdict warn'; verdict.textContent = 'Light load: few collisions, but the channel is mostly idle.'; }
      else { verdict.className = 'w-verdict bad'; verdict.textContent = 'Overload: more frames sent, fewer get through. Collisions waste the channel.'; }
    }

    function drawTimeline() {
      var g = tl.g, w = tl.w, hh = tl.h, fr = st.frames, pure = st.mode === 'pure';
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      var yb = TL.top + LANES * TL.lane;
      // grid
      for (var k = 0; k <= T; k++) {
        if (!pure || k % 5 === 0) { g.strokeStyle = pure ? C.grid : '#c9d1d9'; g.lineWidth = 1; g.beginPath(); g.moveTo(TX(k), TL.top - 6); g.lineTo(TX(k), yb); g.stroke(); }
      }
      g.font = '600 20px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.textBaseline = 'middle';
      for (var L = 0; L < LANES; L++) g.fillText('Stn ' + String.fromCharCode(65 + L), 12, TL.top + L * TL.lane + (TL.lane - 6) / 2);
      // vulnerable window
      var sf = fr[st.sel];
      if (sf) {
        var a = pure ? sf.s - 1 : sf.s, b = sf.s + 1;
        g.fillStyle = 'rgba(240,163,94,.28)'; g.fillRect(TX(Math.max(0, a)), TL.top - 6, TX(Math.min(T, b)) - TX(Math.max(0, a)), yb - TL.top + 6);
        g.strokeStyle = C.orange; g.lineWidth = 2; g.beginPath(); g.moveTo(TX(a), TL.top - 14); g.lineTo(TX(a), TL.top - 30); g.lineTo(TX(b), TL.top - 30); g.lineTo(TX(b), TL.top - 14); g.stroke();
        g.fillStyle = C.orange; g.font = '600 20px ' + SANS; g.textAlign = 'center'; g.textBaseline = 'bottom';
        var lx = Math.min(w - 210, Math.max(TL.l + 200, (TX(a) + TX(b)) / 2));
        g.fillText('vulnerable time ' + (pure ? '2 Tfr (from t − Tfr to t + Tfr)' : 'Tfr (one slot)'), lx, TL.top - 34);
      }
      // frames
      var nOk = 0, nIn = 0;
      fr.forEach(function (f, i) {
        if (f.s >= 0) { nIn++; if (f.ok) nOk++; }
        var y = TL.top + f.lane * TL.lane, x0 = TX(Math.max(0, f.s)), x1 = TX(Math.min(T, f.s + 1));
        if (x1 <= x0) return;
        g.fillStyle = f.ok ? C.green : C.red; g.fillRect(x0 + 1, y, x1 - x0 - 2, TL.lane - 6);
        if (i === st.sel) { g.strokeStyle = C.navy; g.lineWidth = 4; g.strokeRect(x0 + 1, y, x1 - x0 - 2, TL.lane - 6); }
      });
      // axis
      g.fillStyle = C.gray; g.font = '500 20px ' + MONO; g.textAlign = 'center'; g.textBaseline = 'top';
      for (k = 0; k <= T; k += 5) g.fillText(k === 0 ? '0' : k + ' Tfr', Math.min(w - 40, TX(k)), yb + 6);
      g.font = '600 20px ' + SANS; g.textAlign = 'left'; g.fillStyle = C.ink;
      var yl = hh - 26;
      g.fillStyle = C.green; g.fillRect(TL.l, yl - 10, 22, 20); g.fillStyle = C.ink; g.fillText('success', TL.l + 30, yl + 1);
      g.fillStyle = C.red; g.fillRect(TL.l + 140, yl - 10, 22, 20); g.fillStyle = C.ink; g.fillText('collision', TL.l + 170, yl + 1);
      g.fillStyle = C.navy; g.textAlign = 'right';
      g.fillText((pure ? 'Pure' : 'Slotted') + ', G = ' + fmtN(st.G, 2) + ': ' + nOk + ' of ' + nIn + ' frames survive → S ≈ ' + nOk + '/' + T + ' = ' + (nOk / T).toFixed(2) + '  (theory ' + (pure ? Sp(st.G) : Ss(st.G)).toFixed(2) + ')', w - TL.r, yl + 1);
      g.textAlign = 'left'; g.fillStyle = C.gray; g.textBaseline = 'top'; g.font = '500 20px ' + SANS;
      g.fillText(pure ? 'frames start whenever they are ready' : 'frames wait for the next slot boundary', 12, 8);
      g.textAlign = 'right'; g.fillText('click a frame', w - TL.r, 8);
    }
    run(true);
  });
})();
