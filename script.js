/* Interações do site Pegasus. Não altera nem substitui o JavaScript da ASU. */
(() => {
  'use strict';

  const ready = (fn) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn, { once: true });
    else fn();
  };

  ready(() => {
    // Menu responsivo
    const menuButton = document.getElementById('menu-toggle');
    const menu = document.getElementById('menu');
    if (menuButton && menu) {
      menuButton.addEventListener('click', () => {
        const open = menu.classList.toggle('active');
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      });
      menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
        menu.classList.remove('active');
        menuButton.setAttribute('aria-expanded', 'false');
      }));
    }

    // Flip cards: clique/toque e teclado; não interfere nos links do verso.
    document.querySelectorAll('.flip-card').forEach(card => {
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', 'Virar cartão de serviço');
      const flip = () => {
        const flipped = card.classList.toggle('is-flipped');
        card.classList.toggle('flipped', flipped);
        card.setAttribute('aria-pressed', String(flipped));
      };
      card.addEventListener('click', event => {
        if (event.target.closest('a, button')) return;
        flip();
      });
      card.addEventListener('keydown', event => {
        if (event.target !== card) return;
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); flip(); }
      });
    });

    // Filtros da galeria
    const filters = [...document.querySelectorAll('.gallery-filter')];
    const galleryCards = [...document.querySelectorAll('.gallery-card')];
    filters.forEach(button => button.addEventListener('click', () => {
      const category = button.dataset.filter || 'all';
      filters.forEach(item => {
        const active = item === button;
        item.classList.toggle('active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      galleryCards.forEach(card => {
        const show = category === 'all' || card.dataset.category === category;
        card.hidden = !show;
        card.style.display = show ? '' : 'none';
      });
    }));

    // Formulário: valida campos e prepara um e-mail; não finge enviar para um servidor.
    const form = document.getElementById('contact-form');
    const message = document.getElementById('form-message');
    const date = document.getElementById('data_agendamento');
    if (date) date.min = new Date().toISOString().slice(0, 10);
    if (form) form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const fields = [
        ['Nome', data.get('nome')], ['Telefone', data.get('telefone')],
        ['Serviço', data.get('servico')], ['Data desejada', data.get('data') || 'Não informada'],
        ['Mensagem', data.get('mensagem')]
      ];
      const body = fields.map(([label, value]) => `${label}: ${value}`).join('\n');
      if (message) message.textContent = 'Seu aplicativo de e-mail será aberto para você revisar e enviar a solicitação.';
      const mailto = `mailto:contato@pegasuscomputadores.com?subject=${encodeURIComponent('Solicitação de orçamento - Pegasus')}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;
    });

    // Rolagem suave para links internos
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', event => {
        const id = link.getAttribute('href');
        if (!id || id === '#') return;
        const target = document.querySelector(id);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (history.replaceState) history.replaceState(null, '', id);
      });
    });

    // Animação de entrada progressiva, se suportada; conteúdo continua visível sem IntersectionObserver.
    const revealItems = document.querySelectorAll('.section-heading, .service-card, .gallery-card, .cta-box, .contact-info, .contact-form');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      }), { threshold: 0.12 });
      revealItems.forEach(el => observer.observe(el));
    } else {
      revealItems.forEach(el => el.classList.add('is-visible'));
    }

    // Slider principal: setas, indicadores, rotação automática e pausa ao interagir.
    const slider = document.querySelector('.hero-slider');
    if (slider) {
      const slides = [...slider.querySelectorAll('.hero-slide')];
      const dots = [...document.querySelectorAll('.slider-dot')];
      const prev = document.querySelector('.slider-prev');
      const next = document.querySelector('.slider-next');
      let current = Math.max(0, slides.findIndex(slide => slide.classList.contains('active')));
      let timer = null;
      const showSlide = (index) => {
        if (!slides.length) return;
        current = (index + slides.length) % slides.length;
        slides.forEach((slide, i) => {
          const active = i === current;
          slide.classList.toggle('active', active);
          slide.setAttribute('aria-hidden', String(!active));
          if (!active) slide.querySelectorAll('a, button').forEach(el => el.setAttribute('tabindex', '-1'));
          else slide.querySelectorAll('a, button').forEach(el => el.removeAttribute('tabindex'));
        });
        dots.forEach((dot, i) => {
          dot.classList.toggle('active', i === current);
          dot.setAttribute('aria-current', i === current ? 'true' : 'false');
        });
      };
      const stopTimer = () => { if (timer) clearInterval(timer); timer = null; };
      const startTimer = () => {
        stopTimer();
        if (slides.length > 1 && !document.hidden) timer = setInterval(() => showSlide(current + 1), 6000);
      };
      if (slides.length) {
        showSlide(current);
        prev?.addEventListener('click', () => { showSlide(current - 1); startTimer(); });
        next?.addEventListener('click', () => { showSlide(current + 1); startTimer(); });
        dots.forEach((dot, i) => dot.addEventListener('click', () => { showSlide(i); startTimer(); }));
        slider.addEventListener('mouseenter', stopTimer);
        slider.addEventListener('mouseleave', startTimer);
        slider.addEventListener('focusin', stopTimer);
        slider.addEventListener('focusout', startTimer);
        document.addEventListener('visibilitychange', () => document.hidden ? stopTimer() : startTimer());
        startTimer();
      }
    }

    // Lightbox acessível para a galeria: navegação, legenda, contador e Escape.
    const lightboxCards = [...document.querySelectorAll('.gallery-card')];
    if (lightboxCards.length) {
      const lightbox = document.createElement('div');
      lightbox.className = 'lightbox';
      lightbox.id = 'gallery-lightbox';
      lightbox.setAttribute('role', 'dialog');
      lightbox.setAttribute('aria-modal', 'true');
      lightbox.setAttribute('aria-label', 'Visualizador da galeria');
      lightbox.innerHTML = `
        <button class="lightbox-close" type="button" aria-label="Fechar imagem">×</button>
        <button class="lightbox-prev" type="button" aria-label="Imagem anterior">‹</button>
        <div class="lightbox-content" role="document">
          <img alt="" src="">
          <div class="lightbox-caption"></div>
          <div class="lightbox-counter" aria-live="polite"></div>
        </div>
        <button class="lightbox-next" type="button" aria-label="Próxima imagem">›</button>`;
      document.body.appendChild(lightbox);
      const lbImage = lightbox.querySelector('img');
      const lbCaption = lightbox.querySelector('.lightbox-caption');
      const lbCounter = lightbox.querySelector('.lightbox-counter');
      const lbClose = lightbox.querySelector('.lightbox-close');
      let activeIndex = 0;
      let previousFocus = null;
      const visibleCards = () => lightboxCards.filter(card => !card.hidden && getComputedStyle(card).display !== 'none');
      const showImage = (index) => {
        const visible = visibleCards();
        if (!visible.length) return;
        const card = visible[(index + visible.length) % visible.length];
        activeIndex = lightboxCards.indexOf(card);
        const image = card.querySelector('img');
        if (!image) return;
        lbImage.src = image.currentSrc || image.src;
        lbImage.alt = image.alt || '';
        const title = card.querySelector('figcaption h3')?.textContent?.trim() || image.alt || 'Imagem da galeria';
        const category = card.querySelector('figcaption span')?.textContent?.trim() || '';
        lbCaption.textContent = category ? `${title} — ${category}` : title;
        lbCounter.textContent = `${visible.indexOf(card) + 1} / ${visible.length}`;
      };
      const openLightbox = (card) => {
        if (!card.querySelector('img')) return;
        previousFocus = document.activeElement;
        showImage(lightboxCards.indexOf(card));
        lightbox.classList.add('active');
        document.body.classList.add('lightbox-open');
        lbClose.focus();
      };
      const closeLightbox = () => {
        lightbox.classList.remove('active');
        document.body.classList.remove('lightbox-open');
        lbImage.removeAttribute('src');
        if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();
      };
      const moveImage = (direction) => {
        const visible = visibleCards();
        if (!visible.length) return;
        const currentCard = lightboxCards[activeIndex];
        const pos = visible.indexOf(currentCard);
        showImage((pos < 0 ? 0 : pos) + direction);
      };
      lightboxCards.forEach(card => {
        card.setAttribute('tabindex', '0');
        card.setAttribute('role', 'button');
        card.setAttribute('aria-label', `Ampliar: ${card.querySelector('figcaption h3')?.textContent?.trim() || card.querySelector('img')?.alt || 'imagem'}`);
        card.addEventListener('click', event => {
          if (event.target.closest('a, button')) return;
          openLightbox(card);
        });
        card.addEventListener('keydown', event => {
          if ((event.key === 'Enter' || event.key === ' ') && event.target === card) {
            event.preventDefault(); openLightbox(card);
          }
        });
      });
      lbClose.addEventListener('click', closeLightbox);
      lightbox.querySelector('.lightbox-prev').addEventListener('click', () => moveImage(-1));
      lightbox.querySelector('.lightbox-next').addEventListener('click', () => moveImage(1));
      lightbox.addEventListener('click', event => { if (event.target === lightbox) closeLightbox(); });
      document.addEventListener('keydown', event => {
        if (!lightbox.classList.contains('active')) return;
        if (event.key === 'Escape') closeLightbox();
        else if (event.key === 'ArrowLeft') moveImage(-1);
        else if (event.key === 'ArrowRight') moveImage(1);
        else if (event.key === 'Tab') {
          const controls = [...lightbox.querySelectorAll('button')];
          if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1].focus(); }
          else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus(); }
        }
      });
    }

    console.info('[Pegasus] Interações do site inicializadas. ASU permanece independente.');
  });
})();
