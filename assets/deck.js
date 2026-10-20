/* Data Communication course: HTML slide viewer (works from a web server or straight from disk) */
(function () {
  'use strict';
  var C = window.COURSE, N = window.LECTURE;
  var me = C.filter(function (l) { return l.n === N; })[0];
  var slides = [].slice.call(document.querySelectorAll('#stage > section'));
  var stage = document.getElementById('stage'), view = document.getElementById('view');
  var cur = 0, total = slides.length;
  var $ = function (id) { return document.getElementById(id); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  /* tables: one padding value per table applies to its cells (Slides format rule) */
  [].forEach.call(document.querySelectorAll('#stage table'), function (t) {
    var p = t.style.padding;
    if (p) { [].forEach.call(t.querySelectorAll('td,th'), function (c) { if (!c.style.padding) c.style.padding = p; }); t.style.padding = '0'; }
  });

  /* ---------- top bar ---------- */
  var prevL = C.filter(function (l) { return l.n === N - 1; })[0], nextL = C.filter(function (l) { return l.n === N + 1; })[0];
  var sel = $('lecsel');
  C.forEach(function (l) {
    var o = document.createElement('option'); o.value = 'L' + pad(l.n) + '.html'; o.textContent = 'Lecture ' + l.n + ': ' + l.title;
    if (l.n === N) o.selected = true; sel.appendChild(o);
  });
  sel.addEventListener('change', function () { location.href = sel.value; });
  function setLink(id, l, label) {
    var a = $(id);
    if (l) { a.href = 'L' + pad(l.n) + '.html'; a.title = 'Lecture ' + l.n + ': ' + l.title; a.querySelector('span').textContent = label + ' ' + l.n; }
    else a.classList.add('dis');
  }
  setLink('prevlec', prevL, 'Lecture'); setLink('nextlec', nextL, 'Lecture');
  if (me.lab) { $('labbtn').href = '../labs/' + me.lab; } else { $('labbtn').style.display = 'none'; }

  /* ---------- scaling ---------- */
  function fit() {
    var w = view.clientWidth, h = view.clientHeight;
    var s = Math.min(w / 1920, h / 1080);
    stage.style.transform = 'scale(' + s + ')';
  }
  window.addEventListener('resize', fit);

  /* ---------- navigation ---------- */
  function vids(sec) { return [].slice.call(sec.querySelectorAll('video')); }
  function show(i, fromHash) {
    i = Math.max(0, Math.min(total - 1, i));
    if (slides[cur] && cur !== i) vids(slides[cur]).forEach(function (v) { v.pause(); });
    slides.forEach(function (s, k) { s.classList.toggle('off', k !== i); });
    cur = i;
    $('count').textContent = (i + 1) + ' / ' + total;
    if (!fromHash) history.replaceState(null, '', '#' + (i + 1));
    vids(slides[i]).forEach(function (v) {
      if (v.hasAttribute('data-autoplay')) { try { v.currentTime = 0; var p = v.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {} }
    });
    renderNotes();
    document.title = me.title + ' (' + (i + 1) + '/' + total + ') · Data Communication';
  }
  function next() { if (cur < total - 1) show(cur + 1); else endCard(); }
  function prev() { closeEnd(); show(cur - 1); }
  $('nexts').addEventListener('click', next);
  $('prevs').addEventListener('click', prev);

  function endCard() {
    if ($('endcard')) return;
    var d = document.createElement('div'); d.id = 'endcard';
    var h = '<div><h2>End of Lecture ' + N + '</h2><p>' + me.title + '</p><div class="row">';
    if (nextL) h += '<a class="go" href="L' + pad(nextL.n) + '.html">Lecture ' + nextL.n + ': ' + nextL.title + ' →</a>';
    if (me.lab) h += '<a href="../labs/' + me.lab + '">Open the lab</a>';
    h += '<a href="../index.html">Course home</a><button type="button" id="stay">Stay here</button></div></div>';
    d.innerHTML = h; document.body.appendChild(d);
    $('stay').addEventListener('click', closeEnd); $('stay').focus();
    d.addEventListener('click', function (e) { if (e.target === d) closeEnd(); });
  }
  function closeEnd() { var e = $('endcard'); if (e) e.remove(); }

  /* ---------- speaker notes (only if notes/LNN.js was kept) ---------- */
  var notesOn = false;
  if (!window.DECK_NOTES) $('notesbtn').style.display = 'none';
  function renderNotes() {
    var box = $('notes');
    if (!notesOn || !window.DECK_NOTES) { box.hidden = true; return; }
    var t = window.DECK_NOTES[slides[cur].id] || '(no notes for this slide)';
    box.hidden = false; box.innerHTML = '<b>Speaker notes · slide ' + (cur + 1) + '</b>'; box.appendChild(document.createTextNode(t));
  }
  $('notesbtn').addEventListener('click', function () { notesOn = !notesOn; renderNotes(); });

  /* ---------- fullscreen with auto-hiding bar ---------- */
  function toggleFs() {
    if (!document.fullscreenElement) { (document.documentElement.requestFullscreen || function () {}).call(document.documentElement); }
    else document.exitFullscreen();
  }
  $('fsbtn').addEventListener('click', toggleFs);
  document.addEventListener('fullscreenchange', function () {
    document.body.classList.toggle('fs', !!document.fullscreenElement); poke(); setTimeout(fit, 60);
  });
  var idleT;
  function poke() { document.body.classList.remove('idle'); clearTimeout(idleT); idleT = setTimeout(function () { document.body.classList.add('idle'); }, 2500); }
  document.addEventListener('mousemove', poke);

  /* ---------- help ---------- */
  $('helpbtn').addEventListener('click', function () { var h = $('help'); h.hidden = !h.hidden; });

  /* ---------- keyboard ---------- */
  var typed = '';
  document.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase(), k0 = e.key;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (k0 === 'Escape' && e.target !== document.body && e.target.blur) { e.target.blur(); }
    var isRange = tag === 'input' && e.target.type === 'range';
    var inWidget = e.target.closest && e.target.closest('[data-widget]');
    /* presenter clickers send PageDown/PageUp: those always change slides */
    if (k0 !== 'PageDown' && k0 !== 'PageUp') {
      if (isRange && /^(Arrow|Home|End)/.test(k0)) return;
      if (tag === 'select' || tag === 'textarea' || (tag === 'input' && !isRange)) return;
      if (inWidget && (k0 === ' ' || k0 === 'Enter')) return;
    }
    if (tag === 'video' && (e.key === ' ' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;
    var k = e.key;
    if (/^[0-9]$/.test(k)) { typed += k; return; }
    if (k === 'Enter' && typed) { show(parseInt(typed, 10) - 1); typed = ''; e.preventDefault(); return; }
    typed = '';
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'ArrowDown') { e.preventDefault(); if ($('endcard')) return; next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp' || k === 'Backspace') { e.preventDefault(); prev(); }
    else if (k === 'Home') show(0);
    else if (k === 'End') show(total - 1);
    else if (k === 'f' || k === 'F') toggleFs();
    else if ((k === 'n' || k === 'N') && window.DECK_NOTES) { notesOn = !notesOn; renderNotes(); }
    else if (k === 'Escape') { closeEnd(); $('help').hidden = true; }
    else if (k === '[' && prevL) location.href = 'L' + pad(prevL.n) + '.html';
    else if (k === ']' && nextL) location.href = 'L' + pad(nextL.n) + '.html';
    else if ((k === 'l' || k === 'L') && me.lab) location.href = '../labs/' + me.lab;
  });

  /* ---------- touch swipe ---------- */
  var sx = null, sy = null;
  view.addEventListener('touchstart', function (e) { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  view.addEventListener('touchend', function (e) {
    if (sx === null) return;
    var dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next() : prev(); }
    sx = null;
  });

  /* ---------- QR codes: when served from a web server, point them at this server's copy of the lab ---------- */
  if (/^https?:$/.test(location.protocol) && window.qrcode) {
    [].forEach.call(document.querySelectorAll('img[data-qr]'), function (img) {
      try {
        var url = new URL(img.getAttribute('data-qr'), location.href).href;
        var q = qrcode(0, 'M'); q.addData(url); q.make();
        img.src = q.createDataURL(10, 2);
        img.style.imageRendering = 'pixelated';
      } catch (e) {}
    });
  }

  /* ---------- start ---------- */
  window.addEventListener('hashchange', function () { var n = parseInt(location.hash.slice(1), 10); if (n) show(n - 1, true); });
  var start = parseInt(location.hash.slice(1), 10);
  fit(); show(start ? start - 1 : 0, false); poke();
})();
