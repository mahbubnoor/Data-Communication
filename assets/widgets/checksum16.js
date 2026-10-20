/* Try it: the Internet checksum, step by step (Lecture 11, after slide "internet").
   4-bit mode = slide "checksum" (Forouzan Ex. 10.11-10.13: 7, 11, 12, 0, 6 -> 9);
   16-bit mode = slide "internet" ("Forouzan" -> 466F 726F 757A 616E -> 7038). Same logic as Lab L11 tab 5. */
(function () {
  'use strict';
  var D = window.DCW, h = D.h, C = D.C, btn = D.btn;

  // ---------- pure functions ----------
  function mask(W) { return W === 16 ? 0xFFFF : 0xF; }
  // one's-complement addition of two W-bit words: raw sum, carry out, wrapped result
  function ocAdd(a, b, W) {
    var M = mask(W), raw = a + b, carry = raw >> W, res = (raw & M) + carry;
    return { raw: raw, carry: carry, res: res & M };   // a single wrap is always enough for two words
  }
  function wrapAll(s, W) { var M = mask(W); while (s > M) s = (s & M) + (s >> W); return s; }
  function comp(v, W) { return (~v) & mask(W); }
  // rows for a word-by-word one's-complement sum followed by the complement
  function steps(words, W) {
    var rows = [], s = words.length ? words[0] : 0, plain = 0;
    words.forEach(function (w, i) {
      plain += w;
      if (i === 0) { rows.push({ kind: 'start', i: 0, word: w, res: w }); return; }
      var r = ocAdd(s, w, W);
      rows.push({ kind: 'add', i: i, word: w, prev: s, raw: r.raw, carry: r.carry, res: r.res });
      s = r.res;
    });
    rows.push({ kind: 'comp', sum: s, res: comp(s, W) });
    return { rows: rows, sum: s, comp: comp(s, W), plain: plain, plainWrapped: wrapAll(plain, W) };
  }
  function checksum(words, W) { return steps(words, W).comp; }
  function textWords(t) {   // ASCII text -> 16-bit words, zero byte padded if odd
    var b = []; for (var i = 0; i < t.length; i++) b.push(t.charCodeAt(i) & 0xFF);
    if (b.length % 2) b.push(0);
    var w = []; for (i = 0; i < b.length; i += 2) w.push(b[i] * 256 + b[i + 1]);
    return w;
  }

  var PRE = { slide4: [7, 11, 12, 0, 6], chk4: [8, 9, 15], slide16: [0x466F, 0x726F, 0x757A, 0x616E] };
  var MAXW = 5;

  D.register('checksum16', function (root) {
    var st = { W: 16, words: PRE.slide16.slice(), text: 'Forouzan', step: 99, view: 'tx', flips: {}, swap: null };

    function hx(v, W) { var s = v.toString(16).toUpperCase(); var n = (W || st.W) === 16 ? 4 : 1; while (s.length < n) s = '0' + s; return s; }
    function top(v) { return st.W === 16 ? hx(v) : v + ' = ' + hx(v) + 'h'; }
    function bits(v, n) { var s = D.bin(v, n); return n === 16 ? s.replace(/(\d{4})(?=\d)/g, '$1 ') : s; }
    function bitsSpans(v, wi, cmpTo, click) {   // clickable bits with a gap after every nibble
      var s = D.bin(v, st.W), o = '', c = D.bin(cmpTo, st.W);
      for (var k = 0; k < s.length; k++) {
        var bad = s[k] !== c[k];
        o += '<span' + (click ? ' data-w="' + wi + '" data-b="' + k + '"' : '') + ' style="' + (click ? 'cursor:pointer;' : '') +
          (bad ? 'background:' + C.red + ';color:#fff;border-radius:3px;' : '') + '">' + s[k] + '</span>';
        if (st.W === 16 && k % 4 === 3 && k < 15) o += ' ';
      }
      return o;
    }
    function fmtW(v) { return st.W === 16 ? hx(v) : String(v); }

    // ---------- controls ----------
    var modeSeg = D.seg([[4, '4-bit'], [16, '16-bit']], 16, function (k) {
      st.W = k; st.words = (k === 16 ? PRE.slide16 : PRE.slide4).slice(); st.text = k === 16 ? 'Forouzan' : ''; restart(true);
    });
    var wIn = h('input', { cls: 'w-in', type: 'text', 'aria-label': 'Data words', spellcheck: 'false' });
    var tIn = h('input', { cls: 'w-in', type: 'text', 'aria-label': 'Text to send', maxlength: '10', style: 'width:260px' });
    var wLab = h('h4');
    wIn.addEventListener('input', function () {
      var M = mask(st.W), ws = wIn.value.trim().split(/[\s,]+/).filter(Boolean).map(function (t) { return parseInt(t, st.W === 16 ? 16 : 10); })
        .filter(function (v) { return !isNaN(v) && v >= 0 && v <= M; }).slice(0, MAXW);
      if (ws.length) { st.words = ws; st.text = ''; tIn.value = ''; restart(false); }
    });
    tIn.addEventListener('input', function () {
      var ws = textWords(tIn.value).slice(0, MAXW); st.text = tIn.value;
      if (ws.length) { st.words = ws; restart(true, true); }
    });
    var textRow = h('div', { cls: 'w-row', style: 'gap:12px;align-items:center' }, [h('span', { text: 'or text (ASCII):', style: 'font-weight:600;white-space:nowrap' }), tIn]);
    function preset(W, key, text) { st.W = W; modeSeg.set(W); st.words = PRE[key].slice(); st.text = text || ''; restart(true); }

    var stepLbl = h('span', { cls: 'w-note', style: 'font-size:22px;color:' + C.gray + ';margin-left:4px' });
    var viewSeg = D.seg([['tx', 'Sender'], ['rx', 'Receiver']], 'tx', function (k) { st.view = k; draw(); });
    var chips = h('div', { cls: 'w-chips', style: 'align-items:center' });
    var tabBox = h('div');
    var form = h('div', { cls: 'w-f', style: 'font-size:22px;line-height:1.5' });
    var verdict = h('div', { cls: 'w-verdict', style: 'font-size:24px' });
    var slideNote = h('p', { cls: 'w-note', style: 'font-size:22px' });

    tabBox.addEventListener('click', function (e) {
      var t = e.target; if (!t || !t.getAttribute || t.getAttribute('data-w') == null) return;
      var key = t.getAttribute('data-w') + ',' + t.getAttribute('data-b');
      if (st.flips[key]) delete st.flips[key]; else st.flips[key] = 1;
      draw();
    });

    root.appendChild(h('div', { cls: 'w-row', style: 'gap:24px' }, [
      h('div', { cls: 'w-col', style: 'width:1100px;gap:14px' }, [
        h('div', { cls: 'w-card', style: 'gap:12px' }, [
          h('div', { cls: 'w-row', style: 'gap:14px;align-items:center' }, [viewSeg.el,
            h('div', { cls: 'w-btns' }, [
              btn('◀ Back', function () { st.step = Math.max(1, Math.min(st.step, total()) - 1); follow(); draw(); }),
              btn('Next step ▶', function () { st.step = Math.min(total(), st.step + 1); follow(); draw(); }, 'acc'),
              btn('All steps', function () { st.step = total(); draw(); }),
              btn('Restart', function () { st.step = 1; st.view = 'tx'; draw(); })]), stepLbl]),
          chips, tabBox]), verdict]),
      h('div', { cls: 'w-col', style: 'width:540px;gap:14px' }, [
        h('div', { cls: 'w-card', style: 'gap:10px' }, [h('div', { cls: 'w-row', style: 'gap:16px;align-items:center;justify-content:space-between' }, [wLab, modeSeg.el]), wIn, textRow,
          h('div', { cls: 'w-btns' }, [
            btn('7 11 12 0 6', function () { preset(4, 'slide4'); }),
            btn('8 9 15', function () { preset(4, 'chk4'); }),
            btn('“Forouzan”', function () { preset(16, 'slide16', 'Forouzan'); })])]),
        h('div', { cls: 'w-card', style: 'gap:10px' }, [h('h4', { text: 'Channel (changes what arrives)' }),
          h('div', { cls: 'w-btns' }, [
            btn('Clean', function () { st.flips = {}; st.swap = null; st.view = 'rx'; st.step = total(); draw(); }),
            btn('Flip a bit', function () { st.flips = {}; st.swap = null; st.flips[(st.words.length > 1 ? 1 : 0) + ',' + (st.W === 16 ? 11 : 2)] = 1; st.view = 'rx'; st.step = total(); draw(); }),
            btn('Swap words 1 ⇄ 2', function () { st.flips = {}; st.swap = st.words.length > 1 ? [0, 1] : null; st.view = 'rx'; st.step = total(); draw(); }, 'acc')]),
          h('p', { cls: 'w-note', text: 'Or click any bit in the Receiver table to flip it.' })]),
        h('div', { cls: 'w-card', style: 'gap:10px' }, [form, slideNote])])]));

    function restart(setInput, keepText) {
      st.flips = {}; st.swap = null; st.step = total(); st.view = 'tx';
      if (setInput) wIn.value = st.words.map(fmtW).join(' ');
      if (!keepText) tIn.value = st.text || '';
      draw();
    }
    function nTx() { return st.words.length + 1; }
    function total() { return nTx() + st.words.length + 2; }
    function follow() { st.view = st.step > nTx() ? 'rx' : 'tx'; }

    function received(sent) {
      var rx = sent.slice();
      if (st.swap) { var t = rx[st.swap[0]]; rx[st.swap[0]] = rx[st.swap[1]]; rx[st.swap[1]] = t; }
      Object.keys(st.flips).forEach(function (k) {
        var p = k.split(',').map(Number); if (p[0] < rx.length && p[1] < st.W) rx[p[0]] ^= 1 << (st.W - 1 - p[1]);
      });
      return rx;
    }

    function table(S, list, sentList, isRx, shown) {
      var W = st.W, n = W, o = '<table class="w-tab" style="width:100%;table-layout:fixed"><colgroup><col style="width:' + (W === 16 ? 96 : 120) +
        'px"><col><col><col></colgroup><tr><th class="rh">Step</th><th>' + (isRx ? 'Received word' : 'Add word') +
        '</th><th>Running sum + word</th><th>Carry wrapped back in</th></tr>';
      S.rows.forEach(function (r, k) {
        var dim = k >= shown, cur = k === shown - 1;
        var trs = '<tr' + (cur ? ' class="cur"' : '') + (dim ? ' style="opacity:.35"' : '') + '>';
        var cell = function (t, b, extra) { return '<td style="text-align:left;line-height:1.3;padding:6px 10px;' + (dim ? '' : (extra || '')) + '"><div style="font-weight:600;font-size:24px' + (dim ? ';visibility:hidden' : '') + '">' + t + '</div><div style="font-size:23px;' + (dim ? 'visibility:hidden;' : '') + 'color:' + C.gray + '">' + b + '</div></td>'; };
        if (r.kind === 'comp') {
          var ok = r.res === 0;
          trs += '<td class="rh">¬ flip</td>' + cell('sum ' + top(r.sum), bits(r.sum, n)) +
            cell(isRx ? (r.sum === mask(W) ? 'all 1s ✓' : 'not all 1s ✗') : 'flip every bit', W === 16 ? hx(mask(W)) + ' − ' + hx(r.sum) : '15 − ' + r.sum + ' = ' + r.res,
              isRx ? 'color:' + (r.sum === mask(W) ? C.green : C.red) : '') +
            cell('<span style="color:' + (isRx ? (ok ? C.green : C.red) : C.orange) + '">' + (isRx ? (ok ? top(r.res) + ' → accept' : top(r.res) + ' → discard') : 'checksum ' + top(r.res)) + '</span>',
              '<span style="color:' + (isRx ? (ok ? C.green : C.red) : C.orange) + ';font-weight:600">' + bits(r.res, n) + '</span>',
              isRx ? '' : 'background:#fbe9da');
        } else {
          var lab = (isRx && r.i === list.length - 1 ? 'ck' : 'w' + (r.i + 1));
          var wcell = cell((r.kind === 'start' ? '' : '+ ') + top(r.word) + (isRx && r.word !== sentList[r.i] ? ' <span style="color:' + C.red + '">(sent ' + fmtW(sentList[r.i]) + ')</span>' : ''),
            bitsSpans(r.word, r.i, isRx ? sentList[r.i] : r.word, isRx));
          if (r.kind === 'start') {
            trs += '<td class="rh">' + lab + '</td>' + wcell + cell('start: sum = ' + lab, '—') + cell('sum = ' + top(r.res), bits(r.res, n));
          } else {
            var rawB = bits(r.raw & mask(W), n);
            var rawCell = cell(W === 16 ? hx(r.prev) + ' + ' + hx(r.word) + ' = ' + (r.carry ? '<span style="color:' + C.orange + '">1</span>' : '') + hx(r.raw & mask(W))
              : r.prev + ' + ' + r.word + ' = ' + (r.carry ? '<span style="color:' + C.orange + '">' + r.raw + '</span>' : r.raw),
              (r.carry ? '<span style="background:' + C.orange + ';color:#fff;border-radius:4px;padding:0 4px;font-weight:600">1</span> ' : '<span style="visibility:hidden">1 </span>') + rawB);
            var wrapCell = r.carry
              ? cell('<span style="color:' + C.orange + '">↩ ' + (W === 16 ? hx(r.raw & mask(W)) : D.bin(r.raw & mask(W), 4)) + ' + 1 = ' + top(r.res) + '</span>', '<span style="color:' + C.ink + '">' + bits(r.res, n) + '</span>', 'background:#fdf0dc;box-shadow:inset 4px 0 0 ' + C.orange)
              : cell('no carry: ' + top(r.res), bits(r.res, n));
            trs += '<td class="rh">' + lab + '</td>' + wcell + rawCell + wrapCell;
          }
        }
        o += trs + '</tr>';
      });
      return o + '</table>';
    }

    function draw() {
      var W = st.W, words = st.words, tx = steps(words, W), ck = tx.comp, sent = words.concat([ck]);
      var rxw = received(sent), rx = steps(rxw, W);
      var changed = rxw.some(function (v, i) { return v !== sent[i]; }), accepted = rx.comp === 0;
      if (st.step > total()) st.step = total();
      // header + chips
      modeSeg.set(W); viewSeg.set(st.view);
      wLab.textContent = W === 16 ? 'Words (hex)' : 'Words (0–15)';
      textRow.style.display = W === 16 ? 'flex' : 'none';
      if (document.activeElement !== wIn) wIn.value = words.map(fmtW).join(' ');
      var isRx = st.view === 'rx';
      var shownTx = Math.min(nTx(), st.step), shownRx = Math.max(0, st.step - nTx());
      if (!isRx && st.step > nTx()) shownTx = nTx();
      if (isRx && st.step <= nTx()) shownRx = rx.rows.length;   // looking ahead at the receiver shows everything
      stepLbl.textContent = 'step ' + Math.min(st.step, total()) + ' / ' + total();
      var list = isRx ? rxw : sent, ch = '<span style="font-weight:600;margin-right:4px">' + (isRx ? 'Arrived:' : 'Sent:') + '</span>';
      list.forEach(function (v, i) {
        var isCk = i === list.length - 1, bad = isRx && v !== sent[i];
        var show = isRx || isCk ? (isRx ? true : shownTx === nTx()) : true;
        ch += (isCk ? '<span style="font-weight:600;color:' + C.gray + '">|</span>' : '') + '<span class="w-chip" style="cursor:default;' +
          (bad ? 'background:' + C.red + ';border-color:' + C.red + ';color:#fff' : isCk ? 'border-color:' + C.orange + ';color:' + C.orange : 'color:' + C.blue) + '">' +
          (show ? fmtW(v) : '?') + (isCk ? ' <small style="font-size:20px">checksum</small>' : '') + '</span>';
      });
      if (isRx && st.swap) ch += '<span style="color:' + C.red + ';font-weight:600">words ' + (st.swap[0] + 1) + ' ⇄ ' + (st.swap[1] + 1) + ' swapped</span>';
      chips.innerHTML = ch;
      tabBox.innerHTML = isRx ? table(rx, rxw, sent, true, shownRx) : table(tx, sent, sent, false, shownTx);
      // formula with substituted values
      var M = mask(W), f = '<span style="color:' + C.navy + ';font-weight:600">Sender</span>\n';
      f += 'plain sum = ' + (W === 16 ? tx.plain.toString(16).toUpperCase() : tx.plain) + ' = ' + D.bin(tx.plain, W + 1).replace(/^0+(?=.)/, '') + '\n';
      var hi = tx.plain >> W, lo = tx.plain & M;
      f += hi ? 'wrap: ' + (W === 16 ? hx(lo) + ' + ' + hi.toString(16).toUpperCase() + ' = ' + hx(tx.plainWrapped) : D.bin(lo, 4) + ' + ' + hi.toString(2) + ' = ' + D.bin(tx.plainWrapped, 4) + ' = ' + tx.plainWrapped) + '\n' : 'no carries: sum = ' + hx(tx.plainWrapped) + '\n';
      f += 'checksum = ' + (W === 16 ? 'FFFF − ' + hx(tx.sum) : '15 − ' + tx.sum) + ' = <b>' + fmtW(ck) + '</b>\n';
      f += '<span style="color:' + C.navy + ';font-weight:600">Receiver</span>\n';
      f += 'sum (incl. checksum) = <span class="' + (rx.sum === M ? 'ok' : 'bad') + '">' + top(rx.sum) + '</span>\n';
      f += 'complement = <span class="' + (accepted ? 'ok' : 'bad') + '">' + top(rx.comp) + '</span> → ' + (accepted ? 'accept' : 'discard');
      if (st.step < nTx()) f = f.split('\n').map(function (l, k) { return k >= 1 && k <= 3 ? l.replace(/^([a-z ().]+?)(:| =).*$/, '$1$2 ?') : l; }).join('\n');
      if (st.step < total()) f = f.split('\n').map(function (l, k) { return k >= 5 ? l.replace(/^([a-z ().]+?)(:| =).*$/, '$1$2 ?') : l; }).join('\n');
      form.innerHTML = f;
      var msg, cls;
      if (!changed) { msg = 'No change in transit: sum ' + hx(rx.sum) + ' = all 1s, complement 0 → data accepted ✓'; cls = 'ok'; }
      else if (!accepted) { msg = 'DETECTED ✓ The sum is no longer all 1s (complement ' + hx(rx.comp) + ' ≠ 0): discard the data.'; cls = 'ok'; }
      else if (st.swap && !Object.keys(st.flips).length) {
        msg = 'NOT DETECTED ✗ Words ' + (st.swap[0] + 1) + ' and ' + (st.swap[1] + 1) + ' arrived swapped, but addition ignores order: ' +
          fmtW(sent[st.swap[0]]) + ' + ' + fmtW(sent[st.swap[1]]) + ' = ' + fmtW(sent[st.swap[1]]) + ' + ' + fmtW(sent[st.swap[0]]) + '. Same sum, wrong data accepted.'; cls = 'bad';
      } else { msg = 'NOT DETECTED ✗ The changes cancel out in the sum (still all 1s), so wrong data is accepted.'; cls = 'bad'; }
      slideNote.style.visibility = st.step < nTx() ? 'hidden' : 'visible';
      slideNote.textContent = 'Slide method: add all, then wrap once (' + (W === 16 ? tx.plain.toString(16).toUpperCase() + ' → ' + hx(tx.plainWrapped) : tx.plain + ' → ' + tx.plainWrapped) + '). Wrapping after every word, as in the table, gives the same sum.';
      if (st.step < total()) { msg = 'Keep pressing Next step: the verdict comes after the receiver’s complement (step ' + total() + ').'; cls = 'warn'; }
      verdict.className = 'w-verdict ' + cls; verdict.textContent = msg;
    }
    restart(true);
  });
  if (typeof module !== 'undefined') module.exports = { ocAdd: ocAdd, steps: steps, checksum: checksum, textWords: textWords, wrapAll: wrapAll };
})();
