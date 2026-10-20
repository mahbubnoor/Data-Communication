/* Try it: two-dimensional parity (Lecture 11, after slide "parity2d"). Also simple parity C(5, 4) from slide "parity". */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, btn = D.btn;
  var DATA0 = ['1100111', '1011101', '0111001', '0101001'];   // slide parity2d (4 x 7 data bits)

  // pure: build the sent 5 x 8 block (4 data rows + parity row; 7 data columns + parity column), even parity
  function encode2d(rows) {
    var g = rows.map(function (r) { var a = r.split('').map(Number); a.push(a.reduce(function (x, y) { return x ^ y; }, 0)); return a; });
    var last = g[0].map(function (_, j) { return g.reduce(function (x, r) { return x ^ r[j]; }, 0); });
    g.push(last);
    return g;
  }
  // pure: receiver checks on a received block
  function check2d(g) {
    var rs = g.map(function (r) { return r.reduce(function (x, y) { return x ^ y; }, 0); });
    var cs = g[0].map(function (_, j) { return g.reduce(function (x, r) { return x ^ r[j]; }, 0); });
    return { rs: rs, cs: cs, badR: rs.map(function (v, i) { return v ? i : -1; }).filter(function (i) { return i >= 0; }),
      badC: cs.map(function (v, j) { return v ? j : -1; }).filter(function (j) { return j >= 0; }) };
  }

  D.register('parity2d', function (root) {
    var st = { data: DATA0.slice(), flip: {}, d4: '1011', f5: [0, 0, 0, 0, 0] };
    var gridBox = h('div', { style: 'display:grid;grid-template-columns:120px repeat(7,62px) 12px 62px 18px 1fr;gap:7px;align-items:center' });
    var sentLine = h('p', { cls: 'w-note', style: 'font-family:' + D.MONO + ';color:#1d2733' });
    var form = h('div', { cls: 'w-f' }), verdict = h('div', { cls: 'w-verdict' });
    var p5Bits = h('div', { cls: 'w-bits' }), p5Form = h('div', { cls: 'w-f', style: 'font-size:22px' }), p5V = h('div', { cls: 'w-verdict', style: 'font-size:23px;padding:8px 14px;flex:1' });
    var p5Data = h('div', { cls: 'w-bits' });

    function setFlips(list) { st.flip = {}; list.forEach(function (p) { st.flip[p[0] + ',' + p[1]] = 1; }); draw(); }
    var presets = h('div', { cls: 'w-btns' }, [
      btn('No errors', function () { setFlips([]); }),
      btn('1 error', function () { setFlips([[2, 4]]); }),
      btn('2 errors in a row', function () { setFlips([[1, 2], [1, 5]]); }),
      btn('3 errors', function () { setFlips([[0, 1], [0, 5], [2, 5]]); }),
      btn('4 errors in a rectangle (undetected)', function () { setFlips([[1, 1], [1, 5], [3, 1], [3, 5]]); }, 'acc'),
      btn('Slide data', function () { st.data = DATA0.slice(); setFlips([]); }),
      btn('Random data', function () { st.data = [0, 1, 2, 3].map(function () { return D.randBits(7); }); setFlips([]); })]);
    var cases = [[0, 0, 0, 0, 0], [0, 0, 1, 0, 0], [0, 0, 0, 0, 1], [1, 0, 0, 0, 1], [1, 1, 1, 0, 0]];
    var caseBtns = h('div', { cls: 'w-btns', style: 'gap:6px;flex-wrap:nowrap;align-items:center' }, [h('span', { text: 'Ex. 10.7 case', style: 'font-weight:600;color:#16324f;white-space:nowrap' })].concat(cases.map(function (c, k) {
      return btn(String(k + 1), function () { st.d4 = '1011'; st.f5 = c.slice(); draw(); });
    })));

    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1060px;gap:16px' }, [
        h('div', { cls: 'w-card', style: 'gap:10px' }, [
          h('h4', { text: 'Received block: click any bit to flip it (a channel error)' }), gridBox, sentLine]),
        h('div', { cls: 'w-card', style: 'gap:10px' }, [
          h('h4', { text: 'Compare: simple parity C(5, 4), even parity (slide “parity”)' }),
          h('div', { cls: 'w-row', style: 'gap:20px;align-items:flex-end' }, [
            h('div', { cls: 'w-col', style: 'gap:4px' }, [h('p', { cls: 'w-note', text: 'Dataword (click)' }), p5Data]),
            h('div', { cls: 'w-col', style: 'gap:4px' }, [h('p', { cls: 'w-note', text: 'Received: click to flip' }), p5Bits]),
            p5Form]),
          h('div', { cls: 'w-row', style: 'gap:14px;align-items:center' }, [caseBtns, p5V])])]),
      h('div', { cls: 'w-col', style: 'width:580px;gap:16px' }, [
        h('div', { cls: 'w-card' }, [h('h4', { text: 'Channel errors (Fig. 10.11 cases)' }), presets]),
        h('div', { cls: 'w-card' }, [h('h4', { text: 'Receiver recomputes every parity' }), form]),
        verdict])]));

    function cell(v, cls, label, on) {
      var b = h('button', { type: 'button', cls: 'w-bit ' + cls, 'aria-label': label + ' = ' + v, text: String(v),
        style: 'width:62px;height:62px;font-size:32px' + (cls.indexOf('par') >= 0 && cls.indexOf('err') < 0 ? ';color:' + C.blue : '') });
      if (on) b.addEventListener('click', on); else b.classList.add('ro');
      return b;
    }
    function txt(s, style) { return h('div', { text: s, style: 'font:600 22px ' + D.SANS + ';color:' + C.navy + ';' + (style || '') }); }

    function draw() {
      var sent = encode2d(st.data), rx = sent.map(function (r, i) { return r.map(function (v, j) { return v ^ (st.flip[i + ',' + j] ? 1 : 0); }); });
      var ck = check2d(rx), nf = Object.keys(st.flip).length;
      var single = ck.badR.length === 1 && ck.badC.length === 1;
      // grid
      gridBox.innerHTML = '';
      gridBox.appendChild(txt(''));
      for (var j = 0; j < 8; j++) {
        if (j === 7) gridBox.appendChild(txt(''));
        gridBox.appendChild(txt(j < 7 ? 'c' + (j + 1) : 'P', 'text-align:center;color:' + (ck.cs[j] ? C.red : C.gray)));
      }
      gridBox.appendChild(txt('')); gridBox.appendChild(txt('row check', 'color:' + C.gray));
      rx.forEach(function (r, i) {
        if (i === 4) for (var s = 0; s < 12; s++) gridBox.appendChild(h('div', { style: 'height:2px;background:' + C.line + ';margin:2px 0' }));
        gridBox.appendChild(txt(i < 4 ? 'Row ' + (i + 1) : 'Parity row', 'color:' + (ck.rs[i] ? C.red : C.navy)));
        r.forEach(function (v, j) {
          if (j === 7) gridBox.appendChild(h('div'));
          var k = i + ',' + j, cls = (i === 4 || j === 7 ? 'par chk' : '') + (st.flip[k] ? ' err' : '');
          var b = cell(v, cls, 'row ' + (i + 1) + ' column ' + (j + 1), function () { if (st.flip[k]) delete st.flip[k]; else st.flip[k] = 1; draw(); });
          if (!st.flip[k] && (ck.rs[i] || ck.cs[j])) { b.style.background = '#fbe2df'; b.style.borderColor = '#e8a49c'; }
          if (single && ck.badR[0] === i && ck.badC[0] === j) b.classList.add('hl');
          gridBox.appendChild(b);
        });
        gridBox.appendChild(h('div'));
        var ones = r.reduce(function (x, y) { return x + y; }, 0);
        gridBox.appendChild(h('div', { style: 'font:600 22px ' + D.MONO + ';color:' + (ck.rs[i] ? C.red : C.green),
          text: ones + ' ones ' + (ck.rs[i] ? '✗ odd' : '✓') }));
      });
      gridBox.appendChild(txt('col check', 'color:' + C.gray));
      for (j = 0; j < 8; j++) {
        if (j === 7) gridBox.appendChild(h('div'));
        gridBox.appendChild(h('div', { text: ck.cs[j] ? '✗' : '✓', style: 'text-align:center;font:700 26px ' + D.SANS + ';color:' + (ck.cs[j] ? C.red : C.green) }));
      }
      gridBox.appendChild(h('div')); gridBox.appendChild(h('div'));
      sentLine.textContent = 'Sent: ' + sent.slice(0, 4).map(function (r) { return r.join(''); }).join(' · ') + ' + parity row ' + sent[4].join('');
      // receiver formula
      var lst = function (a, p) { return a.length ? a.map(function (x) { return p + (x === 7 && p === 'c' ? 'P' : (x === 4 && p === 'r' ? 'P' : x + 1)); }).join(', ') : 'none'; };
      var f = 'Flipped by the channel: <b>' + nf + '</b> bit' + (nf === 1 ? '' : 's') + '\n';
      f += 'Row checks    r = ' + ck.rs.slice(0, 4).join(' ') + ' | ' + ck.rs[4] + '\n';
      f += 'Column checks c = ' + ck.cs.slice(0, 7).join(' ') + ' | ' + ck.cs[7] + '\n';
      f += 'Failing rows:    <span class="' + (ck.badR.length ? 'bad' : 'ok') + '">' + lst(ck.badR, 'r') + '</span>\n';
      f += 'Failing columns: <span class="' + (ck.badC.length ? 'bad' : 'ok') + '">' + lst(ck.badC, 'c') + '</span>\n';
      if (single) f += 'One row × one column → flip <b>' + lst(ck.badR, 'r') + ' × ' + lst(ck.badC, 'c') + '</b>\n';
      f += 'Overhead: 4 + 8 = 12 parity bits\n          for 28 data bits';
      form.innerHTML = f;
      var msg, cls;
      if (nf === 0) { msg = 'All rows and columns even: accept ✓'; cls = 'ok'; }
      else if (!ck.badR.length && !ck.badC.length) { msg = 'UNDETECTED ✗ ' + nf + ' errors, yet every row and column is still even. Wrong data accepted.'; cls = 'bad'; }
      else if (single && nf === 1) { msg = 'CORRECTED ✓ One error at the crossing of the failing row and column: flip it back.'; cls = 'ok'; }
      else if (single) { msg = 'Detected, but it looks like ONE error at ' + lst(ck.badR, 'r') + ' × ' + lst(ck.badC, 'c') + ': flipping it leaves ' + (nf + 1) + ' wrong bits ✗'; cls = 'bad'; }
      else { msg = 'DETECTED: ' + ck.badR.length + ' row(s), ' + ck.badC.length + ' column(s) fail. Cannot locate: discard and resend.'; cls = 'warn'; }
      verdict.className = 'w-verdict ' + cls; verdict.textContent = msg;
      // C(5,4)
      var a = st.d4.split('').map(Number), r0 = a[0] ^ a[1] ^ a[2] ^ a[3], cw = a.concat([r0]);
      var rb = cw.map(function (v, i) { return v ^ st.f5[i]; }), s0 = rb.reduce(function (x, y) { return x ^ y; }, 0), n5 = st.f5.reduce(function (x, y) { return x + y; }, 0);
      var nm = ['b₃', 'b₂', 'b₁', 'b₀', 'q₀'];
      p5Data.innerHTML = '';
      a.forEach(function (v, i) { p5Data.appendChild(cell(v, '', 'a' + (3 - i), function () { st.d4 = st.d4.slice(0, i) + (v ? '0' : '1') + st.d4.slice(i + 1); st.f5 = [0, 0, 0, 0, 0]; draw(); })); });
      p5Bits.innerHTML = '';
      rb.forEach(function (v, i) { p5Bits.appendChild(cell(v, (i === 4 ? 'par chk' : '') + (st.f5[i] ? ' err' : ''), nm[i], function () { st.f5[i] ^= 1; draw(); })); });
      p5Form.innerHTML = 'r₀ = ' + a.join('⊕') + ' = <b>' + r0 + '</b>  → ' + cw.join('') + '\ns₀ = ' + rb.join('⊕') + ' = <b>' + s0 + '</b>';
      var m5, c5;
      if (s0) { m5 = 's₀ = 1: discard ✓ (' + n5 + ' error' + (n5 === 1 ? '' : 's') + ', odd)'; c5 = 'ok'; }
      else if (n5) { m5 = 's₀ = 0: ' + rb.slice(0, 4).join('') + ' accepted, ' + n5 + ' errors missed ✗'; c5 = 'bad'; }
      else { m5 = 's₀ = 0: no error, accept ' + rb.slice(0, 4).join('') + ' ✓'; c5 = 'ok'; }
      p5V.className = 'w-verdict ' + c5; p5V.textContent = m5;
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { encode2d: encode2d, check2d: check2d };
})();
