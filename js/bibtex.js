/**
 * bibtex.js — BibTeX parser + renderer
 * Loads publications.bib from assets/, falls back to localStorage cache.
 */

'use strict';

const HOMEPAGE_PUBLICATION_KEYS = [
  '11386_4944136',
  '11386_4940435'
];

/* ── parser ─────────────────────────────────────────────────── */

function parseBibtex(raw) {
  const entries = [];
  const entryRe = /@(\w+)\s*\{\s*([^,]+)\s*,\s*([\s\S]*?)(?=\n@|\n\s*$|$)/gi;
  let m;
  while ((m = entryRe.exec(raw)) !== null) {
    const type   = m[1].toLowerCase();
    const key    = m[2].trim();
    const fields = parseFields(m[3]);
    entries.push({ type, key, ...fields });
  }
  return entries;
}

function parseFields(body) {
  const out = {};
  const re = /(\w+)\s*=\s*(?:\{((?:[^{}]|\{[^{}]*\})*)\}|"([^"]*)"|([\w\d]+))/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    out[m[1].toLowerCase()] = cleanLatex((m[2] ?? m[3] ?? m[4] ?? '').trim());
  }
  return out;
}

function cleanLatex(s) {
  return s
    .replace(/\{\\['"^`~]?\{?([a-zA-Z])\}?\}/g, '$1')
    .replace(/\{([^}]+)\}/g, '$1')
    .replace(/\\&/g, '&')
    .replace(/---/g, '—').replace(/--/g, '–')
    .replace(/\s+/g, ' ').trim();
}

/* ── helpers ────────────────────────────────────────────────── */

function entryCategory(type) {
  const t = String(type || '').toLowerCase();
  const map = {
    misc:          ['preprint',    'Pre-print'],
    techreport:    ['preprint',    'Technical report'],
    article:       ['journal',     'Journal article'],
    inproceedings: ['conference',  'Conference paper'],
    incollection:  ['chapter',     'Book chapter'],
    inbook:        ['chapter',     'Book chapter'],
    book:          ['book',        'Book'],
    booklet:       ['book',        'Booklet'],
    proceedings:   ['book',        'Proceedings']
  };
  return map[t] || ['preprint', t || 'Publication'];
}

// Backwards-compatible alias used by older template code.
function entryTypeTag(type) {
  return entryCategory(type);
}


function venueLabel(e) {
  return e.journal || e.booktitle || e.publisher || e.institution || e.school || e.howpublished || '';
}

function yearRank(e) {

  const y = String(e.year || '').trim().toLowerCase();

  if (y === 'accepted')   return 10002;
  if (y === 'in press')   return 10001;

  const n = parseInt(y, 10);

  return Number.isFinite(n) ? n : 0;
}

/* ── renderer ───────────────────────────────────────────────── */


function publicationIcon(category) {
  const icons = {
    preprint: 'description',
    journal: 'menu_book',
    conference: 'event',
    chapter: 'library_books',
    book: 'auto_stories'
  };
  return icons[category] || 'article';
}

function renderEntry(e) {
  const [tagClass, tagLabel] = entryCategory(e.type);
  const year   = e.year || '';
  const doi    = e.doi    ? `<a class="pub-link" href="https://doi.org/${e.doi}" target="_blank" rel="noopener"><span class="material-symbols-outlined">open_in_new</span>DOI</a>` : '';
  const url    = e.url    ? `<a class="pub-link" href="${e.url}" target="_blank" rel="noopener"><span class="material-symbols-outlined">link</span>PDF / Link</a>` : '';
  const arxiv  = e.eprint ? `<a class="pub-link" href="https://arxiv.org/abs/${e.eprint}" target="_blank" rel="noopener"><span class="material-symbols-outlined">science</span>arXiv</a>` : '';
  const bib = `
  @${e.type}{${e.key},
  ${Object.entries(e)
  .filter(([k]) => !['type','key'].includes(k))
  .map(([k,v]) => `  ${k} = {${v}}`)
  .join(',\n')}
  }`.trim();

  const bibLink = `
  <a class="pub-link"
   href="#"
   onclick="downloadBibtex(event, '${e.key}')">
   <span class="material-symbols-outlined">download</span>BibTeX
  </a>`;

  return `
  <li class="pub-item fade-up" data-type="${tagClass}" data-year="${year}">
    <span class="pub-title">${e.title || 'Untitled'}</span>
    <p class="pub-authors">${e.author || ''}</p>
    <p class="pub-venue">
      <span class="material-symbols-outlined">${publicationIcon(tagClass)}</span>
      ${bibliographicDetails(e)}
    </p>
    <div class="pub-tags"><span class="tag ${tagClass}">${tagLabel}</span></div>
    <div class="pub-links">
      ${doi}
      ${url}
      ${arxiv}
      ${bibLink}
    </div> 
   </li>`;
}

/* ── render + populate filters ──────────────────────────────── */


function renderPublicationSections(entries) {
  const sections = [
    ['journal', 'Journals'],
    ['conference', 'Conferences'],
    ['chapter', 'Book chapters'],
    ['book', 'Books'],
    ['preprint', 'Pre-prints']
  ];

  return sections.map(([category, heading]) => {
    const items = entries.filter(e => entryCategory(e.type)[0] === category);

    if (!items.length) return '';

    return `
      <li class="pub-section-heading" data-type="${category}" data-year="">
        <h3>${heading}</h3>
      </li>
      ${items.map(renderEntry).join('')}
    `;
  }).join('');
}

function authorSortKey(author) {
  return (author || '')
    .toLowerCase()
    .replace(/[{}]/g, '')
    .trim();
}

function bibliographicDetails(e) {
  const venue = venueLabel(e);
  const volume = e.volume || '';
  const number = e.number || '';
  const pages = e.pages || '';
  const year = e.year || '';

  let volInfo = '';

  if (volume) {
    volInfo = volume;

    if (number) {
      volInfo += `(${number})`;
    }

    if (pages) {
      volInfo += `: ${pages}`;
    }
  } else if (pages) {
    volInfo = pages;
  }

  return [venue, volInfo, year]
    .filter(Boolean)
    .join(' &middot; ');
}

function renderPublications(raw) {
  const entries = parseBibtex(raw)
    .filter(e => !['string', 'preamble', 'comment'].includes(e.type))
    .sort((a, b) => {
      const yearDiff = yearRank(b) - yearRank(a);

      if (yearDiff !== 0) {
        return yearDiff;
      }

      return authorSortKey(a.author)
        .localeCompare(authorSortKey(b.author));
    });

  const container = document.getElementById('pub-list');
  const recentContainer = document.getElementById('recent-pub-list');

  if (!container && !recentContainer) return;

  if (entries.length === 0) {
    if (container) {
      container.innerHTML = '<li class="text-muted" style="padding:1rem 0">No entries found in publications.bib.</li>';
    }

    if (recentContainer) {
      recentContainer.innerHTML = '<li class="text-muted" style="padding:1rem 0">No recent publications found.</li>';
    }

    return;
  }

  if (container) {
    container.innerHTML = renderPublicationSections(entries);
  }

  if (recentContainer) {
    let homepageEntries = HOMEPAGE_PUBLICATION_KEYS
      .map(key => entries.find(e => e.key === key))
      .filter(Boolean);

    if (!homepageEntries.length) {
      homepageEntries = entries.slice(0, 2);
    }

    recentContainer.innerHTML = homepageEntries.map(renderEntry).join('');
  }

  const statsEl = document.getElementById('pub-stats');
  if (statsEl) statsEl.textContent = entries.length + ' documents';

  const years = [...new Set(entries.map(e => e.year).filter(Boolean))]
    .sort((a, b) => yearRank({ year: b }) - yearRank({ year: a }));

  const yearSel = document.getElementById('year-filter');

  if (yearSel) {
    yearSel.innerHTML = '<option value="">All years</option>';

    years.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y;
      opt.textContent = y;
      yearSel.appendChild(opt);
    });
  }

  if (container) {
    setupFilters();
  }
}

function setupFilters() {
  document.querySelectorAll('.filter-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters();
    });
  });
  const yearSel = document.getElementById('year-filter');
  if (yearSel) yearSel.addEventListener('change', applyFilters);
  const searchIn = document.getElementById('pub-search');
  if (searchIn) searchIn.addEventListener('input', applyFilters);
}

function applyFilters() {
  const activeType  = (document.querySelector('.filter-btn[data-filter].active') || {}).dataset?.filter || 'all';
  const activeYear  = (document.getElementById('year-filter') || {}).value || '';
  const q           = ((document.getElementById('pub-search') || {}).value || '').toLowerCase();

  document.querySelectorAll('#pub-list .pub-item').forEach(item => {
    const ok = (activeType === 'all' || item.dataset.type === activeType)
            && (!activeYear || item.dataset.year === activeYear)
            && (!q || item.textContent.toLowerCase().includes(q));
    item.style.display = ok ? '' : 'none';
  });

  document.querySelectorAll('#pub-list .pub-section-heading').forEach(heading => {
    const category = heading.dataset.type;
    const visibleItems = [...document.querySelectorAll(`#pub-list .pub-item[data-type="${category}"]`)]
      .some(item => item.style.display !== 'none');
    heading.style.display = visibleItems && (activeType === 'all' || activeType === category) ? '' : 'none';
  });
}


/* ── load BibTeX ────────────────────────────────────────────── */

/**
 * The original visual design is unchanged. The loading logic is now robust in
 * both deployment modes:
 *   1. Online / local server: fetch assets/publications.bib directly.
 *   2. Double-click local file:// use: read window.PUBLICATIONS_BIB from
 *      assets/publications.bib.js, because browsers usually block fetch()
 *      from local files.
 */

function bibPath() {
  const depth = location.pathname.includes('/pages/') ? '../' : '';
  return depth + 'assets/publications.bib';
}

function setBibStatus(msg, ok) {
  const el = document.getElementById('bib-status');
  if (!el) return;
  if (!msg) {
    el.style.display = 'none';
    return;
  }
  el.style.display = '';
  el.textContent = msg;
  el.style.color = ok ? 'var(--muted)' : 'var(--orange)';
}

async function loadBibFromAssets() {
  const embeddedBib = (typeof window !== 'undefined' && typeof window.PUBLICATIONS_BIB === 'string')
    ? window.PUBLICATIONS_BIB.trim()
    : '';

  if (embeddedBib) {
    renderPublications(embeddedBib);
    setBibStatus('', true);
    return;
  }

  try {
    const res = await fetch(bibPath(), { cache: 'no-cache' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const raw = await res.text();
    window.PUBLICATIONS_BIB = raw;
    renderPublications(raw);
    try { localStorage.setItem('bib_cache', raw); } catch(_) {}
    setBibStatus('', true);
  } catch (err) {
    try {
      const cached = localStorage.getItem('bib_cache');
      if (cached) {
        renderPublications(cached);
        setBibStatus('Showing cached publications. To make local file:// loading fully reliable, regenerate assets/publications.bib.js from assets/publications.bib.', false);
      } else {
        setBibStatus('Could not load publications.bib in this browser mode. Run python tools/bibtex_to_js.py once, then reopen the page.', false);
      }
    } catch(_) {
      setBibStatus('Could not load publications.bib. Run python tools/bibtex_to_js.py once, then reopen the page.', false);
    }
  }
}

/* ── init ───────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', loadBibFromAssets);

function downloadBibtex(event, key) {
  event.preventDefault();

  const raw = window.PUBLICATIONS_BIB || localStorage.getItem('bib_cache') || '';

  if (!raw) {
    console.warn('No BibTeX source available.');
    return;
  }

  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  const regex = new RegExp(
    '@\\w+\\s*\\{\\s*' + escapedKey + '\\s*,[\\s\\S]*?(?=\\n@\\w+\\s*\\{|\\s*$)',
    'i'
  );

  const match = raw.match(regex);

  if (!match) {
    console.warn('BibTeX entry not found for key:', key);
    return;
  }

  const blob = new Blob(
    [match[0].trim() + '\n'],
    { type: 'text/x-bibtex;charset=utf-8' }
  );

  const a = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);

  a.href = objectUrl;
  a.download = `${key}.bib`;
  a.style.display = 'none';

  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  URL.revokeObjectURL(objectUrl);
}
