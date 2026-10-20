(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, fmtN = D.fmtN, SANS = D.SANS, MONO = D.MONO;
  var COLS = ['#f0a35e', '#9fc1e6', '#8fd19e', '#e6a0c4'], EMPTY = '#2f4a66', NAMES = ['A', 'B', 'C', 'D'], ADDR = ['00', '01', '10', '11'];
  var WIN = 6, UNIT = 8, ABITS = 2;

  function stats(rounds, fbit) { // rounds: arrays of 4 booleans
    var n = rounds.length, used = 0;
    rounds.forEach(function (r) { r.forEach(function (x) { if (x) used++; }); });
    var tot = n * 4;
    return { n: n, tot: tot, used: used, empty: tot - used, util: tot ? used / tot : 0,
      syncBits: n * (4 * UNIT + (fbit ? 1 : 0)), statBits: used * (UNIT + ABITS) };
  }
  var SLIDE = [[1, 1, 0, 1], [0, 1, 0, 1], [1, 0, 0, 1]].map(function (r) { return r.map(Boolean); });

  D.register('tdm', function (root) {
    var st = { p: [2 / 3, 2 / 3, 0, 1], rounds: SLIDE.map(function (r) { return r.slice(); }), all: SLIDE.map(function (r) { return r.slice(); }), fbit: false };
    var timer = null;
    var cv = D.canvas(1080, 610), form = h('div', { cls: 'w-f' }), verdict = h('div', { cls: 'w-verdict' });
    var sl = NAMES.map(function (nm, i) {
      return D.slider('Input ' + nm + ' busy', 0, 100, 1, Math.round(st.p[i] * 100), function (v) { return v + '%'; }, function (v) { st.p[i] = v / 100; pre.set(''); draw(); });
    });
    var pre = D.seg([['slide', 'Slide pattern'], ['busy', 'All busy'], ['bursty', 'All 20%']], 'slide', function (k) {
      stop();
      if (k === 'slide') { st.p = [2 / 3, 2 / 3, 0, 1]; st.rounds = SLIDE.map(function (r) { return r.slice(); }); st.all = st.rounds.map(function (r) { return r.slice(); }); }
      else { st.p = k === 'busy' ? [1, 1, 1, 1] : [0.2, 0.2, 0.2, 0.2]; st.rounds = []; st.all = []; for (var i = 0; i < WIN; i++) step(true); }
      sl.forEach(function (s, i) { s.set(Math.round(st.p[i] * 100)); }); draw();
    });
    var playB = D.btn('▶ Play', function () { if (timer) stop(); else { timer = setInterval(function () { step(); }, 800); playB.textContent = '❚❚ Pause'; } }, 'acc');
    var fB = D.btn('Framing bit', function () { st.fbit = !st.fbit; fB.classList.toggle('on', st.fbit); draw(); });
    function stop() { if (timer) clearInterval(timer); timer = null; playB.textContent = '▶ Play'; }
    function step(quiet) {
      var r = st.p.map(function (p) { return Math.random() < p; });
      st.rounds.push(r); st.all.push(r); if (st.rounds.length > WIN) st.rounds.shift();
      if (!quiet) draw();
    }
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [cv.c, h('div', { cls: 'w-card', style: 'padding:12px 20px' }, [form])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 20px' }, [h('h4', { text: 'Start from' }), pre.el]),
        h('div', { cls: 'w-card', style: 'gap:0;padding:4px 20px' }, sl.map(function (s) { return s.el; })),
        h('div', { cls: 'w-btns' }, [D.btn('Step: one round', function () { stop(); pre.set(''); step(); }), playB,
          D.btn('Clear', function () { stop(); pre.set(''); st.rounds = []; st.all = []; draw(); }), fB]),
        verdict])]));

    function slot(g, x, y, w, hh, i, addr) {
      if (i < 0) { g.fillStyle = EMPTY; g.fillRect(x, y, w, hh); g.strokeStyle = '#4a6f93'; g.setLineDash([4, 4]); g.strokeRect(x + 3, y + 3, w - 6, hh - 6); g.setLineDash([]); return; }
      g.fillStyle = COLS[i]; g.fillRect(x, y, w, hh);
      g.fillStyle = C.ink; g.font = '700 22px ' + MONO; g.textAlign = 'center';
      if (addr) {
        g.fillStyle = C.navy; g.fillRect(x, y, w, 30); g.fillStyle = '#fff'; g.font = '600 20px ' + MONO; g.fillText(ADDR[i], x + w / 2, y + 22);
        g.fillStyle = C.ink; g.font = '700 22px ' + MONO; g.fillText(NAMES[i], x + w / 2, y + 30 + (hh - 30) / 2 + 8);
      } else g.fillText(NAMES[i], x + w / 2, y + hh / 2 + 8);
    }
    function draw() {
      var g = cv.g, w = cv.w, H = cv.h, R = st.rounds, S = stats(R, st.fbit), last = R[R.length - 1];
      g.clearRect(0, 0, w, H); g.fillStyle = C.panel; g.fillRect(0, 0, w, H); g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, H - 1);
      // inputs: this round
      g.font = '600 22px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left'; g.fillText('Inputs, latest round:', 20, 54);
      NAMES.forEach(function (nm, i) {
        var x = 260 + i * 200, on = last && last[i];
        g.fillStyle = on ? COLS[i] : C.panel; g.strokeStyle = on ? 'rgba(22,50,79,.5)' : C.gray; g.lineWidth = 2; g.setLineDash(on ? [] : [5, 5]);
        g.fillRect(x, 24, 64, 46); g.strokeRect(x, 24, 64, 46); g.setLineDash([]);
        g.fillStyle = C.ink; g.font = '700 24px ' + MONO; g.textAlign = 'center'; g.fillText(nm, x + 32, 56);
        g.font = '500 20px ' + SANS; g.fillStyle = on ? C.ink : C.gray; g.textAlign = 'left'; g.fillText(on ? 'has data' : 'idle', x + 74, 54);
      });
      // geometry: same slot width in both rows
      var x0 = 24, x1 = w - 24, fw = st.fbit ? 24 : 0, sw = Math.floor((x1 - x0 - WIN * fw - (WIN - 1) * 6) / (WIN * 4)), frameW = 4 * sw + fw;
      // synchronous
      var y1 = 140;
      g.font = '600 22px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left';
      g.fillText('Synchronous TDM: every input owns one slot per frame', x0, y1 - 14);
      g.textAlign = 'right'; g.fillStyle = C.gray; g.fillText(S.tot + ' slots, ' + S.empty + ' wasted (dark)', x1, y1 - 14);
      for (var f = 0; f < WIN; f++) {
        var fx = x0 + f * (frameW + 6);
        if (f >= R.length) { g.strokeStyle = C.line; g.setLineDash([6, 6]); g.strokeRect(fx + 0.5, y1, frameW - 1, 80); g.setLineDash([]); continue; }
        if (st.fbit) { g.fillStyle = C.gray; g.fillRect(fx, y1, fw, 80); g.fillStyle = '#fff'; g.font = '600 20px ' + MONO; g.textAlign = 'center'; g.fillText(String((st.all.length - R.length + f) % 2), fx + fw / 2, y1 + 47); }
        R[f].forEach(function (on, i) { slot(g, fx + fw + i * sw + 1, y1, sw - 2, 80, on ? i : -1, false); });
        g.strokeStyle = C.navy; g.lineWidth = 2; g.strokeRect(fx - 1, y1 - 3, frameW + 2, 86);
        g.fillStyle = C.gray; g.font = '500 20px ' + SANS; g.textAlign = 'center'; g.fillText('frame ' + (st.all.length - R.length + f + 1), fx + frameW / 2, y1 + 110);
      }
      // statistical
      var y2 = 330, k = 0;
      g.font = '600 22px ' + SANS; g.fillStyle = C.navy; g.textAlign = 'left';
      g.fillText('Statistical TDM: only slots with data, each carries an address', x0, y2 - 14);
      g.textAlign = 'right'; g.fillStyle = C.gray; g.fillText(S.used + ' slots, 0 empty', x1, y2 - 14);
      R.forEach(function (r, f) {
        r.forEach(function (on, i) { if (on) { slot(g, x0 + k * sw + 1, y2, sw - 2, 92, i, true); k++; } });
      });
      var endX = x0 + k * sw, syncEnd = x0 + R.length * (frameW + 6) - 6;
      if (R.length && syncEnd - endX > 8) {
        g.strokeStyle = C.green; g.lineWidth = 2; g.setLineDash([8, 6]); g.strokeRect(endX + 4, y2 + 2, syncEnd - endX - 6, 88); g.setLineDash([]);
        if (syncEnd - endX > 150) { g.fillStyle = C.green; g.font = '600 22px ' + SANS; g.textAlign = 'center'; g.fillText(S.empty + ' slot' + (S.empty === 1 ? '' : 's') + ' saved', (endX + syncEnd) / 2, y2 + 54); }
      }
      g.fillStyle = C.gray; g.font = '500 20px ' + SANS; g.textAlign = 'left';
      g.fillText('navy field = address (A 00, B 01, C 10, D 11): ⌈log₂ 4⌉ = 2 bits per slot', x0, y2 + 124);
      // utilisation bars
      var y3 = 512, bw = x1 - x0 - 320;
      [['Synchronous', S.util, C.blue], ['Statistical', S.used ? 1 : 0, C.orange]].forEach(function (b, i) {
        var yy = y3 + i * 44;
        g.fillStyle = C.ink; g.font = '600 21px ' + SANS; g.textAlign = 'left'; g.fillText(b[0], x0, yy + 22);
        g.fillStyle = C.grid; g.fillRect(x0 + 150, yy + 4, bw, 26); g.fillStyle = b[2]; g.fillRect(x0 + 150, yy + 4, bw * b[1], 26);
        g.fillStyle = C.ink; g.font = '600 21px ' + MONO; g.textAlign = 'left'; g.fillText(fmtN(b[1] * 100, 1) + '% used', x0 + 160 + bw, yy + 24);
      });
      // formulas
      var A = stats(st.all, st.fbit), exp = (st.p[0] + st.p[1] + st.p[2] + st.p[3]) / 4;
      form.innerHTML = 'Synchronous: ' + S.n + ' frames × 4 = ' + S.tot + ' slots → utilisation ' + S.used + ' / ' + S.tot + ' = <b>' + fmtN(S.util * 100, 1) + '%</b>\n' +
        'Statistical: ' + S.used + ' slots, all full → slots saved = ' + S.tot + ' − ' + S.used + ' = <b>' + S.empty + '</b>\n' +
        'Bits (8-bit slots): sync ' + S.n + ' × (4 × 8' + (st.fbit ? ' + 1' : '') + ') = ' + S.syncBits + ',  stat ' + S.used + ' × (8 + 2) = ' + S.statBits + '\n' +
        'Expected use = (' + st.p.map(function (p) { return fmtN(p, 2); }).join(' + ') + ') / 4 = ' + fmtN(exp * 100, 1) + '%' +
        (A.n > S.n ? ';  all ' + A.n + ' rounds so far: ' + fmtN(A.util * 100, 1) + '%' : '');
      if (!S.n) { verdict.className = 'w-verdict warn'; verdict.textContent = 'Press Step or Play to send rounds of data.'; return; }
      verdict.className = 'w-verdict ' + (S.empty ? 'ok' : 'warn');
      verdict.textContent = S.empty ? 'Statistical TDM sends ' + S.used + ' slots instead of ' + S.tot + ': ' + fmtN(S.empty / S.tot * 100, 1) + '% fewer, but every slot pays 2 address bits.' :
        'Every input is busy: no slot is wasted, so synchronous TDM wins (no address overhead).';
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { stats: stats };
})();
