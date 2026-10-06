/* Theme, resolved BEFORE the first paint. React's ThemeProvider can only run once the bundle has
 * loaded and committed, so without this the document paints with the default dark :root tokens and
 * swaps to the saved theme only afterwards — the dark flash a light-theme visitor sees on every
 * hard reload. A synchronous (NOT module, NOT deferred) script executes during HTML parsing, ahead
 * of any paint.
 *
 * It lives in its own file rather than inline so the app can be served under a Content-Security-
 * Policy of `script-src 'self'` with no inline-script exemption and no hash to keep in sync.
 *
 * It writes the SAME attribute (data-theme) and reads the SAME storage key as ThemeContext — one
 * theme system, not two. */
;(function () {
  var theme = 'dark' // brand default, matching ThemeContext.getInitial()
  try {
    var saved = localStorage.getItem('studlyf-theme')
    if (saved === 'light' || saved === 'dark') theme = saved
  } catch (e) {
    /* storage blocked (private mode) — fall through to the default */
  }
  var root = document.documentElement
  root.dataset.theme = theme
  root.style.colorScheme = theme
  // Publish the decision so ThemeContext adopts it as its initial state rather than re-deriving
  // it — React can then never disagree with what is already on screen.
  window.__STUDLYF_THEME__ = theme
  var meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = theme === 'light' ? '#f6f6f3' : '#08080a'
})()
