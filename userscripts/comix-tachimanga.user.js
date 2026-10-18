// ==UserScript==
// @name         Comix Tachimanga Skin
// @description  Makes comix.to look and work like Tachimanga on an iPhone: a page switcher in the title, Library with chapters left and resume buttons, folder tabs, Browse ratings, History by day, a clean title page and reader.
// @version      1.1.0
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

    if (window.top !== window.self || !document.documentElement) return;

    const LIBRARY = '/user?tab=titles';
    const HISTORY = '/user?tab=history';
    const MORE = '/user?tab=settings#ck-more';
    const POPULAR = '/browse?order%5Bscore%5D=desc';
    const LATEST = '/browse?order%5Bchapter_updated_at%5D=desc';
    const COUNTS_KEY = 'ckFolderCounts2';
    const RESUME_KEY = 'ckResume';
    const HOME_KEY = 'ckHomeLibrary';

    function readStore(key) {
        try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; }
    }
    function writeStore(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
    function homeOpensLibrary() {
        try { return localStorage.getItem(HOME_KEY) !== '0'; } catch (e) { return true; }
    }

    if (homeOpensLibrary() && location.pathname === '/' && !location.search) {
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
  --ck-line: #2a2a2a; --ck-chip: #2e2e2e; --ck-sub: #8e8e8e; --ck-strong: #f2f2f2; --ck-on: #f0f0f0;
  --ck-glass: rgba(44,44,46,.9); --ck-glass-line: rgba(255,255,255,.09);
  --ck-font: -apple-system, "SF Pro Text", system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif;
}
html.ck body { overflow-x: hidden !important; background: var(--bg) !important; font-family: var(--ck-font) !important; -webkit-tap-highlight-color: transparent; }
html.ck body, html.ck body *:not(svg):not(path) { font-family: var(--ck-font) !important; }
html.ck .mono, html.ck .mono * { letter-spacing: 0 !important; text-transform: none !important; }

/* ---------- our header (outside the site's own app) ---------- */
#ck-head, #ck-dim, #ck-more { display: none; }
html.ck-headed #ck-head { display: block; }
#ck-head { position: relative; z-index: 60; background: var(--bg); padding-top: env(safe-area-inset-top, 0px); }
html.ck-p-title #ck-head { position: sticky; top: 0; }
#ck-head .ck-nav, #ck-head .ck-big { display: none; }
html.ck-p-title #ck-head .ck-nav { display: grid; }
html.ck-headed:not(.ck-p-title) #ck-head .ck-big { display: grid; }
#ck-head .ck-nav { height: 44px; grid-template-columns: 44px 1fr auto; align-items: center; padding: 0 6px; }
#ck-head .ck-big { grid-template-columns: minmax(0, 1fr) auto; align-items: start; padding: 4px 6px 8px 16px; }
#ck-head .ck-acts { display: flex; margin-top: -2px; }
#ck-head .ck-nav button, #ck-head .ck-nav a, #ck-head .ck-acts button { all: unset; cursor: pointer; color: #fff; display: grid; place-items: center; width: 44px; height: 44px; }
#ck-head .ck-nav svg, #ck-head .ck-acts svg { width: 21px; height: 21px; }
#ck-head [data-for] { display: none !important; }
html.ck-p-lib #ck-head [data-for~="lib"], html.ck-p-browse #ck-head [data-for~="browse"], html.ck-p-hist #ck-head [data-for~="hist"], html.ck-p-title #ck-head [data-for~="title"] { display: grid !important; }
#ck-switch { all: unset; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; font-size: 30px; line-height: 36px; font-weight: 700; color: #fff; }
#ck-switch svg { width: 16px; height: 16px; color: var(--ck-sub); transition: transform .15s; }
html.ck-menu #ck-switch svg { transform: rotate(180deg); }
#ck-sub { font-size: 13px; color: var(--ck-sub); margin-top: 1px; min-height: 18px; }
#ck-menu { display: none; position: absolute; left: 12px; top: calc(env(safe-area-inset-top, 0px) + 48px); width: 240px; border-radius: 16px; overflow: hidden; background: var(--ck-glass); -webkit-backdrop-filter: blur(24px) saturate(1.6); backdrop-filter: blur(24px) saturate(1.6); border: 1px solid var(--ck-glass-line); box-shadow: 0 10px 30px rgba(0,0,0,.5); z-index: 62; }
html.ck-menu #ck-menu { display: block; }
html.ck-menu #ck-dim { display: block; position: fixed; inset: 0; z-index: 59; background: rgba(0,0,0,.5); }
#ck-menu a { all: unset; cursor: pointer; display: grid; grid-template-columns: 28px 1fr 20px; gap: 10px; align-items: center; min-height: 48px; padding: 0 16px; color: var(--ck-strong); font-size: 16px; border-top: 1px solid rgba(255,255,255,.07); }
#ck-menu a:first-child { border-top: 0; }
#ck-menu a svg { width: 24px; height: 24px; }
#ck-menu a .ck-check { visibility: hidden; color: #fff; }
#ck-menu a.on .ck-check { visibility: visible; }
#ck-menu .ck-fill { display: none; }
#ck-menu a.on .ck-fill { display: block; }
#ck-menu a.on .ck-line { display: none; }
#ck-head .ck-pills { display: none; gap: 8px; padding: 0 16px 12px; }
html.ck-p-browse #ck-head .ck-pills { display: flex; }
#ck-head .ck-pills a { all: unset; cursor: pointer; height: 34px; padding: 0 14px; border-radius: 17px; display: flex; gap: 5px; align-items: center; background: var(--ck-chip); color: #e6e6e6; font-size: 14px; }
#ck-head .ck-pills a.on { background: var(--ck-on); color: #111; font-weight: 600; }
#ck-head .ck-pills svg { width: 12px; height: 12px; }

/* the site's own top bar and footer give way to ours */
html.ck-headed header.topnav, html.ck-headed footer.footer { display: none !important; }

/* tools (search, filters, sort, edit buttons) stay hidden until the header's buttons open them */
html.ck .ck-tool { display: none !important; }
html.ck.ck-tools .ck-tool { display: revert !important; }

/* shared: a thin progress line under a row's text, and a section heading above a row */
html.ck .ck-bar::after { content: ""; display: block; height: 3px; margin-top: 6px; border-radius: 2px; background: linear-gradient(to right, var(--ck-on) var(--ck-p, 0%), #333 var(--ck-p, 0%)); }
html.ck [data-ck-head] { margin-top: 30px !important; }
html.ck [data-ck-head]::before { content: attr(data-ck-head); position: absolute; left: 16px; top: -24px; pointer-events: none; font-size: 13px; font-weight: 600; letter-spacing: .4px; text-transform: uppercase; color: var(--ck-sub); white-space: nowrap; }

/* ---------- Library = Followed Titles ---------- */
html.ck-p-lib header.uprofile, html.ck-p-lib aside.umenu, html.ck-p-lib .uview__head,
html.ck-p-hist header.uprofile, html.ck-p-hist aside.umenu, html.ck-p-hist .uview__head { display: none !important; }
html.ck-p-lib main.user-main, html.ck-p-hist main.user-main { padding: 0 !important; }
html.ck-p-lib .user-wrap, html.ck-p-hist .user-wrap, html.ck-p-lib .user-shell, html.ck-p-hist .user-shell,
html.ck-p-lib .user-content, html.ck-p-hist .user-content, html.ck-p-lib .uview, html.ck-p-hist .uview { padding: 0 !important; margin: 0 !important; max-width: none !important; gap: 0 !important; background: transparent !important; border: 0 !important; }
html.ck-p-lib .uview__folders-row { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 50; background: var(--bg); border-bottom: 1px solid var(--ck-line); margin: 0 !important; padding: 0 !important; }
html.ck-p-lib .uview__folders-row::after { content: ""; position: absolute; right: 0; top: 0; bottom: 0; width: 44px; pointer-events: none; background: linear-gradient(to right, rgba(26,26,26,0), var(--bg)); }
html.ck-p-lib .uview__folders .useg { background: transparent !important; padding: 0 16px !important; gap: 20px !important; border-radius: 0 !important; }
html.ck-p-lib .uview__folders .useg__btn { background: transparent !important; color: var(--ck-sub) !important; border-radius: 0 !important; padding: 9px 0 10px !important; font-size: 15px !important; box-shadow: none !important; display: inline-flex !important; gap: 5px; align-items: baseline; white-space: nowrap; }
html.ck-p-lib .uview__folders .useg__btn.is-on { color: #fff !important; font-weight: 600 !important; box-shadow: inset 0 -2px 0 #fff !important; }
html.ck-p-lib .uview__folders .useg__btn[data-ck-count]::after { content: attr(data-ck-count); color: var(--ck-sub); font-weight: 400; }
html.ck-p-lib .uview__folders .useg__btn[data-ck-count="0"]::after { color: #5a5a5a; }
html.ck-p-lib .uview__filter-block, html.ck-p-lib .uview__sort-tabs { padding: 8px 12px !important; margin: 0 !important; }
html.ck-p-lib ul.ulist { padding: 4px 0 16px !important; margin: 0 !important; gap: 0 !important; display: flex !important; flex-direction: column; }
html.ck-p-lib li.ulrow { position: relative; display: grid !important; grid-template-columns: 46px minmax(0, 1fr) auto; gap: 12px; align-items: center; min-height: 72px; padding: 5px 16px !important; margin: 0; background: transparent !important; border: 0 !important; border-radius: 0 !important; box-sizing: border-box; }
html.ck-p-lib li.ulrow[data-ck-group="c"] { order: 1; }
html.ck-p-lib li.ulrow[data-ck-group="n"] { order: 2; }
html.ck-p-lib li.ulrow[data-ck-group="d"] { order: 3; }
html.ck-p-lib .ulrow__poster { width: 46px !important; height: 62px !important; border-radius: 7px; overflow: hidden; display: block; }
html.ck-p-lib .ulrow__poster .poster { width: 46px !important; height: 62px !important; padding: 0 !important; border-radius: 7px !important; }
html.ck-p-lib .ulrow__poster img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
html.ck-p-lib .ulrow__body { min-width: 0; display: block !important; padding: 0 !important; }
html.ck-p-lib .ulrow__title { display: block !important; color: var(--ck-strong) !important; font-size: 15px !important; font-weight: 400 !important; line-height: 1.3 !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; position: static !important; }
html.ck-p-lib .ulrow__meta { display: block !important; min-height: 0 !important; margin-top: 3px; font-size: 12.5px; color: var(--ck-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
html.ck-p-lib .ulrow__meta > * { display: none !important; }
html.ck-p-lib .ulrow__meta::before { content: attr(data-ck-bold); color: var(--ck-strong); font-weight: 600; }
html.ck-p-lib .ulrow__meta::after { content: attr(data-ck-rest); }
html.ck-p-lib .ulrow__actions { display: none !important; }
html.ck a.ck-go { display: flex; gap: 5px; align-items: center; height: 34px; padding: 0 12px; border-radius: 17px; background: var(--ck-chip); color: var(--ck-strong); font-size: 13px; font-weight: 600; text-decoration: none; white-space: nowrap; }
html.ck a.ck-go::before { content: ""; width: 10px; height: 11px; background: currentColor; clip-path: polygon(0 0, 100% 50%, 0 100%); }
html.ck a.ck-go.on { background: var(--ck-on); color: #111; }
/* search open: only the search field and the sort choices, as pills */
html.ck-p-lib .filter-adv-toggle, html.ck-p-lib .filter-top + div, html.ck-p-lib .uview__sort-tabs .useg--icon { display: none !important; }
html.ck-p-lib .filter-search { background: var(--ck-chip) !important; border-radius: 10px !important; border: 0 !important; height: 38px !important; }
html.ck-p-lib .filter-search input { font-size: 16px !important; color: #fff !important; }
html.ck-p-lib .uview__sort-tabs { display: flex; gap: 8px; }
html.ck-p-lib .uview__sort-tabs .useg { background: transparent !important; padding: 0 !important; gap: 8px !important; }
html.ck-p-lib .uview__sort-tabs .useg__btn { background: transparent !important; border: 1px solid #3a3a3a !important; border-radius: 16px !important; padding: 5px 12px !important; color: #d0d0d0 !important; font-size: 14px !important; }
html.ck-p-lib .uview__sort-tabs .useg__btn.is-on { background: var(--ck-chip) !important; border-color: var(--ck-chip) !important; color: #fff !important; }

/* ---------- Browse: 3 posters across, rating on the cover ---------- */
html.ck-p-browse .list-wrap { padding: 0 16px !important; }
html.ck-p-browse .filter-top { margin: 0 0 8px !important; }
html.ck-p-browse .list-toolbar { display: none !important; }
html.ck-p-browse .list-grid { display: grid !important; grid-template-columns: repeat(3, minmax(0, 1fr)) !important; gap: 14px 10px !important; }
html.ck-p-browse .lrow { position: relative; container-type: inline-size; display: flex !important; flex-direction: column !important; gap: 5px !important; padding: 0 !important; background: transparent !important; border: 0 !important; min-width: 0; }
html.ck-p-browse .lrow__poster { position: relative; width: 100% !important; max-width: 100% !important; }
html.ck-p-browse .lrow__poster .poster { width: 100% !important; height: auto !important; aspect-ratio: 5 / 7; border-radius: 8px !important; overflow: hidden; }
html.ck-p-browse .lrow__poster .poster img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
html.ck-p-browse .card__menu { position: absolute !important; top: 5px; right: 5px; left: auto !important; bottom: auto !important; opacity: 1 !important; z-index: 2; }
html.ck-p-browse .card__action { width: 26px !important; height: 26px !important; border-radius: 13px !important; background: rgba(0,0,0,.6) !important; color: #fff !important; display: grid !important; place-items: center; padding: 0 !important; border: 0 !important; }
html.ck-p-browse .card__action svg { width: 14px !important; height: 14px !important; }
html.ck-p-browse .lrow__body { padding: 0 !important; min-width: 0; display: grid !important; grid-template-columns: auto minmax(0, 1fr); column-gap: 4px; align-items: baseline; }
html.ck-p-browse .lrow__title-link { grid-column: 1 / -1; min-width: 0; }
html.ck-p-browse .lrow__title { font-size: 12.5px !important; font-weight: 400 !important; color: #e6e6e6 !important; line-height: 16px !important; display: -webkit-box !important; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0 !important; }
html.ck-p-browse .lrow__meta { display: block !important; grid-column: 1; margin: 1px 0 0 !important; padding: 0 !important; }
html.ck-p-browse .lrow__meta > :not(.lrow__ch):not(.lrow__rating) { display: none !important; }
html.ck-p-browse .lrow__ch { display: inline-block !important; font-size: 11.5px !important; color: var(--ck-sub) !important; text-transform: lowercase !important; }
html.ck-p-browse .lrow__ch::first-letter { text-transform: uppercase; }
html.ck-p-browse .lrow__rating { position: absolute; left: 5px; top: calc(140cqw - 27px); z-index: 2; display: flex !important; gap: 3px; align-items: center; height: 22px; padding: 0 7px; border-radius: 11px; background: rgba(0,0,0,.72); color: #fff !important; font-size: 12.5px !important; font-weight: 700; }
html.ck-p-browse .lrow__rating svg { display: none !important; }
html.ck-p-browse .lrow__rating::before { content: "★"; color: #ffcc00; }
html.ck-p-browse .lrow__rating[data-ck-zero] { font-size: 0 !important; gap: 0; }
html.ck-p-browse .lrow__rating[data-ck-zero]::before { content: "No rating"; color: #bdbdbd; font-size: 11.5px; font-weight: 400; }
html.ck-p-browse .lrow__foot { display: block !important; grid-column: 2; margin: 1px 0 0 !important; padding: 0 !important; font-size: 11.5px !important; color: var(--ck-sub) !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
html.ck-p-browse .lrow__foot::before { content: "· "; }
html.ck-p-browse .lrow__desc { display: none !important; }

/* ---------- History: grouped by day, one tap resumes ---------- */
html.ck-p-hist .hgrid { display: block !important; padding: 4px 0 24px !important; }
html.ck-p-hist a.hitem { position: relative; display: grid !important; grid-template-columns: 46px minmax(0, 1fr) auto; gap: 12px; align-items: center; min-height: 72px; padding: 5px 16px !important; margin: 0; background: transparent !important; border: 0 !important; border-radius: 0 !important; box-sizing: border-box; text-decoration: none; }
html.ck-p-hist .hitem__poster { width: 46px !important; height: 62px !important; border-radius: 7px; overflow: hidden; padding: 0 !important; }
html.ck-p-hist .hitem__poster img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
html.ck-p-hist .hitem__body { min-width: 0; padding: 0 !important; }
html.ck-p-hist .hitem__title { color: var(--ck-strong) !important; font-size: 15px !important; font-weight: 400 !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
html.ck-p-hist .hitem__meta { display: block !important; margin-top: 3px; color: var(--ck-sub) !important; font-size: 12.5px !important; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
html.ck-p-hist .hitem__meta > * { display: none !important; }
html.ck-p-hist .hitem__meta::before { content: attr(data-ck-meta); }
html.ck-p-hist a.hitem > svg { display: none !important; }
html.ck-p-hist a.hitem::after { content: "▶\\00a0 Resume"; display: flex; align-items: center; height: 34px; padding: 0 12px; border-radius: 17px; font-size: 13px; font-weight: 600; white-space: nowrap; color: var(--ck-strong); background: var(--ck-chip); }
html.ck-p-hist a.hitem.ck-first::after { background-color: var(--ck-on); color: #111; }
html.ck-p-hist.ck-tools a.hitem::after { visibility: hidden; }
html.ck-p-hist .hitem__remove { position: absolute !important; right: 12px; top: 50%; transform: translateY(-50%); }

/* ---------- More (our own page, links to the site's own pages) ---------- */
html.ck-p-more body > :not([id^="ck-"]) { display: none !important; }
html.ck-p-more #ck-more { display: block; padding: 0 16px 40px; font-family: var(--ck-font); }
#ck-more h2 { margin: 0; padding: 14px 14px 6px; font-size: 13px; font-weight: 600; letter-spacing: .4px; text-transform: uppercase; color: var(--ck-sub); }
#ck-more .ck-group { border-radius: 12px; background: #232323; overflow: hidden; }
#ck-more .ck-row { all: unset; box-sizing: border-box; width: 100%; cursor: pointer; min-height: 46px; padding: 0 14px; display: grid; grid-template-columns: 28px 1fr auto; gap: 10px; align-items: center; color: var(--ck-strong); font-size: 16px; border-top: 1px solid var(--ck-line); }
#ck-more .ck-row:first-child { border-top: 0; }
#ck-more .ck-row > svg { width: 20px; height: 20px; color: var(--ck-sub); }
#ck-more .ck-row .ck-chev { width: 16px; height: 16px; color: var(--ck-sub); }
#ck-more .ck-switch { width: 51px; height: 31px; border-radius: 16px; background: #3a3a3a; position: relative; transition: background .15s; }
#ck-more .ck-switch::after { content: ""; position: absolute; left: 2px; top: 2px; width: 27px; height: 27px; border-radius: 14px; background: #fff; transition: transform .15s; }
#ck-more [aria-checked="true"] .ck-switch { background: #34c759; }
#ck-more [aria-checked="true"] .ck-switch::after { transform: translateX(20px); }
#ck-more .ck-note { padding: 16px 14px 0; font-size: 12.5px; color: #6e6e6e; }

/* ---------- Title page ---------- */
html.ck-p-title main.layout { padding: 0 !important; }
html.ck-p-title .mpage__hero { background: transparent !important; padding: 4px 16px 8px !important; min-height: 0 !important; }
html.ck-p-title .mpage__hero::before, html.ck-p-title .mpage__hero::after { display: none !important; }
html.ck-p-title .mpage__hero-inner { display: grid !important; grid-template-columns: 104px minmax(0, 1fr); column-gap: 14px; row-gap: 2px; align-items: start; padding: 0 !important; }
html.ck-p-title .mpage__head, html.ck-p-title .mpage__head-main { display: contents !important; }
html.ck-p-title .mpage__poster { grid-column: 1; grid-row: 1 / span 5; width: 104px !important; max-width: 104px !important; }
html.ck-p-title .mpage__poster .poster { border-radius: 8px !important; }
html.ck-p-title .mpage__title-row, html.ck-p-title .mpage__credits, html.ck-p-title .mpage__badges, html.ck-p-title .mpage__byline { grid-column: 2; min-width: 0; }
html.ck-p-title .mpage__title-row { grid-row: 1; }
html.ck-p-title .mpage__credits { grid-row: 2; }
html.ck-p-title .mpage__badges { grid-row: 3; }
html.ck-p-title .mpage__byline { grid-row: 4; display: flex !important; flex-wrap: wrap; gap: 2px 6px; align-items: baseline; }
html.ck-p-title .mpage__byline > .mpage__rank, html.ck-p-title .mpage__byline > .mpage__rank + .mpage__byline-sep,
html.ck-p-title .mpage__byline > .mpage__stat[title], html.ck-p-title .mpage__byline > .mpage__stat[title] + .mpage__byline-sep { display: none !important; }
html.ck-p-title .mpage__stat { display: inline !important; }
html.ck-p-title .mpage__stat > * { display: inline !important; font-size: 12.5px !important; }
html.ck-p-title .mpage__stat strong { color: #e6e6e6 !important; margin-right: 3px; }
html.ck-p-title .mpage__cta, html.ck-p-title .mpage__desc-wrap, html.ck-p-title .mpage__actions, html.ck-p-title .mpage__details-shell { grid-column: 1 / -1; min-width: 0; }
html.ck-p-title .share-block, html.ck-p-title .mpage__rate-stack, html.ck-p-title .mpage__crumbs, html.ck-p-title .mpage__alts, html.ck-p-title .mpage__cta-report { display: none !important; }
html.ck-p-title .mpage__title { font-size: 21px !important; line-height: 1.25 !important; margin: 0 0 2px !important; color: #fff !important; }
html.ck-p-title .mpage__credits, html.ck-p-title .mpage__byline { font-size: 12.5px !important; color: #9a9a9a !important; }
html.ck-p-title .mpage__badges { gap: 4px !important; margin: 4px 0 !important; }
html.ck-p-title .mpage__badge { font-size: 10.5px !important; padding: 1px 6px !important; background: var(--ck-chip) !important; color: #cfcfcf !important; }
html.ck-p-title .mpage__cta { display: flex !important; flex-wrap: wrap !important; gap: 10px !important; align-items: center; margin: 14px 0 0 !important; }
html.ck-p-title .mpage__cta .mpage__read { flex: 1 1 100%; height: 48px; border-radius: 24px !important; padding: 0 18px !important; background: var(--ck-on) !important; color: #111 !important; font-size: 16px !important; font-weight: 600 !important; display: flex !important; gap: 8px; align-items: center; justify-content: center; box-shadow: none !important; }
html.ck-p-title .mpage__cta-aux { display: flex !important; flex: none; gap: 8px; min-width: 0; }
html.ck-p-title .mpage__cta-aux .mpage__collect, html.ck-p-title .mpage__cta-aux .mpage__rate { display: none !important; }
html.ck-p-title .mpage__follow-btn { height: 48px !important; border-radius: 24px !important; padding: 0 16px !important; }
html.ck-p-title .mpage__desc-wrap { margin-top: 12px !important; }
html.ck-p-title .mpage__desc { font-size: 14px !important; line-height: 20px !important; }
html.ck-p-title .mpage__side, html.ck-p-title section.cm-widget, html.ck-p-title #mal-sync { display: none !important; }
html.ck-p-title .mpage__body { padding: 0 !important; }
html.ck-p-title .mpage__sec-head { padding: 12px 16px 4px !important; }
html.ck-p-title .mpage__sec-title { font-size: 18px !important; color: #fff !important; }
html.ck-p-title .mchap-toolbar { padding: 4px 16px !important; }
html.ck-p-title ul.mchap-list { padding: 0 !important; gap: 0 !important; }
html.ck-p-title li.mchap-item { background: transparent !important; border: 0 !important; border-bottom: 1px solid var(--ck-line) !important; border-radius: 0 !important; padding: 9px 16px !important; margin: 0 !important; }
html.ck-p-title .mchap-row__ch { font-size: 15px !important; color: #f2f2f2 !important; font-weight: 500 !important; }
html.ck-p-title .mchap-row__secondary { font-size: 12.5px !important; color: #8e8e8e !important; }
html.ck-p-title .mchap-foot { padding: 12px 16px 40px !important; }

/* ---------- Reader: clean page, tap to show controls ---------- */
html.ck-p-reader .rpage-progress, html.ck-p-reader .rpage-hoverzone { display: none !important; }
html.ck-p-reader .rpage-main, html.ck-p-reader .rpage-main__inner { padding: 0 !important; margin: 0 !important; max-width: none !important; }
html.ck-p-reader .rpage-page { margin: 0 !important; }
html.ck-p-reader .rpage-page__img { width: 100% !important; max-width: 100% !important; height: auto !important; display: block; }
html.ck-p-reader .rpage-floatctl { display: none !important; }
html.ck-p-reader.ck-ui .rpage-floatctl { display: flex !important; position: fixed !important; left: 14px !important; right: 14px !important; top: auto !important; bottom: calc(14px + env(safe-area-inset-bottom, 0px)) !important; width: auto !important; flex-direction: column; gap: 8px; z-index: 70; }
html.ck-p-reader.ck-ui .rpage-floatctl__row, html.ck-p-reader.ck-ui .rpage-floatctl__col { width: 100% !important; height: auto !important; background: var(--ck-glass) !important; -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px); border: 1px solid var(--ck-glass-line) !important; }
html.ck-p-reader.ck-ui .rpage-floatctl__row { justify-content: space-between; border-radius: 30px !important; padding: 4px 8px !important; }
html.ck-p-reader.ck-ui .rpage-floatctl__col { flex-direction: row !important; justify-content: space-around; border-radius: 22px !important; padding: 4px !important; }
#ck-rtop { display: none; }
html.ck-p-reader.ck-ui #ck-rtop { display: grid; position: fixed; left: 0; right: 0; top: 0; z-index: 70; background: rgba(26,26,26,.92); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); padding: calc(6px + env(safe-area-inset-top, 0px)) 10px 6px; grid-template-columns: 44px minmax(0, 1fr); gap: 6px; align-items: center; font-family: var(--ck-font); }
#ck-rtop a { all: unset; cursor: pointer; color: #fff; display: grid; place-items: center; width: 44px; height: 44px; }
#ck-rtop a svg { width: 22px; height: 22px; }
#ck-rtop b { display: block; color: #fff; font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#ck-rtop small { color: #9a9a9a; font-size: 12.5px; }
`;

    const svg = (body, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${body}</svg>`;
    const LINE = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
    const ICON = {
        back: svg('<path d="M15 5l-7 7 7 7"/>', 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"'),
        search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"'),
        filter: svg('<path d="M4 6h16M7 12h10M10 18h4"/>', 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"'),
        trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'),
        down: svg('<path d="M6 9l6 6 6-6"/>', 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"'),
        check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'class="ck-check" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"'),
        chev: svg('<path d="M9 5l7 7-7 7"/>', 'class="ck-chev" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"'),
    };
    // page icons: an outline and a filled version, the filled one marks the current page
    const PAGE_ICON = {
        lib: '<rect x="3" y="4" width="4.6" height="16" rx="1.3"/><rect x="9.4" y="4" width="4.6" height="16" rx="1.3"/><rect x="15.6" y="4.6" width="4.6" height="15.4" rx="1.3" transform="rotate(-13 17.9 12.3)"/>',
        browse: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="3.5"/>',
        hist: '<path d="M4 12.5a8 8 0 1 0 2.4-6.2"/><path d="M4 4.5v4.3h4.3"/><path d="M12 8v4.3l2.9 1.8"/>',
        more: '<circle cx="12" cy="12" r="9"/><circle cx="7.6" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="16.4" cy="12" r="1.3" fill="currentColor"/>',
    };
    const pageIcon = (k) => k === 'hist' || k === 'more'
        ? svg(PAGE_ICON[k], LINE)
        : svg(PAGE_ICON[k], 'class="ck-line" ' + LINE) + svg(PAGE_ICON[k], 'class="ck-fill" fill="currentColor"');
    const PAGES = [
        { k: 'lib', name: 'Library', href: LIBRARY },
        { k: 'browse', name: 'Browse', href: LATEST },
        { k: 'hist', name: 'History', href: HISTORY },
        { k: 'more', name: 'More', href: MORE },
    ];
    const MORE_LINKS = [
        ['Your account', [
            ['Notifications', '/user?tab=notifs', '<path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z"/><path d="M10 20a2 2 0 0 0 4 0"/>'],
            ['Feed', '/user?tab=feed', '<path d="M5 5h14M5 10h14M5 15h9"/>'],
            ['Collections', '/user?tab=collections', '<rect x="3" y="5" width="18" height="15" rx="2"/><path d="M3 9h18"/>'],
            ['Followed users', '/user?tab=following-users', '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/>'],
            ['Followed groups', '/user?tab=groups', '<circle cx="9" cy="8" r="3.5"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21 20c0-2.6-1.6-4.8-4-5.6"/>'],
            ['Comments', '/user?tab=comments', '<path d="M4 5h16v11H9l-5 4z"/>'],
            ['Import / Export', '/user?tab=backup', '<path d="M7 4v16M4 7l3-3 3 3M17 20V4M14 17l3 3 3-3"/>'],
        ]],
        ['comix.to', [
            ['Site settings', '/user?tab=settings', '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>'],
            ['Edit profile', '/user?tab=edit', '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>'],
            ['Community', '/community', '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>'],
        ]],
    ];

    const root = document.documentElement;
    const style = document.createElement('style');
    style.id = 'ck-style';
    style.textContent = CSS;
    root.classList.add('ck');
    (document.head || root).appendChild(style);

    const PAGE_CLASSES = ['ck-p-lib', 'ck-p-hist', 'ck-p-browse', 'ck-p-more', 'ck-p-title', 'ck-p-reader', 'ck-p-other', 'ck-headed'];

    function pageKind() {
        const p = location.pathname;
        const tab = new URLSearchParams(location.search).get('tab');
        if (p === '/user' && location.hash === '#ck-more') return 'more';
        if (p === '/user' && tab === 'titles') return 'lib';
        if (p === '/user' && tab === 'history') return 'hist';
        if (p === '/browse') return 'browse';
        if (/^\/title\/[^/]+\/[^/]+/.test(p)) return 'reader';
        if (/^\/title\/[^/]+\/?$/.test(p)) return 'title';
        return 'other';
    }

    // Only write when the value changes, so our own writes don't wake the page watcher again
    function setText(node, text) {
        if (node && node.textContent !== text) node.textContent = text;
    }
    function setAttr(node, name, value) {
        if (!node) return;
        if (value === null || value === undefined) { if (node.hasAttribute(name)) node.removeAttribute(name); }
        else if (node.getAttribute(name) !== String(value)) node.setAttribute(name, value);
    }
    function setVar(node, name, value) {
        if (node && node.style.getPropertyValue(name) !== value) node.style.setProperty(name, value);
    }

    function el(html) {
        const box = document.createElement('div');
        box.innerHTML = html.trim();
        return box.firstElementChild;
    }

    // "/title/2rlj2-the-counts-secret-maid/5554490-chapter-1" -> "2rlj2"
    function titleId(href) {
        const m = /\/title\/([^/-]+)/.exec(href || '');
        return m ? m[1] : null;
    }
    // "...-chapter-39-1" -> "39.1"
    function chapterFrom(href) {
        const m = /chapter-(\d+(?:-\d+)?)\/?$/.exec(href || '');
        return m ? m[1].replace('-', '.') : null;
    }
    const fmt = (n) => String(Math.round(n * 10) / 10);

    function saveResume(id, href, ch) {
        if (!id || !href || !ch) return;
        const all = readStore(RESUME_KEY);
        if (all[id] && all[id].href === href) return;
        all[id] = { href, ch };
        writeStore(RESUME_KEY, all);
    }

    function closeMenu() { root.classList.remove('ck-menu'); }

    function buildChrome() {
        if (document.getElementById('ck-head')) return;
        const menu = PAGES.map(p => `<a href="${p.href}" data-k="${p.k}" role="menuitem">${pageIcon(p.k)}<span>${p.name}</span>${ICON.check}</a>`).join('');
        document.body.prepend(el(`
<div id="ck-head">
  <div class="ck-nav">
    <a id="ck-back" aria-label="Back">${ICON.back}</a><span></span>
    <div class="ck-acts"><button id="ck-csearch" data-for="title" aria-label="Search chapters">${ICON.search}</button><button id="ck-cfilter" data-for="title" aria-label="Chapter filters">${ICON.filter}</button></div>
  </div>
  <div class="ck-big">
    <div><button id="ck-switch" aria-haspopup="menu" aria-expanded="false"><span id="ck-name"></span>${ICON.down}</button><div id="ck-sub"></div></div>
    <div class="ck-acts">
      <button id="ck-search" data-for="lib browse" aria-label="Search">${ICON.search}</button>
      <button id="ck-filter" data-for="lib browse" aria-label="Filter and sort">${ICON.filter}</button>
      <button id="ck-edit" data-for="hist" aria-label="Remove from history">${ICON.trash}</button>
    </div>
  </div>
  <div class="ck-pills"><a href="${LATEST}" data-k="chapter_updated_at">Latest</a><a href="${POPULAR}" data-k="score">Popular</a><a id="ck-pill-filter">Filter ${ICON.down}</a></div>
  <div id="ck-menu" role="menu">${menu}</div>
</div>`));
        document.body.appendChild(el('<div id="ck-dim"></div>'));
        document.body.appendChild(el(`<div id="ck-rtop"><a id="ck-rback" aria-label="Back to title">${ICON.back}</a><div><b id="ck-rtitle"></b><small id="ck-rch"></small></div></div>`));
        document.body.appendChild(buildMore());

        document.getElementById('ck-back').addEventListener('click', () => history.length > 1 ? history.back() : location.assign(LIBRARY));
        document.getElementById('ck-switch').addEventListener('click', () => {
            const open = root.classList.toggle('ck-menu');
            document.getElementById('ck-switch').setAttribute('aria-expanded', String(open));
        });
        document.getElementById('ck-dim').addEventListener('click', closeMenu);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
        const toggleTools = () => root.classList.toggle('ck-tools');
        for (const id of ['ck-filter', 'ck-pill-filter', 'ck-edit', 'ck-cfilter']) document.getElementById(id).addEventListener('click', toggleTools);
        const search = () => {
            root.classList.add('ck-tools');
            const input = document.querySelector('.filter-search input, .mchap-search input');
            if (input) setTimeout(() => input.focus(), 50);
            else location.assign('/browse');
        };
        document.getElementById('ck-search').addEventListener('click', search);
        document.getElementById('ck-csearch').addEventListener('click', search);
    }

    function buildMore() {
        const groups = MORE_LINKS.map(([title, rows]) => `<h2>${title}</h2><div class="ck-group">${rows.map(([label, href, icon]) =>
            `<a class="ck-row" href="${href}">${svg(icon, LINE)}<span>${label}</span>${ICON.chev}</a>`).join('')}</div>`).join('');
        const box = el(`
<div id="ck-more">
  <h2>Skin</h2>
  <div class="ck-group"><button class="ck-row" id="ck-home" role="switch" aria-checked="${homeOpensLibrary()}">${svg('<path d="M4 11l8-7 8 7v9H4z"/>', LINE)}<span>Open Library first</span><span class="ck-switch"></span></button></div>
  ${groups}
  <p class="ck-note">Comix Tachimanga Skin 1.1.0</p>
</div>`);
        box.querySelector('#ck-home').addEventListener('click', (e) => {
            const on = e.currentTarget.getAttribute('aria-checked') !== 'true';
            e.currentTarget.setAttribute('aria-checked', String(on));
            try { localStorage.setItem(HOME_KEY, on ? '1' : '0'); } catch (err) {}
        });
        return box;
    }

    const TITLES = { lib: 'Library', hist: 'History', browse: 'Browse', more: 'More' };

    function applyPage() {
        const kind = pageKind();
        const want = ['ck-p-' + kind];
        if (['lib', 'hist', 'browse', 'more', 'title'].includes(kind)) want.push('ck-headed');
        for (const c of PAGE_CLASSES) root.classList.toggle(c, want.includes(c));
        if (kind !== 'reader') root.classList.remove('ck-ui');

        setText(document.getElementById('ck-name'), TITLES[kind] || '');
        if (!['lib', 'hist'].includes(kind)) setText(document.getElementById('ck-sub'), '');
        document.querySelectorAll('#ck-menu a').forEach(a => a.classList.toggle('on', a.dataset.k === kind));
        const order = location.search.includes('score') ? 'score' : 'chapter_updated_at';
        document.querySelectorAll('#ck-head .ck-pills a[data-k]').forEach(a => a.classList.toggle('on', kind === 'browse' && a.dataset.k === order));

        if (kind === 'lib') decorateLibrary();
        if (kind === 'browse') decorateBrowse();
        if (kind === 'hist') decorateHistory();
        if (kind === 'title') decorateTitle();
        if (kind === 'reader') decorateReader();
    }

    function markTools(selectors) {
        for (const s of selectors) document.querySelectorAll(s).forEach(n => n.classList.add('ck-tool'));
    }

    // The site's own "read / latest" text, e.g. "1 / 110" or "— / 49"
    function progressFrom(text) {
        const m = /^\s*([\d.]+|—|-)?\s*\/\s*([\d.]+)/.exec(text || '');
        if (!m) return null;
        const latest = parseFloat(m[2]);
        const read = m[1] && /\d/.test(m[1]) ? parseFloat(m[1]) : 0;
        return { read, latest };
    }

    const GROUP_NAMES = { c: 'Continue reading', n: 'Not started', d: 'Caught up' };

    function decorateLibrary() {
        markTools(['.uview__filter-block', '.uview__sort-tabs']);
        const resume = readStore(RESUME_KEY);
        const rows = [...document.querySelectorAll('li.ulrow')];
        let left = 0;
        for (const row of rows) {
            const link = row.querySelector('a.ulrow__title');
            const body = row.querySelector('.ulrow__body');
            const meta = row.querySelector('.ulrow__meta');
            const ch = row.querySelector('.ulrow__progress .card__ch');
            if (!link || !body || !meta) continue;
            const href = link.getAttribute('href');
            const p = progressFrom(ch && ch.textContent);
            let group = 'n', bold = '', rest = '', pct = '0%';
            if (p) {
                const l = Math.max(0, Math.round(p.latest - p.read));
                left += l;
                group = p.read > 0 ? (l > 0 ? 'c' : 'd') : 'n';
                if (p.read > 0) {
                    bold = l > 0 ? `${l} left` : 'Caught up';
                    rest = ` · ${fmt(p.read)} of ${fmt(p.latest)} read`;
                } else {
                    bold = `${fmt(p.latest)} chapters`;
                }
                pct = `${p.latest ? Math.min(100, (p.read / p.latest) * 100) : 0}%`;
            }
            body.classList.add('ck-bar');
            setVar(body, '--ck-p', pct);
            setAttr(row, 'data-ck-group', group);
            setAttr(meta, 'data-ck-bold', bold);
            setAttr(meta, 'data-ck-rest', rest);

            // Resume: a saved link to the last chapter, else the title page presses its own Resume button
            let go = row.querySelector(':scope > a.ck-go');
            if (!go) {
                go = document.createElement('a');
                go.className = 'ck-go';
                row.appendChild(go);
            }
            const saved = resume[titleId(href)];
            const started = p && p.read > 0;
            const fresh = started && saved && parseFloat(saved.ch) === p.read;
            setAttr(go, 'href', fresh ? saved.href : `${href}#ck-resume-${started ? fmt(p.read) : 0}`);
            setText(go, started ? `Ch. ${fmt(p.read)}` : 'Start');
            go.classList.toggle('on', group === 'c');
        }

        // A heading above the first row of each group (rows keep the site's order inside a group)
        const sizes = {};
        for (const row of rows) sizes[row.dataset.ckGroup] = (sizes[row.dataset.ckGroup] || 0) + 1;
        const seen = new Set();
        for (const row of rows) {
            const g = row.dataset.ckGroup;
            setAttr(row, 'data-ck-head', g && !seen.has(g) ? `${GROUP_NAMES[g]} ${sizes[g]}` : null);
            if (g) seen.add(g);
        }

        // Folder counts: the site says "27 titles in your library." for the folder on screen; remember it
        const buttons = [...document.querySelectorAll('.uview__folders .useg__btn')];
        const counts = readStore(COUNTS_KEY);
        const active = buttons.find(b => b.classList.contains('is-on'));
        const sub = document.querySelector('.uview__sub');
        const m = /([\d,]+)\s+titles?/.exec(sub ? sub.textContent : '');
        const total = m ? parseInt(m[1].replace(/,/g, ''), 10) : null;
        if (active && total !== null && counts[active.textContent.trim()] !== total) {
            counts[active.textContent.trim()] = total;
            writeStore(COUNTS_KEY, counts);
        }
        for (const b of buttons) {
            const n = counts[b.textContent.trim()];
            setAttr(b, 'data-ck-count', n === undefined ? null : n);
        }
        let line = total === null ? '' : `${total.toLocaleString('en-US')} title${total === 1 ? '' : 's'}`;
        if (total !== null && rows.length === total && rows.length) line += ` · ${left.toLocaleString('en-US')} chapters left`;
        setText(document.getElementById('ck-sub'), line);
    }

    function decorateBrowse() {
        markTools(['.filter-top', '.filter-top + div']);
        document.querySelectorAll('.lrow__rating').forEach(r => setAttr(r, 'data-ck-zero', /^\s*0(\.0)?\s*$/.test(r.textContent) ? '' : null));
    }

    // "2h ago" -> Today, "1d ago" -> Yesterday, and so on
    function dayGroup(text) {
        const t = (text || '').toLowerCase();
        if (/just|now|sec|\d+\s*(s|m|min|mins|h|hr|hrs|hour|hours)\b/.test(t)) return 'Today';
        const d = /(\d+)\s*(d|day|days)\b/.exec(t);
        if (d) return d[1] === '1' ? 'Yesterday' : 'This week';
        const w = /(\d+)\s*(w|wk|week|weeks)\b/.exec(t);
        if (w) return w[1] === '1' ? 'Last week' : 'Earlier';
        return 'Earlier';
    }

    function decorateHistory() {
        markTools(['.hitem__remove']);
        const items = [...document.querySelectorAll('a.hitem')];
        const all = readStore(RESUME_KEY);
        let changed = false;
        let last = null;
        items.forEach((a, i) => {
            const href = a.getAttribute('href');
            const ch = chapterFrom(href);
            const id = titleId(href);
            const ring = a.querySelector('.hring__label');
            const pct = ring ? parseInt(ring.textContent, 10) : NaN;
            const timeNode = a.querySelector('.hitem__time');
            const time = timeNode ? timeNode.textContent.trim() : '';
            const parts = [ch ? `Ch. ${ch}` : '', Number.isNaN(pct) ? '' : `${pct}%`, time].filter(Boolean);
            setAttr(a.querySelector('.hitem__meta'), 'data-ck-meta', parts.join(' · '));
            const body = a.querySelector('.hitem__body');
            if (body) {
                body.classList.add('ck-bar');
                setVar(body, '--ck-p', `${Number.isNaN(pct) ? 100 : pct}%`);
            }
            const group = dayGroup(time);
            setAttr(a, 'data-ck-head', group !== last ? group : null);
            last = group;
            a.classList.toggle('ck-first', i === 0);
            if (id && ch && (!all[id] || all[id].href !== href)) {
                all[id] = { href, ch };
                changed = true;
            }
        });
        if (changed) writeStore(RESUME_KEY, all);
        setText(document.getElementById('ck-sub'), items.length ? `${items.length} title${items.length === 1 ? '' : 's'}` : '');
    }

    // Arriving from a Library resume button: wait for the site's own Resume button to show the expected chapter, then go
    let resumeWaitStart = 0;
    function decorateTitle() {
        markTools(['.mchap-toolbar']);
        const read = [...document.querySelectorAll('a.mpage__read')].find(a => a.offsetParent) || document.querySelector('a.mpage__read');
        if (!read) return;
        const href = read.getAttribute('href');
        const label = read.textContent.trim();
        if (/^resume/i.test(label)) saveResume(titleId(location.pathname), href, chapterFrom(href));

        const m = /^#ck-resume-([\d.]+)$/.exec(location.hash);
        if (!m || !href) return;
        if (!resumeWaitStart) resumeWaitStart = Date.now();
        const want = m[1];
        const ready = want === '0' || chapterFrom(href) === want || Date.now() - resumeWaitStart > 4000;
        if (!ready) {
            setTimeout(queue, 300);
            return;
        }
        history.replaceState(history.state, '', location.pathname + location.search);
        location.assign(href);
    }

    function decorateReader() {
        const manga = document.querySelector('.rpage-floatctl a[aria-label="Manga page"]');
        const back = document.getElementById('ck-rback');
        if (back && manga) setAttr(back, 'href', manga.getAttribute('href'));
        const parts = document.title.split(' · ');
        setText(document.getElementById('ck-rtitle'), parts[0] || '');
        setText(document.getElementById('ck-rch'), parts[1] || '');
        saveResume(titleId(location.pathname), location.pathname, chapterFrom(location.pathname));
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
            closeMenu();
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
