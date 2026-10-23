/* Try it: mix your own composite signal, DC + up to 5 sines (Lecture 2, after slide "composite") */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C;
  var NC = 5, RAD = Math.PI / 180;

  function gcd(a, b) { return b ? gcd(b, a % b) : a; }
  function wrap(deg) { var d = ((deg % 360) + 360) % 360; return d > 180 ? d - 360 : d; }
  function active(st) { return st.comps.filter(function (c) { return c.on && c.A > 0; }); }
  /* value of the whole signal at time t (s); s(t) = DC + sum A sin(2*pi*f*t + phi) */
  function sig(st, t) {
    var v = st.dc;
    st.comps.forEach(function (c) { if (c.on) v += c.A * Math.sin(2 * Math.PI * c.f * t + c.ph * RAD); });
    return v;
  }
  /* spectrum lines: same-frequency sines merge as phasors (sin convention) */
  function spectrum(st) {
    var map = {}, out = [];
    st.comps.forEach(function (c, i) {
      if (!c.on || !(c.A > 0)) return;
      var k = c.f.toFixed(3); map[k] = map[k] || { f: c.f, re: 0, im: 0, idx: [] };
      map[k].re += c.A * Math.cos(c.ph * RAD); map[k].im += c.A * Math.sin(c.ph * RAD); map[k].idx.push(i);
    });
    Object.keys(map).forEach(function (k) {
      var l = map[k], a = Math.hypot(l.re, l.im);
      out.push({ f: l.f, a: a, ph: a > 1e-9 ? wrap(Math.atan2(l.im, l.re) / RAD) : 0, idx: l.idx, merged: l.idx.length > 1, gone: a < 1e-9 });
    });
    if (Math.abs(st.dc) > 1e-9) out.push({ f: 0, a: Math.abs(st.dc), ph: st.dc < 0 ? 180 : 0, idx: ['dc'], dc: true });
    out.sort(function (a, b) { return a.f - b.f; });
    return out.filter(function (l) { return !l.gone; });
  }
  /* fundamental of the sum: frequencies lie on a 0.5 Hz grid, so f0 = gcd in half-hertz units */
  function fund(st) {
    var fs = spectrum(st).filter(function (l) { return l.f > 0; }).map(function (l) { return l.f; });
    if (!fs.length) return null;
    var g = fs.map(function (f) { return Math.round(f * 2); }).reduce(gcd);
    return { fs: fs, f0: g / 2, T: 2 / g };
  }
  function extremes(st) {
    var F = fund(st); if (!F) return { mx: st.dc, mn: st.dc };
    var N = 7200, mx = -1e9, mn = 1e9;
    for (var i = 0; i < N; i++) { var v = sig(st, i / N * F.T); if (v > mx) mx = v; if (v < mn) mn = v; }
    return { mx: mx, mn: mn };
  }
  function niceStep(span) { var p = Math.pow(10, Math.floor(Math.log10(span))), m = span / p; return (m <= 2 ? 0.5 : m <= 5 ? 1 : 2) * p; }

  function blank() { var a = []; for (var i = 0; i < NC; i++) a.push({ on: false, A: 3, f: 2 * (i + 1), ph: 0 }); return a; }
  function make(dc, list) { var c = blank(); list.forEach(function (x, i) { c[i] = { on: true, A: x[0], f: x[1], ph: x[2] || 0 }; }); return { dc: dc, comps: c }; }
  var SAW = [[6, 2], [3, 4], [2, 6], [1.5, 8], [1.2, 10]];
  var SCR = [0, 90, 180, 270, 0];
  var PRESETS = {
    comp: { label: '10 V DC + 7 V, 6 Hz', s: make(10, [[7, 6]]), win: 1, mode: 'mul' },
    beats: { label: 'Beats 10 + 11 Hz', s: make(0, [[5, 10], [5, 11]]), win: 2, mode: 'add' },
    chord: { label: 'Chord 4:5:6', s: make(0, [[3, 4], [3, 5], [3, 6]]), win: 1, mode: 'mul' },
    saw: { label: 'Sawtooth', s: make(0, SAW), win: 1, mode: 'mul' },
    tri: { label: 'Triangle', s: make(0, [[8, 2], [0.89, 6, 180], [0.32, 10], [0.16, 14, 180], [0.1, 18]]), win: 1, mode: 'mul' },
    same: { label: 'Same spectrum, new shape', s: make(0, SAW.map(function (x, i) { return [x[0], x[1], SCR[i]]; })), win: 1, mode: 'mul', ref: make(0, SAW) }
  };

  D.register('compose', function (root) {
    var st = { dc: 10, comps: blank(), win: 1, showPh: false, sel: null, mode: 'mul', ref: null, preset: 'comp' };
    var cv = D.canvas(1080, 580), g = cv.g, W = cv.w, H = cv.h;
    cv.c.style.touchAction = 'manipulation'; cv.c.style.cursor = 'pointer';
    var fForm = h('div', { cls: 'w-f', style: 'flex:1.15;min-width:0' }), fStat = h('div', { cls: 'w-f', style: 'flex:1;min-width:0' });

    /* ---- component rows: one row per sine, compact sliders */
    var rows = [], dcSl;
    dcSl = D.slider('DC level', -10, 10, 0.5, st.dc, function (v) { return D.fmtN(v, 1) + ' V'; }, function (v) { st.dc = v; changed(); });
    for (var i = 0; i < NC; i++) (function (i) {
      var c = st.comps[i];
      var tg = D.btn(String(i + 1), function () { st.comps[i].on = !st.comps[i].on; changed(); });
      tg.style.cssText = 'width:52px;padding:6px 0;margin-top:24px;flex:none';
      var a = D.slider('A', 0, 10, 0.01, c.A, function (v) { return D.fmtN(v, 2) + ' V'; }, function (v) { st.comps[i].A = v; st.comps[i].on = true; changed(); });
      var f = D.slider('f', 0.5, 20, 0.5, c.f, function (v) { return D.fmtN(v, 1) + ' Hz'; }, function (v) { st.comps[i].f = v; st.comps[i].on = true; changed(); });
      var p = D.slider('φ', 0, 345, 15, c.ph, function (v) { return v + '°'; }, function (v) { st.comps[i].ph = v; st.comps[i].on = true; changed(); });
      [a, f, p].forEach(function (s) { s.el.style.cssText = 'flex:1;min-width:0'; s.input.style.margin = '6px 0 2px'; });
      var row = h('div', { style: 'display:flex;gap:12px;align-items:flex-start;padding:2px 6px;border-radius:10px' }, [tg, a.el, f.el, p.el]);
      rows.push({ el: row, tg: tg, a: a, f: f, p: p });
    })(i);
    dcSl.input.style.margin = '6px 0 2px';

    var phB = D.btn('Phase spectrum', function () { st.showPh = !st.showPh; draw(); });
    var winSeg = D.seg([[1, '1 s'], [2, '2 s']], 1, function (k) { st.win = k; draw(); });
    var swapB = D.btn('Swap phases', function () {
      if (!st.ref) return; var orig = st.comps.every(function (c, j) { return c.ph === st.ref.comps[j].ph; });
      st.comps.forEach(function (c, j) { c.ph = orig ? SCR[j] : st.ref.comps[j].ph; }); changed(true);
    }, 'acc');

    /* ---- presets */
    var pBtns = {};
    function load(key) {
      var p = PRESETS[key];
      st.dc = p.s.dc; st.comps = JSON.parse(JSON.stringify(p.s.comps)); st.win = p.win; st.mode = p.mode;
      st.ref = p.ref ? JSON.parse(JSON.stringify(p.ref)) : null; st.sel = null; st.preset = key;
      if (key === 'same') st.showPh = true;
      changed(true);
    }
    var presetBox = h('div', { cls: 'w-btns', style: 'gap:8px' }, Object.keys(PRESETS).map(function (k) {
      var b = D.btn(PRESETS[k].label, function () { load(k); }); pBtns[k] = b; if (k === 'same') b.style.borderColor = C.light; return b;
    }).concat([swapB]));

    /* ---- sound */
    var au = { ctx: null, src: null, gain: null, on: false, timer: null, poll: null };
    var playB = D.btn('▶ Play', function () { startSound(); }, 'acc'), stopB = D.btn('■ Stop', function () { stopSound(); });
    var modeSeg = D.seg([['mul', '× 110'], ['add', '+ 440 Hz']], 'mul', function (k) { st.mode = k; draw(); if (au.on) startSound(); });
    var sndNote = h('p', { cls: 'w-note' });

    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [cv.c,
        h('div', { cls: 'w-card', style: 'flex-direction:row;gap:22px;padding:12px 20px' }, [fForm, fStat])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 16px' }, [presetBox]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:8px 10px 4px' }, [
          h('div', { style: 'padding:0 6px' }, [dcSl.el])].concat(rows.map(function (r) { return r.el; })).concat([
          h('div', { cls: 'w-row', style: 'gap:10px;align-items:center;padding:6px 6px 6px;flex-wrap:wrap' }, [phB, winSeg.el])])),
        h('div', { cls: 'w-card', style: 'gap:6px;padding:10px 16px' }, [
          h('div', { cls: 'w-row', style: 'gap:10px;align-items:center' }, [playB, stopB, modeSeg.el]), sndNote])])]));

    /* click a spike -> highlight its component(s) in the time plot */
    var geo = {};
    cv.c.addEventListener('click', function (e) {
      var r = cv.c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width * W, y = (e.clientY - r.top) / r.height * H;
      if (y < geo.s0) { st.sel = null; draw(); return; }
      var best = null, bd = 1e9;
      spectrum(st).forEach(function (l) { [geo.FX, geo.PX].forEach(function (M) { if (!M) return; var d = Math.abs(M(l.f) - x); if (d < bd) { bd = d; best = l; } }); });
      st.sel = best && bd < 30 ? (best.dc ? 'dc' : best.f.toFixed(3)) : null; draw();
    });

    function syncCtl() {
      dcSl.set(st.dc); winSeg.set(st.win); modeSeg.set(st.mode);
      rows.forEach(function (r, j) {
        var c = st.comps[j]; r.a.set(c.A); r.f.set(c.f); r.p.set(c.ph);
        r.tg.classList.toggle('on', c.on); r.tg.setAttribute('aria-pressed', c.on);
        [r.a, r.f, r.p].forEach(function (s) { s.el.style.opacity = c.on ? 1 : 0.4; });
      });
    }
    function changed(fromPreset) {
      if (!fromPreset) {
        Object.keys(pBtns).forEach(function (k) { pBtns[k].classList.remove('on'); });
        if (st.ref && !sameAmps()) st.ref = null;
      } else Object.keys(pBtns).forEach(function (k) { pBtns[k].classList.toggle('on', k === st.preset); });
      syncCtl(); draw(); if (au.on) { clearTimeout(au.timer); au.timer = setTimeout(startSound, 150); }
    }
    function sameAmps() {
      return st.ref && st.dc === st.ref.dc && st.comps.every(function (c, j) { var r = st.ref.comps[j]; return c.on === r.on && c.A === r.A && c.f === r.f; });
    }
    function selIdx() {
      if (st.sel === null) return [];
      if (st.sel === 'dc') return ['dc'];
      var l = spectrum(st).filter(function (x) { return !x.dc && x.f.toFixed(3) === st.sel; })[0];
      return l ? l.idx : [];
    }

    /* ---------- sound: render a 2 s loop (every audio frequency fits a whole number of cycles in 2 s) */
    function audioF(f) { return st.mode === 'mul' ? 110 * f : 440 + f; }
    function startSound() {
      try {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) throw new Error('no Web Audio');
        if (!au.ctx) au.ctx = new AC();
        if (au.ctx.state === 'suspended') au.ctx.resume();
        var ctx = au.ctx, sr = ctx.sampleRate, n = Math.round(2 * sr), buf = ctx.createBuffer(1, n, sr), d = buf.getChannelData(0), pk = 0;
        var on = active(st);
        for (var k = 0; k < n; k++) {
          var t = k / sr, v = 0;
          for (var q = 0; q < on.length; q++) v += on[q].A * Math.sin(2 * Math.PI * audioF(on[q].f) * t + on[q].ph * RAD);
          d[k] = v; if (Math.abs(v) > pk) pk = Math.abs(v);
        }
        if (pk > 0) for (k = 0; k < n; k++) d[k] *= 0.9 / pk;
        var src = ctx.createBufferSource(), gn = ctx.createGain(), now = ctx.currentTime;
        src.buffer = buf; src.loop = true; gn.gain.setValueAtTime(0, now); gn.gain.linearRampToValueAtTime(0.25, now + 0.05);
        src.connect(gn); gn.connect(ctx.destination); src.start(now);
        fadeOut(); au.src = src; au.gain = gn; au.on = true; au.err = null;
        if (!au.poll) au.poll = setInterval(function () { if (!root.isConnected || !root.getClientRects().length) stopSound(); }, 500);
      } catch (err) { au.err = 'Sound is not available in this browser.'; au.on = false; }
      drawNote();
    }
    function fadeOut() {
      if (!au.src) return; var s = au.src, gn = au.gain, now = au.ctx.currentTime;
      try { gn.gain.cancelScheduledValues(now); gn.gain.setValueAtTime(gn.gain.value, now); gn.gain.linearRampToValueAtTime(0, now + 0.05); s.stop(now + 0.06); } catch (e) { /* already stopped */ }
      au.src = null; au.gain = null;
    }
    function stopSound() { fadeOut(); au.on = false; clearTimeout(au.timer); if (au.poll) { clearInterval(au.poll); au.poll = null; } drawNote(); }
    function drawNote() {
      playB.classList.toggle('on', au.on); playB.textContent = au.on ? '▶ Playing' : '▶ Play';
      var on = active(st), map = st.mode === 'mul' ? '1 Hz on screen → 110 Hz audio' : 'audio = 440 Hz + on-screen f (keeps beat rate)';
      var fl = on.map(function (c) { return D.fmtN(audioF(c.f), 1); });
      sndNote.innerHTML = au.err ? '<span style="color:' + C.red + '">' + au.err + '</span>' :
        map + (fl.length ? ': ' + fl.join(', ') + ' Hz' : ': nothing to play') + '. Volume normalised; DC is silent.';
    }

    /* ---------- drawing */
    function draw() {
      var lines = spectrum(st), F = fund(st), ex = extremes(st), sel = selIdx();
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, W - 1, H - 1);
      // ---- time domain
      var top = 296, pl = 66, pr = 18, pt = 46, pb = 36, N = 1600;
      var comps = sel.filter(function (x) { return x !== 'dc'; }).map(function (j) { return st.comps[j]; });
      var lo = Math.min(0, ex.mn), hi = Math.max(0, ex.mx);
      comps.forEach(function (c) { lo = Math.min(lo, -c.A); hi = Math.max(hi, c.A); });
      if (hi - lo < 1e-6) { hi += 1; lo -= 1; }
      var step = niceStep(hi - lo); lo = Math.floor(lo / step - 0.15) * step; hi = Math.ceil(hi / step + 0.15) * step;
      var X = function (t) { return pl + t / st.win * (W - pl - pr); }, Y = function (v) { return pt + (hi - v) / (hi - lo) * (top - pt - pb); };
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Time domain', 14, 30);
      if (!st.ref) { g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText('s(t) in V against time (s)', W - 14, 30); }
      g.strokeStyle = C.grid; g.lineWidth = 1; g.fillStyle = C.gray; g.font = '500 20px ' + D.MONO; g.textBaseline = 'middle';
      var ticks = []; for (var v = lo; v <= hi + 1e-9; v += step) ticks.push(v);
      var every = ticks.length > 6 ? 2 : 1;
      ticks.forEach(function (y, k) { g.beginPath(); g.moveTo(pl, Y(y)); g.lineTo(W - pr, Y(y)); g.stroke(); if (k % every === 0 || Math.abs(y) < 1e-9) { g.textAlign = 'right'; g.fillText(D.fmtN(y, 2), pl - 8, Y(y)); } });
      g.strokeStyle = C.gray; g.beginPath(); g.moveTo(pl, Y(0)); g.lineTo(W - pr, Y(0)); g.stroke();
      g.textBaseline = 'alphabetic'; g.textAlign = 'center';
      for (var tk = 0; tk <= 4; tk++) { var tt = tk / 4 * st.win; g.textAlign = tk === 4 ? 'right' : 'center'; g.fillText(D.fmtN(tt, 2), X(tt) + (tk === 4 ? 4 : 0), top - 10); }
      // period markers of the sum
      if (F && F.T <= st.win + 1e-9 && F.T < st.win - 1e-9) {
        g.strokeStyle = 'rgba(22,50,79,.35)'; g.setLineDash([5, 6]); g.lineWidth = 1.5;
        for (var m = F.T; m < st.win - 1e-9; m += F.T) { g.beginPath(); g.moveTo(X(m), pt); g.lineTo(X(m), top - pb); g.stroke(); }
        g.setLineDash([]);
      }
      // reference (same spectrum, original phases)
      if (st.ref) {
        g.strokeStyle = '#9aa5b1'; g.lineWidth = 2.5; g.setLineDash([9, 7]); g.beginPath();
        for (var r = 0; r <= N; r++) { var tr = r / N * st.win, vr = sig(st.ref, tr); r ? g.lineTo(X(tr), Y(vr)) : g.moveTo(X(tr), Y(vr)); }
        g.stroke(); g.setLineDash([]);
      }
      // highlighted component(s)
      comps.forEach(function (c) {
        g.strokeStyle = 'rgba(240,163,94,.75)'; g.lineWidth = 5; g.beginPath();
        for (var q = 0; q <= N; q++) { var tq = q / N * st.win, vq = c.A * Math.sin(2 * Math.PI * c.f * tq + c.ph * RAD); q ? g.lineTo(X(tq), Y(vq)) : g.moveTo(X(tq), Y(vq)); }
        g.stroke();
      });
      if (sel[0] === 'dc') { g.strokeStyle = 'rgba(240,163,94,.85)'; g.lineWidth = 5; g.beginPath(); g.moveTo(pl, Y(st.dc)); g.lineTo(W - pr, Y(st.dc)); g.stroke(); }
      // max / min
      g.strokeStyle = 'rgba(166,79,21,.55)'; g.lineWidth = 1.5; g.setLineDash([4, 5]);
      [ex.mx, ex.mn].forEach(function (y) { g.beginPath(); g.moveTo(pl, Y(y)); g.lineTo(W - pr, Y(y)); g.stroke(); });
      g.setLineDash([]);
      // the sum
      g.strokeStyle = C.blue; g.lineWidth = 3.5; g.lineJoin = 'round'; g.beginPath();
      for (var p = 0; p <= N; p++) { var tp = p / N * st.win, vp = sig(st, tp); p ? g.lineTo(X(tp), Y(vp)) : g.moveTo(X(tp), Y(vp)); }
      g.stroke();
      g.font = '600 20px ' + D.MONO; g.fillStyle = C.orange; g.textAlign = 'left';
      var lbx = W - pr - 150;
      g.fillStyle = 'rgba(251,250,247,.85)'; g.fillRect(lbx - 4, Y(ex.mx) - 22, 150, 22); g.fillRect(lbx - 4, Y(ex.mn) + 2, 150, 22);
      g.fillStyle = C.orange; g.fillText('max ' + D.fmtN(ex.mx, 2), lbx, Y(ex.mx) - 5); g.fillText('min ' + D.fmtN(ex.mn, 2), lbx, Y(ex.mn) + 20);
      if (st.ref) {
        var msg = sameAmps() && st.comps.some(function (c, j) { return c.ph !== st.ref.comps[j].ph; }) ? 'Same amplitude spectrum, different phases → different shape (grey = phases all 0°)' : 'Phases all 0°: the plain sawtooth (grey dashed)';
        g.font = '600 21px ' + D.SANS; var mw = g.measureText(msg).width + 24;
        g.fillStyle = '#fdf0dc'; g.strokeStyle = C.light; g.lineWidth = 2; g.beginPath(); g.rect(W - 10 - mw, 8, mw, 32); g.fill(); g.stroke();
        g.fillStyle = '#8a4a0b'; g.textAlign = 'left'; g.fillText(msg, W - mw + 2, 31);
      }
      // ---- frequency domain
      var s0 = top + 6, Fm = 21, sp = st.showPh;
      var a0 = 66, a1 = sp ? 520 : W - 24, p0 = 640, p1 = W - 24;
      var FX = function (f) { return a0 + f / Fm * (a1 - a0); }, PX = function (f) { return p0 + f / Fm * (p1 - p0); };
      geo.FX = FX; geo.PX = sp ? PX : null; geo.s0 = s0;
      g.strokeStyle = C.line; g.beginPath(); g.moveTo(10, s0); g.lineTo(W - 10, s0); g.stroke();
      var amax = Math.max(1, lines.reduce(function (m, l) { return Math.max(m, l.a); }, 0)), astep = niceStep(amax), atop = Math.ceil(amax * 1.02 / astep) * astep;
      var aT = s0 + 70, aB = H - 40;
      var AY = function (a) { return aB - a / atop * (aB - aT); };
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText(sp ? 'Amplitude spectrum' : 'Frequency domain: amplitude spectrum', 14, s0 + 30);
      if (sp) { g.fillText('Phase spectrum φ (sin reference)', p0 - 70, s0 + 30); g.strokeStyle = C.line; g.beginPath(); g.moveTo(p0 - 84, s0 + 8); g.lineTo(p0 - 84, H - 8); g.stroke(); }
      else { g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText('click a spike to see its sine', W - 14, s0 + 30); }
      g.strokeStyle = C.grid; g.beginPath(); g.moveTo(a0, AY(atop)); g.lineTo(a1, AY(atop)); g.stroke();
      g.strokeStyle = C.gray; g.beginPath(); g.moveTo(a0, aB); g.lineTo(a1, aB); g.moveTo(a0, aB); g.lineTo(a0, aT); g.stroke();
      g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'right'; g.textBaseline = 'middle';
      g.fillText(D.fmtN(atop, 2), a0 - 8, AY(atop)); g.fillText('0', a0 - 8, aB); g.textBaseline = 'alphabetic';
      function tickF(MX, yb, x1) {
        g.textAlign = 'center'; g.fillStyle = C.gray; g.font = '500 20px ' + D.MONO;
        (sp ? [0, 4, 8, 12, 16, 20] : [0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20]).forEach(function (f) { g.fillText(f, MX(f), yb + 24); });
        g.textAlign = 'right'; g.fillText('Hz', x1 + 20, yb + 24);
      }
      tickF(FX, aB, a1);
      var selKey = st.sel;
      function roomy(l, k, MX, gap) { var pv = lines[k - 1], nx = lines[k + 1]; gap = gap || 56; return (!pv || MX(l.f) - MX(pv.f) > gap) && (!nx || MX(nx.f) - MX(l.f) > gap); }
      lines.forEach(function (l, k) {
        var key = l.dc ? 'dc' : l.f.toFixed(3), hl = key === selKey, col = hl ? C.orange : (l.dc ? C.navy : C.blue);
        g.strokeStyle = col; g.lineWidth = hl ? 9 : 7; g.beginPath(); g.moveTo(FX(l.f), aB); g.lineTo(FX(l.f), AY(l.a)); g.stroke();
        g.fillStyle = col; g.beginPath(); g.arc(FX(l.f), AY(l.a), 7, 0, 7); g.fill();
        if (!sp || roomy(l, k, FX, 40) || hl) {
          g.font = '600 20px ' + D.MONO; g.textAlign = l.f < 0.6 ? 'left' : 'center';
          g.fillText(D.fmtN(l.a, 2) + (l.dc && st.dc < 0 ? ' (−)' : ''), FX(l.f) + (l.f < 0.6 ? 4 : 0), AY(l.a) - 13);
        }
      });
      if (sp) {
        var pT = s0 + 62, pB2 = H - 40, PY = function (d) { return (pT + pB2) / 2 - d / 180 * (pB2 - pT) / 2; };
        tickF(PX, pB2, p1);
        g.strokeStyle = C.grid; [180, 90, -90, -180].forEach(function (d) { g.beginPath(); g.moveTo(p0, PY(d)); g.lineTo(p1, PY(d)); g.stroke(); });
        g.strokeStyle = C.gray; g.beginPath(); g.moveTo(p0, PY(0)); g.lineTo(p1, PY(0)); g.moveTo(p0, PY(180)); g.lineTo(p0, PY(-180)); g.stroke();
        g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'right'; g.textBaseline = 'middle';
        [[180, '180°'], [90, '90°'], [0, '0°'], [-90, '−90°'], [-180, '−180°']].forEach(function (q) { g.fillText(q[1], p0 - 6, PY(q[0])); }); g.textBaseline = 'alphabetic';
        lines.forEach(function (l, k) {
          var key = l.dc ? 'dc' : l.f.toFixed(3), hl = key === selKey, col = hl ? C.orange : '#7a5aa6';
          g.strokeStyle = col; g.lineWidth = hl ? 8 : 6; g.beginPath(); g.moveTo(PX(l.f), PY(0)); g.lineTo(PX(l.f), PY(l.ph)); g.stroke();
          g.fillStyle = col; g.beginPath(); g.arc(PX(l.f), PY(l.ph), 6, 0, 7); g.fill();
          if (Math.abs(l.ph) > 1e-6 && (roomy(l, k, PX) || hl)) { g.font = '600 20px ' + D.MONO; g.textAlign = 'center'; g.fillText(D.fmtN(l.ph, 0) + '°', PX(l.f), PY(l.ph) + (l.ph > 0 ? -12 : 26)); }
        });
      }
      phB.classList.toggle('on', st.showPh); winSeg.set(st.win);
      swapB.style.display = st.ref ? '' : 'none';
      rows.forEach(function (r, j) { r.el.style.background = sel.indexOf(j) >= 0 ? '#fbe9da' : ''; });

      // ---- formula
      var on = st.comps.map(function (c, j) { return { c: c, j: j }; }).filter(function (x) { return x.c.on && x.c.A > 0; });
      var t = '<b>s(t)</b> = ' + D.fmtN(st.dc, 2);
      on.forEach(function (x) {
        var c = x.c, hl = sel.indexOf(x.j) >= 0;
        var term = D.fmtN(c.A, 2) + ' sin(2π·' + D.fmtN(c.f, 1) + 't + ' + c.ph + '°)';
        t += '\n     + ' + (hl ? '<b>' + term + '</b>' : term);
      });
      if (!on.length) t += '\n  (no sines on: a flat DC line)';
      fForm.innerHTML = t;
      var u = 'max = ' + D.fmtN(ex.mx, 2) + ' V, min = ' + D.fmtN(ex.mn, 2) + ' V\n';
      if (F) {
        u += 'f₀ = gcd(' + F.fs.map(function (f) { return D.fmtN(f, 1); }).join(', ') + ') = ' + D.fmtN(F.f0, 1) + ' Hz\n';
        u += 'T = 1/f₀ = <b>' + D.fmtN(F.T, 3) + ' s</b>' + (F.T > st.win + 1e-9 ? ' <span class="bad">(> window)</span>' : '') + '\n';
      } else u += 'DC only: never changes, T = ∞\n';
      if (lines.length >= 2) {
        var hiF = lines[lines.length - 1].f, loF = lines[0].f;
        u += 'B = highest − lowest\n  = ' + D.fmtN(hiF, 1) + ' − ' + D.fmtN(loF, 1) + ' = <b>' + D.fmtN(hiF - loF, 1) + ' Hz</b>';
      } else u += 'B = ' + (lines.length ? '0 Hz (one spike)' : '—');
      if (lines.some(function (l) { return l.merged; })) u += '\n<span class="bad">equal f: sines merge into one spike</span>';
      fStat.innerHTML = u;
      drawNote();
    }
    load('comp');
  });
  if (typeof module !== 'undefined') module.exports = { sig: sig, spectrum: spectrum, fund: fund, extremes: extremes, PRESETS: PRESETS };
})();
