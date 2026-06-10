'use strict';

document.addEventListener('DOMContentLoaded', () => {

  /* ── active nav link ─────────────────────────── */
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href').split('/').pop();
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  /* ── hamburger ───────────────────────────────── */
  const ham = document.getElementById('hamburger');
  const links = document.querySelector('.nav-links');
  if (ham && links) {
    ham.addEventListener('click', () => {
      links.classList.toggle('open');
      ham.setAttribute('aria-expanded', links.classList.contains('open'));
    });
  }

  /* ── course accordion ────────────────────────── */
  document.querySelectorAll('.course-header').forEach(header => {
    header.addEventListener('click', () => {
      const body    = header.nextElementSibling;
      const chevron = header.querySelector('.chevron');
      const isOpen  = body.classList.contains('open');
      // close all
      document.querySelectorAll('.course-body').forEach(b => b.classList.remove('open'));
      document.querySelectorAll('.chevron').forEach(c => c.classList.remove('open'));
      // open clicked if was closed
      if (!isOpen) {
        body.classList.add('open');
        if (chevron) chevron.classList.add('open');
      }
    });
  });

  /* ── fade-up on scroll ───────────────────────── */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'none'; }
      });
    }, { threshold: 0.1 });
    document.querySelectorAll('.card, .pub-item, .news-item').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(12px)';
      el.style.transition = 'opacity .4s ease, transform .4s ease';
      io.observe(el);
    });
  }

});
