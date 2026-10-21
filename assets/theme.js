/* Light / dark theme for the course home page and the labs.
   Default: follow the computer's setting. The button saves a choice that every page shares. */
(function () {
  var KEY = 'dc-theme', root = document.documentElement;
  try { var saved = localStorage.getItem(KEY); if (saved) root.setAttribute('data-theme', saved); } catch (e) {}
  function current() {
    return root.getAttribute('data-theme') || (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  function label() {
    var dark = current() === 'dark';
    [].forEach.call(document.querySelectorAll('[data-theme-toggle]'), function (b) {
      b.textContent = dark ? '☀ Light' : '☾ Dark';
      b.setAttribute('aria-pressed', String(dark));
      b.title = dark ? 'Switch to light theme' : 'Switch to dark theme';
    });
  }
  function apply(t) {
    root.setAttribute('data-theme', t); label();
    try { window.dispatchEvent(new Event('resize')); } catch (e) {}   // lets canvases redraw in the new colours
    if (window.DC_REDRAW) { try { window.DC_REDRAW(); } catch (e) {} }
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-theme-toggle]');
    if (!b) return;
    var next = current() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(KEY, next); } catch (err) {}
    apply(next);
  });
  window.addEventListener('storage', function (e) { if (e.key === KEY && e.newValue) apply(e.newValue); });
  if (window.matchMedia) { try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', label); } catch (e) {} }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', label); else label();
})();
