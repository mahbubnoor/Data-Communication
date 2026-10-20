/* Try it: scramble long runs of zeros (Lecture 6, after slide "hdb3"). Slides "b8zs" and "hdb3"; Line Coding Lab tab 3.
   Convention (same as the lab): the pulse "before" the data is taken as −, so AMI's first 1 is +.
   HDB3 starts with a count of 0 pulses (even). Levels are full-bit pulses (+1, 0, −1). */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C;

  /*PURE*/
  function ami(bits) {
    var last = -1;
    return bits.split('').map(function (c) { if (c === '1') { last = -last; return last; } return 0; });
  }
  // B8ZS: every 00000000 -> 000VB0VB, V = previous pulse polarity
  function b8zs(bits) {
    var lv = [], mk = [], subs = [], last = -1, i = 0, b = bits;
    while (i < b.length) {
      if (b.substr(i, 8) === '00000000') {
        var p = last, pat = [0, 0, 0, p, -p, 0, -p, p];
        pat.forEach(function (v, j) { lv.push(v); mk.push(['', '', '', 'V', 'B', '', 'V', 'B'][j]); });
        subs.push({ start: i, len: 8, prev: p, pat: pat, code: '000VB0VB' });
        i += 8; // last pulse sent is B = p, so "last" is unchanged
      } else if (b[i] === '1') { last = -last; lv.push(last); mk.push(''); i++; }
      else { lv.push(0); mk.push(''); i++; }
    }
    return { lv: lv, mk: mk, subs: subs, cnt: [] };
  }
  // HDB3: every 0000 -> 000V (odd pulses since last substitution) or B00V (even)
  function hdb3(bits) {
    var lv = [], mk = [], subs = [], cnt = [], last = -1, n = 0, i = 0, b = bits;
    while (i < b.length) {
      if (b.substr(i, 4) === '0000') {
        var pat, code, prev = last;
        if (n % 2 === 1) { pat = [0, 0, 0, last]; code = '000V'; }
        else { var bp = -last; pat = [bp, 0, 0, bp]; code = 'B00V'; last = bp; }
        pat.forEach(function (v, j) { lv.push(v); cnt.push(null); mk.push(code[j] === 'B' ? 'B' : (code[j] === 'V' ? 'V' : '')); });
        subs.push({ start: i, len: 4, count: n, prev: prev, pat: pat, code: code, v: pat[3] });
        n = 0; i += 4;
      } else if (b[i] === '1') { last = -last; n++; lv.push(last); mk.push(''); cnt.push(n); i++; }
      else { lv.push(0); mk.push(''); cnt.push(null); i++; }
    }
    return { lv: lv, mk: mk, subs: subs, cnt: cnt };
  }
  // receiver: a pulse with the same polarity as the previous pulse is a violation
  function receive(lv, kind) {
    var out = lv.map(function (v) { return v ? '1' : '0'; }), prev = -1, viol = [], zones = [];
    for (var i = 0; i < lv.length; i++) {
      if (!lv[i]) continue;
      if (lv[i] === prev) {
        if (kind === 'b8zs') {
          var s = i - 3;
          viol.push(i, i + 3); zones.push([s, 8]);
          for (var k = s; k < s + 8 && k < lv.length; k++) out[k] = '0';
          prev = lv[Math.min(i + 4, lv.length - 1)]; i = i + 4; continue;
        } else {
          var s2 = i - 3; viol.push(i); zones.push([s2, 4]);
          for (var k2 = s2; k2 <= i; k2++) out[k2] = '0';
        }
      }
      prev = lv[i];
    }
    return { bits: out.join(''), viol: viol, zones: zones };
  }
  function zrun(lv) { var m = 0, r = 0; lv.forEach(function (v) { r = v ? 0 : r + 1; if (r > m) m = r; }); return m; }
  function sum(lv) { return lv.reduce(function (a, b) { return a + b; }, 0); }
  /*END*/

  function sg(v) { return v > 0 ? '+' : (v < 0 ? '−' : '0'); }
  function patStr(p) { return p.map(sg).join(' '); }

  var PRE = [
    ['B8ZS slide', 'b8zs', '1100000000110'],
    ['HDB3 slide', 'hdb3', '10000100000000'],
    ['B8ZS checkpoint', 'b8zs', '1000000001'],
    ['Lab bits', null, '1100000000110000010'],
    ['All 0s', null, '0000000000000000']
  ];

  D.register('scramble', function (root) {
    var st = { mode: 'b8zs', bits: '1100000000110' };
    var cv = D.canvas(1080, 742), g = cv.g;
    var row = D.bitRow(st, 24, draw);
    var modeSeg = D.seg([['b8zs', 'B8ZS (T1)'], ['hdb3', 'HDB3 (E1)']], st.mode, function (k) { st.mode = k; draw(); });
    var pres = h('div', { cls: 'w-btns' });
    var ruleH = h('h4'), ruleBox = h('div'), why = h('p', { cls: 'w-note' });
    var form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' }), verdict = h('div', { cls: 'w-verdict', style: 'font-size:23px;padding:10px 14px' });
    PRE.forEach(function (p) {
      pres.appendChild(D.btn(p[0], function () { if (p[1]) { st.mode = p[1]; modeSeg.set(p[1]); } st.bits = p[2]; row.render(); draw(); }));
    });
    pres.querySelectorAll('button').forEach(function (b) { b.style.fontSize = '22px'; b.style.padding = '6px 12px'; });

    root.appendChild(h('div', { cls: 'w-col', style: 'gap:12px;width:1664px' }, [
      h('div', { cls: 'w-card', style: 'flex-direction:row;align-items:center;gap:18px;padding:10px 18px' }, [
        h('div', { style: 'font:600 24px ' + D.SANS + ';color:' + C.navy + ';white-space:nowrap', text: 'Bits (click):' }), row.el]),
      h('div', { cls: 'w-row', style: 'gap:14px;align-items:stretch' }, [
        h('div', { cls: 'w-card', style: 'padding:6px;width:1094px;flex:none' }, [cv.c]),
        h('div', { cls: 'w-col', style: 'gap:10px;flex:1;min-width:0' }, [
          h('div', { cls: 'w-card', style: 'gap:10px;padding:12px 16px' }, [modeSeg.el, pres]),
          h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 16px' }, [ruleH, ruleBox, why]),
          h('div', { cls: 'w-card', style: 'padding:10px 16px' }, [form]),
          verdict])])]));

    function draw() {
      var bits = st.bits, n = bits.length, isB = st.mode === 'b8zs';
      var a = ami(bits), s = isB ? b8zs(bits) : hdb3(bits), r = receive(s.lv, st.mode);
      var W = cv.w, H = cv.h, x0 = 176, x1 = W - 14, bw = (x1 - x0) / n, top = 46, lh = (H - top) / 3, amp = 46;
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H);
      // bit numbers row
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '600 24px ' + D.MONO; g.fillStyle = C.blue;
      for (var i = 0; i < n; i++) g.fillText(bits[i], x0 + (i + 0.5) * bw, 24);
      g.textAlign = 'left'; g.font = '600 20px ' + D.SANS; g.fillStyle = C.gray; g.fillText('data', 12, 24);
      // grid
      g.strokeStyle = C.grid; g.lineWidth = 1;
      for (i = 0; i <= n; i++) { g.beginPath(); g.moveTo(x0 + i * bw, 40); g.lineTo(x0 + i * bw, H - 6); g.stroke(); }
      function lane(j, name, sub) {
        var yc = top + lh * j + lh / 2 - 6;
        if (j) { g.strokeStyle = C.line; g.lineWidth = 2; g.beginPath(); g.moveTo(8, top + lh * j); g.lineTo(W - 8, top + lh * j); g.stroke(); }
        g.strokeStyle = '#b9c3cd'; g.lineWidth = 1; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(x0, yc); g.lineTo(x1, yc); g.stroke(); g.setLineDash([]);
        g.textAlign = 'left'; g.textBaseline = 'middle';
        g.font = '600 24px ' + D.SANS; g.fillStyle = C.navy; g.fillText(name, 12, yc - 16);
        g.font = '400 20px ' + D.SANS; g.fillStyle = C.gray; g.fillText(sub, 12, yc + 14);
        g.font = '500 20px ' + D.MONO; g.fillStyle = C.gray; g.textAlign = 'right';
        g.fillText('+', x0 - 8, yc - amp); g.fillText('0', x0 - 8, yc); g.fillText('−', x0 - 8, yc + amp);
        return yc;
      }
      function wave(lv, yc, col, wd) {
        g.strokeStyle = col; g.lineWidth = wd; g.lineJoin = 'round'; g.beginPath();
        lv.forEach(function (v, k) { var y = yc - v * amp; if (k === 0) g.moveTo(x0, y); else g.lineTo(x0 + k * bw, y); g.lineTo(x0 + (k + 1) * bw, y); });
        g.stroke();
      }
      function band(st0, len, yc, fill, stroke) {
        g.fillStyle = fill; g.fillRect(x0 + st0 * bw + 2, yc - amp - 40, len * bw - 4, 2 * amp + 50);
        if (stroke) { g.strokeStyle = stroke; g.lineWidth = 2; g.strokeRect(x0 + st0 * bw + 2, yc - amp - 40, len * bw - 4, 2 * amp + 50); }
      }
      function tag(txt, cx, y, col, maxW, bg) {
        g.font = '600 20px ' + D.MONO; g.textAlign = 'center'; g.textBaseline = 'middle';
        var w = g.measureText(txt).width; if (maxW && w > maxW) { g.font = '600 20px ' + D.SANS; w = g.measureText(txt).width; }
        if (bg) { g.fillStyle = bg; g.fillRect(cx - w / 2 - 4, y - 12, w + 8, 24); }
        g.fillStyle = col; g.fillText(txt, cx, y);
      }
      // lane 1: AMI with long zero runs marked
      var y1 = lane(0, 'AMI', 'first 1 = +');
      var need = isB ? 8 : 4, runStart = -1;
      for (i = 0; i <= n; i++) {
        if (i < n && a[i] === 0) { if (runStart < 0) runStart = i; }
        else if (runStart >= 0) {
          var L = i - runStart;
          if (L >= need) { band(runStart, L, y1, 'rgba(192,57,43,0.10)', null); tag(L + ' zeros: flat', x0 + (runStart + L / 2) * bw, y1 - amp - 25, C.red, L * bw); }
          runStart = -1;
        }
      }
      wave(a, y1, C.blue, 4);
      // lane 2: scrambled
      var y2 = lane(1, isB ? 'B8ZS sent' : 'HDB3 sent', isB ? 'scrambled' : 'n starts at 0');
      s.subs.forEach(function (sb) {
        band(sb.start, sb.len, y2, 'rgba(240,163,94,0.22)', C.light);
        var lbl = isB ? 'prev ' + sg(sb.prev) + ' → 000VB0VB' : (sb.count % 2 ? 'odd' : 'even') + ' → ' + sb.code;
        tag(lbl, x0 + (sb.start + sb.len / 2) * bw, y2 - amp - 25, C.orange, sb.len * bw);
      });
      wave(s.lv, y2, C.navy, 4);
      g.textBaseline = 'middle';
      s.mk.forEach(function (m, k) {
        var cx = x0 + (k + 0.5) * bw;
        if (m) { g.font = '700 22px ' + D.MONO; g.textAlign = 'center'; g.fillStyle = m === 'V' ? C.red : C.orange; g.fillText(m, cx, y2 + amp + 34); }
        else if (!isB && s.cnt[k]) { g.font = '600 20px ' + D.MONO; g.textAlign = 'center'; g.fillStyle = C.gray; g.fillText('n=' + s.cnt[k], cx, y2 + amp + 34); }
      });
      // lane 3: receiver
      var y3 = lane(2, 'Receiver', 'undoes it');
      r.zones.forEach(function (z) { band(z[0], z[1], y3, 'rgba(63,143,90,0.12)', C.green); });
      wave(s.lv, y3, '#8a96a3', 3);
      r.viol.forEach(function (k) {
        var cx = x0 + (k + 0.5) * bw, cy = y3 - s.lv[k] * amp;
        g.strokeStyle = C.red; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, Math.min(16, bw * 0.42), 0, 2 * Math.PI); g.stroke();
      });
      r.zones.forEach(function (z) { tag(isB ? 'two V → 8 zeros' : 'V → 4 zeros', x0 + (z[0] + z[1] / 2) * bw, y3 - amp - 27, C.green, z[1] * bw, '#e4efe6'); });
      for (i = 0; i < r.bits.length; i++) {
        var inZ = r.zones.some(function (z) { return i >= z[0] && i < z[0] + z[1]; });
        g.font = '700 24px ' + D.MONO; g.textAlign = 'center'; g.fillStyle = inZ ? C.green : C.ink;
        g.fillText(r.bits[i], x0 + (i + 0.5) * bw, y3 + amp + 34);
      }

      // rule card
      var rows = '';
      if (isB) {
        ruleH.textContent = 'B8ZS: eight 0s → 000VB0VB';
        if (!s.subs.length) rows = '<tr><td colspan="3" style="color:' + C.gray + '">no run of eight 0s</td></tr>';
        s.subs.slice(0, 3).forEach(function (sb) {
          rows += '<tr><td>' + (sb.start + 1) + '–' + (sb.start + 8) + '</td><td>' + sg(sb.prev) + '</td><td><b style="color:' + C.orange + '">' + patStr(sb.pat) + '</b></td></tr>';
        });
        ruleBox.innerHTML = '<table class="w-tab" style="width:100%;font-size:22px"><tr><th>Bits</th><th>Prev pulse</th><th>Sent</th></tr>' + rows + '</table>';
        why.innerHTML = 'V repeats the previous pulse (breaks AMI on purpose); B obeys AMI. The two V\'s are opposite (+ and −), so the pattern adds no DC.';
      } else {
        ruleH.textContent = 'HDB3: count pulses n since last sub.';
        if (!s.subs.length) rows = '<tr><td colspan="4" style="color:' + C.gray + '">no run of four 0s</td></tr>';
        s.subs.slice(0, 3).forEach(function (sb) {
          rows += '<tr><td>' + (sb.start + 1) + '–' + (sb.start + 4) + '</td><td>' + sb.count + ' (' + (sb.count % 2 ? 'odd' : 'even') + ')</td><td>' + sb.code + '</td><td><b style="color:' + C.orange + '">' + patStr(sb.pat) + '</b></td></tr>';
        });
        if (s.subs.length > 3) rows += '<tr><td colspan="4" style="color:' + C.gray + ';padding:2px">+ ' + (s.subs.length - 3) + ' more (see the waveform)</td></tr>';
        ruleBox.innerHTML = '<table class="w-tab" style="width:100%;font-size:22px"><tr><th>Bits</th><th>n</th><th>Code</th><th>Sent</th></tr>' + rows + '</table>';
        var vs = s.subs.map(function (sb) { return sg(sb.v); });
        var alt = vs.every(function (v, k) { return k === 0 || v !== vs[k - 1]; });
        why.innerHTML = 'Odd n → 000V, even n → B00V, so successive V\'s alternate and cancel (no DC). V: <b style="color:' + C.orange + '">' + (vs.length ? vs.join(' ') : '—') + '</b>' + (vs.length > 1 ? (alt ? ' ✓' : ' ✗') : '');
      }
      // formulas
      var za = zrun(a), zs = zrun(s.lv), sa = sum(a), ss = sum(s.lv);
      function dc(x) { return (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(2); }
      function sn(x) { return (x < 0 ? '−' : '') + Math.abs(x); }
      var nm = isB ? 'B8ZS' : 'HDB3';
      form.innerHTML =
        'Longest 0 run: AMI <span class="bad">' + za + '</span> → ' + nm + ' <span class="' + (zs <= (isB ? 7 : 3) ? 'ok' : 'bad') + '">' + zs + '</span>' + (isB ? '' : ' (max 3)') + '\n' +
        'DC = Σlevels/n: AMI  ' + sn(sa) + '/' + n + ' = <b>' + dc(sa / n) + '</b>\n                 ' + nm + ' ' + sn(ss) + '/' + n + ' = <b>' + dc(ss / n) + '</b>';
      var ok = r.bits === bits;
      verdict.className = 'w-verdict ' + (ok ? 'ok' : 'bad');
      var nv = r.viol.length, nz = r.zones.reduce(function (t, z) { return t + z[1]; }, 0);
      verdict.textContent = ok ? (nv ? 'Receiver: ' + nv + ' violation' + (nv > 1 ? 's' : '') + ' found, ' + nz + ' zeros restored: output = input ✓' : 'No substitution needed: output = input ✓') : 'Receiver output differs from input ✗';
    }
    draw();
  });
})();
