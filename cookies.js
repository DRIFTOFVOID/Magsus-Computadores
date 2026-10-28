// Gerenciador simples do aviso de cookies. Executa apenas no navegador.
(() => {
  function iniciarCookies() {
    const aviso = document.getElementById('banner-cookies') || document.getElementById('cookie-banner');
    const botao = document.getElementById('btn-aceitar-cookies') || document.getElementById('accept-cookies');
    if (!aviso || !botao) {
      console.warn('[Cookies] Não encontrei o aviso ou o botão. Confira os IDs no HTML.');
      return;
    }

    const chave = 'pegasus_cookie_consent';
    const ocultar = () => {
      aviso.classList.add('oculto');
      aviso.hidden = true;
      aviso.setAttribute('aria-hidden', 'true');
    };

    try {
      if (localStorage.getItem(chave) === 'accepted') ocultar();
    } catch (erro) {
      console.warn('[Cookies] Não foi possível consultar a preferência salva:', erro);
    }

    botao.addEventListener('click', (evento) => {
      evento.preventDefault();
      try {
        localStorage.setItem(chave, 'accepted');
      } catch (erro) {
        console.warn('[Cookies] Não foi possível salvar a preferência:', erro);
      }
      ocultar();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciarCookies, { once: true });
  } else {
    iniciarCookies();
  }
})();
