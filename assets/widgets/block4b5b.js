/* Try it: 4B/5B removes long zero runs (Lecture 6, after slide "fourb5b"). Slides "block" and "fourb5b"; Line Coding Lab tab 2.
   Table = Forouzan Table 4.2 (same as the slide and the lab). NRZ-I starts from a high line and inverts on every 1 (lab convention). */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C;

  /*PURE*/
  var T45 = { '0000': '11110', '0001': '01001', '0010': '10100', '0011': '10101', '0100': '01010', '0101': '01011', '0110': '01110', '0111': '01111',
    '1000': '10010', '1001': '10011', '1010': '10110', '1011': '10111', '1100': '11010', '1101': '11011', '1110': '11100', '1111': '11101' };
  function enc(bits) { var g = bits.match(/.{4}/g) || []; return { groups: g, codes: g.map(function (x) { return T45[x]; }), out: g.map(function (x) { return T45[x]; }).join('') }; }
  function nrzi(bits) { var l = 1; return bits.split('').map(function (c) { if (c === '1') l = -l; return l; }); }
  function zrun(s) { var m = 0, r = 0, at = -1, best = -1; for (var i = 0; i < s.length; i++) { r = s[i] === '0' ? r + 1 : 0; if (r > m) { m = r; best = i - r + 1; } } return { len: m, at: best }; }
  // longest stretch (in bit times) with no transition, and where it starts
  function flat(lv) { var m = lv.length ? 1 : 0, r = 1, at = 0, st = 0; for (var i = 1; i < lv.length; i++) { if (lv[i] === lv[i - 1]) r++; else { r = 1; st = i; } if (r > m) { m = r; at = st; } } return { len: m, at: at }; }
  /*END*/

  var PRE = [['Slide', '11010000'], ['Checkpoint', '00011111'], ['All 0s', '0000000000000000'], ['Lab bits', '1101000000000001']];

  D.register('block4b5b', function (root) {
    var st = { bits: '11010000', R: 100 };
    var cv = D.canvas(1080, 742), g = cv.g;
    var bitsBox = h('div', { style: 'display:flex;gap:16px;align-items:center' });
    var tab = h('div'), form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' });
    var pres = h('div', { cls: 'w-btns', style: 'flex-wrap:nowrap;gap:8px' });
    PRE.forEach(function (p) { var b = D.btn(p[0], function () { st.bits = p[1]; renderBits(); draw(); }); b.style.fontSize = '22px'; b.style.padding = '6px 12px'; pres.appendChild(b); });
    var sl = D.slider('Data rate R', 10, 1000, 10, st.R, function (v) { return v + ' Mbps'; }, function (v) { st.R = v; draw(); });

    root.appendChild(h('div', { cls: 'w-col', style: 'gap:12px;width:1664px' }, [
      h('div', { cls: 'w-card', style: 'flex-direction:row;align-items:center;gap:18px;padding:10px 18px' }, [
        h('div', { style: 'font:600 24px ' + D.SANS + ';color:' + C.navy + ';white-space:nowrap', text: 'Data bits (click):' }), bitsBox]),
      h('div', { cls: 'w-row', style: 'gap:14px;align-items:stretch' }, [
        h('div', { cls: 'w-card', style: 'padding:6px;width:1094px;flex:none' }, [cv.c]),
        h('div', { cls: 'w-col', style: 'gap:10px;flex:1;min-width:0' }, [
          h('div', { cls: 'w-card', style: 'gap:4px;padding:12px 16px' }, [pres, sl.el]),
          h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 16px' }, [h('h4', { text: '4B/5B table (Forouzan Table 4.2)' }), tab]),
          h('div', { cls: 'w-card', style: 'padding:10px 16px;flex:1;justify-content:center' }, [form])])])]));

    function renderBits() {
      bitsBox.innerHTML = '';
      var gs = st.bits.match(/.{4}/g);
      gs.forEach(function (gr, k) {
        var box = h('div', { style: 'display:flex;gap:4px' });
        gr.split('').forEach(function (c, j) {
          var i = 4 * k + j;
          box.appendChild(h('button', { type: 'button', cls: 'w-bit', style: 'width:42px;height:56px;font-size:28px', 'aria-label': 'bit ' + (i + 1) + ' = ' + c, text: c,
            onclick: function () { st.bits = st.bits.slice(0, i) + (c === '1' ? '0' : '1') + st.bits.slice(i + 1); renderBits(); draw(); } }));
        });
        bitsBox.appendChild(box);
      });
      bitsBox.appendChild(D.btn('+4', function () { if (st.bits.length < 24) { st.bits += '0000'; renderBits(); draw(); } }));
      bitsBox.appendChild(D.btn('−4', function () { if (st.bits.length > 4) { st.bits = st.bits.slice(0, -4); renderBits(); draw(); } }));
    }

    function draw() {
      var d = st.bits, e = enc(d), o = e.out, n = d.length, m = o.length, ng = e.groups.length;
      var W = cv.w, H = cv.h, x0 = 150, x1 = W - 16, span = (x1 - x0) / ng, amp = 42;
      var bwD = (x1 - x0) / n, bwO = (x1 - x0) / m;
      var lvD = nrzi(d), lvO = nrzi(o), fD = flat(lvD), fO = flat(lvO), zD = zrun(d), zO = zrun(o);
      g.clearRect(0, 0, W, H); g.fillStyle = C.panel; g.fillRect(0, 0, W, H);
      var TINT = ['rgba(47,109,181,0.08)', 'rgba(22,50,79,0.03)'];
      // group tints across the whole height
      for (var k = 0; k < ng; k++) { g.fillStyle = TINT[k % 2]; g.fillRect(x0 + k * span, 8, span, H - 16); }
      function lab(t1, t2, y) {
        g.textAlign = 'left'; g.textBaseline = 'middle';
        g.font = '600 24px ' + D.SANS; g.fillStyle = C.navy; g.fillText(t1, 12, y - 14);
        g.font = '400 20px ' + D.SANS; g.fillStyle = C.gray; g.fillText(t2, 12, y + 14);
      }
      function lane(bits, lv, bw, yb, yc, col, fl, lbl1, lbl2) {
        // grid + bit labels
        g.strokeStyle = C.grid; g.lineWidth = 1;
        for (var i = 0; i <= bits.length; i++) { g.beginPath(); g.moveTo(x0 + i * bw, yb + 16); g.lineTo(x0 + i * bw, yc + amp + 8); g.stroke(); }
        g.strokeStyle = '#b9c3cd'; g.setLineDash([4, 5]); g.beginPath(); g.moveTo(x0, yc); g.lineTo(x1, yc); g.stroke(); g.setLineDash([]);
        // flat stretch
        if (fl.len >= 2) {
          g.fillStyle = 'rgba(192,57,43,0.13)'; g.fillRect(x0 + fl.at * bw, yc - amp - 8, fl.len * bw, 2 * amp + 16);
          g.strokeStyle = C.red; g.lineWidth = 2; g.strokeRect(x0 + fl.at * bw, yc - amp - 8, fl.len * bw, 2 * amp + 16);
        }
        g.font = '600 ' + (bw > 34 ? 24 : 22) + 'px ' + D.MONO; g.textAlign = 'center'; g.textBaseline = 'middle';
        for (i = 0; i < bits.length; i++) { g.fillStyle = col; g.fillText(bits[i], x0 + (i + 0.5) * bw, yb); }
        g.strokeStyle = col; g.lineWidth = 4; g.lineJoin = 'round'; g.beginPath();
        lv.forEach(function (v, j) { var y = yc - v * amp; if (j === 0) g.moveTo(x0, y); else g.lineTo(x0 + j * bw, y); g.lineTo(x0 + (j + 1) * bw, y); });
        g.stroke();
        lab(lbl1, lbl2, yc);
        // flat-run caption under the wave
        g.font = '600 20px ' + D.SANS; g.fillStyle = C.red; g.textAlign = 'center';
        var cx = Math.min(Math.max(x0 + (fl.at + fl.len / 2) * bw, x0 + 150), x1 - 150);
        g.fillText('no transition for ' + fl.len + ' bit' + (fl.len > 1 ? 's' : ''), cx, yc + amp + 30);
      }
      lane(d, lvD, bwD, 34, 140, C.blue, fD, 'Data', 'NRZ-I at R');
      // mapping band
      var yA = 250, yB = 470;
      e.groups.forEach(function (gr, k) {
        var xl = x0 + k * span, xr = xl + span;
        g.strokeStyle = C.navy; g.lineWidth = 2;
        g.beginPath(); g.moveTo(xl + 6, yA); g.lineTo(xl + 6, yB); g.moveTo(xr - 6, yA); g.lineTo(xr - 6, yB); g.stroke();
        g.textAlign = 'center'; g.textBaseline = 'middle';
        var cx = (xl + xr) / 2, big = span >= 140;
        g.font = '600 ' + (big ? 24 : 22) + 'px ' + D.MONO; g.fillStyle = C.blue; g.fillText(gr, cx, yA + 46);
        g.font = '600 26px ' + D.SANS; g.fillStyle = C.gray; g.fillText('↓', cx, yA + 88);
        g.font = '600 ' + (big ? 24 : 22) + 'px ' + D.MONO; g.fillStyle = C.orange; g.fillText(T45[gr], cx, yA + 130);
        g.font = '400 20px ' + D.SANS; g.fillStyle = C.gray; g.fillText('group ' + (k + 1), cx, yA + 172);
      });
      lab('4B/5B', 'table lookup', yA + 88);
      lane(o, lvO, bwO, 500, 606, C.orange, fO, '4B/5B out', 'NRZ-I at 1.25R');

      // table
      var used = {}; e.groups.forEach(function (x) { used[x] = (used[x] || 0) + 1; });
      var keys = ['0000', '0001', '0010', '0011', '0100', '0101', '0110', '0111', '1000', '1001', '1010', '1011', '1100', '1101', '1110', '1111'], rows = '';
      for (var r = 0; r < 8; r++) {
        rows += '<tr>';
        [keys[r], keys[r + 8]].forEach(function (kk, j) {
          var u = used[kk], sty = u ? 'background:#fbe9da;color:' + C.orange + ';font-weight:600' : '';
          rows += '<td style="padding:2px 8px;' + sty + (j ? ';border-left:3px solid ' + C.navy : '') + '">' + kk + '</td><td style="padding:2px 8px;' + sty + '">' + T45[kk] + (u > 1 ? ' ×' + u : '') + '</td>';
        });
        rows += '</tr>';
      }
      tab.innerHTML = '<table class="w-tab" style="width:100%;font-size:22px"><tr><th>Data</th><th>Code</th><th style="border-left:3px solid ' + C.navy + '">Data</th><th>Code</th></tr>' + rows + '</table>';

      var R = st.R, Rl = R * 5 / 4, tD = fD.len * 1000 / R, tO = fO.len * 1000 / Rl;
      function ns(x) { return D.fmtN(x, 1) + ' ns'; }
      form.innerHTML =
        'Line rate = ' + R + ' × 5/4 = <b>' + D.fmtN(Rl, 1) + ' Mbps</b>\n' +
        'Bits ' + n + ' → ' + n + ' × 5/4 = <b>' + m + '</b> (+' + (m - n) + ', 25%)\n' +
        'Longest 0 run  <span class="bad">' + zD.len + '</span> → <span class="ok">' + zO.len + '</span> (max 3)\n' +
        'Flat NRZ-I ' + fD.len + ' × 1/R = <span class="bad">' + ns(tD) + '</span>\n' +
        '        → ' + fO.len + ' × 1/1.25R = <span class="ok">' + ns(tO) + '</span>';
    }
    renderBits(); draw();
  });
})();
