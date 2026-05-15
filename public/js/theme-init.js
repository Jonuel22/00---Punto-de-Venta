/* ============================================================
   theme-init.js — JCT POS v2
   Incluir como PRIMER script en el <head> de TODAS las páginas.
   ============================================================ */

// ── Aplicar tema antes de que el navegador pinte nada ──
(function () {
  const t = localStorage.getItem('jct_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
})();

// ── Re-aplicar tema al volver con history.back (bfcache) ──
window.addEventListener('pageshow', function () {
  const t = localStorage.getItem('jct_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
  if (typeof ThemeManager !== 'undefined') ThemeManager._icons(t);
});

const ThemeManager = {
  get()  { return localStorage.getItem('jct_theme') || 'dark'; },

  set(theme) {
    localStorage.setItem('jct_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    this._icons(theme);
    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  },

  toggle() {
    const next = this.get() === 'dark' ? 'light' : 'dark';
    this.set(next); return next;
  },

  _icons(theme) {
    document.querySelectorAll('.theme-toggle').forEach(btn => {
      const i = btn.querySelector('i');
      if (!i) return;
      i.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
      btn.title    = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    });
  },

  init() {
    if (window._themeInitDone) return;
    window._themeInitDone = true;
    this._icons(this.get());
    document.addEventListener('click', e => {
      if (e.target.closest('.theme-toggle')) ThemeManager.toggle();
    });
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ThemeManager.init());
} else {
  ThemeManager.init();
}