(function () {
  'use strict';

  const PROJECTS = [
    {
      id: 'route-tracker',
      title: 'Client-Side Route Tracker',
      tag: 'javascript',
      summary: 'A tiny hash-based router that maps URL fragments to view templates.',
      stack: 'Vanilla JS, hashchange',
      role: 'Solo',
      status: 'Complete',
      notes: 'The core of this SPA. Handles hash changes and matches dynamic segments like #/projects/:id against a route table — works even when the file is opened directly from disk.'
    },
    {
      id: 'state-log',
      title: 'In-Memory State Log',
      tag: 'ui',
      summary: 'A visible log panel that mirrors every state change as it happens, for debugging navigation.',
      stack: 'DOM APIs',
      role: 'Solo',
      status: 'Complete',
      notes: 'Every route change appends an entry with a timestamp, so state transitions stay inspectable instead of hidden inside variables.'
    },
    {
      id: 'editor-shell',
      title: 'Editor-Shell Interface',
      tag: 'css',
      summary: 'A code-editor-style shell — file tree, tab strip, and address bar — used as the SPA\u2019s navigation chrome.',
      stack: 'CSS Grid & Flexbox',
      role: 'Solo',
      status: 'In progress',
      notes: 'Chosen instead of a conventional navbar because the file-tree metaphor makes the idea of “separate views, one document” legible at a glance.'
    }
  ];

  const ROUTES = ['/', '/projects', '/projects/:id', '/about', '/contact'];

  
  const state = {
    path: '/',
    projectId: null,
    log: []
  };

 
  const els = {
    content: document.getElementById('content'),
    tree: document.getElementById('tree'),
    tabstrip: document.getElementById('tabstrip'),
    urlBar: document.getElementById('urlBar'),
    log: document.getElementById('log')
  };

  const templates = {
    home: document.getElementById('tpl-home'),
    projectsList: document.getElementById('tpl-projects-list'),
    projectDetail: document.getElementById('tpl-project-detail'),
    about: document.getElementById('tpl-about'),
    contact: document.getElementById('tpl-contact'),
    notFound: document.getElementById('tpl-404')
  };


  function pushLog(message) {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    state.log.unshift({ time, message });
    state.log = state.log.slice(0, 8);
    renderLog();
  }

  function renderLog() {
    els.log.innerHTML = state.log
      .map(entry => `<li><span class="log__time">${entry.time}</span> ${escapeHtml(entry.message)}</li>`)
      .join('');
  }

  
  function getPathFromHash() {
    const raw = location.hash.replace(/^#/, '');
    return raw === '' ? '/' : raw;
  }

  function matchRoute(path) {
    if (path === '/') return { name: 'home' };
    if (path === '/projects') return { name: 'projects' };
    if (path === '/about') return { name: 'about' };
    if (path === '/contact') return { name: 'contact' };

    const projectMatch = path.match(/^\/projects\/([\w-]+)$/);
    if (projectMatch) {
      const project = PROJECTS.find(p => p.id === projectMatch[1]);
      if (project) return { name: 'project-detail', project };
    }
    return { name: '404' };
  }

  function navigate(path) {
    if (path === state.path) return;
    // Setting location.hash automatically pushes a new session-history
    // entry and fires "hashchange" — no pushState() call needed.
    location.hash = path;
  }

  window.addEventListener('hashchange', () => {
    render(getPathFromHash(), { fromHistory: true });
  });

  
  function render(path, { fromHistory = false } = {}) {
    const match = matchRoute(path);
    state.path = path;
    state.projectId = match.project ? match.project.id : null;

    mountView(match);
    updateChrome(match, path);

    pushLog(
      (fromHistory ? 'hashchange → ' : 'navigate → ') +
      (match.name === '404' ? `${path} (unmatched)` : path)
    );

    els.content.focus({ preventScroll: true });
    els.content.scrollTop = 0;
  }

  function mountView(match) {
    els.content.innerHTML = '';

    switch (match.name) {
      case 'home':
        els.content.appendChild(templates.home.content.cloneNode(true));
        break;

      case 'projects': {
        const node = templates.projectsList.content.cloneNode(true);
        const list = node.getElementById('projectCards');
        PROJECTS.forEach(p => list.appendChild(renderCard(p)));
        els.content.appendChild(node);
        break;
      }

      case 'project-detail': {
        const node = templates.projectDetail.content.cloneNode(true);
        const p = match.project;
        node.getElementById('pd-title').textContent = p.title;
        node.getElementById('pd-summary').textContent = p.summary;
        node.getElementById('pd-notes').textContent = p.notes;
        node.getElementById('pd-meta').innerHTML = `
          <div><dt>stack</dt><dd>${escapeHtml(p.stack)}</dd></div>
          <div><dt>role</dt><dd>${escapeHtml(p.role)}</dd></div>
          <div><dt>status</dt><dd>${escapeHtml(p.status)}</dd></div>
          <div><dt>id</dt><dd>/projects/${escapeHtml(p.id)}</dd></div>
        `;
        els.content.appendChild(node);
        break;
      }

      case 'about':
        els.content.appendChild(templates.about.content.cloneNode(true));
        break;

      case 'contact': {
        const node = templates.contact.content.cloneNode(true);
        els.content.appendChild(node);
        const form = els.content.querySelector('#contactForm');
        const result = els.content.querySelector('#formResult');
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const data = new FormData(form);
          const name = data.get('name');
          result.textContent = `✓ logged locally — thanks, ${name}. (No server: this is a UI demo.)`;
          pushLog(`contact form submitted by "${name}"`);
          form.reset();
        });
        break;
      }

      default:
        els.content.appendChild(templates.notFound.content.cloneNode(true));
    }
  }

  function renderCard(project) {
    const li = document.createElement('li');
    li.innerHTML = `
      <button class="card" data-nav="/projects/${project.id}">
        <div class="card__top">
          <span class="card__title">${escapeHtml(project.title)}</span>
          <span class="card__tag">${escapeHtml(project.tag)}</span>
        </div>
        <p class="card__desc">${escapeHtml(project.summary)}</p>
      </button>
    `;
    return li;
  }

  function updateChrome(match, path) {
    // Address bar (display only — the real URL sits in location.hash)
    els.urlBar.textContent = 'zayn.dev/#' + path;

    // Sidebar active state
    const topRoute = '/' + path.split('/')[1];
    els.tree.querySelectorAll('.tree__item').forEach(a => {
      a.classList.toggle('is-active', a.dataset.route === (topRoute === '/' ? '/' : topRoute));
    });

    // Tab strip
    const activeLink = els.tree.querySelector('.tree__item.is-active');
    const label = match.name === 'project-detail'
      ? match.project.title + '.json'
      : (activeLink ? activeLink.dataset.title : 'Home.html');
    els.tabstrip.innerHTML = `<div class="tab is-active">${escapeHtml(label)}</div>`;
  }

 
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-nav], [data-route]');
    if (!el) return;
    e.preventDefault();
    const path = el.dataset.nav || el.dataset.route;
    navigate(path);
  });

 
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

 
  function init() {
    pushLog('app booted, routes registered: ' + ROUTES.join(', '));
    render(getPathFromHash(), { fromHistory: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
