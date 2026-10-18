// ==UserScript==
// @name         Comix Tachimanga Skin
// @description  Makes comix.to look and work like Tachimanga on an iPhone: Library with unread badges, folder tabs, a bottom tab bar, a clean title page and reader.
// @version      1.0.0
// @match        https://comix.to/*
// @match        https://comix.ws/*
// @run-at       document-start
// @noframes
// @updateURL    https://raw.githubusercontent.com/kenjixx1/manga-ext/main/userscripts/comix-tachimanga.user.js
// @downloadURL  https://raw.githubusercontent.com/kenjixx1/manga-ext/main/userscripts/comix-tachimanga.user.js
// ==/UserScript==

// Only restyles and rearranges what comix.to already shows, and adds links between its own pages.
// It never replaces the site's built-in browser functions, and never adds content the site does not send.

(function () {
    'use strict';

    // Open the Library instead of the Home page when comix.to is opened at its front page.
    const HOME_OPENS_LIBRARY = true;

    const LIBRARY = '/user?tab=titles';
    const HISTORY = '/user?tab=history';
    const MORE = '/user?tab=settings';
    const POPULAR = '/browse?order%5Bscore%5D=desc';
    const LATEST = '/browse?order%5Bchapter_updated_at%5D=desc';
    const COUNTS_KEY = 'ckFolderCounts';

    if (HOME_OPENS_LIBRARY && location.pathname === '/' && !location.search) {
        location.replace(LIBRARY);
        return;
    }

    const CSS = `
:root:root {
  --bg: #1a1a1a !important; --bg-rgb: 26 26 26 !important;
  --bg-2: #1e1e1e !important; --bg-2-rgb: 30 30 30 !important;
  --surface: #262626 !important; --surface-rgb: 38 38 38 !important;
  --surface-2: #2e2e2e !important; --surface-2-rgb: 46 46 46 !important;
  --surface-3: #3a3a3a !important; --surface-3-rgb: 58 58 58 !important;
  --reader-bg: #000 !important;
  --text-emphasis: #ffffff !important; --text-emphasis-rgb: 255 255 255 !important;
  --text: #e6e6e6 !important; --text-rgb: 230 230 230 !important;
  --text-2: #9a9a9a !important; --text-2-rgb: 154 154 154 !important;
  --text-3: #6e6e6e !important; --text-3-rgb: 110 110 110 !important;
  --accent: #f0f0f0 !important; --accent-rgb: 240 240 240 !important;
  --accent-2: #d0d0d0 !important; --accent-2-rgb: 208 208 208 !important;
  --accent-ink: #111111 !important;
  --ck-bar: #1e1e1e; --ck-line: #2a2a2a; --ck-chip: #3a3a3a; --ck-badge: #f0f0f0;
  --ck-font: -apple-system, "SF Pro Text", system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif;
}
html.ck body { overflow-x: hidden !important; background: var(--bg) !important; font-family: var(--ck-font) !important; -webkit-tap-highlight-color: transparent; }
html.ck body, html.ck body *:not(svg):not(path) { font-family: var(--ck-font) !important; }
html.ck .mono, html.ck .mono * { letter-spacing: 0 !important; text-transform: none !important; }

/* ---------- our header and bottom bar (outside the site's own app) ---------- */
#ck-head, #ck-tabs { display: none; }
html.ck-tabbed #ck-tabs, html.ck-headed #ck-head { display: block; }
#ck-head { position: sticky; top: 0; z-index: 60; background: var(--bg); padding-top: env(safe-area-inset-top, 0px); }
#ck-head .ck-nav { height: 44px; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 0 14px; }
#ck-head .ck-title { font-size: 19px; color: #fff; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 62vw; }
#ck-head .ck-side { display: flex; gap: 18px; align-items: center; }
#ck-head .ck-side.r { justify-content: flex-end; }
#ck-head button, #ck-head a { all: unset; cursor: pointer; color: #fff; display: grid; place-items: center; width: 26px; height: 26px; }
#ck-head svg { width: 22px; height: 22px; }
#ck-head .ck-pills { display: none; gap: 8px; padding: 2px 14px 10px; }
html.ck-p-browse #ck-head .ck-pills { display: flex; }
#ck-head .ck-pills a { all: unset; cursor: pointer; border: 1px solid #3a3a3a; border-radius: 16px; padding: 5px 12px; color: #e6e6e6; font-size: 14px; }
#ck-head .ck-pills a.on { background: #2e2e2e; border-color: #2e2e2e; color: #fff; }
#ck-tabs { position: fixed; left: 0; right: 0; bottom: 0; z-index: 60; background: var(--ck-bar); border-top: 1px solid var(--ck-line); padding: 6px 0 calc(6px + env(safe-area-inset-bottom, 0px)); }
#ck-tabs nav { display: grid; grid-template-columns: repeat(4, 1fr); }
#ck-tabs a { all: unset; cursor: pointer; display: flex; flex-direction: column; align-items: center; gap: 2px; color: #8e8e8e; font-size: 11px; font-family: var(--ck-font); }
#ck-tabs a.on { color: #fff; }
#ck-tabs svg { width: 25px; height: 25px; }
html.ck-tabbed body { padding-bottom: calc(64px + env(safe-area-inset-bottom, 0px)) !important; }

/* the site's own top bar and footer give way to ours */
html.ck-headed header.topnav, html.ck-headed footer.footer, html.ck-tabbed footer.footer { display: none !important; }

/* tools (search, filters, sort, edit buttons) stay hidden until the header's filter button opens them */
html.ck .ck-tool { display: none !important; }
html.ck.ck-tools .ck-tool { display: revert !important; }

/* ---------- Library = Followed Titles ---------- */
html.ck-p-lib header.uprofile, html.ck-p-lib aside.umenu, html.ck-p-lib .uview__head,
html.ck-p-hist header.uprofile, html.ck-p-hist aside.umenu, html.ck-p-hist .uview__head { display: none !important; }
html.ck-p-lib main.user-main, html.ck-p-hist main.user-main { padding: 0 !important; }
html.ck-p-lib .user-wrap, html.ck-p-hist .user-wrap, html.ck-p-lib .user-shell, html.ck-p-hist .user-shell,
html.ck-p-lib .user-content, html.ck-p-hist .user-content, html.ck-p-lib .uview, html.ck-p-hist .uview { padding: 0 !important; margin: 0 !important; max-width: none !important; gap: 0 !important; background: transparent !important; border: 0 !important; }
html.ck-p-lib .uview__folders-row { position: sticky; top: calc(44px + env(safe-area-inset-top, 0px)); z-index: 50; background: var(--bg); border-bottom: 1px solid var(--ck-line); margin: 0 !important; padding: 0 !important; }
html.ck-p-lib .uview__folders .useg { background: transparent !important; padding: 0 8px !important; gap: 18px !important; border-radius: 0 !important; }
html.ck-p-lib .uview__folders .useg__btn { background: transparent !important; color: #d8d8d8 !important; border-radius: 0 !important; padding: 8px 0 9px !important; font-size: 15px !important; box-shadow: none !important; display: inline-flex !important; gap: 4px; align-items: center; }
html.ck-p-lib .uview__folders .useg__btn.is-on { color: #fff !important; box-shadow: inset 0 -2px 0 #fff !important; }
html.ck-p-lib .uview__folders .useg__btn[data-ck-count]::after { content: attr(data-ck-count); background: var(--ck-chip); color: #e6e6e6; border-radius: 8px; padding: 0 5px; font-size: 12px; line-height: 17px; }
html.ck-p-lib .uview__filter-block, html.ck-p-lib .uview__sort-tabs { padding: 8px 12px !important; margin: 0 !important; }
html.ck-p-lib ul.ulist { padding: 4px 0 !important; margin: 0 !important; gap: 0 !important; display: block !important; }
html.ck-p-lib li.ulrow { position: relative; display: grid !important; grid-template-columns: 44px 1fr; gap: 12px; align-items: center; padding: 7px 64px 7px 12px !important; margin: 0 !important; background: transparent !important; border: 0 !important; border-radius: 0 !important; min-height: 0 !important; }
html.ck-p-lib .ulrow__poster { width: 44px !important; height: 44px !important; border-radius: 7px; overflow: hidden; display: block; }
html.ck-p-lib .ulrow__poster .poster { width: 44px !important; height: 44px !important; padding: 0 !important; border-radius: 7px !important; }
html.ck-p-lib .ulrow__poster img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
html.ck-p-lib .ulrow__body { min-width: 0; display: flex !important; flex-direction: column; gap: 1px; padding: 0 !important; }
html.ck-p-lib .ulrow__title { color: #f2f2f2 !important; font-size: 15px !important; font-weight: 400 !important; line-height: 1.3 !important; display: -webkit-box !important; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; position: static !important; }
html.ck-p-lib .ulrow__meta { display: flex !important; gap: 0 !important; min-height: 0 !important; }
html.ck-p-lib .ulrow__meta > :not(.card__time) { display: none !important; }
html.ck-p-lib .ulrow__meta .card__time { color: #8e8e8e !important; font-size: 12px !important; }
html.ck-p-lib .ulrow__actions { grid-column: 1 / -1; }
html.ck-p-lib .ulrow__title[data-ck-unread]::after { content: attr(data-ck-unread); position: absolute; right: 12px; top: 50%; transform: translateY(-50%); background: var(--ck-badge); color: #111; border-radius: 7px; padding: 2px 7px; font-size: 14px; font-variant-numeric: tabular-nums; line-height: 1.35; }

/* ---------- Browse ---------- */
html.ck-p-browse .list-wrap { padding: 0 10px !important; }
html.ck-p-browse .filter-top { margin: 0 0 8px !important; }
html.ck-p-browse .list-toolbar { display: none !important; }
html.ck-p-browse .list-grid { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 12px 8px !important; }
html.ck-p-browse .lrow { display: flex !important; flex-direction: column !important; gap: 4px !important; padding: 0 !important; background: transparent !important; border: 0 !important; }
html.ck-p-browse .lrow__poster { width: 100% !important; max-width: 100% !important; }
html.ck-p-browse .lrow__poster .poster { width: 100% !important; height: auto !important; aspect-ratio: 200 / 280; border-radius: 6px !important; overflow: hidden; }
html.ck-p-browse .lrow__poster .poster img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
html.ck-p-browse .lrow__body { padding: 0 !important; min-width: 0; }
html.ck-p-browse .lrow__title { font-size: 12.5px !important; font-weight: 400 !important; color: #e6e6e6 !important; line-height: 1.25 !important; display: -webkit-box !important; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0 !important; }
html.ck-p-browse .lrow__meta, html.ck-p-browse .lrow__desc, html.ck-p-browse .lrow__foot, html.ck-p-browse .card__menu { display: none !important; }

/* ---------- History ---------- */
html.ck-p-hist .hgrid { display: block !important; padding: 4px 0 !important; }
html.ck-p-hist a.hitem { position: relative; display: grid !important; grid-template-columns: 44px 1fr; gap: 12px; align-items: center; padding: 7px 14px !important; margin: 0 !important; background: transparent !important; border: 0 !important; border-radius: 0 !important; min-height: 0 !important; }
html.ck-p-hist .hitem__poster { width: 44px !important; height: 44px !important; border-radius: 7px; overflow: hidden; padding: 0 !important; }
html.ck-p-hist .hitem__poster img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
html.ck-p-hist .hitem__body { min-width: 0; padding: 0 !important; }
html.ck-p-hist .hitem__title { color: #f2f2f2 !important; font-size: 15px !important; font-weight: 400 !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
html.ck-p-hist .hitem__meta { display: flex !important; gap: 8px; color: #8e8e8e !important; font-size: 12.5px !important; }
html.ck-p-hist a.hitem > svg { display: none !important; }
html.ck-p-hist .hitem__remove { position: absolute !important; right: 10px; top: 50%; transform: translateY(-50%); }

/* ---------- Title page ---------- */
html.ck-p-title main.layout { padding: 0 !important; }
html.ck-p-title .mpage__hero { background: transparent !important; padding: 4px 14px 8px !important; min-height: 0 !important; }
html.ck-p-title .mpage__hero::before, html.ck-p-title .mpage__hero::after { display: none !important; }
html.ck-p-title .mpage__hero-inner { display: flex !important; flex-wrap: wrap; gap: 12px 14px; align-items: flex-start; padding: 0 !important; }
html.ck-p-title .mpage__head-main { flex: 1 1 0 !important; width: auto !important; max-width: calc(100% - 118px) !important; min-width: 0; display: flex !important; flex-direction: column; gap: 2px; margin: 0 !important; }
html.ck-p-title .mpage__title-row { order: -3; }
html.ck-p-title .mpage__credits { order: -2; }
html.ck-p-title .mpage__details-shell { flex: 1 1 100%; }
html.ck-p-title .share-block { display: none !important; }
html.ck-p-title .mpage__poster { width: 104px !important; max-width: 104px !important; flex: 0 0 104px; }
html.ck-p-title .mpage__poster .poster { border-radius: 8px !important; }
html.ck-p-title .mpage__rate-stack, html.ck-p-title .mpage__crumbs, html.ck-p-title .mpage__alts, html.ck-p-title .mpage__cta-report { display: none !important; }
html.ck-p-title .mpage__title { font-size: 19px !important; line-height: 1.25 !important; margin: 0 0 4px !important; color: #fff !important; }
html.ck-p-title .mpage__credits, html.ck-p-title .mpage__byline { font-size: 12.5px !important; color: #9a9a9a !important; }
html.ck-p-title .mpage__badges { gap: 4px !important; margin: 6px 0 !important; }
html.ck-p-title .mpage__badge { font-size: 10.5px !important; padding: 1px 6px !important; background: #2e2e2e !important; color: #cfcfcf !important; }
html.ck-p-title .mpage__cta-aux { display: flex !important; flex-wrap: wrap; gap: 8px; min-width: 0; }
html.ck-p-title .mpage__cta { display: flex !important; max-width: 100%; min-width: 0; flex-wrap: wrap; gap: 8px !important; margin-top: 6px !important; }
html.ck-p-title .mpage__read { position: fixed !important; right: 16px; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); z-index: 55; border-radius: 22px !important; padding: 11px 20px !important; background: #fff !important; color: #111 !important; box-shadow: 0 8px 22px rgba(0,0,0,.55) !important; font-weight: 600 !important; }
html.ck-p-title .mpage__side, html.ck-p-title section.cm-widget, html.ck-p-title #mal-sync { display: none !important; }
html.ck-p-title .mpage__body { padding: 0 !important; }
html.ck-p-title .mpage__sec-head { padding: 10px 14px 4px !important; }
html.ck-p-title .mpage__sec-title { font-size: 16px !important; color: #fff !important; }
html.ck-p-title .mchap-toolbar { padding: 4px 14px !important; }
html.ck-p-title ul.mchap-list { padding: 0 !important; gap: 0 !important; }
html.ck-p-title li.mchap-item { background: transparent !important; border: 0 !important; border-bottom: 1px solid var(--ck-line) !important; border-radius: 0 !important; padding: 9px 14px !important; margin: 0 !important; }
html.ck-p-title .mchap-row__ch { font-size: 15px !important; color: #f2f2f2 !important; font-weight: 500 !important; }
html.ck-p-title .mchap-row__secondary { font-size: 12.5px !important; color: #8e8e8e !important; }
html.ck-p-title .mchap-foot { padding: 12px 14px 90px !important; }

/* ---------- Reader: clean page, tap to show controls ---------- */
html.ck-p-reader .rpage-progress, html.ck-p-reader .rpage-hoverzone { display: none !important; }
html.ck-p-reader .rpage-main, html.ck-p-reader .rpage-main__inner { padding: 0 !important; margin: 0 !important; max-width: none !important; }
html.ck-p-reader .rpage-page { margin: 0 !important; }
html.ck-p-reader .rpage-page__img { width: 100% !important; max-width: 100% !important; height: auto !important; display: block; }
html.ck-p-reader .rpage-floatctl { display: none !important; }
html.ck-p-reader.ck-ui .rpage-floatctl { display: flex !important; position: fixed !important; left: 12px !important; right: 12px !important; top: auto !important; bottom: calc(14px + env(safe-area-inset-bottom, 0px)) !important; width: auto !important; flex-direction: column; gap: 8px; z-index: 70; }
html.ck-p-reader.ck-ui .rpage-floatctl__row { justify-content: space-between; width: 100% !important; background: rgba(26,26,26,.95) !important; border-radius: 20px !important; padding: 4px 8px !important; }
html.ck-p-reader.ck-ui .rpage-floatctl__col { flex-direction: row !important; justify-content: space-around; width: 100% !important; height: auto !important; background: rgba(26,26,26,.95) !important; border-radius: 16px !important; padding: 4px !important; }
#ck-rtop { display: none; }
html.ck-p-reader.ck-ui #ck-rtop { display: grid; position: fixed; left: 0; right: 0; top: 0; z-index: 70; background: rgba(26,26,26,.95); padding: calc(10px + env(safe-area-inset-top, 0px)) 14px 10px; grid-template-columns: 26px 1fr; gap: 12px; align-items: center; font-family: var(--ck-font); }
#ck-rtop a { all: unset; cursor: pointer; color: #fff; display: grid; place-items: center; }
#ck-rtop a svg { width: 22px; height: 22px; }
#ck-rtop b { display: block; color: #fff; font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#ck-rtop small { color: #9a9a9a; font-size: 12.5px; }
`;

    const ICON = {
        back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
        search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
        filter: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 6h16M7 12h10M10 18h4"/></svg>',
        library: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 3h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm6 2v6l2-1.3L17 11V5h-4z"/><path d="M3 7v12a2 2 0 0 0 2 2h12v-2H5V7H3z"/></svg>',
        browse: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z" fill="currentColor" stroke-linejoin="round"/></svg>',
        history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
        more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>',
    };

    const root = document.documentElement;
    const style = document.createElement('style');
    style.id = 'ck-style';
    style.textContent = CSS;
    root.classList.add('ck');
    (document.head || root).appendChild(style);

    const PAGE_CLASSES = ['ck-p-lib', 'ck-p-hist', 'ck-p-browse', 'ck-p-title', 'ck-p-reader', 'ck-p-other', 'ck-tabbed', 'ck-headed'];

    function pageKind() {
        const p = location.pathname;
        const tab = new URLSearchParams(location.search).get('tab');
        if (p === '/user' && tab === 'titles') return 'lib';
        if (p === '/user' && tab === 'history') return 'hist';
        if (p === '/browse') return 'browse';
        if (/^\/title\/[^/]+\/[^/]+/.test(p)) return 'reader';
        if (/^\/title\/[^/]+\/?$/.test(p)) return 'title';
        return 'other';
    }

    // Only write when the text changes, so our own writes don't wake the page watcher again
    function setText(node, text) {
        if (node && node.textContent !== text) node.textContent = text;
    }

    function el(html) {
        const box = document.createElement('div');
        box.innerHTML = html.trim();
        return box.firstElementChild;
    }

    function buildChrome() {
        if (document.getElementById('ck-head')) return;
        document.body.prepend(el(`
<div id="ck-head">
  <div class="ck-nav">
    <div class="ck-side l"><a id="ck-back" aria-label="Back">${ICON.back}</a></div>
    <div class="ck-title" id="ck-title"></div>
    <div class="ck-side r"><button id="ck-search" aria-label="Search">${ICON.search}</button><button id="ck-filter" aria-label="Filters and sort">${ICON.filter}</button></div>
  </div>
  <div class="ck-pills"><a href="${POPULAR}" data-k="score">♡ Popular</a><a href="${LATEST}" data-k="chapter_updated_at">✓ Latest</a><a id="ck-pill-filter">≡ Filter</a></div>
</div>`));
        document.body.appendChild(el(`
<div id="ck-tabs"><nav>
  <a href="${LIBRARY}" data-k="lib">${ICON.library}<span>Library</span></a>
  <a href="${LATEST}" data-k="browse">${ICON.browse}<span>Browse</span></a>
  <a href="${HISTORY}" data-k="hist">${ICON.history}<span>History</span></a>
  <a href="${MORE}" data-k="more">${ICON.more}<span>More</span></a>
</nav></div>`));
        document.body.appendChild(el(`<div id="ck-rtop"><a id="ck-rback" aria-label="Back to title">${ICON.back}</a><div><b id="ck-rtitle"></b><small id="ck-rch"></small></div></div>`));

        document.getElementById('ck-back').addEventListener('click', () => history.length > 1 ? history.back() : location.assign(LIBRARY));
        const toggleTools = () => root.classList.toggle('ck-tools');
        document.getElementById('ck-filter').addEventListener('click', toggleTools);
        document.getElementById('ck-pill-filter').addEventListener('click', toggleTools);
        document.getElementById('ck-search').addEventListener('click', () => {
            root.classList.add('ck-tools');
            const input = document.querySelector('.filter-search input, .mchap-search input');
            if (input) setTimeout(() => input.focus(), 50);
            else location.assign('/browse');
        });
    }

    const TITLES = { lib: 'Library', hist: 'History', browse: 'Browse', title: '', other: '' };

    function applyPage() {
        const kind = pageKind();
        const want = ['ck-p-' + kind];
        if (['lib', 'hist', 'browse', 'title'].includes(kind)) want.push('ck-headed');
        if (['lib', 'hist', 'browse', 'other'].includes(kind)) want.push('ck-tabbed');
        for (const c of PAGE_CLASSES) root.classList.toggle(c, want.includes(c));
        if (kind !== 'reader') root.classList.remove('ck-ui');

        const title = document.getElementById('ck-title');
        setText(title, TITLES[kind]);
        const back = document.getElementById('ck-back');
        if (back) back.style.visibility = kind === 'title' ? 'visible' : 'hidden';
        const order = location.search.includes('score') ? 'score' : 'chapter_updated_at';
        document.querySelectorAll('#ck-head .ck-pills a[data-k]').forEach(a => a.classList.toggle('on', kind === 'browse' && a.dataset.k === order));
        document.querySelectorAll('#ck-tabs a').forEach(a => a.classList.toggle('on', a.dataset.k === kind));

        if (kind === 'lib') decorateLibrary();
        if (kind === 'browse') markTools(['.filter-top', '.filter-top + div']);
        if (kind === 'hist') markTools(['.hitem__remove']);
        if (kind === 'title') markTools(['.mchap-toolbar']);
        if (kind === 'reader') decorateReader();
    }

    function markTools(selectors) {
        for (const s of selectors) document.querySelectorAll(s).forEach(n => n.classList.add('ck-tool'));
    }

    // Unread = latest chapter minus the last chapter read, from the site's own "read / latest" text
    function unreadFrom(text) {
        const m = /^\s*([\d.]+|—|-)?\s*\/\s*([\d.]+)/.exec(text || '');
        if (!m) return null;
        const latest = parseFloat(m[2]);
        const read = m[1] && /\d/.test(m[1]) ? parseFloat(m[1]) : 0;
        const left = Math.max(0, Math.round(latest - read));
        return left > 0 ? String(left) : null;
    }

    function readCounts() {
        try { return JSON.parse(localStorage.getItem(COUNTS_KEY) || '{}'); } catch (e) { return {}; }
    }

    function decorateLibrary() {
        markTools(['.uview__filter-block', '.uview__sort-tabs', '.ulrow__actions']);
        const rows = [...document.querySelectorAll('li.ulrow')];
        for (const row of rows) {
            const title = row.querySelector('.ulrow__title');
            const ch = row.querySelector('.ulrow__progress .card__ch');
            if (!title) continue;
            const unread = unreadFrom(ch && ch.textContent);
            if (unread) title.setAttribute('data-ck-unread', unread);
            else title.removeAttribute('data-ck-unread');
        }
        const buttons = [...document.querySelectorAll('.uview__folders .useg__btn')];
        if (!buttons.length) return;
        const active = buttons.find(b => b.classList.contains('is-on'));
        const counts = readCounts();
        if (active && active.textContent.trim() === 'All' && rows.length && document.querySelector('.ulrow__folder')) {
            const fresh = { All: rows.length };
            for (const row of rows) {
                const f = row.querySelector('.ulrow__folder');
                const name = f && f.textContent.trim();
                if (name) fresh[name] = (fresh[name] || 0) + 1;
            }
            for (const b of buttons) {
                const name = b.textContent.trim();
                if (!(name in fresh)) fresh[name] = 0;
            }
            Object.assign(counts, fresh);
            try { localStorage.setItem(COUNTS_KEY, JSON.stringify(counts)); } catch (e) {}
        }
        for (const b of buttons) {
            const n = counts[b.textContent.trim()];
            if (n) b.setAttribute('data-ck-count', n);
            else b.removeAttribute('data-ck-count');
        }
    }

    function decorateReader() {
        const manga = document.querySelector('.rpage-floatctl a[aria-label="Manga page"]');
        const back = document.getElementById('ck-rback');
        if (back && manga) back.setAttribute('href', manga.getAttribute('href'));
        const parts = document.title.split(' · ');
        const t = document.getElementById('ck-rtitle');
        const c = document.getElementById('ck-rch');
        setText(t, parts[0] || '');
        setText(c, parts[1] || '');
    }

    // Reader: a tap on the page (not on a control) shows or hides the bars
    document.addEventListener('click', (event) => {
        if (pageKind() !== 'reader') return;
        if (event.target.closest('a, button, input, select, textarea, label, [role="button"], #ck-rtop')) return;
        if (!event.target.closest('.rpage-main')) return;
        root.classList.toggle('ck-ui');
    }, true);

    let lastUrl = '';
    let queued = false;
    function refresh() {
        queued = false;
        if (!document.body) return;
        buildChrome();
        if (location.href !== lastUrl) {
            lastUrl = location.href;
            root.classList.remove('ck-tools');
        }
        applyPage();
    }
    function queue() {
        if (queued) return;
        queued = true;
        requestAnimationFrame(refresh);
    }

    function start() {
        refresh();
        // The site is a single-page app: re-apply when its content or address changes
        new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
        setInterval(() => { if (location.href !== lastUrl) queue(); }, 400);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else start();
})();
