/* Try it: byte and bit stuffing (Lecture 11, after slide "bitstuff"). Slides "bytestuff" and "bitstuff". */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, btn = D.btn;
  var FLAGBITS = '01111110';

  // pure: byte stuffing. tokens -> [{t, stuffed}]
  function byteStuff(toks) {
    var out = [];
    toks.forEach(function (t) { if (t === 'FLAG' || t === 'ESC') out.push({ t: 'ESC', s: true }); out.push({ t: t, s: false }); });
    return out;
  }
  // pure: receiver removes each ESC and keeps the next byte as data
  function byteUnstuff(body) {
    var out = [], del = [];
    for (var i = 0; i < body.length; i++) {
      if (body[i] === 'ESC') { del.push(i); i++; if (i < body.length) out.push(body[i]); } else out.push(body[i]);
    }
    return { data: out, del: del };
  }
  // pure: bit stuffing. returns body string, indices of stuffed bits in body, run counter for each data bit
  function bitStuff(d) {
    var o = '', ins = [], run = 0, runs = [];
    for (var i = 0; i < d.length; i++) {
      o += d[i]; run = d[i] === '1' ? run + 1 : 0; runs.push(run);
      if (run === 5) { ins.push(o.length); o += '0'; run = 0; }
    }
    return { body: o, ins: ins, runs: runs };
  }
  // pure: receiver: after five 1s, a following 0 is deleted
  function bitUnstuff(b) {
    var o = '', del = [], run = 0;
    for (var i = 0; i < b.length; i++) {
      if (run === 5) { if (b[i] === '0') { del.push(i); run = 0; continue; } }
      o += b[i]; run = b[i] === '1' ? run + 1 : 0;
    }
    return { data: o, del: del };
  }

  D.register('stuffing', function (root) {
    var st = { mode: 'bit', bits: '0001111111001111101000', toks: ['A', 'FLAG', 'B', 'ESC', 'C'] };
    var inp = h('input', { cls: 'w-in', spellcheck: 'false', 'aria-label': 'Data to send', style: 'flex:1;min-width:0' });
    var presetBox = h('div', { cls: 'w-btns', style: 'flex-wrap:nowrap' });
    var row1 = h('div', { style: 'display:flex;flex-wrap:wrap;gap:4px;align-items:flex-start' });
    var row2 = h('div', { style: 'display:flex;flex-wrap:wrap;gap:4px;align-items:flex-start' });
    var row3 = h('div', { style: 'display:flex;flex-wrap:wrap;gap:4px;align-items:flex-start' });
    var row4 = h('div', { style: 'display:flex;flex-wrap:wrap;gap:4px;align-items:center' });
    var t1 = h('h4'), t2 = h('h4'), t3 = h('h4'), n1 = h('p', { cls: 'w-note' }), n2 = h('p', { cls: 'w-note' }), n3 = h('p', { cls: 'w-note' });
    var form = h('div', { cls: 'w-f' }), rule = h('div', { cls: 'w-f' }), verdict = h('div', { cls: 'w-verdict' });
    var modeSeg = D.seg([['byte', 'Byte-oriented'], ['bit', 'Bit-oriented']], st.mode, function (k) { st.mode = k; syncInput(); draw(); });

    root.appendChild(h('div', { cls: 'w-col', style: 'gap:14px;width:1664px' }, [
      h('div', { cls: 'w-card', style: 'flex-direction:row;align-items:center;gap:16px;padding:12px 18px' }, [modeSeg.el, inp, presetBox]),
      h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 22px' }, [h('div', { cls: 'w-row', style: 'justify-content:space-between;align-items:baseline' }, [t1, n1]), row1]),
      h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 22px' }, [h('div', { cls: 'w-row', style: 'justify-content:space-between;align-items:baseline' }, [t2, n2]), row2]),
      h('div', { cls: 'w-card', style: 'gap:8px;padding:12px 22px' }, [h('div', { cls: 'w-row', style: 'justify-content:space-between;align-items:baseline' }, [t3, n3]), row3, row4]),
      h('div', { cls: 'w-row', style: 'gap:18px;align-items:stretch' }, [
        h('div', { cls: 'w-card', style: 'width:820px' }, [form]),
        h('div', { cls: 'w-col', style: 'flex:1;gap:14px' }, [h('div', { cls: 'w-card', style: 'flex:1' }, [rule]), verdict])])]));

    function syncInput() {
      inp.value = st.mode === 'bit' ? st.bits : st.toks.join(' ');
      presetBox.innerHTML = '';
      var P = st.mode === 'bit'
        ? [['Slide example', '0001111111001111101000'], ['Checkpoint', '011111111111'], ['Flag in data', '01111110'], ['All 1s', '111111111111111111111111111111']]
        : [['Slide example', 'A FLAG B ESC C'], ['Checkpoint', 'ESC ESC FLAG'], ['No special bytes', 'H E L L O']];
      P.forEach(function (p) { presetBox.appendChild(btn(p[0], function () { if (st.mode === 'bit') st.bits = p[1]; else st.toks = p[1].split(' '); syncInput(); draw(); })); });
      if (st.mode === 'byte') ['FLAG', 'ESC', 'A'].forEach(function (t) {
        presetBox.appendChild(btn('+' + t, function () { if (st.toks.length < 14) st.toks.push(t); syncInput(); draw(); }, t === 'A' ? '' : 'acc'));
      });
    }
    inp.addEventListener('input', function () {
      if (st.mode === 'bit') { var v = inp.value.replace(/[^01]/g, '').slice(0, 30); if (v !== inp.value) inp.value = v; st.bits = v; }
      else st.toks = inp.value.trim().split(/\s+/).filter(Boolean).slice(0, 14).map(function (t) { var u = t.toUpperCase(); return u === 'FLAG' || u === 'ESC' ? u : t; });
      draw();
    });

    function bitBox(c, opt) {
      opt = opt || {};
      var col = opt.ins ? C.orange : C.ink, bg = opt.ins ? '#fbe9da' : '#fff', bd = opt.ins ? C.orange : '#cfd6dd';
      if (opt.del) { col = C.orange; bg = '#f3f1ec'; bd = C.orange; }
      var b = h('div', { style: 'width:' + opt.w + 'px;height:48px;border-radius:8px;border:2px solid ' + bd + ';background:' + bg + ';display:flex;align-items:center;justify-content:center;font:600 ' + opt.fs + 'px ' + D.MONO + ';color:' + col + (opt.del ? ';text-decoration:line-through;text-decoration-thickness:3px;opacity:.85' : ''), text: c });
      var under = h('div', { style: 'height:28px;font:600 22px ' + D.MONO + ';text-align:center;color:' + (opt.cnt === 5 ? C.orange : C.gray), text: opt.cnt ? String(opt.cnt) : '' });
      return h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:2px' }, opt.counter ? [b, under] : [b]);
    }
    function flagChip(txt) { return h('div', { style: 'height:48px;padding:0 12px;border-radius:8px;background:' + C.navy + ';color:#f5f3ee;display:flex;align-items:center;font:600 24px ' + D.MONO + ';margin:0 6px', text: txt }); }
    function tok(t, opt) {
      opt = opt || {};
      var isF = t === 'FLAG', isE = t === 'ESC', bg = '#fff', col = C.ink, bd = '#cfd6dd';
      if (isF) { bg = '#e7edf3'; col = C.navy; bd = C.navy; } if (isE) { bg = '#e7edf3'; col = C.blue; bd = C.blue; }
      if (opt.ins) { bg = C.orange; col = '#fff'; bd = C.orange; }
      if (opt.del) { bg = '#f3f1ec'; col = C.orange; bd = C.orange; }
      if (opt.frame) { bg = C.navy; col = '#f5f3ee'; bd = C.navy; }
      return h('div', { style: 'min-width:64px;height:54px;padding:0 14px;border-radius:10px;border:2px solid ' + bd + ';background:' + bg + ';color:' + col + ';display:flex;align-items:center;justify-content:center;font:600 25px ' + D.MONO + (opt.del ? ';text-decoration:line-through;text-decoration-thickness:3px' : ''), text: t });
    }
    function lab(s) { return h('div', { text: s, style: 'height:54px;display:flex;align-items:center;font:600 23px ' + D.SANS + ';color:' + C.gray + ';margin-right:8px' }); }
    function pct(x) { return D.fmtN(100 * x, 1) + ' %'; }

    function draw() {
      [row1, row2, row3, row4].forEach(function (r) { r.innerHTML = ''; });
      if (st.mode === 'bit') {
        var d = st.bits, s = bitStuff(d), r = bitUnstuff(s.body), n = d.length, k = s.ins.length;
        var w = Math.max(30, Math.min(44, Math.floor((1600 - 2 * 150) / Math.max(1, n + k)) - 4)), fs = w >= 36 ? 28 : 24;
        t1.textContent = '1 · Data from the upper layer (' + n + ' bits)'; n1.textContent = 'grey numbers count consecutive 1s';
        t2.textContent = '2 · Frame sent: flag | stuffed data | flag'; n2.textContent = 'orange = stuffed 0 (after every five 1s)';
        t3.textContent = '3 · Receiver: after 0 1 1 1 1 1, delete the next 0'; n3.textContent = 'struck out = removed by the receiver';
        d.split('').forEach(function (c, i) { row1.appendChild(bitBox(c, { w: w, fs: fs, counter: true, cnt: c === '1' ? s.runs[i] : 0 })); });
        row2.appendChild(flagChip(FLAGBITS));
        s.body.split('').forEach(function (c, i) { row2.appendChild(bitBox(c, { w: w, fs: fs, ins: s.ins.indexOf(i) >= 0 })); });
        row2.appendChild(flagChip(FLAGBITS));
        s.body.split('').forEach(function (c, i) { row3.appendChild(bitBox(c, { w: w, fs: fs, del: r.del.indexOf(i) >= 0 })); });
        row4.appendChild(lab('Delivered:'));
        r.data.split('').forEach(function (c) { row4.appendChild(bitBox(c, { w: w, fs: fs })); });
        var f = 'Data bits         n = <b>' + n + '</b>\n';
        f += 'Stuffed 0s        k = <b>' + k + '</b>\n';
        f += 'Stuffed body  n + k = ' + n + ' + ' + k + ' = <b>' + (n + k) + '</b> bits\n';
        f += 'Frame (2 flags)     = ' + (n + k) + ' + 2 × 8 = <b>' + (n + k + 16) + '</b> bits\n';
        f += 'Stuffing overhead k/n = ' + k + '/' + n + ' = <b>' + (n ? pct(k / n) : '—') + '</b>  (worst ⌊n/5⌋ = ' + Math.floor(n / 5) + ')';
        form.innerHTML = f;
        rule.innerHTML = 'Sender: five 1s → insert <b>0</b>\nReceiver: 0 1 1 1 1 1 then\n  next bit 0 → <b>delete it</b>\n  next bit 1 → flag 01111110 (or error)';
        var ok = r.data === d;
        verdict.className = 'w-verdict ' + (ok ? 'ok' : 'bad');
        verdict.textContent = ok ? 'Receiver output = original data ✓ ' + (k ? k + ' stuffed 0' + (k > 1 ? 's' : '') + ' removed' : 'nothing to remove') : 'Mismatch ✗';
      } else {
        var toks = st.toks, body = byteStuff(toks), bt = body.map(function (x) { return x.t; }), u = byteUnstuff(bt), nb = toks.length;
        var kb = body.filter(function (x) { return x.s; }).length;
        t1.textContent = '1 · Data from the upper layer (' + nb + ' bytes)'; n1.textContent = 'FLAG and ESC here are ordinary data bytes';
        t2.textContent = '2 · Frame sent: FLAG | stuffed data | FLAG'; n2.textContent = 'orange = ESC added before each FLAG or ESC';
        t3.textContent = '3 · Receiver: on ESC, delete it and keep the next byte'; n3.textContent = 'struck out = removed by the receiver';
        toks.forEach(function (t) { row1.appendChild(tok(t)); });
        row2.appendChild(tok('FLAG', { frame: true }));
        body.forEach(function (x) { row2.appendChild(tok(x.t, { ins: x.s })); });
        row2.appendChild(tok('FLAG', { frame: true }));
        bt.forEach(function (t, i) { row3.appendChild(tok(t, { del: u.del.indexOf(i) >= 0 })); });
        row4.appendChild(lab('Delivered:'));
        u.data.forEach(function (t) { row4.appendChild(tok(t)); });
        var fb = 'Data bytes            n = <b>' + nb + '</b>\n';
        fb += 'Stuffed ESC bytes     k = <b>' + kb + '</b>\n';
        fb += 'Stuffed data      n + k = ' + nb + ' + ' + kb + ' = <b>' + (nb + kb) + '</b> bytes\n';
        fb += 'Frame (2 flags)         = ' + (nb + kb) + ' + 2 = <b>' + (nb + kb + 2) + '</b> bytes\n';
        fb += 'Stuffing overhead k/n = ' + kb + '/' + nb + ' = <b>' + (nb ? pct(kb / nb) : '—') + '</b>';
        form.innerHTML = fb;
        rule.innerHTML = 'Sender: FLAG → <b>ESC</b> FLAG\n        ESC  → <b>ESC</b> ESC\nReceiver: ESC → delete it,\n  next byte is plain data\n  FLAG without ESC = end of frame';
        var okb = u.data.join(' ') === toks.join(' ');
        verdict.className = 'w-verdict ' + (okb ? 'ok' : 'bad');
        verdict.textContent = okb ? 'Receiver output = original data ✓ ' + (kb ? kb + ' ESC byte' + (kb > 1 ? 's' : '') + ' removed' : 'nothing to remove') : 'Mismatch ✗';
      }
    }
    syncInput(); draw();
  });
  if (typeof module !== 'undefined') module.exports = { byteStuff: byteStuff, byteUnstuff: byteUnstuff, bitStuff: bitStuff, bitUnstuff: bitUnstuff };
})();
