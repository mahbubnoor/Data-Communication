/* Try it: persistence methods (Lecture 13, after slide "persist"). Forouzan 12.1.2, Figures 12.9 and 12.10. */
(function () {
  'use strict';

  /* ---- pure functions (all times in slots; slot >= maximum propagation time) ---- */
  function rng(seed) { // mulberry32: seeded, so a run number always gives the same picture
    var a = seed >>> 0;
    return function () { a = (a + 0x6D2B79F5) >>> 0; var t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  // method '1p' | 'np' | 'pp'. ready[i] = slot in which station i gets its frame. o = {seed, F, busy, W, p}
  // A station senses at the start of a slot; frames that start in the same slot cannot hear each other (collision).
  function simulate(method, ready, o) {
    var r = rng(o.seed), F = o.F, B = o.busy, W = o.W, p = o.p, LIM = 400;
    var tx = [{ s: 0, e: B, who: [], ok: true, other: true }], ev = [], idle = [];
    var S = ready.map(function (a) { return { a: a, wake: a, K: 0, def: false, done: null, txEnd: -1 }; });
    function busyAt(s) { for (var i = 0; i < tx.length; i++) if (tx[i].s < s && s < tx[i].e) return true; return false; }
    function occAt(s) { for (var i = 0; i < tx.length; i++) if (tx[i].s <= s && s < tx[i].e) return true; return false; }
    function backoff(st, from) { st.K++; var R = Math.floor(r() * Math.pow(2, Math.min(st.K, 10))); st.wake = from + R; st.def = false; return from + R; }
    for (var s = 0; s < LIM; s++) {
      var send = [], bz = busyAt(s);
      S.forEach(function (st, i) {
        if (st.done !== null || st.txEnd > s || st.a > s || st.wake > s) return;
        if (bz) {
          if (method === 'np') { var w = 1 + Math.floor(r() * W); st.wake = s + w; ev.push({ t: s, i: i, k: 'wait', to: s + w }); }
          else if (method === 'pp' && st.def) { ev.push({ t: s, i: i, k: 'back', to: backoff(st, s + 1) }); }
        } else if (method === 'pp' && p < 1 && r() >= p) { st.def = true; ev.push({ t: s, i: i, k: 'defer' }); }
        else send.push(i);
      });
      if (send.length) {
        var ok = send.length === 1; tx.push({ s: s, e: s + F, who: send, ok: ok });
        send.forEach(function (i) {
          var st = S[i]; st.txEnd = s + F; st.def = false;
          if (ok) st.done = s + F; else ev.push({ t: s + F, i: i, k: 'back', to: backoff(st, s + F) });
        });
      }
      var waiting = S.some(function (st) { return st.done === null && st.a <= s; });
      if (s >= B && !occAt(s) && waiting) idle.push(s);
      if (S.every(function (st) { return st.done !== null; })) break;
    }
    var d = 0; S.forEach(function (st) { d += (st.done === null ? LIM : st.done) - st.a; });
    return { tx: tx, ev: ev, S: S, idle: idle, col: tx.filter(function (t) { return !t.ok; }).length, delay: d / S.length,
      end: Math.max.apply(null, S.map(function (st) { return st.done === null ? LIM : st.done; })) };
  }
  function many(method, ready, o, n) { // seeds 1..n, so "Run 100 times" is repeatable
    var c = 0, i = 0, d = 0;
    for (var k = 1; k <= n; k++) { var q = {}; for (var key in o) q[key] = o[key]; q.seed = k; var r = simulate(method, ready, q); c += r.col; i += r.idle.length; d += r.delay; }
    return { col: c / n, idle: i / n, delay: d / n };
  }
  if (typeof module !== 'undefined') { module.exports = { simulate: simulate, many: many }; return; }

  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;
  var READY = { 2: [3, 7], 3: [2, 5, 8] }, NAMES = ['A', 'B', 'C'];
  var BASE = { F: 4, busy: 10, W: 10 };
  var METH = [['1p', '1-persistent', 'keep sensing; send the moment it is idle'],
    ['np', 'Non-persistent', 'busy: wait a random time, sense again'],
    ['pp', 'p-persistent', 'idle: send with probability p; else wait a slot']];

  D.register('persist', function (root) {
    var st = { n: 3, p: 0.2, seed: 1, many: false };
    var cv = D.canvas(1080, 604);
    var tab = h('div'), form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' }), verdict = h('div', { cls: 'w-verdict', style: 'font-size:23px' });
    var runLbl = h('span', { style: 'font:600 22px ' + SANS + ';color:' + C.navy + ';align-self:center' });
    var pSl = D.slider('p (p-persistent)', 0.05, 1, 0.05, 0.2, function (v) { return fmtN(v, 2); }, function (v) { st.p = v; draw(); });
    var nSeg = D.seg([[2, '2 stations'], [3, '3 stations']], 3, function (k) { st.n = k; draw(); });
    function mk(t, f, c) { var b = D.btn(t, f, c); b.style.cssText = 'font-size:22px;padding:7px 12px'; return b; }
    var manyB = mk('Run 100 times', function () { st.many = true; draw(); }, 'acc');
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:12px' }, [cv.c, h('div', { cls: 'w-card', style: 'padding:8px 14px' }, [tab])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:10px;padding-top:12px;padding-bottom:12px' }, [nSeg.el, pSl.el,
          h('div', { cls: 'w-btns', style: 'gap:8px' }, [mk('◀', function () { if (st.seed > 1) { st.seed--; draw(); } }), runLbl, mk('▶ New run', function () { st.seed++; draw(); }), manyB]),
          h('div', { cls: 'w-btns', style: 'gap:8px' }, [h('span', { text: 'Presets:', style: 'font-weight:600;color:' + C.navy + ';align-self:center' }),
            mk('Slide: p = 0.2', function () { st.p = 0.2; pSl.set(0.2); st.seed = 1; draw(); }), mk('p = 1', function () { st.p = 1; pSl.set(1); draw(); }), mk('p = 0.05', function () { st.p = 0.05; pSl.set(0.05); draw(); })])]),
        h('div', { cls: 'w-card', style: 'padding:10px 16px' }, [form]),
        verdict])
    ]));

    function draw() {
      var ready = READY[st.n], o = { F: BASE.F, busy: BASE.busy, W: BASE.W, p: st.p, seed: st.seed };
      var R = METH.map(function (m) { return simulate(m[0], ready, o); });
      runLbl.textContent = 'Run #' + st.seed;
      var g = cv.g, w = cv.w, hh = cv.h;
      var endMax = Math.max.apply(null, R.map(function (r) { return r.end; }));
      var T = Math.min(120, Math.max(40, Math.ceil((endMax + 1) / 10) * 10)), x0 = 150, x1 = w - 22;
      var X = function (t) { return x0 + Math.min(t, T) / T * (x1 - x0); };
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      g.textBaseline = 'middle';
      // header: ready marks and slot axis
      g.font = '600 21px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Frame ready:', 14, 30);
      g.font = '500 20px ' + MONO; g.fillStyle = C.gray; g.textAlign = 'center';
      for (var k = 0; k <= T; k += 10) { g.fillText(String(k), X(k), 64); g.strokeStyle = C.grid; g.beginPath(); g.moveTo(X(k), 78); g.lineTo(X(k), hh - 44); g.stroke(); }
      g.textAlign = 'left'; g.fillText('slots', 14, 64);
      ready.forEach(function (a, i) {
        g.fillStyle = C.blue; g.beginPath(); g.moveTo(X(a) - 9, 38); g.lineTo(X(a) + 9, 38); g.lineTo(X(a), 50); g.closePath(); g.fill();
        g.font = '700 21px ' + SANS; g.textAlign = 'center'; g.fillText(NAMES[i], X(a), 22);
      });
      g.font = '600 20px ' + SANS; g.fillStyle = C.gray; g.textAlign = 'left'; g.fillText('← all ready while the channel is busy (slots 0–' + BASE.busy + ')', X(ready[ready.length - 1]) + 20, 30);
      // three method rows
      var y = 84, bh = 40, lane = 22, blk = 46 + bh + st.n * lane + 18;
      METH.forEach(function (m, mi) {
        var r = R[mi], yb = y + 30;
        g.fillStyle = mi % 2 ? 'rgba(230,234,239,.5)' : 'transparent'; g.fillRect(1, y - 4, w - 2, blk - 2);
        g.textAlign = 'left'; g.font = '700 22px ' + SANS; g.fillStyle = C.navy; g.fillText(m[1] + (m[0] === 'pp' ? ' (p = ' + fmtN(st.p, 2) + ')' : ''), 14, y + 13);
        var tw = g.measureText(m[1] + (m[0] === 'pp' ? ' (p = ' + fmtN(st.p, 2) + ')' : '')).width;
        g.font = '400 20px ' + SANS; g.fillStyle = C.gray; g.fillText(m[2], 14 + tw + 14, y + 13);
        g.textAlign = 'right'; g.font = '600 20px ' + MONO;
        g.fillStyle = r.col ? C.red : C.green; g.fillText(r.col + ' coll.', x1 - 290, y + 13);
        g.fillStyle = C.orange; g.fillText(r.idle.length + ' idle', x1 - 170, y + 13);
        g.fillStyle = C.navy; g.fillText('delay ' + fmtN(r.delay, 1), x1, y + 13);
        // channel bar
        g.font = '600 20px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'right'; g.fillText('channel', x0 - 12, yb + bh / 2);
        g.fillStyle = '#fff'; g.fillRect(x0, yb, x1 - x0, bh); g.strokeStyle = C.line; g.strokeRect(x0 + 0.5, yb + 0.5, x1 - x0 - 1, bh - 1);
        r.idle.forEach(function (s) { g.fillStyle = 'rgba(240,163,94,.45)'; g.fillRect(X(s), yb + 1, X(s + 1) - X(s), bh - 2); });
        r.tx.forEach(function (t) {
          if (t.s >= T) return;
          var col = t.other ? '#8a96a3' : t.ok ? C.green : C.red, xa = X(t.s), xb = X(t.e);
          g.fillStyle = col; g.fillRect(xa + 1, yb + 3, xb - xa - 2, bh - 6);
          var lbl = t.other ? 'busy' : t.who.map(function (i) { return NAMES[i]; }).join(t.ok ? '' : '+');
          g.font = '700 20px ' + SANS; if (g.measureText(lbl).width > xb - xa - 4) lbl = t.other ? '' : t.ok ? lbl : '✕';
          g.fillStyle = '#fff'; g.textAlign = 'center'; g.fillText(lbl, (xa + xb) / 2, yb + bh / 2 + 1);
        });
        // station lanes
        r.S.forEach(function (s, i) {
          var ly = yb + bh + 14 + i * lane;
          g.font = '700 20px ' + SANS; g.fillStyle = C.blue; g.textAlign = 'right'; g.fillText(NAMES[i], x0 - 12, ly);
          var end = s.done === null ? 400 : s.done;
          g.strokeStyle = C.navy; g.lineWidth = 2; g.beginPath(); g.moveTo(X(s.a), ly); g.lineTo(X(end), ly); g.stroke();
          r.ev.forEach(function (e) {
            if (e.i !== i || e.t >= T) return;
            if (e.k === 'wait' || e.k === 'back') {
              g.strokeStyle = C.panel; g.lineWidth = 6; g.beginPath(); g.moveTo(X(e.t) + 1, ly); g.lineTo(X(e.to), ly); g.stroke();
              g.strokeStyle = e.k === 'wait' ? C.gray : C.red; g.lineWidth = 2; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(X(e.t), ly); g.lineTo(X(e.to), ly); g.stroke(); g.setLineDash([]);
              if (e.k === 'wait') { g.fillStyle = C.gray; g.beginPath(); g.arc(X(e.t), ly, 4.5, 0, 7); g.fill(); }
            } else if (e.k === 'defer') { g.strokeStyle = C.orangeL; g.lineWidth = 2.5; g.beginPath(); g.arc(X(e.t + 0.5), ly, 5, 0, 7); g.stroke(); }
          });
          r.tx.forEach(function (t) {
            if (t.who.indexOf(i) < 0 || t.s >= T) return;
            g.strokeStyle = t.ok ? C.green : C.red; g.lineWidth = 9; g.beginPath(); g.moveTo(X(t.s) + 1, ly); g.lineTo(X(t.e) - 1, ly); g.stroke();
          });
          if (end > T) { g.fillStyle = C.navy; g.font = '700 20px ' + SANS; g.textAlign = 'right'; g.fillText('→', x1 - 2, ly - 1); }
        });
        y += blk;
      });
      // legend
      var ly = hh - 22, lx = 14;
      function key(col, txt, kind) {
        g.lineWidth = 2;
        if (kind === 'box') { g.fillStyle = col; g.fillRect(lx, ly - 9, 26, 18); }
        else if (kind === 'dash') { g.strokeStyle = col; g.setLineDash([4, 4]); g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 26, ly); g.stroke(); g.setLineDash([]); }
        else if (kind === 'ring') { g.strokeStyle = col; g.lineWidth = 2.5; g.beginPath(); g.arc(lx + 13, ly, 6, 0, 7); g.stroke(); }
        else { g.strokeStyle = col; g.beginPath(); g.moveTo(lx, ly); g.lineTo(lx + 26, ly); g.stroke(); }
        g.fillStyle = C.ink; g.font = '400 20px ' + SANS; g.textAlign = 'left'; g.fillText(txt, lx + 32, ly); lx += 32 + g.measureText(txt).width + 22;
      }
      key(C.green, 'success', 'box'); key(C.red, 'collision', 'box'); key('rgba(240,163,94,.6)', 'idle, someone waiting', 'box');
      key(C.navy, 'sensing', 'line'); key(C.gray, 'random wait', 'dash'); key(C.red, 'backoff', 'dash'); key(C.orangeL, 'wait a slot', 'ring');

      // 100-run table (seeds 1..100, same arrivals)
      if (st.many) {
        var A = METH.map(function (m) { return many(m[0], ready, o, 100); });
        var bestC = Math.min.apply(null, A.map(function (a) { return a.col; })), bestI = Math.min.apply(null, A.map(function (a) { return a.idle; })), bestD = Math.min.apply(null, A.map(function (a) { return a.delay; }));
        function cell(v, best, d) { return '<td' + (Math.abs(v - best) < 1e-9 ? ' style="color:' + C.green + ';font-weight:600"' : '') + '>' + fmtN(v, d) + '</td>'; }
        tab.innerHTML = '<table class="w-tab" style="width:100%"><tr><th class="rh">Average of runs #1–100</th><th>collisions / run</th><th>idle slots / run</th><th>avg delay (slots)</th></tr>' +
          METH.map(function (m, i) { return '<tr><td class="rh">' + m[1] + (m[0] === 'pp' ? ' (p = ' + fmtN(st.p, 2) + ')' : '') + '</td>' + cell(A[i].col, bestC, 2) + cell(A[i].idle, bestI, 1) + cell(A[i].delay, bestD, 1) + '</tr>'; }).join('') + '</table>';
        verdict.className = 'w-verdict warn';
        verdict.textContent = 'Fewest collisions: ' + METH[A.map(function (a) { return a.col; }).indexOf(bestC)][1] + '. Least idle time: ' + METH[A.map(function (a) { return a.idle; }).indexOf(bestI)][1] + '. No method wins both: fewer collisions cost idle slots.';
      } else {
        tab.innerHTML = '<p class="w-note" style="font-size:22px;margin:6px 0">One run can be lucky or unlucky. Press <b>Run 100 times</b> to average runs #1–100 (same arrivals, fixed random sequence, so the class always sees the same numbers).</p>';
        var r0 = R[0];
        verdict.className = 'w-verdict ' + (r0.col ? 'bad' : 'ok');
        verdict.textContent = '1-persistent: ' + (st.n === 2 ? 'both' : 'all ' + st.n) + ' waiting stations send in slot ' + BASE.busy + ', the moment the channel goes idle: ' + (r0.tx[1] && !r0.tx[1].ok ? 'collision.' : 'no collision.');
      }
      var q = 1 - st.p;
      form.innerHTML = 'p-persistent, channel stays idle:\n' +
        'Send in 1st slot = p = <b>' + fmtN(st.p * 100, 1) + ' %</b>\n' +
        'Still waiting after 3 slots\n  = (1 − p)³ = ' + fmtN(q, 2) + '³ = <b>' + fmtN(Math.pow(q, 3) * 100, 1) + ' %</b>\n' +
        'Average wait = 1/p = 1/' + fmtN(st.p, 2) + ' = <b>' + fmtN(1 / st.p, 2) + ' slots</b>\n' +
        '<span style="color:' + C.gray + '">Busy: slots 0–' + BASE.busy + ', frame: ' + BASE.F + ' slots\nRandom wait: 1–' + BASE.W + ' slots\nBackoff after K-th collision:\n  R = 0 … 2^K − 1 slots</span>';
    }
    draw();
  });
})();
