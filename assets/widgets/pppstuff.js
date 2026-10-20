/* Try it: PPP byte stuffing (Lecture 12, after slide "pppstuff"). Slides "ppp", "pppstuff"; ARQ Lab tab 4.
   Two rules, as on the slide: real PPP (RFC 1662: 7D, then byte XOR 20) and Forouzan's simplified rule (7D before 7E or 7D). */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, btn = D.btn;
  var HDR = [0xFF, 0x03, 0x00, 0x21];   // address FF, control 03, protocol 0021 (IPv4)

  function H(n) { return (n < 16 ? '0' : '') + n.toString(16).toUpperCase(); }
  function B8(n) { var s = D.bin(n, 8); return s.slice(0, 4) + ' ' + s.slice(4); }
  // pure: parse hex bytes ("45 7E 00" or "457E00")
  function parseHex(txt) {
    var t = txt.replace(/0x/gi, ' ').replace(/[,;]/g, ' ').trim(), out = [], bad = null;
    if (!t) return { bytes: out, bad: null };
    t.split(/\s+/).forEach(function (w) {
      if (!/^[0-9a-fA-F]+$/.test(w)) { bad = bad || w; return; }
      if (w.length % 2 && w.length > 2) { bad = bad || w; return; }
      if (w.length <= 2) out.push(parseInt(w, 16)); else for (var i = 0; i < w.length; i += 2) out.push(parseInt(w.slice(i, i + 2), 16));
    });
    return { bytes: out, bad: bad };
  }
  // pure: PPP FCS-16 (RFC 1662): reflected CRC-CCITT, init FFFF, complemented; sent low byte first
  function fcs16(bytes) {
    var c = 0xFFFF;
    bytes.forEach(function (b) { c ^= b; for (var k = 0; k < 8; k++) c = (c & 1) ? (c >>> 1) ^ 0x8408 : c >>> 1; });
    c ^= 0xFFFF; return [c & 0xFF, c >>> 8];
  }
  function needs(x, rule, accm) { return x === 0x7E || x === 0x7D || (rule === 'rfc' && accm && x < 0x20); }
  // pure: stuff a list of bytes. Returns tokens {v, esc (inserted 7D), x (XOR-changed), orig, src}
  function stuff(bytes, rule, accm) {
    var out = [];
    bytes.forEach(function (x, i) {
      if (needs(x, rule, accm)) {
        out.push({ v: 0x7D, esc: true, src: i });
        out.push(rule === 'rfc' ? { v: x ^ 0x20, x: true, orig: x, src: i } : { v: x, kept: true, orig: x, src: i });
      } else out.push({ v: x, src: i });
    });
    return out;
  }
  // pure: receiver: drop each 7D; RFC: XOR the next byte with 20; Forouzan: keep it
  function unstuff(vals, rule) {
    var out = [], drop = [];
    for (var i = 0; i < vals.length; i++) {
      if (vals[i] === 0x7D && i + 1 < vals.length) { drop.push(i); i++; out.push(rule === 'rfc' ? vals[i] ^ 0x20 : vals[i]); }
      else out.push(vals[i]);
    }
    return { data: out, drop: drop };
  }

  D.register('pppstuff', function (root) {
    var st = { txt: '45 7E 00 7D 21', rule: 'rfc', accm: false };
    var MAXB = 10;
    var inp = h('input', { cls: 'w-in', spellcheck: 'false', 'aria-label': 'Payload bytes in hex', style: 'box-sizing:border-box;width:100%;font-family:' + D.MONO + ';font-size:28px', value: st.txt });
    var inNote = h('p', { cls: 'w-note', style: 'margin:0' });
    var ruleSeg = D.seg([['rfc', 'RFC 1662'], ['frz', 'Forouzan']], st.rule, function (k) { st.rule = k; draw(); });
    var accmB = btn('+ 00–1F', function () { st.accm = !st.accm; draw(); });
    var preBox = h('div', { cls: 'w-btns', style: 'flex-wrap:wrap;gap:8px' });
    [['Slide', '45 7E 00 7D 21'], ['7E 41 7D', '7E 41 7D'], ['Checkpoint', '7E 7E'], ['No specials', '45 00 21'], ['All flags', '7E 7E 7E 7E 7E 7E 7E 7E 7E 7E']].forEach(function (p) {
      preBox.appendChild(btn(p[0], function () { inp.value = p[1]; st.txt = p[1]; draw(); }));
    });
    var row1 = h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start' });
    var row2 = h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px 6px;align-items:flex-start' });
    var row3 = h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;align-items:flex-start' });
    var row4 = h('div', { style: 'display:flex;flex-wrap:wrap;gap:6px;align-items:center' });
    var t1 = h('h4', { style: 'margin:0' }), t2 = h('h4', { style: 'margin:0' }), t3 = h('h4', { style: 'margin:0' });
    var legend = h('p', { cls: 'w-note', style: 'margin:0' }), n2 = h('p', { cls: 'w-note', style: 'margin:0' }), n3 = h('p', { cls: 'w-note', style: 'margin:0' });
    var xorT = h('h4', { style: 'margin:0' }), xorF = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.45' });
    var form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.45' });
    var verdict = h('div', { cls: 'w-verdict', style: 'font-size:22px;margin:0' });
    var contrast = h('p', { cls: 'w-note', style: 'margin:0;font-size:22px;color:' + C.ink });

    function hd(t, n) { return h('div', { style: 'display:flex;justify-content:space-between;align-items:baseline;gap:12px' }, [t, n]); }
    root.appendChild(h('div', { cls: 'w-row', style: 'gap:20px;width:1664px;align-items:stretch' }, [
      h('div', { cls: 'w-col', style: 'width:1084px;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:8px;padding:10px 20px' }, [t1, row1]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding:10px 20px' }, [hd(t2, n2), row2, legend]),
        h('div', { cls: 'w-card', style: 'gap:8px;padding:10px 20px' }, [hd(t3, n3), row3, row4]),
        h('div', { cls: 'w-card', style: 'gap:4px;padding:10px 20px;flex:1' }, [h('h4', { text: 'Overhead', style: 'margin:0' }), form])]),
      h('div', { cls: 'w-col', style: 'width:560px;min-width:0;gap:12px' }, [
        h('div', { cls: 'w-card', style: 'gap:10px;padding:12px 20px' }, [h('h4', { text: 'Payload bytes (hex)', style: 'margin:0' }), inp, inNote, preBox,
          h('div', { style: 'display:flex;gap:10px;align-items:center' }, [ruleSeg.el, accmB])]),
        h('div', { cls: 'w-card', style: 'gap:6px;padding:12px 20px;flex:1' }, [xorT, xorF]), verdict, h('div', { cls: 'w-card', style: 'padding:10px 18px' }, [contrast])])]));
    inp.addEventListener('input', function () { st.txt = inp.value; draw(); });

    var CW = 56;
    function chip(v, o) {
      o = o || {};
      var bg = '#fff', col = C.ink, bd = '#cfd6dd', deco = '';
      if (o.special) { bd = C.blue; col = C.blue; bg = '#e7edf3'; }
      if (o.hdr) { bg = '#eef1f4'; col = C.gray; }
      if (o.flag) { bg = C.navy; col = '#f5f3ee'; bd = C.navy; }
      if (o.esc) { bg = C.orange; col = '#fff'; bd = C.orange; }
      if (o.x) { bg = '#fbe9da'; col = C.orange; bd = C.orange; }
      if (o.kept) { bg = '#fbe3df'; col = C.red; bd = C.red; }
      if (o.del) { bg = '#f3f1ec'; col = C.orange; bd = C.orange; deco = ';text-decoration:line-through;text-decoration-thickness:3px'; }
      var b = h('div', { text: H(v), style: 'width:' + CW + 'px;height:50px;box-sizing:border-box;border-radius:9px;border:2px solid ' + bd + ';background:' + bg + ';color:' + col +
        ';display:flex;align-items:center;justify-content:center;font:600 ' + (CW < 54 ? 22 : 25) + 'px ' + D.MONO + deco });
      if (o.bar) b = h('div', { style: 'display:flex;flex-direction:column;gap:3px' }, [b, h('div', { style: 'height:5px;border-radius:3px;background:' + o.bar })]);
      if (o.under === undefined) return b;
      return h('div', { style: 'display:flex;flex-direction:column;align-items:center;gap:2px;width:' + CW + 'px' }, [b,
        h('div', { text: o.under, style: 'height:26px;font:600 20px ' + D.MONO + ';color:' + C.orange + ';white-space:nowrap' })]);
    }
    function lab(s) { return h('div', { text: s, style: 'height:50px;display:flex;align-items:center;font:600 22px ' + D.SANS + ';color:' + C.gray + ';margin-right:6px' }); }

    function draw() {
      ruleSeg.set(st.rule);
      accmB.classList.toggle('on', st.accm && st.rule === 'rfc'); accmB.disabled = st.rule !== 'rfc'; accmB.style.opacity = st.rule === 'rfc' ? '1' : '0.45';
      var p = parseHex(st.txt), pay = p.bytes.slice(0, MAXB), rfc = st.rule === 'rfc', accm = rfc && st.accm;
      inNote.textContent = p.bad ? 'Ignored "' + p.bad + '": not a hex byte.' : p.bytes.length > MAXB ? 'Only the first ' + MAXB + ' bytes are used.' : 'Type bytes such as 7E 41 7D (up to ' + MAXB + ').';
      inNote.style.color = p.bad || p.bytes.length > MAXB ? C.red : C.gray;
      [row1, row2, row3, row4].forEach(function (r) { r.innerHTML = ''; });
      var n = pay.length, fcs = fcs16(HDR.concat(pay));
      var sH = stuff(HDR, st.rule, accm), sP = stuff(pay, st.rule, accm), sF = stuff(fcs, st.rule, accm);
      var N = sH.length + sP.length + sF.length + 2;
      CW = Math.max(44, Math.min(56, Math.floor(1044 / Math.ceil(N / 2)) - 6));
      var kH = sH.filter(function (t) { return t.esc; }).length, kP = sP.filter(function (t) { return t.esc; }).length, kF = sF.filter(function (t) { return t.esc; }).length;
      var k = kH + kP + kF;

      t1.textContent = '1 · Payload from the network layer (' + n + ' byte' + (n === 1 ? '' : 's') + ')';
      if (!n) row1.appendChild(lab('(empty)'));
      pay.forEach(function (x) { row1.appendChild(chip(x, { special: needs(x, st.rule, accm) })); });

      t2.textContent = '2 · Sender: frame on the wire';
      n2.textContent = rfc ? 'orange = inserted 7D · light = byte XOR 20' : 'orange = inserted 7D · red = 7E/7D sent unchanged';
      function toks(arr, isHdr) { return arr.map(function (t) { return chip(t.v, { esc: t.esc, x: t.x, kept: t.kept, hdr: isHdr && !t.esc && !t.x }); }); }
      [[[{ v: 0x7E, f: 1 }], C.navy], [sH, '#9aa3ad'], [sP, C.blue], [sF, '#9aa3ad'], [[{ v: 0x7E, f: 1 }], C.navy]].forEach(function (g) {
        g[0].forEach(function (t) { row2.appendChild(chip(t.v, { flag: t.f, esc: t.esc, x: t.x, kept: t.kept, hdr: g[1] !== C.blue && !t.f && !t.esc && !t.x, bar: g[1] })); });
      });
      legend.innerHTML = 'Bars: <b style="color:' + C.navy + '">flag</b> · <span style="color:#7d8792;font-weight:600">FF 03 00 21 = address, control, protocol (IPv4)</span> · <b style="color:' + C.blue + '">payload</b> · <span style="color:#7d8792;font-weight:600">FCS (CRC-16)</span>';

      // receiver: everything between the flags
      var body = sH.concat(sP, sF).map(function (t) { return t.v; }), u = unstuff(body, st.rule);
      t3.textContent = '3 · Receiver: drop each 7D' + (rfc ? ', XOR the next byte with 20' : ', keep the next byte');
      n3.textContent = 'struck out = removed';
      body.forEach(function (v, i) {
        var d = u.drop.indexOf(i) >= 0, after = u.drop.indexOf(i - 1) >= 0;
        row3.appendChild(chip(v, { del: d, x: after && rfc, kept: after && !rfc, under: after ? (rfc ? '→' + H(v ^ 0x20) : '→' + H(v)) : '' }));
      });
      var got = u.data.slice(HDR.length, u.data.length - 2);
      row4.appendChild(lab('Payload delivered:'));
      if (!got.length) row4.appendChild(lab('(empty)'));
      got.forEach(function (x) { row4.appendChild(chip(x, { special: x === 0x7E || x === 0x7D })); });

      // XOR card
      var seen = [], xs = sP.concat(sH, sF).filter(function (t) { return t.x || t.kept; });
      xs.forEach(function (t) { if (seen.indexOf(t.orig) < 0) seen.push(t.orig); });
      if (rfc) {
        xorT.textContent = 'Sender: escaped byte XOR 20, in binary';
        var lines = seen.slice(0, 2).map(function (o) { return '  ' + H(o) + ' = ' + B8(o) + '\n⊕ 20 = ' + B8(0x20) + '\n     = ' + B8(o ^ 0x20) + ' = <b>' + H(o ^ 0x20) + '</b>'; });
        xorF.innerHTML = seen.length ? lines.join('\n') + (seen.length > 2 ? '\n(and ' + seen.slice(2).map(H).join(', ') + ' the same way)' : '') : 'No byte needs escaping: nothing to XOR.\nReceiver: ' + H(0x5E) + ' ⊕ 20 = <b>7E</b>, ' + H(0x5D) + ' ⊕ 20 = <b>7D</b>';
      } else {
        xorT.textContent = 'Forouzan\'s rule: no XOR';
        xorF.innerHTML = seen.length ? seen.map(function (o) { return '  ' + H(o) + ' → 7D <span class="bad">' + H(o) + '</span>'; }).join('\n') +
          '\nThe byte after 7D is sent unchanged,\nso <span class="bad">7E still appears</span> between the flags.' : 'No 7E or 7D in the frame:\nnothing to escape.';
      }

      // overhead
      var total = 1 + HDR.length + n + 2 + k + 1;
      var f = 'Payload n = <b>' + n + '</b> bytes · escapes in payload k = <b>' + kP + '</b>' + (kH + kF ? ' (+' + (kH + kF) + ' in header/FCS)' : '') + '\n';
      f += 'Frame = flag + header + n + FCS + escapes + flag\n      = 1 + 4 + ' + n + ' + 2 + ' + k + ' + 1 = <b>' + total + '</b> bytes\n';
      f += 'Overhead k/n = ' + kP + '/' + n + ' = <b>' + (n ? D.fmtN(100 * kP / n, 1) + ' %' : '—') + '</b>';
      form.innerHTML = f;
      var flagsInside = body.filter(function (v) { return v === 0x7E; }).length, ok = got.join(',') === pay.join(',');
      if (!ok) { verdict.className = 'w-verdict bad'; verdict.textContent = 'Receiver output ≠ payload ✗'; }
      else if (flagsInside) { verdict.className = 'w-verdict warn'; verdict.textContent = 'Recovered ✓, but 7E appears ' + flagsInside + '× inside the frame'; }
      else { verdict.className = 'w-verdict ok'; verdict.textContent = 'Payload recovered ✓ · no 7E inside the frame'; }
      contrast.innerHTML = '<b style="color:' + C.navy + '">HDLC vs PPP:</b> HDLC stuffs a 0 bit after five 1s (≤ 1 bit in 5); PPP adds a whole 7D byte per flag-like byte (up to 100 %).';
    }
    draw();
  });
  if (typeof module !== 'undefined') module.exports = { parseHex: parseHex, stuff: stuff, unstuff: unstuff, fcs16: fcs16 };
})();
