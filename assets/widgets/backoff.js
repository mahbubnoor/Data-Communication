/* Try it: binary exponential backoff (Lecture 13, after slide "backoff"). Forouzan Example 12.1, Figures 12.3 and 12.13. */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, btn = D.btn;
  var KMAX = 15, CAP = 10, NAMES = ['A', 'B', 'C'];

  // pure: size of the range of R after the K-th collision (Ethernet stops doubling at K = 10)
  function rangeN(K) { return Math.pow(2, Math.min(K, CAP)); }
  // pure: probability that n stations picking uniformly from N values do NOT get a unique smallest R
  function pAgain(n, N) {
    var ok = 0;
    for (var r = 0; r < N; r++) ok += n * (1 / N) * Math.pow((N - 1 - r) / N, n - 1);
    return 1 - ok;
  }
  // pure: outcome of one round of picks
  function judge(picks) {
    var mn = Math.min.apply(null, picks), who = [];
    picks.forEach(function (r, i) { if (r === mn) who.push(i); });
    return { ok: who.length === 1, winner: who[0], min: mn };
  }

  D.register('backoff', function (root) {
    var st = { n: 2, unit: 'tp', K: 1, rounds: [], status: 'pending', timer: null };
    var cv = D.canvas(1080, 840), form = h('div', { cls: 'w-f', style: 'font-size:22px' }), verdict = h('div', { cls: 'w-verdict' });
    function unitV() { return st.unit === 'tp' ? 2e-3 : 51.2e-6; }
    function fT(s) { return s === 0 ? '0' : s >= 1e-3 ? D.fmtN(s * 1e3, 3) + ' ms' : D.fmtN(s * 1e6, 1) + ' µs'; }
    function unitLbl() { return st.unit === 'tp' ? 'Tp' : 'slot'; }
    function stop() { if (st.timer) { clearInterval(st.timer); st.timer = null; } }
    function reset() { stop(); st.K = 1; st.rounds = []; st.status = 'pending'; }
    function step() {
      if (st.status !== 'pending') return;
      var N = rangeN(st.K), picks = [];
      for (var i = 0; i < st.n; i++) picks.push(Math.floor(Math.random() * N));
      var j = judge(picks);
      st.rounds.push({ K: st.K, N: N, picks: picks, ok: j.ok, winner: j.winner });
      if (j.ok) st.status = 'success';
      else { st.K++; if (st.K >= KMAX) st.status = 'abort'; }
    }
    function forceTo(K) {   // preset: replay collisions with equal picks until K collisions have happened
      reset(); st.n = 2; nSeg.set(2);
      while (st.K < K) { var N = rangeN(st.K), r = Math.floor(Math.random() * N); st.rounds.push({ K: st.K, N: N, picks: [r, r], ok: false, forced: true }); st.K++; }
      draw();
    }
    var nSeg = D.seg([[2, '2 stations'], [3, '3 stations']], 2, function (k) { st.n = k; reset(); draw(); });
    var uSeg = D.seg([['tp', 'TB = R × Tp (2 ms)'], ['slot', 'R × slot (51.2 µs)']], 'tp', function (k) { st.unit = k; draw(); });
    var runB = btn('Run until success', function () {
      if (st.status !== 'pending') reset();
      stop(); st.timer = setInterval(function () { step(); draw(); if (st.status !== 'pending') stop(); }, 450);
    });
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      cv.c,
      h('div', { cls: 'w-col', style: 'width:560px;gap:14px' }, [
        h('div', { cls: 'w-card', style: 'gap:10px' }, [nSeg.el, uSeg.el,
          h('div', { cls: 'w-btns' }, [btn('Step', function () { stop(); if (st.status !== 'pending') reset(); else step(); draw(); }, 'acc'), runB, btn('Reset', function () { reset(); draw(); })]),
          h('div', { cls: 'w-btns', style: 'gap:8px' }, [h('span', { text: 'Jump to:', style: 'font-weight:600;color:' + C.navy + ';align-self:center' }),
            btn('Ex. 12.1: K = 2', function () { uSeg.set('tp'); st.unit = 'tp'; forceTo(2); }), btn('K = 4', function () { uSeg.set('tp'); st.unit = 'tp'; forceTo(4); })])]),
        h('div', { cls: 'w-card', style: 'padding:14px 18px' }, [form]),
        verdict])]));

    var COL = [C.blue, C.orange, C.navy];
    function draw() {
      var g = cv.g, w = cv.w, hh = cv.h, u = unitV();
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh);
      g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      // rows: initial collision, each round, then the pending range
      var rows = [{ init: true }].concat(st.rounds);
      if (st.status === 'pending') rows.push({ K: st.K, N: rangeN(st.K), pending: true });
      if (st.status === 'abort') rows.push({ abort: true });
      var vis = rows.slice(-6), Nmax = 8;
      vis.forEach(function (r) { if (r.N) Nmax = Math.max(Nmax, r.N); });
      var ax0 = 250, ax1 = 860, cw = (ax1 - ax0) / Nmax, rh = 70, y0 = 70;
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textBaseline = 'middle'; g.textAlign = 'left';
      g.fillText('After collision K', 18, 30); g.fillText('R picked from 0 … 2^K − 1 (scale: 0 … ' + (Nmax - 1) + ')', ax0, 30); g.textAlign = 'right'; g.fillText('Result', w - 16, 30);
      vis.forEach(function (r, i) {
        var y = y0 + i * rh;
        g.fillStyle = i % 2 ? 'rgba(230,234,239,.45)' : 'transparent'; g.fillRect(1, y - 6, w - 2, rh);
        g.textAlign = 'left';
        if (r.init) {
          g.font = '600 22px ' + D.SANS; g.fillStyle = C.ink; g.fillText('Attempt 1: all ' + st.n + ' stations send at once', 18, y + 18);
          g.textAlign = 'right'; g.fillStyle = C.red; g.fillText('collision 1', w - 16, y + 18);
          g.textAlign = 'left'; g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.fillText('→ K = 1, each station backs off', 18, y + 44);
          return;
        }
        if (r.abort) {
          g.font = '700 24px ' + D.SANS; g.fillStyle = C.red; g.fillText('K = ' + KMAX + ': give up (abort), Fig. 12.13', 18, y + 24); return;
        }
        g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.fillText('K = ' + r.K, 18, y + 16);
        g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.fillText('R ∈ 0…' + (r.N - 1), 100, y + 16);
        if (r.picks) { g.fillStyle = C.ink; g.fillText(r.picks.map(function (p, k) { return NAMES[k] + '=' + p; }).join(' '), 18, y + 46); }
        // range bar
        g.fillStyle = r.pending ? '#fbe9da' : '#e7edf3'; g.fillRect(ax0, y + 4, r.N * cw, 28);
        g.strokeStyle = r.pending ? C.orangeL : C.sky; g.lineWidth = 1.5; g.strokeRect(ax0, y + 4, r.N * cw, 28);
        if (cw >= 7) { g.strokeStyle = 'rgba(22,50,79,.18)'; g.lineWidth = 1; for (var c = 1; c < r.N; c++) { g.beginPath(); g.moveTo(ax0 + c * cw, y + 4); g.lineTo(ax0 + c * cw, y + 32); g.stroke(); } }
        g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'right';
        g.fillText(String(r.N - 1), Math.min(ax0 + r.N * cw + (r.N * cw < 40 ? 34 : -4), ax1 + 40), y + 48);
        g.textAlign = 'left'; if (r.N * cw >= 40) g.fillText('0', ax0 + 3, y + 48);
        if (r.pending) {
          g.font = '600 22px ' + D.SANS; g.fillStyle = C.orange; g.textAlign = 'right'; g.fillText('Step →', w - 16, y + 18);
          return;
        }
        // markers
        var seen = {};
        r.picks.forEach(function (p, k) {
          var off = seen[p] = (seen[p] || 0) + 1, cx = ax0 + (p + 0.5) * cw + (off - 1) * 24, cy = y + 18;
          g.fillStyle = COL[k]; g.beginPath(); g.arc(cx, cy, 13, 0, 7); g.fill();
          g.fillStyle = '#fff'; g.font = '700 18px ' + D.SANS; g.textAlign = 'center'; g.fillText(NAMES[k], cx, cy + 1);
        });
        if (!r.ok) {
          var mn = Math.min.apply(null, r.picks), cnt = r.picks.filter(function (p) { return p === mn; }).length;
          g.strokeStyle = C.red; g.lineWidth = 3; g.strokeRect(ax0 + mn * cw - 3, y + 1, cw + (cnt - 1) * 24 + 6, 34);
        }
        g.font = '600 22px ' + D.SANS; g.textAlign = 'right';
        if (r.ok) { g.fillStyle = C.green; g.fillText(NAMES[r.winner] + ' goes first ✓', w - 16, y + 18); }
        else { g.fillStyle = C.red; g.fillText('collision ' + (r.K + 1) + (r.forced ? '*' : ''), w - 16, y + 18); }
      });
      if (rows.length > vis.length) { g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'left'; g.fillText('(earlier rounds scrolled off)', 18, 500); }
      if (st.rounds.some(function (r) { return r.forced; })) { g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'right'; g.fillText('* preset: picks forced equal', w - 16, 500); }
      // chance of colliding again, K = 1 … 10
      var cy0 = 540, cbase = hh - 46, chH = cbase - cy0 - 60, curK = st.status === 'pending' ? st.K : (st.rounds.length ? st.rounds[st.rounds.length - 1].K : 1);
      g.strokeStyle = C.line; g.lineWidth = 1; g.beginPath(); g.moveTo(10, cy0 - 14); g.lineTo(w - 10, cy0 - 14); g.stroke();
      g.font = '600 22px ' + D.SANS; g.fillStyle = C.navy; g.textAlign = 'left';
      g.fillText('Chance that the ' + st.n + ' stations collide again, after collision K', 18, cy0 + 14);
      var bw2 = (w - 160) / 10, p1 = pAgain(st.n, 2);
      for (var kk = 1; kk <= 10; kk++) {
        var pk = pAgain(st.n, rangeN(kk)), bx = 130 + (kk - 1) * bw2, bh = Math.max(2, pk / p1 * chH), on = kk === curK;
        g.fillStyle = on ? C.orange : C.sky; g.fillRect(bx + 10, cbase - bh, bw2 - 20, bh);
        g.font = (on ? '700' : '500') + ' 20px ' + D.MONO; g.fillStyle = on ? C.orange : C.ink; g.textAlign = 'center';
        g.fillText(D.fmtN(100 * pk, pk < 0.01 ? 2 : 1) + '%', bx + bw2 / 2, cbase - bh - 14);
        g.fillStyle = on ? C.orange : C.gray; g.fillText('K=' + kk, bx + bw2 / 2, cbase + 22);
      }
      g.strokeStyle = C.gray; g.beginPath(); g.moveTo(130, cbase); g.lineTo(w - 30, cbase); g.stroke();
      // ----- formula
      var last = st.rounds[st.rounds.length - 1], K = st.status === 'pending' ? st.K : (last ? last.K : 1), N = rangeN(K), ul = unitLbl();
      var vals = [], ex = N <= 8;
      if (ex) for (var q = 0; q < N; q++) vals.push(D.fmtN(q * u * (u >= 1e-3 ? 1e3 : 1e6), 2));
      var unitS = u >= 1e-3 ? 'ms' : 'µs', pa = pAgain(st.n, N), collisions = st.rounds.filter(function (r) { return !r.ok; }).length + 1;
      var f = 'Collisions so far: <b>' + collisions + '</b>' + (st.status === 'pending' ? '  (next: K = ' + K + ')' : '') + '\n';
      f += 'R ∈ {0 … 2^' + (K > CAP ? 'min(K,10)' : 'K') + ' − 1} = {0 … ' + (N - 1) + '}\n';
      var sc = u >= 1e-3 ? 1e3 : 1e6, lst = vals.join(', ');
      if (!ex || lst.length > 18) lst = '0, ' + D.fmtN(u * sc, 2) + ', …, ' + D.fmtN((N - 1) * u * sc, 1);
      f += 'TB = R × ' + ul + ' ∈ {' + lst + '} ' + unitS + '\n';
      if (last) f += 'Last R:  ' + last.picks.map(function (p, k) { return NAMES[k] + '=' + p; }).join('  ') + '\nLast TB: ' + last.picks.map(function (p, k) { return NAMES[k] + ' ' + fT(p * u); }).join(', ') + '\n';
      f += 'P(collide again)' + (st.n === 2 ? ' = P(same R)\n  = 1/2^K = 1/' + N : '\n  = 1 − P(one smallest R)') + ' = <b>' + D.fmtN(100 * pa, pa < 0.01 ? 3 : 1) + ' %</b>\n';
      f += 'Give up after collision ' + KMAX + '; range stops\ndoubling at K = ' + CAP + ' (0 … 1023)';
      form.innerHTML = f;
      if (st.status === 'success') { verdict.className = 'w-verdict ok'; verdict.textContent = 'Success after ' + collisions + ' collision' + (collisions > 1 ? 's' : '') + ': station ' + NAMES[last.winner] + ' waits least and gets through ✓'; }
      else if (st.status === 'abort') { verdict.className = 'w-verdict bad'; verdict.textContent = 'Aborted after ' + KMAX + ' collisions ✗'; }
      else { verdict.className = 'w-verdict warn'; verdict.textContent = 'Collision ' + collisions + ': press Step to roll R from 0 … ' + (N - 1) + '.'; }
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { rangeN: rangeN, pAgain: pAgain, judge: judge };
})();
