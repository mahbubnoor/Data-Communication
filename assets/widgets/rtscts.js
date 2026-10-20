/* Try it: hidden stations and RTS/CTS (Lecture 13, after slide "hidden"). Forouzan 12.1.4, Figure 12.17 "CSMA/CA and NAV". */
(function () {
  'use strict';

  /* ---- pure functions ---- */
  // time units (not to scale; SIFS < DIFS as in 802.11). Contention-window slots are left out, as in Figure 12.17.
  var U = { DIFS: 4, SIFS: 2, RTS: 3, CTS: 3, DATA: 14, ACK: 3 }, TC = 10, TMAX = 42;
  function hears(pos, R) { // symmetric: X hears Y when their distance is at most the radio range
    var d = function (a, b) { return Math.abs(pos[a] - pos[b]); };
    return { AB: d('A', 'B') <= R, CB: d('C', 'B') <= R, AC: d('A', 'C') <= R, dAB: d('A', 'B'), dCB: d('C', 'B'), dAC: d('A', 'C') };
  }
  // mode 1: CSMA/CA without RTS/CTS; mode 2: with RTS/CTS. hAC: can A and C hear each other?
  function plan(mode, hAC) {
    var it = [], ev = [], u = U;
    function add(st, k, s, e, x) { var o = { st: st, k: k, s: s, e: e }; for (var key in x || {}) o[key] = x[key]; it.push(o); return e; }
    function E(t, txt, tone) { ev.push({ t: t, txt: txt, tone: tone || '' }); }
    var t = 0;
    add('C', 'ready', TC, TC);
    if (mode === 1) {
      t = add('A', 'DIFS', 0, u.DIFS);
      E(0, 'A has a frame for B. It senses the medium idle and waits DIFS.');
      var aEnd = add('A', 'DATA', t, t + u.DATA, { frame: true });
      E(t, 'A sends its data to B. ' + (hAC ? 'C is in A\'s range, so C hears it.' : 'C is out of A\'s range: C hears nothing.'));
      if (!hAC) {
        add('C', 'DIFS', TC, TC + u.DIFS);
        E(TC, 'C has a frame for B. It senses the medium: idle! (A is hidden from C.) C waits DIFS.', 'warn');
        var cs = TC + u.DIFS, cEnd = add('C', 'DATA', cs, cs + u.DATA, { frame: true });
        E(cs, 'C sends its data. Both signals reach B and overlap: collision at B. A and C each hear only silence.', 'bad');
        add('A', 'wait', aEnd, aEnd + u.SIFS + u.ACK); add('A', 'timeout', aEnd + u.SIFS + u.ACK, aEnd + u.SIFS + u.ACK);
        E(aEnd, 'A finishes. B received a garbled frame, so B sends no ACK. A waits for one.', 'bad');
        E(aEnd + u.SIFS + u.ACK, 'A\'s ACK timer runs out: no ACK, so A assumes a collision and backs off.', 'bad');
        add('C', 'wait', cEnd, cEnd + u.SIFS + u.ACK); add('C', 'timeout', cEnd + u.SIFS + u.ACK, cEnd + u.SIFS + u.ACK);
        E(cEnd + u.SIFS + u.ACK, 'C\'s ACK timer runs out too. Both frames are lost, and neither sender ever heard the collision: it happened only at B.', 'bad');
        return { it: it, ev: ev, col: true, overlap: [cs, aEnd] };
      }
      add('B', 'SIFS', aEnd, aEnd + u.SIFS); var k = add('B', 'ACK', aEnd + u.SIFS, aEnd + u.SIFS + u.ACK, { frame: true });
      E(TC, 'C has a frame for B. It senses the medium: busy (C hears A). C keeps waiting.', 'ok');
      E(aEnd, 'A finishes. B waits SIFS.');
      E(aEnd + u.SIFS, 'B sends the ACK. SIFS < DIFS, so B gets the medium before C.', 'ok');
      add('C', 'DIFS', k, k + u.DIFS); add('C', 'DATA', k + u.DIFS, k + u.DIFS + u.DATA, { frame: true });
      E(k, 'The medium is idle. C waits DIFS.');
      E(k + u.DIFS, 'C sends its data. No collision: carrier sense works because A and C hear each other.', 'ok');
      return { it: it, ev: ev, col: false };
    }
    // mode 2: DIFS, RTS, SIFS, CTS, SIFS, data, SIFS, ACK
    t = add('A', 'DIFS', 0, u.DIFS);
    E(0, 'A has a frame for B. It senses the medium idle and waits DIFS.');
    var durR = u.SIFS + u.CTS + u.SIFS + u.DATA + u.SIFS + u.ACK, durC = u.SIFS + u.DATA + u.SIFS + u.ACK;
    t = add('A', 'RTS', t, t + u.RTS, { frame: true, dur: durR });
    E(t - u.RTS, 'A sends RTS (request to send), asking for ' + durR + ' units. ' + (hAC ? 'C is in A\'s range and hears it.' : 'C is out of A\'s range: it hears nothing.'));
    var navS = hAC ? t : null;
    t = add('B', 'SIFS', t, t + u.SIFS);
    if (hAC) E(t - u.SIFS, 'C sets its NAV from the RTS: ' + durR + ' units, until t = ' + (t - u.SIFS + durR) + '. B waits SIFS.', 'ok');
    else E(t - u.SIFS, 'B waits SIFS.');
    t = add('B', 'CTS', t, t + u.CTS, { frame: true, dur: durC });
    E(t - u.CTS, 'B sends CTS (clear to send), ' + durC + ' units left. Everyone in B\'s range hears it, including C.');
    E(TC, hAC ? 'C has a frame for B, but its NAV is running: C stays quiet.' : 'C has a frame for B, but it hears the CTS: the medium is busy.', 'ok');
    if (!hAC) navS = t;
    var navE = t + durC;
    add('C', 'NAV', navS, navE, { by: hAC ? 'RTS' : 'CTS' });
    t = add('A', 'SIFS', t, t + u.SIFS);
    E(t - u.SIFS, hAC ? 'CTS received. A waits SIFS.' : 'C sets its NAV from the CTS: ' + durC + ' units, until t = ' + navE + '. A waits SIFS.', 'ok');
    t = add('A', 'DATA', t, t + u.DATA, { frame: true });
    E(t - u.DATA, 'A sends the data. C, inside its NAV, does not even sense the channel.', 'ok');
    t = add('B', 'SIFS', t, t + u.SIFS); E(t - u.SIFS, 'Data received. B waits SIFS.');
    t = add('B', 'ACK', t, t + u.ACK, { frame: true }); E(t - u.ACK, 'B sends the ACK: A\'s frame arrived safely.', 'ok');
    t = add('C', 'DIFS', navE, navE + u.DIFS); E(navE, 'C\'s NAV expires. C waits DIFS.');
    add('C', 'RTS', t, t + u.RTS, { frame: true }); E(t, 'C starts its own exchange with an RTS. No collision happened.', 'ok');
    ev.sort(function (a, b) { return a.t - b.t; });
    return { it: it, ev: ev, col: false, nav: [navS, navE], durR: durR, durC: durC };
  }
  // which signals station X hears at time t (frames from other stations in range)
  function heardAt(p, g, X, t) {
    return p.it.filter(function (o) { return o.frame && o.st !== X && o.s <= t && t < o.e && inRange(g, X, o.st); });
  }
  function inRange(g, X, Y) { var key = [X, Y].sort().join(''); return key === 'AB' ? g.AB : key === 'BC' ? g.CB : g.AC; }
  if (typeof module !== 'undefined') { module.exports = { plan: plan, hears: hears, heardAt: heardAt, U: U }; return; }

  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;
  var KC = { RTS: C.orangeL, CTS: C.blue, DATA: C.orange, ACK: C.green };
  var PRE = { hid: { pos: { A: 120, B: 300, C: 480 }, R: 220 }, near: { pos: { A: 200, B: 300, C: 400 }, R: 220 } };
  var MS = 1.15; function MXP(m) { return 540 + (m - 300) * MS; } // map: metres 0 … 600 → px

  D.register('rtscts', function (root) {
    var st = { mode: 1, pos: { A: 120, B: 300, C: 480 }, R: 220, t: 0, timer: null };
    var cv = D.canvas(1080, 650);
    var form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.45' });
    var dist = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.45' });
    var stepBox = h('div', { cls: 'w-verdict', style: 'font-size:23px;min-height:150px' });
    function mk(t, f, c) { var b = D.btn(t, f, c); b.style.cssText = 'font-size:22px;padding:7px 12px'; return b; }
    function stop() { if (st.timer) { clearInterval(st.timer); st.timer = null; playB.textContent = '▶ Play'; } }
    var mSeg = D.seg([[1, 'Mode 1: no RTS/CTS'], [2, 'Mode 2: RTS/CTS']], 1, function (k) { stop(); st.mode = k; st.t = 0; draw(); });
    var rSl = D.slider('Radio range (all stations)', 60, 500, 10, st.R, function (v) { return v + ' m'; }, function (v) { st.R = v; pre.set(''); draw(); });
    var pre = D.seg([['hid', 'Hidden station (slide)'], ['near', 'A and C in range']], 'hid', function (k) {
      stop(); st.pos = JSON.parse(JSON.stringify(PRE[k].pos)); st.R = PRE[k].R; rSl.set(st.R); st.t = 0; draw();
    });
    [].forEach.call(mSeg.el.children, function (b) { b.style.cssText = 'font-size:22px;padding:7px 12px'; });
    [].forEach.call(pre.el.children, function (b) { b.style.cssText = 'font-size:22px;padding:7px 12px'; });
    function chip(col, txt, solid) { return h('span', { style: 'display:inline-flex;align-items:center;gap:6px;margin-right:14px;font-size:22px' }, [h('span', { style: 'width:30px;height:20px;border-radius:4px;' + (solid ? 'background:' + col : 'background:#cfe0f3;border:2px solid ' + col) }), txt]); }
    var legend = h('div', { cls: 'w-card', style: 'padding:10px 16px;display:block;line-height:1.7' }, [chip(KC.RTS, 'RTS', 1), chip(KC.CTS, 'CTS', 1), chip(KC.DATA, 'Data', 1), chip(KC.ACK, 'ACK', 1), chip(C.blue, 'NAV', 0), chip(C.red, 'collision (two signals)', 1),
      h('div', { cls: 'w-note', style: 'font-size:22px;margin-top:4px', text: '"hears" strip: what reaches each station.' })]);
    var P = null;
    function events() { return P ? P.ev : []; }
    function step() {
      stop(); var nx = events().filter(function (e) { return e.t > st.t + 1e-9; })[0];
      st.t = nx ? nx.t : st.t < TMAX ? TMAX : 0; draw();
    }
    var playB = mk('▶ Play', function () {
      if (st.timer) { stop(); return; }
      if (st.t >= TMAX) st.t = 0;
      playB.textContent = '❚❚ Pause';
      st.timer = setInterval(function () { st.t = Math.min(TMAX, st.t + 0.25); draw(); if (st.t >= TMAX) stop(); }, 60);
    }, 'acc');
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:12px' }, [cv.c, h('div', { cls: 'w-card', style: 'padding:8px 16px' }, [form])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:10px;padding-top:12px;padding-bottom:10px' }, [mSeg.el,
          h('div', { cls: 'w-btns', style: 'gap:8px' }, [mk('Step ▸', step), playB, mk('Reset', function () { stop(); st.t = 0; draw(); })]),
          pre.el, rSl.el,
          h('p', { cls: 'w-note', style: 'font-size:22px;margin:0', text: 'Drag A, B or C on the map.' })]),
        h('div', { cls: 'w-card', style: 'padding:8px 16px' }, [dist]),
        stepBox, legend])
    ]));
    // dragging stations on the map
    var drag = null;
    function mpos(e) { var r = cv.c.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.w / r.width, y: (e.clientY - r.top) * cv.h / r.height }; }
    cv.c.addEventListener('pointerdown', function (e) {
      var m = mpos(e); if (m.y > 280) return;
      var best = null, bd = 50;
      ['A', 'B', 'C'].forEach(function (k) { var d = Math.abs(MXP(st.pos[k]) - m.x); if (d < bd && Math.abs(m.y - 150) < 60) { bd = d; best = k; } });
      if (best) { drag = best; cv.c.setPointerCapture(e.pointerId); e.preventDefault(); }
    });
    cv.c.addEventListener('pointermove', function (e) {
      var m = mpos(e);
      if (!drag) { cv.c.style.cursor = m.y < 280 && ['A', 'B', 'C'].some(function (k) { return Math.abs(MXP(st.pos[k]) - m.x) < 50 && Math.abs(m.y - 150) < 60; }) ? 'grab' : 'default'; return; }
      st.pos[drag] = Math.max(0, Math.min(600, Math.round(((m.x - 540) / MS + 300) / 5) * 5)); pre.set(''); draw();
    });
    cv.c.addEventListener('pointerup', function () { drag = null; });

    function draw() {
      var G = hears(st.pos, st.R), okB = G.AB && G.CB;
      P = plan(st.mode, G.AC);
      var g = cv.g, w = cv.w, hh = cv.h, t = st.t;
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      g.textBaseline = 'middle';
      /* ---- map ---- */
      var MY = 150, MH = 284, X = MXP;
      var active = okB ? P.it.filter(function (o) { return o.frame && o.s <= t && t < o.e; }) : [];
      g.save(); g.beginPath(); g.rect(1, 1, w - 2, MH - 2); g.clip();
      var rx = st.R * MS, ry = Math.min(rx * 0.62, 400);
      [['A', 'rgba(240,163,94,.16)', '#e0883a'], ['C', 'rgba(159,193,230,.25)', C.blue]].forEach(function (s) {
        g.fillStyle = s[1]; g.strokeStyle = s[2]; g.lineWidth = 3; g.beginPath(); g.ellipse(X(st.pos[s[0]]), MY, rx, ry, 0, 0, 7); g.fill(); g.stroke();
      });
      active.forEach(function (o) { // ring of the station that is transmitting now
        g.strokeStyle = KC[o.k]; g.lineWidth = 7; g.setLineDash(o.st === 'B' ? [14, 8] : []); g.beginPath(); g.ellipse(X(st.pos[o.st]), MY, rx, ry, 0, 0, 7); g.stroke(); g.setLineDash([]);
      });
      g.restore();
      g.font = '600 20px ' + SANS; g.textAlign = 'left'; g.fillStyle = '#b5651d'; g.fillText('A\'s range', 14, 22);
      g.textAlign = 'right'; g.fillStyle = C.blue; g.fillText('C\'s range', w - 14, 22);
      g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(1, MH); g.lineTo(w - 1, MH); g.stroke();
      ['A', 'B', 'C'].forEach(function (k) {
        var x = X(st.pos[k]), hd = okB ? heardAt(P, G, k, t) : [], col = hd.length > 1;
        var nav = P.it.filter(function (o) { return o.k === 'NAV' && o.st === k && o.s <= t && t < o.e; })[0];
        var tx = active.filter(function (o) { return o.st === k; })[0];
        if (col) { g.fillStyle = 'rgba(192,57,43,.25)'; g.beginPath(); g.arc(x, MY, 58, 0, 7); g.fill(); }
        g.fillStyle = col ? C.red : C.navy; g.beginPath(); g.arc(x, MY, 32, 0, 7); g.fill();
        g.fillStyle = '#fff'; g.font = '700 30px ' + SANS; g.textAlign = 'center'; g.fillText(k, x, MY + 1);
        g.font = '600 21px ' + SANS;
        function tag(txt, yy, col, font) { g.font = font || '600 21px ' + SANS; var tw = g.measureText(txt).width; g.fillStyle = 'rgba(251,250,247,.9)'; g.fillRect(x - tw / 2 - 6, yy - 14, tw + 12, 28); g.fillStyle = col; g.fillText(txt, x, yy); }
        if (tx) tag('sends ' + (tx.k === 'DATA' ? 'data' : tx.k), MY - 52, KC[tx.k]);
        if (col) tag('✕ collision at ' + k, MY + 54, C.red, '700 22px ' + SANS);
        else if (hd.length === 1) tag('hears ' + hd[0].st + '\'s ' + (hd[0].k === 'DATA' ? 'data' : hd[0].k), MY + 54, KC[hd[0].k]);
        if (nav) tag('NAV: quiet until t = ' + nav.e, MY + (col || hd.length ? 84 : 54), C.blue, '700 21px ' + SANS);
      });
      // distance ruler
      g.font = '500 20px ' + MONO; g.fillStyle = C.gray; g.textAlign = 'center';
      [['A', 'B', G.AB, G.dAB], ['B', 'C', G.CB, G.dCB]].forEach(function (q) {
        var xa = X(st.pos[q[0]]), xb = X(st.pos[q[1]]), ym = MH - 22;
        g.strokeStyle = q[2] ? C.gray : C.red; g.lineWidth = 1.5; g.beginPath(); g.moveTo(xa, ym); g.lineTo(xb, ym); g.stroke();
        g.fillStyle = q[2] ? C.gray : C.red; g.fillText(q[3] + ' m', (xa + xb) / 2, ym - 14);
      });
      /* ---- timeline ---- */
      var tx0 = 170, tx1 = w - 20, TY = MH + 10, T = TMAX, XT = function (u) { return tx0 + u / T * (tx1 - tx0); };
      g.font = '500 20px ' + MONO; g.fillStyle = C.gray; g.textAlign = 'center';
      for (var k = 0; k <= T; k += 5) { g.fillText(String(k), XT(k), TY + 12); g.strokeStyle = C.grid; g.lineWidth = 1; g.beginPath(); g.moveTo(XT(k), TY + 26); g.lineTo(XT(k), hh - 8); g.stroke(); }
      g.textAlign = 'left'; g.fillText('t (units)', 14, TY + 12);
      var rows = [['A', 'A (source)'], ['B', 'B (destination)'], ['C', 'C (other)']], RH = 104, ry0 = TY + 58;
      g.save(); if (!okB) g.globalAlpha = 0.25;
      rows.forEach(function (r, i) {
        var y = ry0 + i * RH, bh = 34, sy = y + bh + 6;
        g.font = '700 21px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText(r[1], 12, y + bh / 2);
        g.font = '400 20px ' + SANS; g.fillStyle = C.gray; g.fillText('hears', 12, sy + 8);
        g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(tx0, y + bh); g.lineTo(tx1, y + bh); g.stroke();
        g.save(); g.beginPath(); g.rect(tx0 - 30, y - 30, Math.max(0, XT(t) - tx0 + 30), RH); g.clip();
        P.it.forEach(function (o) {
          if (o.st !== r[0]) return;
          var xa = XT(o.s), xb = XT(o.e);
          if (o.frame) {
            g.fillStyle = KC[o.k]; g.fillRect(xa, y, xb - xa, bh);
            g.fillStyle = '#fff'; g.font = '700 20px ' + SANS; g.textAlign = 'center'; g.fillText(o.k === 'DATA' ? 'Data' : o.k, (xa + xb) / 2, y + bh / 2 + 1);
          } else if (o.k === 'DIFS' || o.k === 'SIFS') {
            g.strokeStyle = C.gray; g.lineWidth = 2; g.beginPath(); g.moveTo(xa, y + bh - 10); g.lineTo(xa, y + bh); g.lineTo(xb, y + bh); g.lineTo(xb, y + bh - 10); g.stroke();
            g.fillStyle = C.gray; g.font = '400 20px ' + SANS; g.textAlign = 'center'; g.fillText(o.k, (xa + xb) / 2, y + bh - 20);
          } else if (o.k === 'NAV') {
            g.fillStyle = '#cfe0f3'; g.strokeStyle = C.blue; g.lineWidth = 2; g.fillRect(xa, y + 4, xb - xa, bh - 8); g.strokeRect(xa, y + 4, xb - xa, bh - 8);
            g.fillStyle = C.blue; g.font = '700 20px ' + SANS; g.textAlign = 'center'; g.fillText('NAV (set by ' + o.by + ')', (xa + xb) / 2, y + bh / 2 + 1);
          } else if (o.k === 'wait') {
            g.strokeStyle = C.gray; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(xa, y + bh / 2); g.lineTo(xb, y + bh / 2); g.stroke(); g.setLineDash([]);
            g.fillStyle = C.gray; g.font = '400 20px ' + SANS; g.textAlign = 'center'; g.fillText('ACK?', (xa + xb) / 2, y + bh / 2 - 14);
          } else if (o.k === 'timeout') {
            g.fillStyle = C.red; g.font = '700 26px ' + SANS; g.textAlign = 'center'; g.fillText('✕', xa, y + bh / 2);
            g.font = '600 20px ' + SANS; g.textAlign = 'left'; g.fillText('time-out', xa + 14, y + bh / 2);
          } else if (o.k === 'ready' && t >= o.s) {
            g.fillStyle = C.navy; g.beginPath(); g.moveTo(xa - 8, y - 14); g.lineTo(xa + 8, y - 14); g.lineTo(xa, y - 2); g.closePath(); g.fill();
            g.font = '600 20px ' + SANS; g.textAlign = 'right'; g.fillText('C has a frame', xa - 12, y - 10);
          }
        });
        // what this station hears: one strip, red where two signals overlap
        var bp = [0, T]; P.it.forEach(function (o) { if (o.frame) bp.push(o.s, o.e); });
        bp.sort(function (a, b) { return a - b; });
        for (var q = 0; q + 1 < bp.length; q++) {
          if (bp[q + 1] - bp[q] < 1e-9) continue;
          var hd = heardAt(P, G, r[0], (bp[q] + bp[q + 1]) / 2);
          if (!hd.length) continue;
          g.fillStyle = hd.length > 1 ? C.red : KC[hd[0].k]; g.globalAlpha = (okB ? 1 : 0.25) * (hd.length > 1 ? 1 : 0.5);
          g.fillRect(XT(bp[q]), sy, XT(bp[q + 1]) - XT(bp[q]), 16); g.globalAlpha = okB ? 1 : 0.25;
        }
        if (P.col && r[0] === 'B' && t > P.overlap[0]) { g.fillStyle = C.red; g.font = '700 20px ' + SANS; g.textAlign = 'left'; g.fillText('← collision only at B', XT(P.overlap[1]) + 8, sy + 8); }
        g.restore();
      });
      g.restore();
      // cursor
      if (t > 0) { g.strokeStyle = C.orange; g.lineWidth = 3; g.beginPath(); g.moveTo(XT(t), TY + 26); g.lineTo(XT(t), hh - 6); g.stroke(); }
      if (!okB) { g.fillStyle = C.red; g.font = '700 24px ' + SANS; g.textAlign = 'center'; g.fillText('B must be in range of both A and C: drag back or pick a preset', (tx0 + tx1) / 2, ry0 + RH * 1.3); }

      /* ---- text ---- */
      function line(a, b, ok, d) { return a + '–' + b + ' = ' + d + ' m ' + (ok ? '≤' : '>') + ' ' + st.R + ' m  ' + (ok ? '<span class="ok">in range</span>' : '<span class="bad">out of range</span>'); }
      dist.innerHTML = line('A', 'B', G.AB, G.dAB) + '\n' + line('C', 'B', G.CB, G.dCB) + '\n' + line('A', 'C', G.AC, G.dAC) +
        '\n<b>' + (!okB ? 'B cannot hear both senders' : G.AC ? 'A and C hear each other' : 'A and C are hidden from each other') + '</b>';
      var u = U;
      if (!okB) form.innerHTML = 'The hidden-station setup needs B within range of both A and C.\nDrag the stations closer to B, raise the range, or pick a preset.';
      else if (st.mode === 2) form.innerHTML = 'RTS duration = SIFS+CTS+SIFS+Data+SIFS+ACK = ' + [u.SIFS, u.CTS, u.SIFS, u.DATA, u.SIFS, u.ACK].join('+') + ' = <b>' + P.durR + '</b>\n' +
        'CTS duration = SIFS+Data+SIFS+ACK = ' + [u.SIFS, u.DATA, u.SIFS, u.ACK].join('+') + ' = <b>' + P.durC + '</b>\n' +
        'C\'s NAV: set by the ' + (G.AC ? 'RTS' : 'CTS') + ' at t = ' + P.nav[0] + ', quiet until t = <b>' + P.nav[1] + '</b>   (SIFS ' + u.SIFS + ' < DIFS ' + u.DIFS + ')';
      else form.innerHTML = 'Plain CSMA/CA: idle → DIFS (' + u.DIFS + ') → data (' + u.DATA + ') → SIFS (' + u.SIFS + ') → ACK (' + u.ACK + ')\n' +
        (P.col ? 'At B: A\'s data ' + 4 + '–' + P.overlap[1] + ', C\'s data ' + P.overlap[0] + '–' + (P.overlap[0] + u.DATA) + ' → overlap ' + P.overlap[0] + '–' + P.overlap[1] + ': <span class="bad">both frames lost</span>'
          : 'C hears A, so it defers: <span class="ok">no collision</span>') + '\n' +
        '<span style="color:' + C.gray + '">Time units, not to scale; contention-window slots left out, as in Figure 12.17.</span>';
      var cur = null; P.ev.forEach(function (e) { if (e.t <= t + 1e-9) cur = e; });
      if (!okB) { stepBox.className = 'w-verdict bad'; stepBox.textContent = 'Out of range: B must hear both A and C.'; }
      else if (t < 1e-9) { stepBox.className = 'w-verdict warn'; stepBox.textContent = 't = 0: ' + (P.ev[0].txt) + '  Press Step or Play.'; }
      else { stepBox.className = 'w-verdict ' + (cur.tone || 'warn'); stepBox.textContent = 't = ' + fmtN(cur.t, 2) + ': ' + cur.txt; }
    }
    draw();
  });
})();
