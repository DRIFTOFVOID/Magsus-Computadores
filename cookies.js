(() => {
  'use strict';
  const init = () => {
    const banner = document.getElementById('banner-cookies');
    const button = document.getElementById('btn-aceitar-cookies');
    if (!banner || !button) return;
    const key = 'pegasus_cookie_consent';
    try { if (localStorage.getItem(key) === 'accepted') { banner.classList.add('oculto'); banner.setAttribute('aria-hidden','true'); } } catch {}
    button.addEventListener('click', () => {
      try { localStorage.setItem(key, 'accepted'); } catch (error) { console.warn('[Cookies] armazenamento indisponível', error); }
      banner.classList.add('oculto'); banner.setAttribute('aria-hidden','true');
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
