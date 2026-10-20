/* Try it: the window-size trap (Lecture 12, after slide "gbnsize"). Slides "gbnsize", "srsize"; logic as ARQ Lab tab 3. */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, btn = D.btn;

  // pure: the classic failure. W frames (#0..#W-1) all arrive, every ACK is lost, old frame 0 is resent.
  function trap(proto, m, W) {
    var M = Math.pow(2, m), Wr = proto === 'gbn' ? 1 : W, safe = proto === 'gbn' ? M - 1 : M / 2;
    var win = []; for (var k = 0; k < Wr; k++) win.push((W + k) % M);
    var bad = win.indexOf(0) >= 0;
    return { M: M, Wr: Wr, safe: safe, win: win, bad: bad, asNew: bad ? W + win.indexOf(0) : -1, rn: W % M };
  }

  D.register('wintrap', function (root) {
    var st = { proto: 'gbn', m: 2, W: 4, ph: 5 };
    var cv = D.canvas(1080, 580), strip = h('div', { cls: 'w-col', style: 'gap:8px' });
    var form = h('div', { cls: 'w-f', style: 'font-size:22px' }), stepTxt = h('p', { style: 'margin:0;font-size:23px;line-height:1.35;min-height:94px' });
    var verdict = h('div', { cls: 'w-verdict' }), stepLab = h('span', { style: 'font:600 23px ' + D.MONO + ';color:' + C.orange + ';align-self:center' });
    var sW = D.slider('Window size Ssize', 1, 4, 1, st.W, function (v) { return String(v); }, function (v) { st.W = v; draw(); });
    var pSeg = D.seg([['gbn', 'Go-Back-N'], ['sr', 'Selective Repeat']], st.proto, function (k) { st.proto = k; draw(); });
    var mSeg = D.seg([[2, 'm = 2'], [3, 'm = 3']], st.m, function (k) { st.m = k; var M = Math.pow(2, k); sW.range(1, M, 1); if (st.W > M) { st.W = M; } sW.set(st.W); draw(); });
    function pre(p, m, W) { return function () { st.proto = p; st.m = m; pSeg.set(p); mSeg.set(m); sW.range(1, Math.pow(2, m), 1); st.W = W; sW.set(W); st.ph = 5; draw(); }; }
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1080px;gap:14px' }, [cv.c, h('div', { cls: 'w-card', style: 'padding:12px 20px' }, [strip])]),
      h('div', { cls: 'w-col', style: 'width:560px;gap:14px' }, [
        h('div', { cls: 'w-card', style: 'gap:10px' }, [pSeg.el, mSeg.el, sW.el,
          h('div', { cls: 'w-btns', style: 'gap:8px' }, [btn('GBN 3', pre('gbn', 2, 3)), btn('GBN 4', pre('gbn', 2, 4)), btn('SR 2', pre('sr', 2, 2)), btn('SR 3', pre('sr', 2, 3))])]),
        h('div', { cls: 'w-card', style: 'gap:10px' }, [
          h('div', { cls: 'w-btns', style: 'gap:8px' }, [btn('◀', function () { st.ph = Math.max(0, st.ph - 1); draw(); }),
            btn('Next step ▶', function () { st.ph = Math.min(5, st.ph + 1); draw(); }, 'acc'), btn('Replay', function () { st.ph = 0; draw(); }), stepLab]),
          stepTxt]),
        h('div', { cls: 'w-card', style: 'padding:14px 18px' }, [form]),
        verdict])]));

    function ring(g, cx, cy, R, M, fills, title, sub, mark) {
      var da = 2 * Math.PI / M;
      for (var i = 0; i < M; i++) {
        var a0 = -Math.PI / 2 + i * da - da / 2, a1 = a0 + da;
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, a0, a1); g.closePath();
        g.fillStyle = fills[i] || '#fff'; g.fill(); g.strokeStyle = C.navy; g.lineWidth = 2; g.stroke();
        var am = a0 + da / 2;
        g.fillStyle = C.ink; g.font = '600 28px ' + D.MONO; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(i), cx + Math.cos(am) * R * 0.68, cy + Math.sin(am) * R * 0.68);
      }
      g.fillStyle = C.panel; g.beginPath(); g.arc(cx, cy, R * 0.34, 0, 7); g.fill(); g.strokeStyle = C.navy; g.stroke();
      if (mark) {
        var am2 = -Math.PI / 2 + mark.i * da;
        g.strokeStyle = mark.col; g.lineWidth = 6; g.beginPath(); g.arc(cx, cy, R + 8, am2 - da / 2 + 0.04, am2 + da / 2 - 0.04); g.stroke();
        g.fillStyle = mark.col; g.font = '700 22px ' + D.SANS; g.textAlign = 'center';
        g.fillText(mark.txt, cx + Math.cos(am2) * (R + 30), cy + Math.sin(am2) * (R + 30) - 4);
      }
      g.fillStyle = C.navy; g.font = '600 22px ' + D.SANS; g.textAlign = 'left'; g.textBaseline = 'middle';
      g.fillText(title, cx + R + 22, cy - 22);
      g.fillStyle = C.gray; g.font = '500 20px ' + D.SANS;
      sub.forEach(function (s, k) { g.fillText(s, cx + R + 22, cy + 8 + k * 26); });
    }

    function draw() {
      var t = trap(st.proto, st.m, st.W), M = t.M, W = st.W, ph = st.ph, g = cv.g, w = cv.w, hh = cv.h;
      var nums = []; for (var i = 0; i < W; i++) nums.push(i % M);
      g.clearRect(0, 0, w, hh); g.fillStyle = C.panel; g.fillRect(0, 0, w, hh);
      g.strokeStyle = C.line; g.lineWidth = 1; g.strokeRect(0.5, 0.5, w - 1, hh - 1);
      // ----- rings (left half)
      var sf = []; for (i = 0; i < W; i++) sf[i % M] = ph >= 1 ? C.light : '#fbe9da';
      var rf = [], rwin = ph >= 2 ? t.win : [0].concat(st.proto === 'sr' ? nums.slice(1, t.Wr) : []);
      rwin.forEach(function (n) { rf[n] = C.sky; });
      var mark = null;
      if (ph >= 5) mark = { i: 0, col: t.bad ? C.red : C.green, txt: t.bad ? 'old 0 ✗' : 'old 0 ✓' };
      ring(g, 108, 140, 90, M, sf, 'Sender', [ph >= 1 ? 'outstanding: ' + nums.join(', ') : 'may send: ' + nums.join(', '), 'Sf = 0, Sn = ' + (ph >= 1 ? t.rn : 0)], null);
      ring(g, 108, 420, 90, M, rf, 'Receiver', ['window: {' + rwin.join(', ') + '}', 'Rn = ' + (ph >= 2 ? t.rn : 0) + (st.proto === 'gbn' ? ' (size 1)' : ' (size ' + t.Wr + ')')], mark);
      // ----- time-space sketch (right half)
      var xS = 640, xR = 1000, y0 = 70, dt = W <= 4 ? 40 : 24, Dy = W <= 4 ? 110 : 90;
      g.strokeStyle = C.navy; g.lineWidth = 3;
      [xS, xR].forEach(function (x) { g.beginPath(); g.moveTo(x, y0 - 14); g.lineTo(x, hh - 20); g.stroke(); });
      g.fillStyle = C.navy; g.font = '600 22px ' + D.SANS; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
      g.fillText('Sender', xS, y0 - 26); g.fillText('Receiver', xR, y0 - 26);
      g.font = '500 20px ' + D.SANS; g.fillStyle = C.gray; g.textAlign = 'left'; g.fillText('time ↓', xS - 150, y0 - 26);
      function arrow(x1, y1, x2, y2, col, lw, dash) {
        g.strokeStyle = col; g.lineWidth = lw; g.setLineDash(dash || []); g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke(); g.setLineDash([]);
        var a = Math.atan2(y2 - y1, x2 - x1); g.fillStyle = col; g.beginPath(); g.moveTo(x2, y2);
        g.lineTo(x2 - 14 * Math.cos(a - 0.4), y2 - 14 * Math.sin(a - 0.4)); g.lineTo(x2 - 14 * Math.cos(a + 0.4), y2 - 14 * Math.sin(a + 0.4)); g.closePath(); g.fill();
      }
      g.textBaseline = 'middle';
      for (i = 0; i < W && ph >= 1; i++) {
        var ys = y0 + i * dt, yr = ys + Dy;
        arrow(xS, ys, xR, yr, C.orange, 2.5);
        g.fillStyle = C.orange; g.font = '600 20px ' + D.MONO; g.textAlign = 'right'; g.fillText(nums[i] + ' #' + i, xS - 10, ys);
        if (ph >= 2) {
          var mx = (xS + xR) / 2 + 40, my = yr + Dy * 0.4;
          g.strokeStyle = C.green; g.lineWidth = 2; g.setLineDash([6, 5]); g.beginPath(); g.moveTo(xR, yr); g.lineTo(mx, my); g.stroke(); g.setLineDash([]);
          if (ph >= 3) { g.strokeStyle = C.red; g.lineWidth = 4; g.beginPath(); g.moveTo(mx - 9, my - 9); g.lineTo(mx + 9, my + 9); g.moveTo(mx + 9, my - 9); g.lineTo(mx - 9, my + 9); g.stroke(); }
          g.fillStyle = C.green; g.font = '500 20px ' + D.MONO; g.textAlign = 'left';
          if (W <= 4 || i === W - 1) g.fillText('ACK ' + ((i + 1) % M), xR + 10, yr);
        }
      }
      var yTo = y0 + (W - 1) * dt + Dy * 1.6 + 30;
      if (ph >= 4) {
        g.strokeStyle = C.gray; g.lineWidth = 2; g.beginPath(); g.moveTo(xS - 14, yTo); g.lineTo(xS + 14, yTo); g.stroke();
        g.fillStyle = C.gray; g.font = '600 20px ' + D.SANS; g.textAlign = 'right'; g.fillText('time-out', xS - 18, yTo - 2);
        arrow(xS, yTo + 6, xR, yTo + 6 + Dy, ph >= 5 ? (t.bad ? C.red : C.green) : C.orange, 3.5, [10, 6]);
        g.fillStyle = C.orange; g.font = '600 20px ' + D.MONO; g.fillText('0 (old #0)', xS - 10, yTo + 30);
        if (ph >= 5) {
          g.fillStyle = t.bad ? C.red : C.green; g.font = '700 22px ' + D.SANS; g.textAlign = 'right';
          g.fillText(t.bad ? 'accepted as NEW #' + t.asNew + ' ✗' : 'duplicate: discarded ✓', xR - 8, Math.min(hh - 16, yTo + Dy + 38));
        }
      }
      // ----- strip
      var tot = Math.max(2 * M, W + t.Wr + 1);
      function cell(n, idx, bg, bd, col) {
        return h('div', { style: 'width:50px;height:68px;border-radius:8px;border:2px solid ' + bd + ';background:' + bg + ';display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.05;color:' + col },
          [h('div', { text: String(n), style: 'font:600 26px ' + D.MONO }), h('div', { text: idx, style: 'font:500 20px ' + D.MONO + ';opacity:.8' })]);
      }
      function rowEl(label, cells) { return h('div', { style: 'display:flex;gap:5px;align-items:center' }, [h('div', { text: label, style: 'width:120px;font:600 22px ' + D.SANS + ';color:' + C.navy })].concat(cells)); }
      var sc = [], rc = [];
      for (i = 0; i < tot; i++) {
        sc.push(i < W && ph >= 1 ? cell(i % M, '#' + i, C.light, C.orangeL, C.ink) : cell(i % M, '#' + i, '#fff', '#cfd6dd', C.gray));
        var inWin = ph >= 2 ? (i >= W && i < W + t.Wr) : (i < t.Wr);
        var isHit = ph >= 5 && t.bad && i === t.asNew;
        if (ph >= 2 && i < W) rc.push(cell(i % M, '#' + i, C.green, C.green, '#fff'));
        else if (isHit) rc.push(cell(i % M, '#' + i, C.red, C.red, '#fff'));
        else if (inWin) rc.push(cell(i % M, '#' + i, C.sky, C.blue, C.ink));
        else rc.push(cell(i % M, '#' + i, '#fff', '#cfd6dd', C.gray));
      }
      if (ph >= 4) sc.push(h('div', { style: 'margin-left:10px' }, [cell(0, 'old', ph >= 5 ? (t.bad ? C.red : C.green) : C.light, ph >= 5 ? (t.bad ? C.red : C.green) : C.orangeL, ph >= 5 ? '#fff' : C.ink)]));
      strip.innerHTML = '';
      strip.appendChild(rowEl('Sender', sc)); strip.appendChild(rowEl('Receiver', rc));
      strip.appendChild(h('p', { cls: 'w-note', text: '#k = the k-th frame sent · orange: sent · green: delivered · blue: receiver window' + (ph >= 5 && t.bad ? ' · red: old 0' : '') }));
      // ----- text
      var steps = [
        'Ready. m = ' + st.m + ', so numbers run 0 … ' + (M - 1) + '. The sender may send ' + W + ' frame' + (W > 1 ? 's' : '') + '.',
        'Sender sends frames ' + nums.join(', ') + ' (#0 … #' + (W - 1) + ').',
        'All arrive in order. The receiver delivers them, slides its window to {' + t.win.join(', ') + '} and sends ACKs.',
        'Every ACK is lost. The sender still thinks #0 … #' + (W - 1) + ' are outstanding.',
        'Time-out: the sender resends its oldest frame, number 0 (the OLD data #0).',
        t.bad ? 'The receiver window {' + t.win.join(', ') + '} contains 0, so the old frame is taken as new frame #' + t.asNew + '.'
          : 'The receiver window {' + t.win.join(', ') + '} does not contain 0: the old frame is a duplicate.'];
      stepTxt.textContent = steps[ph]; stepLab.textContent = 'step ' + ph + ' / 5';
      var gb = st.proto === 'gbn', okW = W <= t.safe;
      var f = (gb ? 'GBN: Ssize ≤ 2^m − 1 = 2^' + st.m + ' − 1 = <b>' + t.safe + '</b>' : 'SR: Ssize ≤ 2^(m−1) = 2^' + (st.m - 1) + ' = <b>' + t.safe + '</b>') + '\n';
      f += 'Ssize = ' + W + (okW ? ' ≤ ' + t.safe + ' <span class="ok">✓ safe</span>' : ' > ' + t.safe + ' <span class="bad">✗ too big</span>') + '\n';
      f += (gb ? 'Receiver window: size 1\nRn = W mod 2^m = ' + W + ' mod ' + M + ' = ' + t.rn : 'Receiver window: size Ssize = ' + t.Wr + '\nstarts at ' + W + ' mod ' + M + ' = ' + t.rn) + '\n';
      f += 'After #0…#' + (W - 1) + ': {' + t.win.join(', ') + '}\n';
      f += 'Old 0 ∈ {' + t.win.join(', ') + '}? ' + (ph < 5 ? '<b>?</b>' : '<span class="' + (t.bad ? 'bad' : 'ok') + '">' + (t.bad ? 'yes ✗' : 'no ✓') + '</span>');
      form.innerHTML = f;
      if (ph < 5) { verdict.className = 'w-verdict warn'; verdict.textContent = 'Press “Next step” to see what the receiver does with the old 0.'; }
      else if (t.bad) { verdict.className = 'w-verdict bad'; verdict.textContent = 'DUPLICATE ACCEPTED ✗ Old frame 0 delivered again, as new #' + t.asNew + '.'; }
      else { verdict.className = 'w-verdict ok'; verdict.textContent = 'REJECTED ✓ Old frame 0 discarded as a duplicate (and re-ACKed).'; }
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { trap: trap };
})();
