/* ============================================================
   theme-init.js — JCT POS v2
   UBICACIÓN: raíz del proyecto (mismo nivel que index.html)
   Incluir como PRIMER script en el <head> de TODAS las páginas
   para evitar el parpadeo al cargar.
   ============================================================ */
(function () {
  const t = localStorage.getItem('jct_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
})();

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
