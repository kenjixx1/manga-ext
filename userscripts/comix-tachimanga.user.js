// ==UserScript==
// @name         Comix Tachimanga Skin
// @description  Makes comix.to look and work like Tachimanga on an iPhone: Purple night colours, a page switcher in the title, Library with chapters left and resume buttons, Browse with shelves, a filter sheet and saved filters, History by day, a clean title page and reader.
// @version      1.2.0
// @match        https://comix.to/*
// @match        https://comix.ws/*
// @run-at       document-start
// @noframes
// @updateURL    https://raw.githubusercontent.com/kenjixx1/manga-ext/main/userscripts/comix-tachimanga.user.js
// @downloadURL  https://raw.githubusercontent.com/kenjixx1/manga-ext/main/userscripts/comix-tachimanga.user.js
// ==/UserScript==

// Only restyles and rearranges what comix.to already shows, and adds links between its own pages.
// The filter sheet only builds comix.to's own Browse addresses (the same ones its filter panel makes).
// It never replaces the site's built-in browser functions, and never adds content the site does not send.

(function () {
    'use strict';

    if (window.top !== window.self || !document.documentElement) return;

    const LIBRARY = '/user?tab=titles';
    const HISTORY = '/user?tab=history';
    const MORE = '/user?tab=settings#ck-more';
    const DISCOVER = '/#ck-discover';
    const COUNTS_KEY = 'ckFolderCounts2';
    const FOLDER_ORDER = ['All', 'Plan to Read', 'Reading', 'On-Hold', 'Completed', 'Dropped'];
    const RESUME_KEY = 'ckResume';
    const HOME_KEY = 'ckHomeLibrary';
    const FROM_KEY = 'ckFrom';
    const PRESETS_KEY = 'ckPresets';

    function readStore(key) {
        try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (e) { return {}; }
    }
    function writeStore(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }
    function homeOpensLibrary() {
        try { return localStorage.getItem(HOME_KEY) !== '0'; } catch (e) { return true; }
    }

    if (homeOpensLibrary() && location.pathname === '/' && !location.search && location.hash !== '#ck-discover') {
        location.replace(LIBRARY);
        return;
    }

    // ---------- comix.to's own Browse address words, read from its filter panel ----------
    const SORTS = {
        'chapter_updated_at:desc': 'Latest update', 'views_7d:desc': 'Popular · 7 days', 'views_30d:desc': 'Popular · 30 days',
        'views_90d:desc': 'Popular · 90 days', 'views_total:desc': 'Popular · all time', 'follows_total:desc': 'Most followed',
        'score:desc': 'Highest rated', 'created_at:desc': 'Recently added', 'title:asc': 'Title A to Z', 'title:desc': 'Title Z to A',
        'year:desc': 'Year, newest', 'year:asc': 'Year, oldest', 'relevance:desc': 'Best match',
    };
    const LATEST = 'chapter_updated_at:desc';
    const PILLS = [['discover', 'Discover'], [LATEST, 'Latest'], ['views_7d:desc', 'Popular'], ['follows_total:desc', 'Most followed'], ['score:desc', 'Top rated'], ['created_at:desc', 'New']];
    const GENRE_IDS = {
        'Action': 6, 'Adult': 87264, 'Adventure': 7, 'Boys Love': 8, 'Comedy': 9, 'Crime': 10, 'Drama': 11, 'Ecchi': 87265, 'Fantasy': 12,
        'Girls Love': 13, 'Harem': 40, 'Hentai': 87266, 'Historical': 14, 'Horror': 15, 'Isekai': 16, 'Magical Girls': 17, 'Mature': 87267,
        'Mecha': 18, 'Medical': 19, 'Mystery': 20, 'Philosophical': 21, 'Psychological': 22, 'Romance': 23, 'Sci-Fi': 24, 'Slice of Life': 25,
        'Smut': 87268, 'Sports': 26, 'Superhero': 27, 'Thriller': 28, 'Tragedy': 29, 'Wuxia': 30,
        '4-Koma': 93164, 'Adaptation': 93167, 'Anthology': 93165, 'Award Winning': 93166, 'Doujinshi': 93168, 'Full Color': 93172,
        'Long Strip': 93170, 'Oneshot': 93169, 'Web Comic': 93171,
    };
    const GENRE_NAMES = Object.fromEntries(Object.entries(GENRE_IDS).map(([k, v]) => [String(v), k]));
    const GENRES = Object.keys(GENRE_IDS).slice(0, 31);
    const FORMATS = Object.keys(GENRE_IDS).slice(31);
    const FIRST_GENRES = ['Action', 'Fantasy', 'Romance', 'Comedy'];
    const TYPES = ['Manga', 'Manhwa', 'Manhua', 'Other'];
    const STATUSES = { 'Releasing': 'releasing', 'Finished': 'finished', 'On hiatus': 'on_hiatus', 'Discontinued': 'discontinued', 'Not yet released': 'not_yet_released' };
    const DEMOS = { 'Josei': '3', 'Seinen': '4', 'Shoujo': '1', 'Shounen': '2' };
    const RATINGS = ['Safe', 'Suggestive', 'Erotica', 'Pornographic'];
    const DEFAULT_RATINGS = ['Safe', 'Suggestive'];
    const KNOWN_PARAMS = ['q', 'sort', 'types', 'statuses', 'genres_in', 'genres_ex', 'genres_mode', 'demos', 'content_rating', 'min_chap', 'year_from', 'year_to', 'page'];

    const CSS = `
:root:root {
  --bg: #15131c !important; --bg-rgb: 21 19 28 !important;
  --bg-2: #1a1723 !important; --bg-2-rgb: 26 23 35 !important;
  --surface: #1c1926 !important; --surface-rgb: 28 25 38 !important;
  --surface-2: #221e2d !important; --surface-2-rgb: 34 30 45 !important;
  --surface-3: #2d2840 !important; --surface-3-rgb: 45 40 64 !important;
  --reader-bg: #000 !important;
  --text-emphasis: #ffffff !important; --text-emphasis-rgb: 255 255 255 !important;
  --text: #e6e1f5 !important; --text-rgb: 230 225 245 !important;
  --text-2: #a39cbd !important; --text-2-rgb: 163 156 189 !important;
  --text-3: #6f6888 !important; --text-3-rgb: 111 104 136 !important;
  --accent: #8765eb !important; --accent-rgb: 135 101 235 !important;
  --accent-2: #b39dff !important; --accent-2-rgb: 179 157 255 !important;
  --accent-ink: #ffffff !important;
  /* Purple night */
  --ck-bg: #15131c; --ck-raise: #1c1926; --ck-field: #221e2d; --ck-chip: #272236; --ck-line: #2d2840; --ck-line2: #3b3452;
  --ck-strong: #f4f1ff; --ck-text: #d2cce6; --ck-sub: #8f88a8; --ck-on: #8765eb; --ck-on-ink: #ffffff;
  --ck-tag: #c4b2ff; --ck-tag-bg: #2c2350; --ck-tag-line: #4d3f8a; --ck-bad: #ff8a9e; --ck-bad-line: #ff6b86; --ck-bad-bg: rgba(255,107,134,.1);
  --ck-glass: rgba(34,30,45,.92); --ck-glass-line: rgba(255,255,255,.09);
  --ck-font: -apple-system, "SF Pro Text", system-ui, "Helvetica Neue", Helvetica, Arial, sans-serif;
}
html.ck body { overflow-x: hidden !important; background: var(--ck-bg) !important; font-family: var(--ck-font) !important; -webkit-tap-highlight-color: transparent; }
html.ck body, html.ck body *:not(svg):not(path) { font-family: var(--ck-font) !important; }
html.ck .mono, html.ck .mono * { letter-spacing: 0 !important; text-transform: none !important; }
html.ck-sheet-open body { overflow: hidden !important; }

/* ---------- our header (outside the site's own app) ---------- */
#ck-head, #ck-dim, #ck-more, #ck-sheet, #ck-sdim { display: none; }
html.ck-headed #ck-head { display: block; }
#ck-head { position: relative; z-index: 60; background: var(--ck-bg); padding-top: env(safe-area-inset-top, 0px); }
html.ck-p-title #ck-head { position: sticky; top: 0; }
#ck-head .ck-nav, #ck-head .ck-big, #ck-head .ck-bx { display: none; }
html.ck-p-title #ck-head .ck-nav { display: grid; }
html.ck-headed:not(.ck-p-title) #ck-head .ck-big { display: grid; }
html.ck-p-browse #ck-head .ck-bx, html.ck-p-discover #ck-head .ck-bx { display: block; }
#ck-head .ck-nav { height: 44px; grid-template-columns: 44px 1fr auto; align-items: center; padding: 0 6px; }
#ck-head .ck-big { grid-template-columns: minmax(0, 1fr) auto; align-items: start; padding: 4px 6px 8px 16px; }
#ck-head .ck-acts { display: flex; margin-top: -2px; }
#ck-head .ck-nav button, #ck-head .ck-nav a, #ck-head .ck-acts button { all: unset; cursor: pointer; color: var(--ck-strong); display: grid; place-items: center; width: 44px; height: 44px; }
#ck-head .ck-nav svg, #ck-head .ck-acts svg { width: 21px; height: 21px; }
#ck-head [data-for] { display: none !important; }
html.ck-p-lib #ck-head [data-for~="lib"], html.ck-p-hist #ck-head [data-for~="hist"], html.ck-p-title #ck-head [data-for~="title"] { display: grid !important; }
#ck-switch { all: unset; cursor: pointer; display: inline-flex; gap: 6px; align-items: center; font-size: 30px; line-height: 36px; font-weight: 700; color: var(--ck-strong); }
#ck-switch svg { width: 16px; height: 16px; color: var(--ck-sub); transition: transform .15s; }
html.ck-menu #ck-switch svg { transform: rotate(180deg); }
#ck-sub { font-size: 13px; color: var(--ck-sub); margin-top: 1px; min-height: 18px; }
#ck-menu { display: none; position: absolute; left: 12px; top: calc(env(safe-area-inset-top, 0px) + 48px); width: 240px; border-radius: 16px; overflow: hidden; background: var(--ck-glass); -webkit-backdrop-filter: blur(24px) saturate(1.6); backdrop-filter: blur(24px) saturate(1.6); border: 1px solid var(--ck-glass-line); box-shadow: 0 10px 30px rgba(0,0,0,.5); z-index: 62; }
html.ck-menu #ck-menu { display: block; }
html.ck-menu #ck-dim { display: block; position: fixed; inset: 0; z-index: 59; background: rgba(0,0,0,.5); }
#ck-menu a { all: unset; cursor: pointer; display: grid; grid-template-columns: 28px 1fr 20px; gap: 10px; align-items: center; min-height: 48px; padding: 0 16px; color: var(--ck-strong); font-size: 16px; border-top: 1px solid rgba(255,255,255,.07); }
#ck-menu a:first-child { border-top: 0; }
#ck-menu a svg { width: 24px; height: 24px; }
#ck-menu a .ck-check { visibility: hidden; color: var(--ck-tag); }
#ck-menu a.on .ck-check { visibility: visible; }
#ck-menu .ck-fill { display: none; }
#ck-menu a.on .ck-fill { display: block; }
#ck-menu a.on .ck-line { display: none; }

/* Browse header: search bar, saved filters, sort pills, filters that are on */
#ck-sform { display: grid; grid-template-columns: minmax(0, 1fr) 42px; gap: 8px; padding: 0 16px 10px; margin: 0; }
#ck-sform label { height: 40px; border-radius: 12px; background: var(--ck-field); display: flex; gap: 8px; align-items: center; padding: 0 10px 0 12px; color: var(--ck-sub); }
#ck-sform label svg { width: 18px; height: 18px; flex-shrink: 0; }
#ck-q { all: unset; flex: 1; min-width: 0; color: var(--ck-strong); font-size: 16px; }
#ck-q::placeholder { color: var(--ck-sub); }
#ck-q::-webkit-search-cancel-button { display: none; }
#ck-qx { all: unset; cursor: pointer; width: 22px; height: 22px; border-radius: 11px; background: var(--ck-line2); color: var(--ck-bg); display: none; place-items: center; }
#ck-qx svg { width: 12px; height: 12px; }
#ck-sform.has-q #ck-qx { display: grid; }
#ck-fbtn { all: unset; cursor: pointer; position: relative; height: 40px; border-radius: 12px; background: var(--ck-field); display: grid; place-items: center; color: var(--ck-strong); }
#ck-fbtn svg { width: 20px; height: 20px; }
#ck-fbtn.on { background: var(--ck-on); color: var(--ck-on-ink); }
#ck-fn { position: absolute; top: -5px; right: -5px; min-width: 18px; height: 18px; padding: 0 4px; box-sizing: border-box; border-radius: 9px; background: var(--ck-tag); color: #1a1530; font-size: 11px; font-weight: 700; display: none; place-items: center; }
#ck-fbtn.on #ck-fn { display: grid; }
#ck-head .ck-row { display: flex; gap: 8px; padding: 0 16px 8px; overflow-x: auto; scrollbar-width: none; white-space: nowrap; align-items: center; }
#ck-head .ck-row::-webkit-scrollbar { display: none; }
#ck-head .ck-row:empty { display: none; }
#ck-head .ck-lbl { font-size: 11.5px; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; color: var(--ck-sub); flex-shrink: 0; }
#ck-head .ck-row a, #ck-head .ck-row button { all: unset; cursor: pointer; flex-shrink: 0; height: 32px; padding: 0 14px; border-radius: 16px; background: var(--ck-chip); color: var(--ck-text); display: flex; gap: 5px; align-items: center; font-size: 14px; }
#ck-head .ck-row a.on { background: var(--ck-on); color: var(--ck-on-ink); font-weight: 600; }
#ck-head .ck-row a.ck-preset { padding: 0 12px; }
#ck-head .ck-row a.ck-preset.on { background: var(--ck-tag-bg); color: var(--ck-tag); font-weight: 700; box-shadow: inset 0 0 0 1px var(--ck-tag-line); }
#ck-head .ck-row a.ck-preset svg { width: 13px; height: 13px; }
#ck-head #ck-active a { height: 30px; padding: 0 10px 0 12px; border-radius: 15px; background: var(--ck-tag-bg); color: var(--ck-tag); font-size: 13.5px; font-weight: 600; gap: 6px; }
#ck-head #ck-active a svg { width: 12px; height: 12px; }
#ck-head #ck-active a.ck-clr { background: transparent; color: var(--ck-sub); font-weight: 400; }

/* the site's own top bar and footer give way to ours */
html.ck-headed header.topnav, html.ck-headed footer.footer { display: none !important; }

/* tools (search, filters, sort, edit buttons) stay hidden until the header's buttons open them */
html.ck .ck-tool { display: none !important; }
html.ck.ck-tools .ck-tool { display: revert !important; }

/* shared: a thin progress line under a row's text, and a section heading above a row */
html.ck .ck-bar::after { content: ""; display: block; height: 3px; margin-top: 6px; border-radius: 2px; background: linear-gradient(to right, var(--ck-on) var(--ck-p, 0%), var(--ck-line2) var(--ck-p, 0%)); }
html.ck [data-ck-head] { margin-top: 30px !important; }
html.ck [data-ck-head]::before { content: attr(data-ck-head); position: absolute; left: 16px; top: -24px; pointer-events: none; font-size: 13px; font-weight: 600; letter-spacing: .4px; text-transform: uppercase; color: var(--ck-sub); white-space: nowrap; }

/* ---------- Library = Followed Titles ---------- */
html.ck-p-lib header.uprofile, html.ck-p-lib aside.umenu, html.ck-p-lib .uview__head,
html.ck-p-hist header.uprofile, html.ck-p-hist aside.umenu, html.ck-p-hist .uview__head { display: none !important; }
html.ck-p-lib main.user-main, html.ck-p-hist main.user-main { padding: 0 !important; }
html.ck-p-lib .user-wrap, html.ck-p-hist .user-wrap, html.ck-p-lib .user-shell, html.ck-p-hist .user-shell,
html.ck-p-lib .user-content, html.ck-p-hist .user-content, html.ck-p-lib .uview, html.ck-p-hist .uview { padding: 0 !important; margin: 0 !important; max-width: none !important; gap: 0 !important; background: transparent !important; border: 0 !important; }
html.ck-p-lib .uview__folders-row { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 50; background: var(--ck-bg); border-bottom: 1px solid var(--ck-line); margin: 0 !important; padding: 0 !important; }
html.ck-p-lib .uview__folders-row::after { content: ""; position: absolute; right: 0; top: 0; bottom: 0; width: 44px; pointer-events: none; background: linear-gradient(to right, rgba(21,19,28,0), var(--ck-bg)); }
html.ck-p-lib .uview__folders .useg { background: transparent !important; padding: 0 16px !important; gap: 20px !important; border-radius: 0 !important; }
html.ck-p-lib .uview__folders .useg__btn { background: transparent !important; color: var(--ck-sub) !important; border-radius: 0 !important; padding: 9px 0 10px !important; font-size: 15px !important; box-shadow: none !important; display: inline-flex !important; gap: 5px; align-items: baseline; white-space: nowrap; }
html.ck-p-lib .uview__folders .useg__btn.is-on { color: var(--ck-strong) !important; font-weight: 600 !important; box-shadow: inset 0 -2px 0 var(--ck-on) !important; }
html.ck-p-lib .uview__folders .useg__btn[data-ck-count]::after { content: attr(data-ck-count); color: var(--ck-sub); font-weight: 400; }
html.ck-p-lib .uview__folders .useg__btn[data-ck-count="0"]::after { color: var(--ck-line2); }
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
html.ck a.ck-go.on { background: var(--ck-on); color: var(--ck-on-ink); }
/* search open: only the search field and the sort choices, as pills */
html.ck-p-lib .filter-adv-toggle, html.ck-p-lib .filter-top + div, html.ck-p-lib .uview__sort-tabs .useg--icon { display: none !important; }
html.ck-p-lib .filter-search { background: var(--ck-field) !important; border-radius: 10px !important; border: 0 !important; height: 38px !important; }
html.ck-p-lib .filter-search input { font-size: 16px !important; color: var(--ck-strong) !important; }
html.ck-p-lib .uview__sort-tabs { display: flex; gap: 8px; }
html.ck-p-lib .uview__sort-tabs .useg { background: transparent !important; padding: 0 !important; gap: 8px !important; }
html.ck-p-lib .uview__sort-tabs .useg__btn { background: transparent !important; border: 1px solid var(--ck-line2) !important; border-radius: 16px !important; padding: 5px 12px !important; color: var(--ck-text) !important; font-size: 14px !important; }
html.ck-p-lib .uview__sort-tabs .useg__btn.is-on { background: var(--ck-on) !important; border-color: var(--ck-on) !important; color: var(--ck-on-ink) !important; }

/* ---------- Browse list: cover, title, chapter and time, rating, type and status ---------- */
html.ck-p-browse main.layout, html.ck-p-browse .list-wrap { padding: 0 !important; margin-top: 0 !important; }
html.ck-p-browse .list-toolbar { display: none !important; }
html.ck-p-browse .list-grid { display: flex !important; flex-direction: column !important; gap: 0 !important; padding: 4px 0 8px !important; }
html.ck-p-browse .lrow { position: relative; display: grid !important; grid-template-columns: 64px minmax(0, 1fr); gap: 12px; align-items: start; padding: 7px 16px !important; background: transparent !important; border: 0 !important; border-radius: 0 !important; min-width: 0; }
html.ck-p-browse .lrow__poster { position: relative; width: 64px !important; max-width: 64px !important; }
html.ck-p-browse .lrow__poster .poster { width: 64px !important; height: 90px !important; padding: 0 !important; border-radius: 7px !important; overflow: hidden; }
html.ck-p-browse .lrow__poster .poster img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
html.ck-p-browse .card__menu { position: absolute !important; top: 4px; right: 4px; left: auto !important; bottom: auto !important; opacity: 1 !important; z-index: 2; }
html.ck-p-browse .card__action { width: 24px !important; height: 24px !important; border-radius: 12px !important; background: rgba(0,0,0,.6) !important; color: #fff !important; display: grid !important; place-items: center; padding: 0 !important; border: 0 !important; }
html.ck-p-browse .card__action svg { width: 13px !important; height: 13px !important; }
html.ck-p-browse .lrow__body { padding: 2px 0 0 !important; min-width: 0; display: block !important; }
html.ck-p-browse .lrow__title { font-size: 15.5px !important; font-weight: 600 !important; color: var(--ck-strong) !important; line-height: 1.3 !important; display: -webkit-box !important; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin: 0 !important; }
html.ck-p-browse .lrow__meta { display: flex !important; flex-wrap: wrap; gap: 5px 6px; align-items: center; margin: 0 !important; padding: 0 !important; width: auto !important; max-width: none !important; }
html.ck-p-browse .lrow__meta::before { content: attr(data-ck-line); flex-basis: 100%; margin-top: 2px; font-size: 13px; color: var(--ck-sub); }
html.ck-p-browse .lrow__meta > * { display: none !important; }
html.ck-p-browse .lrow__meta > .lrow__rating { display: inline-flex !important; order: 1; gap: 4px; align-items: center; height: 21px; padding: 0 7px; border-radius: 6px; background: var(--ck-field); color: var(--ck-strong) !important; font-size: 12.5px !important; font-weight: 600; }
html.ck-p-browse .lrow__rating svg { display: none !important; }
html.ck-p-browse .lrow__rating::before { content: "★"; color: #f5c443; font-size: 11px; }
html.ck-p-browse .lrow__rating[data-ck-zero] { font-size: 0 !important; gap: 0; }
html.ck-p-browse .lrow__rating[data-ck-zero]::before { content: "No rating"; color: var(--ck-sub); font-size: 12px; font-weight: 400; }
html.ck-p-browse .lrow__meta > .lrow__type, html.ck-p-browse .lrow__meta > .lrow__status { display: inline !important; order: 2; font-size: 10.5px !important; color: var(--ck-sub) !important; text-transform: uppercase !important; letter-spacing: .2px !important; white-space: nowrap; background: none !important; padding: 0 !important; }
html.ck-p-browse .lrow__meta > .lrow__status { order: 4; }
html.ck-p-browse .lrow__meta > .lrow__type + .lrow__dot { display: inline !important; order: 3; font-size: 0 !important; }
html.ck-p-browse .lrow__meta > .lrow__type + .lrow__dot::before { content: "·"; font-size: 12px; color: var(--ck-sub); }
html.ck-p-browse .lrow__desc, html.ck-p-browse .lrow__foot { display: none !important; }
html.ck-p-browse .npager { padding: 8px 16px 32px !important; }
html.ck-p-browse .npager__num { background: var(--ck-chip) !important; color: var(--ck-text) !important; border: 0 !important; }
html.ck-p-browse .npager__num.is-active { background: var(--ck-on) !important; color: var(--ck-on-ink) !important; }
/* comix.to's own full filter panel, opened from More filters */
html.ck-p-browse .filter-top { margin: 0 16px 8px !important; }

/* ---------- Discover = comix.to's home page shelves ---------- */
html.ck-p-discover main.layout { display: block !important; padding: 0 0 32px !important; max-width: none !important; }
html.ck-p-discover .side-col, html.ck-p-discover .announce, html.ck-p-discover .share-block, html.ck-p-discover section.section:not([data-ck-keep]) { display: none !important; }
html.ck-p-discover .main-col { width: auto !important; max-width: none !important; padding: 0 !important; }
html.ck-p-discover section.section[data-ck-keep] { margin: 0 !important; padding: 0 !important; }
html.ck-p-discover .section__header { display: flex !important; flex-wrap: nowrap !important; gap: 10px; justify-content: space-between; align-items: center; padding: 16px 16px 8px !important; margin: 0 !important; }
html.ck-p-discover .section__title-wrap { min-width: 0; }
html.ck-p-discover .section__title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin: 0 !important; font-size: 19px !important; font-weight: 700 !important; color: var(--ck-strong) !important; text-transform: none !important; letter-spacing: 0 !important; }
html.ck-p-discover .section__controls { display: flex !important; gap: 10px; align-items: center; }
html.ck-p-discover .section__controls .nav-btns { display: none !important; }
html.ck-p-discover .filter-group { display: flex !important; background: var(--ck-field) !important; border-radius: 9px; padding: 2px !important; gap: 0 !important; border: 0 !important; }
html.ck-p-discover .filter-btn { padding: 4px 12px !important; border-radius: 7px !important; color: var(--ck-sub) !important; background: transparent !important; font-size: 13px !important; border: 0 !important; }
html.ck-p-discover .filter-btn.is-active { background: var(--ck-on) !important; color: var(--ck-on-ink) !important; font-weight: 600; }
html.ck a.ck-all { flex-shrink: 0; display: flex; align-items: center; gap: 2px; color: var(--ck-sub); font-size: 14px; text-decoration: none; white-space: nowrap; }
html.ck a.ck-all svg { width: 14px; height: 14px; }
html.ck-p-discover .rail-swiper { padding: 0 16px !important; margin: 0 !important; overflow: hidden !important; }
html.ck-p-discover .rail-swiper .swiper-slide { width: 112px !important; margin-right: 12px !important; }
html.ck-p-discover section[data-ck-keep="big"] .rail-swiper .swiper-slide { width: 150px !important; }
html.ck-p-discover section[data-ck-keep="rank"] .rail-swiper .swiper-slide { width: 140px !important; }
html.ck-p-discover .card { text-align: left !important; display: block !important; background: transparent !important; border: 0 !important; padding: 0 !important; text-decoration: none; }
html.ck-p-discover .card__poster-wrap { position: relative; }
html.ck-p-discover .card__poster-wrap .poster { width: 100% !important; height: auto !important; aspect-ratio: 2 / 3; border-radius: 8px !important; overflow: hidden; padding: 0 !important; }
html.ck-p-discover .card__poster-wrap .poster img { width: 100% !important; height: 100% !important; object-fit: cover !important; }
html.ck-p-discover .card__reading-badge, html.ck-p-discover .card__progress { display: none !important; }
html.ck-p-discover .card__menu { position: absolute !important; top: 4px; right: 4px; left: auto !important; bottom: auto !important; opacity: 1 !important; z-index: 2; }
html.ck-p-discover .card__action { width: 24px !important; height: 24px !important; border-radius: 12px !important; background: rgba(0,0,0,.6) !important; color: #fff !important; display: grid !important; place-items: center; padding: 0 !important; border: 0 !important; }
html.ck-p-discover .card__action svg { width: 13px !important; height: 13px !important; }
html.ck-p-discover .card__body { text-align: left !important; align-items: flex-start !important; display: flex !important; flex-direction: column; padding: 6px 0 0 !important; gap: 2px; background: none !important; }
html.ck-p-discover .card__title { order: 1; font-size: 13.5px !important; font-weight: 600 !important; color: var(--ck-strong) !important; line-height: 1.25 !important; white-space: normal !important; display: -webkit-box !important; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
html.ck-p-discover .card__meta { order: 2; display: flex !important; justify-content: flex-start !important; gap: 0; font-size: 12px !important; color: var(--ck-sub) !important; background: none !important; padding: 0 !important; }
html.ck-p-discover .card__meta > * { color: var(--ck-sub) !important; font-size: 12px !important; background: none !important; padding: 0 !important; }
html.ck-p-discover .card__time::before { content: " · "; white-space: pre; }
html.ck-p-discover .card__rank-slot { position: relative; padding-left: 28px; display: block !important; }
html.ck-p-discover .card__rank { position: absolute !important; left: -2px !important; bottom: 52px !important; top: auto !important; z-index: 1; pointer-events: none; font: 800 64px/1 var(--ck-font) !important; color: var(--ck-bg) !important; -webkit-text-stroke: 2px #5a5175; background: none !important; width: auto !important; height: auto !important; }
html.ck-p-discover .card__rank::before { content: none !important; }
/* Latest updates: a short list instead of a grid */
html.ck-p-discover .grid-updates { display: flex !important; flex-direction: column; gap: 0 !important; padding: 0 !important; }
html.ck-p-discover .grid-updates > .card { display: grid !important; grid-template-columns: 46px minmax(0, 1fr); gap: 12px; align-items: center; padding: 6px 16px !important; }
html.ck-p-discover .grid-updates > .card:nth-child(n+9) { display: none !important; }
html.ck-p-discover .grid-updates .card__poster-wrap .poster { width: 46px !important; height: 64px !important; aspect-ratio: auto; border-radius: 6px !important; }
html.ck-p-discover .grid-updates .card__menu { display: none !important; }
html.ck-p-discover .grid-updates .card__body { padding: 0 !important; min-width: 0; }
html.ck-p-discover .grid-updates .card__title { font-size: 15px !important; -webkit-line-clamp: 1; }
html.ck-p-discover .ck-more-latest { display: flex; justify-content: flex-end; padding: 8px 16px 0; }

/* ---------- Filter sheet ---------- */
html.ck-sheet-open #ck-sdim { display: block; position: fixed; inset: 0; z-index: 80; background: rgba(0,0,0,.55); }
html.ck-sheet-open #ck-sheet { display: flex; }
#ck-sheet { position: fixed; left: 0; right: 0; bottom: 0; top: calc(env(safe-area-inset-top, 0px) + 40px); z-index: 81; flex-direction: column; background: var(--ck-raise); border-radius: 18px 18px 0 0; color: var(--ck-text); font: 15px/1.35 var(--ck-font); max-width: 600px; margin: 0 auto; }
#ck-sheet * { box-sizing: border-box; }
#ck-sheet button { all: unset; cursor: pointer; box-sizing: border-box; }
#ck-sheet .ck-grab { width: 38px; height: 5px; border-radius: 3px; background: var(--ck-line2); margin: 7px auto 0; flex-shrink: 0; }
#ck-sheet .ck-shd { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 6px 16px 10px; font-size: 17px; color: var(--ck-strong); border-bottom: 1px solid var(--ck-line); flex-shrink: 0; }
#ck-sheet .ck-shd button { font-size: 16px; color: var(--ck-sub); justify-self: start; min-height: 32px; }
#ck-sheet .ck-shd button.r { color: var(--ck-strong); font-weight: 600; justify-self: end; }
#ck-sheet .ck-sbody { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain; padding-bottom: 8px; }
#ck-sheet .ck-fs { padding: 12px 16px 8px; display: grid; gap: 8px; }
#ck-sheet .ck-fl { font-size: 12.5px; font-weight: 600; letter-spacing: .5px; text-transform: uppercase; color: var(--ck-sub); display: flex; justify-content: space-between; }
#ck-sheet .ck-fl i { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 400; color: var(--ck-tag); }
#ck-sheet .ck-subl { font-size: 12.5px; color: var(--ck-text); opacity: .8; }
#ck-sheet .ck-fc { display: flex; flex-wrap: wrap; gap: 7px; }
#ck-sheet .ck-c { height: 34px; padding: 0 12px; border-radius: 17px; border: 1px solid var(--ck-line2); display: inline-flex; gap: 4px; align-items: center; font-size: 14px; color: var(--ck-text); }
#ck-sheet .ck-c svg { width: 14px; height: 14px; }
#ck-sheet .ck-c.on { background: var(--ck-on); border-color: var(--ck-on); color: var(--ck-on-ink); font-weight: 600; }
#ck-sheet .ck-c.exc { border-color: var(--ck-bad-line); color: var(--ck-bad); text-decoration: line-through; font-weight: 600; background: var(--ck-bad-bg); }
#ck-sheet .ck-c.more { border-style: dashed; color: var(--ck-text); gap: 5px; }
#ck-sheet .ck-c.more svg { width: 13px; height: 13px; }
#ck-sheet .ck-sg { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); background: var(--ck-chip); border-radius: 10px; padding: 2px; gap: 2px; }
#ck-sheet .ck-sg button { text-align: center; padding: 7px 0; border-radius: 8px; font-size: 14px; color: var(--ck-text); }
#ck-sheet .ck-sg button.on { background: var(--ck-on); color: var(--ck-on-ink); font-weight: 600; }
#ck-sheet .ck-legend { font-size: 12.5px; color: var(--ck-sub); }
#ck-sheet .ck-inp { height: 38px; border-radius: 10px; background: var(--ck-chip); display: flex; gap: 8px; align-items: center; padding: 0 12px; flex: 1; min-width: 0; }
#ck-sheet .ck-inp.small { flex: 0 0 96px; height: 34px; border-radius: 17px; }
#ck-sheet .ck-inp input { all: unset; flex: 1; min-width: 0; color: var(--ck-strong); font-size: 16px; }
#ck-sheet .ck-inp input::placeholder { color: var(--ck-sub); }
#ck-sheet .ck-pair { display: flex; gap: 8px; align-items: center; color: var(--ck-sub); font-size: 14px; }
#ck-sheet .ck-mf { margin: 10px 16px 4px; padding: 12px 14px; border-radius: 12px; background: var(--ck-field); display: flex; justify-content: space-between; align-items: center; gap: 10px; width: calc(100% - 32px); }
#ck-sheet .ck-mf.open { background: transparent; border: 1px solid var(--ck-line2); }
#ck-sheet .ck-mf > span { display: grid; gap: 2px; min-width: 0; }
#ck-sheet .ck-mf b { font-size: 15.5px; color: var(--ck-strong); }
#ck-sheet .ck-mf small { font-size: 12.5px; color: var(--ck-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#ck-sheet .ck-mf small i { font-style: normal; color: var(--ck-tag); }
#ck-sheet .ck-mf svg { width: 13px; height: 13px; flex-shrink: 0; }
#ck-sheet .ck-wide { margin: 12px 16px 4px; padding: 12px 14px; border-radius: 12px; border: 1px dashed var(--ck-line2); display: grid; gap: 2px; width: calc(100% - 32px); }
#ck-sheet .ck-wide b { font-size: 15px; color: var(--ck-strong); }
#ck-sheet .ck-wide small { font-size: 13px; color: var(--ck-sub); }
#ck-sheet .ck-gobar { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 8px; padding: 8px 16px calc(12px + env(safe-area-inset-bottom, 0px)); border-top: 1px solid var(--ck-line); flex-shrink: 0; }
#ck-sheet .ck-gobar.naming { grid-template-columns: minmax(0, 1fr) 96px; }
#ck-sheet .ck-go { height: 48px; border-radius: 14px; background: var(--ck-on); color: var(--ck-on-ink); font-weight: 700; font-size: 16px; text-align: center; display: grid; place-items: center; }
#ck-sheet .ck-save { height: 48px; border-radius: 14px; background: var(--ck-tag-bg); color: var(--ck-tag); font-weight: 700; font-size: 15px; display: flex; gap: 6px; align-items: center; justify-content: center; }
#ck-sheet .ck-save svg { width: 14px; height: 14px; }
#ck-sheet .ck-name { height: 48px; border-radius: 14px; background: var(--ck-chip); display: flex; align-items: center; padding: 0 14px; }
#ck-sheet .ck-name input { all: unset; flex: 1; min-width: 0; color: var(--ck-strong); font-size: 16px; }

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
html.ck-p-hist a.hitem.ck-first::after { background-color: var(--ck-on); color: var(--ck-on-ink); }
html.ck-p-hist.ck-tools a.hitem::after { visibility: hidden; }
html.ck-p-hist .hitem__remove { position: absolute !important; right: 12px; top: 50%; transform: translateY(-50%); }

/* ---------- More (our own page, links to the site's own pages) ---------- */
html.ck-p-more body > :not([id^="ck-"]) { display: none !important; }
html.ck-p-more #ck-more { display: block; padding: 0 16px 40px; font-family: var(--ck-font); }
#ck-more h2 { margin: 0; padding: 14px 14px 6px; font-size: 13px; font-weight: 600; letter-spacing: .4px; text-transform: uppercase; color: var(--ck-sub); }
#ck-more .ck-group { border-radius: 12px; background: var(--ck-raise); overflow: hidden; }
#ck-more .ck-row { all: unset; box-sizing: border-box; width: 100%; cursor: pointer; min-height: 46px; padding: 0 14px; display: grid; grid-template-columns: 28px 1fr auto; gap: 10px; align-items: center; color: var(--ck-strong); font-size: 16px; border-top: 1px solid var(--ck-line); }
#ck-more .ck-row:first-child { border-top: 0; }
#ck-more .ck-row > svg { width: 20px; height: 20px; color: var(--ck-sub); }
#ck-more .ck-row .ck-chev { width: 16px; height: 16px; color: var(--ck-sub); }
#ck-more .ck-row .ck-del { color: var(--ck-bad); font-size: 15px; }
#ck-more .ck-empty { padding: 12px 14px; color: var(--ck-sub); font-size: 14px; }
#ck-more .ck-switch { width: 51px; height: 31px; border-radius: 16px; background: var(--ck-line2); position: relative; transition: background .15s; }
#ck-more .ck-switch::after { content: ""; position: absolute; left: 2px; top: 2px; width: 27px; height: 27px; border-radius: 14px; background: #fff; transition: transform .15s; }
#ck-more [aria-checked="true"] .ck-switch { background: var(--ck-on); }
#ck-more [aria-checked="true"] .ck-switch::after { transform: translateX(20px); }
#ck-more .ck-note { padding: 16px 14px 0; font-size: 12.5px; color: var(--ck-sub); }

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
html.ck-p-title .mpage__stat strong { color: var(--ck-text) !important; margin-right: 3px; }
html.ck-p-title .mpage__cta, html.ck-p-title .mpage__desc-wrap, html.ck-p-title .mpage__actions, html.ck-p-title .mpage__details-shell { grid-column: 1 / -1; min-width: 0; }
html.ck-p-title .share-block, html.ck-p-title .mpage__rate-stack, html.ck-p-title .mpage__crumbs, html.ck-p-title .mpage__alts, html.ck-p-title .mpage__cta-report { display: none !important; }
html.ck-p-title .mpage__title { font-size: 21px !important; line-height: 1.25 !important; margin: 0 0 2px !important; color: var(--ck-strong) !important; }
html.ck-p-title .mpage__credits, html.ck-p-title .mpage__byline { font-size: 12.5px !important; color: var(--ck-sub) !important; }
html.ck-p-title .mpage__badges { gap: 4px !important; margin: 4px 0 !important; }
html.ck-p-title .mpage__badge { font-size: 10.5px !important; padding: 1px 6px !important; background: var(--ck-chip) !important; color: var(--ck-text) !important; }
html.ck-p-title .mpage__cta { display: flex !important; flex-wrap: wrap !important; gap: 10px !important; align-items: center; margin: 14px 0 0 !important; }
html.ck-p-title .mpage__cta .mpage__read { flex: 1 1 100%; height: 48px; border-radius: 24px !important; padding: 0 18px !important; background: var(--ck-on) !important; color: var(--ck-on-ink) !important; font-size: 16px !important; font-weight: 600 !important; display: flex !important; gap: 8px; align-items: center; justify-content: center; box-shadow: none !important; }
html.ck-p-title .mpage__cta-aux { display: flex !important; flex: none; gap: 8px; min-width: 0; }
html.ck-p-title .mpage__cta-aux .mpage__collect, html.ck-p-title .mpage__cta-aux .mpage__rate { display: none !important; }
html.ck-p-title .mpage__follow-btn { height: 48px !important; border-radius: 24px !important; padding: 0 16px !important; }
html.ck-p-title .mpage__desc-wrap { margin-top: 12px !important; }
html.ck-p-title .mpage__desc { font-size: 14px !important; line-height: 20px !important; }
html.ck-p-title .mpage__side, html.ck-p-title section.cm-widget, html.ck-p-title #mal-sync { display: none !important; }
html.ck-p-title .mpage__body { padding: 0 !important; }
html.ck-p-title .mpage__sec-head { padding: 12px 16px 4px !important; }
html.ck-p-title .mpage__sec-title { font-size: 18px !important; color: var(--ck-strong) !important; }
html.ck-p-title .mchap-toolbar { padding: 4px 16px !important; }
html.ck-p-title ul.mchap-list { padding: 0 !important; gap: 0 !important; }
html.ck-p-title li.mchap-item { background: transparent !important; border: 0 !important; border-bottom: 1px solid var(--ck-line) !important; border-radius: 0 !important; padding: 9px 16px !important; margin: 0 !important; }
html.ck-p-title .mchap-row__ch { font-size: 15px !important; color: var(--ck-strong) !important; font-weight: 500 !important; }
html.ck-p-title .mchap-row__secondary { font-size: 12.5px !important; color: var(--ck-sub) !important; }
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
html.ck-p-reader.ck-ui #ck-rtop { display: grid; position: fixed; left: 0; right: 0; top: 0; z-index: 70; background: rgba(21,19,28,.92); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px); padding: calc(6px + env(safe-area-inset-top, 0px)) 10px 6px; grid-template-columns: 44px minmax(0, 1fr); gap: 6px; align-items: center; font-family: var(--ck-font); }
#ck-rtop a { all: unset; cursor: pointer; color: var(--ck-strong); display: grid; place-items: center; width: 44px; height: 44px; }
#ck-rtop a svg { width: 22px; height: 22px; }
#ck-rtop b { display: block; color: var(--ck-strong); font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#ck-rtop small { color: var(--ck-sub); font-size: 12.5px; }
`;

    const svg = (body, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}>${body}</svg>`;
    const LINE = 'fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"';
    const BOLD = 'fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"';
    const ICON = {
        back: svg('<path d="M15 5l-7 7 7 7"/>', 'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"'),
        search: svg('<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>', 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"'),
        filter: svg('<path d="M4 6h16M7 12h10M10 18h4"/>', 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"'),
        trash: svg('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>', 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'),
        down: svg('<path d="M6 9l6 6 6-6"/>', 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"'),
        check: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'class="ck-check" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"'),
        tick: svg('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"'),
        x: svg('<path d="M6 6l12 12M18 6L6 18"/>', 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"'),
        dn: svg('<path d="M6 9l6 6 6-6"/>', BOLD),
        up: svg('<path d="M6 15l6-6 6 6"/>', BOLD),
        star: svg('<path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/>', 'fill="currentColor"'),
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
        { k: 'browse', name: 'Browse', href: DISCOVER },
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

    const PAGE_CLASSES = ['ck-p-lib', 'ck-p-hist', 'ck-p-browse', 'ck-p-discover', 'ck-p-more', 'ck-p-title', 'ck-p-reader', 'ck-p-other', 'ck-headed'];

    function pageKind() {
        const p = location.pathname;
        const tab = new URLSearchParams(location.search).get('tab');
        if (p === '/user' && location.hash === '#ck-more') return 'more';
        if (p === '/user' && tab === 'titles') return 'lib';
        if (p === '/user' && tab === 'history') return 'hist';
        if (p === '/browse') return 'browse';
        if (p === '/' && location.hash === '#ck-discover') return 'discover';
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
    function setHTML(node, html) {
        if (node && node.ckHtml !== html) { node.ckHtml = html; node.innerHTML = html; }
    }

    function el(html) {
        const box = document.createElement('div');
        box.innerHTML = html.trim();
        return box.firstElementChild;
    }
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

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

    // ---------- Browse addresses <-> filters ----------
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    function blankFilters() {
        return { q: '', sort: LATEST, types: [], statuses: [], genres: {}, extraIn: [], extraEx: [], match: 'all', demos: [], ratings: DEFAULT_RATINGS.slice(), min: '', yFrom: '', yTo: '', keep: [] };
    }
    function parseFilters(search) {
        const p = new URLSearchParams(search);
        const f = blankFilters();
        const list = (k) => (p.get(k) || '').split(',').map(s => s.trim()).filter(Boolean);
        f.q = p.get('q') || '';
        f.sort = p.get('sort') || (f.q ? 'relevance:desc' : LATEST);
        f.types = list('types').map(cap).filter(t => TYPES.includes(t));
        f.statuses = list('statuses').map(v => Object.keys(STATUSES).find(k => STATUSES[k] === v)).filter(Boolean);
        for (const [key, mark, extra] of [['genres_in', 'inc', f.extraIn], ['genres_ex', 'exc', f.extraEx]]) {
            for (const id of list(key)) { if (GENRE_NAMES[id]) f.genres[GENRE_NAMES[id]] = mark; else extra.push(id); }
        }
        f.match = p.get('genres_mode') === 'or' ? 'any' : 'all';
        f.demos = list('demos').map(v => Object.keys(DEMOS).find(k => DEMOS[k] === v)).filter(Boolean);
        if (p.has('content_rating')) f.ratings = list('content_rating').map(cap).filter(r => RATINGS.includes(r));
        f.min = p.get('min_chap') || '';
        f.yFrom = p.get('year_from') || '';
        f.yTo = p.get('year_to') || '';
        for (const [k, v] of p) if (!KNOWN_PARAMS.includes(k)) f.keep.push([k, v]);
        return f;
    }
    const sameList = (a, b) => a.slice().sort().join() === b.slice().sort().join();
    function buildSearch(f) {
        const p = new URLSearchParams();
        if (f.q) p.set('q', f.q);
        p.set('sort', f.sort);
        if (f.types.length) p.set('types', f.types.map(t => t.toLowerCase()).join(','));
        if (f.statuses.length) p.set('statuses', f.statuses.map(s => STATUSES[s]).join(','));
        const inc = Object.keys(f.genres).filter(g => f.genres[g] === 'inc').map(g => GENRE_IDS[g]).concat(f.extraIn);
        const exc = Object.keys(f.genres).filter(g => f.genres[g] === 'exc').map(g => GENRE_IDS[g]).concat(f.extraEx);
        if (inc.length) p.set('genres_in', inc.join(','));
        if (exc.length) p.set('genres_ex', exc.join(','));
        if (inc.length && f.match === 'any') p.set('genres_mode', 'or');
        if (f.demos.length) p.set('demos', f.demos.map(d => DEMOS[d]).join(','));
        if (!sameList(f.ratings, DEFAULT_RATINGS) && f.ratings.length) p.set('content_rating', f.ratings.map(r => r.toLowerCase()).join(','));
        if (f.min) p.set('min_chap', f.min);
        if (f.yFrom) p.set('year_from', f.yFrom);
        if (f.yTo) p.set('year_to', f.yTo);
        for (const [k, v] of f.keep) p.append(k, v);
        return p.toString().replace(/%2C/g, ',').replace(/%3A/g, ':');
    }
    function countOn(f) {
        let n = 0;
        if (f.types.length) n++;
        if (f.statuses.length) n++;
        if (Object.keys(f.genres).length || f.extraIn.length || f.extraEx.length) n++;
        if (f.demos.length) n++;
        if (!sameList(f.ratings, DEFAULT_RATINGS)) n++;
        if (f.min) n++;
        if (f.yFrom || f.yTo) n++;
        if (f.keep.length) n++;
        return n;
    }
    const browseUrl = (f) => '/browse?' + buildSearch(f);
    const go = (f) => location.assign(browseUrl(f));
    function readPresets() {
        try { const v = JSON.parse(localStorage.getItem(PRESETS_KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; }
    }
    function writePresets(list) { writeStore(PRESETS_KEY, list); }
    // A preset matches the page when the addresses say the same thing (page number and search words aside)
    const presetKey = (search) => { const f = parseFilters(search); f.q = ''; return buildSearch(f); };

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
      <button id="ck-search" data-for="lib" aria-label="Search">${ICON.search}</button>
      <button id="ck-filter" data-for="lib" aria-label="Filter and sort">${ICON.filter}</button>
      <button id="ck-edit" data-for="hist" aria-label="Remove from history">${ICON.trash}</button>
    </div>
  </div>
  <div class="ck-bx">
    <form id="ck-sform" role="search"><label>${ICON.search}<input id="ck-q" type="search" enterkeyhint="search" placeholder="Search titles" autocomplete="off" autocapitalize="off"><button type="button" id="ck-qx" aria-label="Clear search">${ICON.x}</button></label><button type="button" id="ck-fbtn" aria-label="Filters">${ICON.filter}<span id="ck-fn"></span></button></form>
    <div class="ck-row" id="ck-saved"></div>
    <div class="ck-row" id="ck-pills"></div>
    <div class="ck-row" id="ck-active"></div>
  </div>
  <div id="ck-menu" role="menu">${menu}</div>
</div>`));
        document.body.appendChild(el('<div id="ck-dim"></div>'));
        document.body.appendChild(el(`<div id="ck-rtop"><a id="ck-rback" aria-label="Back to title">${ICON.back}</a><div><b id="ck-rtitle"></b><small id="ck-rch"></small></div></div>`));
        document.body.appendChild(el('<div id="ck-sdim"></div>'));
        document.body.appendChild(el('<div id="ck-sheet" role="dialog" aria-modal="true" aria-label="Filters"></div>'));
        document.body.appendChild(buildMore());

        // Back from a title page goes to the list page it was opened from, even after reading a chapter in between
        document.getElementById('ck-back').addEventListener('click', () => {
            let from = null;
            try { from = sessionStorage.getItem(FROM_KEY); } catch (e) {}
            location.assign(from || LIBRARY);
        });
        document.getElementById('ck-switch').addEventListener('click', () => {
            const open = root.classList.toggle('ck-menu');
            document.getElementById('ck-switch').setAttribute('aria-expanded', String(open));
        });
        document.getElementById('ck-dim').addEventListener('click', closeMenu);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeMenu(); closeSheet(); } });
        const toggleTools = () => root.classList.toggle('ck-tools');
        for (const id of ['ck-filter', 'ck-edit', 'ck-cfilter']) document.getElementById(id).addEventListener('click', toggleTools);
        const search = () => {
            root.classList.add('ck-tools');
            const input = document.querySelector('.filter-search input, .mchap-search input');
            if (input) setTimeout(() => input.focus(), 50);
        };
        document.getElementById('ck-search').addEventListener('click', search);
        document.getElementById('ck-csearch').addEventListener('click', search);

        // Browse search: keeps the filters that are on, sorts by best match unless another sort was picked
        document.getElementById('ck-sform').addEventListener('submit', (e) => {
            e.preventDefault();
            const q = document.getElementById('ck-q').value.trim();
            const f = pageKind() === 'browse' ? parseFilters(location.search) : blankFilters();
            f.q = q;
            if (q && f.sort === LATEST) f.sort = 'relevance:desc';
            if (!q && f.sort === 'relevance:desc') f.sort = LATEST;
            go(f);
        });
        document.getElementById('ck-q').addEventListener('input', (e) => document.getElementById('ck-sform').classList.toggle('has-q', !!e.target.value));
        document.getElementById('ck-qx').addEventListener('click', () => {
            const input = document.getElementById('ck-q');
            if (pageKind() === 'browse' && new URLSearchParams(location.search).get('q')) {
                const f = parseFilters(location.search);
                f.q = '';
                if (f.sort === 'relevance:desc') f.sort = LATEST;
                go(f);
                return;
            }
            input.value = '';
            document.getElementById('ck-sform').classList.remove('has-q');
            input.focus();
        });
        document.getElementById('ck-fbtn').addEventListener('click', openSheet);
        document.getElementById('ck-sdim').addEventListener('click', closeSheet);
        document.getElementById('ck-sheet').addEventListener('click', onSheetClick);
        document.getElementById('ck-sheet').addEventListener('input', onSheetInput);
        document.getElementById('ck-sheet').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'ck-pname') savePreset(); });
    }

    function buildMore() {
        const groups = MORE_LINKS.map(([title, rows]) => `<h2>${title}</h2><div class="ck-group">${rows.map(([label, href, icon]) =>
            `<a class="ck-row" href="${href}">${svg(icon, LINE)}<span>${label}</span>${ICON.chev}</a>`).join('')}</div>`).join('');
        const box = el(`
<div id="ck-more">
  <h2>Skin</h2>
  <div class="ck-group"><button class="ck-row" id="ck-home" role="switch" aria-checked="${homeOpensLibrary()}">${svg('<path d="M4 11l8-7 8 7v9H4z"/>', LINE)}<span>Open Library first</span><span class="ck-switch"></span></button></div>
  <h2>Saved filters</h2>
  <div class="ck-group" id="ck-presets"></div>
  ${groups}
  <p class="ck-note">Comix Tachimanga Skin 1.2.0 · Purple night</p>
</div>`);
        box.querySelector('#ck-home').addEventListener('click', (e) => {
            const on = e.currentTarget.getAttribute('aria-checked') !== 'true';
            e.currentTarget.setAttribute('aria-checked', String(on));
            try { localStorage.setItem(HOME_KEY, on ? '1' : '0'); } catch (err) {}
        });
        box.querySelector('#ck-presets').addEventListener('click', (e) => {
            const b = e.target.closest('[data-del]');
            if (!b) return;
            e.preventDefault();
            const list = readPresets();
            list.splice(Number(b.dataset.del), 1);
            writePresets(list);
            renderPresetList();
        });
        return box;
    }
    function renderPresetList() {
        const list = readPresets();
        setHTML(document.getElementById('ck-presets'), list.length
            ? list.map((p, i) => `<a class="ck-row" href="/browse?${esc(p.qs)}">${svg(PAGE_ICON.browse, LINE)}<span>${esc(p.name)}</span><span class="ck-del" data-del="${i}" role="button">Remove</span></a>`).join('')
            : '<div class="ck-empty">None yet. Press Save in the Browse filter sheet.</div>');
    }

    const TITLES = { lib: 'Library', hist: 'History', browse: 'Browse', discover: 'Browse', more: 'More' };

    function applyPage() {
        const kind = pageKind();
        const want = ['ck-p-' + kind];
        if (['lib', 'hist', 'browse', 'discover', 'more', 'title'].includes(kind)) want.push('ck-headed');
        for (const c of PAGE_CLASSES) root.classList.toggle(c, want.includes(c));
        if (kind !== 'reader') root.classList.remove('ck-ui');
        if (['lib', 'hist', 'browse', 'discover', 'more'].includes(kind)) {
            try { sessionStorage.setItem(FROM_KEY, location.pathname + location.search + location.hash); } catch (e) {}
        }

        setText(document.getElementById('ck-name'), TITLES[kind] || '');
        if (!['lib', 'hist', 'browse'].includes(kind)) setText(document.getElementById('ck-sub'), '');
        document.querySelectorAll('#ck-menu a').forEach(a => a.classList.toggle('on', a.dataset.k === kind || (kind === 'discover' && a.dataset.k === 'browse')));

        if (kind === 'lib') decorateLibrary();
        if (kind === 'browse' || kind === 'discover') decorateBrowseHeader(kind);
        if (kind === 'browse') decorateBrowse();
        if (kind === 'discover') decorateDiscover();
        if (kind === 'hist') decorateHistory();
        if (kind === 'title') decorateTitle();
        if (kind === 'reader') decorateReader();
        if (kind === 'more') renderPresetList();
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
            let goBtn = row.querySelector(':scope > a.ck-go');
            if (!goBtn) {
                goBtn = document.createElement('a');
                goBtn.className = 'ck-go';
                row.appendChild(goBtn);
            }
            const saved = resume[titleId(href)];
            const started = p && p.read > 0;
            const fresh = started && saved && parseFloat(saved.ch) === p.read;
            setAttr(goBtn, 'href', fresh ? saved.href : `${href}#ck-resume-${started ? fmt(p.read) : 0}`);
            setText(goBtn, started ? `Ch. ${fmt(p.read)}` : 'Start');
            goBtn.classList.toggle('on', group === 'c');
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
            // Kenji's folder order, left to right
            const pos = FOLDER_ORDER.indexOf(b.textContent.trim());
            if (pos >= 0 && b.style.order !== String(pos)) b.style.order = pos;
        }
        let line = total === null ? '' : `${total.toLocaleString('en-US')} title${total === 1 ? '' : 's'}`;
        if (total !== null && rows.length === total && rows.length) line += ` · ${left.toLocaleString('en-US')} chapters left`;
        setText(document.getElementById('ck-sub'), line);
    }

    // ---------- Browse and Discover header rows ----------
    function activeChips(f) {
        const out = [];
        const without = (fn) => { const g = JSON.parse(JSON.stringify(f)); fn(g); return browseUrl(g); };
        const inc = Object.keys(f.genres).filter(k => f.genres[k] === 'inc');
        const exc = Object.keys(f.genres).filter(k => f.genres[k] === 'exc');
        if (f.types.length) out.push([f.types.join(' + '), without(g => { g.types = []; })]);
        if (f.statuses.length) out.push([f.statuses.join(' + '), without(g => { g.statuses = []; })]);
        if (inc.length || f.extraIn.length) out.push([inc.join(f.match === 'all' ? ' + ' : ' or ') + (f.extraIn.length ? ` +${f.extraIn.length} tag${f.extraIn.length > 1 ? 's' : ''}` : ''), without(g => { for (const k in g.genres) if (g.genres[k] === 'inc') delete g.genres[k]; g.extraIn = []; })]);
        if (exc.length || f.extraEx.length) out.push(['No ' + exc.concat(f.extraEx.length ? [`${f.extraEx.length} tag${f.extraEx.length > 1 ? 's' : ''}`] : []).join(', '), without(g => { for (const k in g.genres) if (g.genres[k] === 'exc') delete g.genres[k]; g.extraEx = []; })]);
        if (f.demos.length) out.push([f.demos.join(' + '), without(g => { g.demos = []; })]);
        if (!sameList(f.ratings, DEFAULT_RATINGS)) out.push([f.ratings.join(' + '), without(g => { g.ratings = DEFAULT_RATINGS.slice(); })]);
        if (f.min) out.push([`${f.min}+ ch`, without(g => { g.min = ''; })]);
        if (f.yFrom || f.yTo) out.push([`${f.yFrom || '…'} to ${f.yTo || 'now'}`, without(g => { g.yFrom = ''; g.yTo = ''; })]);
        if (f.keep.length) out.push(['Author, artist or tag', without(g => { g.keep = []; })]);
        return out;
    }

    function decorateBrowseHeader(kind) {
        const f = kind === 'browse' ? parseFilters(location.search) : blankFilters();
        const input = document.getElementById('ck-q');
        if (input && document.activeElement !== input && input.value !== f.q) input.value = f.q;
        document.getElementById('ck-sform').classList.toggle('has-q', !!(input && input.value));
        const n = countOn(f);
        document.getElementById('ck-fbtn').classList.toggle('on', n > 0);
        setText(document.getElementById('ck-fn'), n ? String(n) : '');

        const here = kind === 'browse' ? presetKey(location.search) : null;
        const presets = readPresets();
        const presetOn = presets.findIndex(p => presetKey(p.qs) === here);
        setHTML(document.getElementById('ck-saved'), presets.length
            ? '<span class="ck-lbl">Saved</span>' + presets.map((p, i) => `<a class="ck-preset${i === presetOn ? ' on' : ''}" href="${i === presetOn ? DISCOVER : '/browse?' + esc(p.qs)}">${i === 0 ? ICON.star : ''}${esc(p.name)}</a>`).join('')
            : '');
        const pillOn = kind === 'discover' ? 'discover' : f.sort;
        setHTML(document.getElementById('ck-pills'), PILLS.map(([k, label]) => {
            const href = k === 'discover' ? DISCOVER : browseUrl(Object.assign(blankFilters(), kind === 'browse' ? parseFilters(location.search) : {}, { sort: k, q: '' }));
            return `<a class="${pillOn === k ? 'on' : ''}" href="${esc(href)}">${label}</a>`;
        }).join(''));
        const chips = kind === 'browse' ? activeChips(f) : [];
        setHTML(document.getElementById('ck-active'), chips.length
            ? chips.map(([label, href]) => `<a href="${esc(href)}">${esc(label)} ${ICON.x}</a>`).join('') + `<a class="ck-clr" href="${esc(browseUrl(Object.assign(blankFilters(), { sort: f.sort, q: f.q })))}">Clear</a>`
            : '');

        if (kind === 'browse') {
            const sub = f.q ? `Results for “${f.q}”` : (presetOn >= 0 ? presets[presetOn].name + ' · ' : '') + (SORTS[f.sort] || '');
            setText(document.getElementById('ck-sub'), sub);
        }
    }

    let luckyDone = false;
    function decorateBrowse() {
        markTools(['.filter-top', '.filter-top + div']);
        if (location.hash === '#ck-full') root.classList.add('ck-tools');
        if (location.hash === '#ck-lucky' && !luckyDone) {
            const lucky = [...document.querySelectorAll('button')].find(b => /feeling lucky/i.test(b.textContent));
            if (lucky) { luckyDone = true; history.replaceState(history.state, '', location.pathname + location.search); lucky.click(); }
        }
        for (const meta of document.querySelectorAll('.lrow__meta')) {
            const row = meta.closest('.lrow');
            const ch = meta.querySelector('.lrow__ch');
            const foot = row && row.querySelector('.lrow__foot');
            const chText = ch ? ch.textContent.trim().replace(/^ch\./i, 'Ch.') : '';
            const ago = foot ? foot.textContent.trim() : '';
            setAttr(meta, 'data-ck-line', [chText, ago].filter(Boolean).join(' · '));
        }
        document.querySelectorAll('.lrow__rating').forEach(r => setAttr(r, 'data-ck-zero', /^\s*0(\.0)?\s*$/.test(r.textContent) ? '' : null));
    }

    // Home page shelves kept on Discover, with where their "See all" goes
    const SHELVES = [
        ['Recommended for you', 'big', null],
        ['Most Recent Popular', 'rank', 'views_7d:desc'],
        ['Most Follows', 'rank', 'follows_total:desc'],
        ['Latest Updates', 'list', LATEST],
    ];
    function decorateDiscover() {
        for (const section of document.querySelectorAll('section.section')) {
            const title = section.querySelector('.section__title');
            const shelf = title && SHELVES.find(([name]) => title.textContent.trim().startsWith(name));
            setAttr(section, 'data-ck-keep', shelf ? shelf[1] : null);
            if (!shelf || !shelf[2]) continue;
            const header = section.querySelector('.section__header');
            const href = browseUrl(Object.assign(blankFilters(), { sort: shelf[2] }));
            if (shelf[1] === 'list') {
                if (!section.querySelector('.ck-more-latest')) section.appendChild(el(`<div class="ck-more-latest"><a class="ck-all" href="${href}">All latest updates ${ICON.chev}</a></div>`));
            } else if (header && !header.querySelector('.ck-all')) {
                header.appendChild(el(`<a class="ck-all" href="${href}">See all ${ICON.chev}</a>`));
            }
        }
    }

    // ---------- Filter sheet ----------
    let draft = null;
    let open = {};
    let naming = false;

    function openSheet() {
        draft = pageKind() === 'browse' ? parseFilters(location.search) : blankFilters();
        open = { sort: false, status: false, genres: false, more: false };
        naming = false;
        renderSheet(false);
        root.classList.add('ck-sheet-open');
    }
    function closeSheet() {
        root.classList.remove('ck-sheet-open');
        naming = false;
    }
    function applyDraft() {
        closeSheet();
        go(draft);
    }

    function chip(group, value, label, on, mark) {
        const cls = mark === 'exc' ? 'exc' : on ? 'on' : '';
        const icon = mark === 'exc' ? ICON.x : on ? ICON.tick : '';
        return `<button class="ck-c ${cls}" data-g="${group}" data-v="${esc(value)}">${icon}${esc(label)}</button>`;
    }
    const moreBtn = (key, label) => `<button class="ck-c more" data-open="${key}">${label} ${ICON.dn}</button>`;
    const lessBtn = (key) => `<button class="ck-c more" data-open="${key}">Show less ${ICON.up}</button>`;

    function renderSheet(keepScroll = true) {
        const sheet = document.getElementById('ck-sheet');
        const oldBody = sheet.querySelector('.ck-sbody');
        const top = keepScroll && oldBody ? oldBody.scrollTop : 0;
        const d = draft;
        const sortChip = (k, label) => chip('sort', k, label || SORTS[k], d.sort === k);
        const shortSorts = [LATEST, 'views_7d:desc', 'follows_total:desc', 'score:desc'];
        if (!shortSorts.includes(d.sort)) shortSorts.push(d.sort);
        const sortBody = open.sort
            ? `<div class="ck-fc">${[LATEST, 'follows_total:desc', 'score:desc', 'created_at:desc'].map(k => sortChip(k)).join('')}</div>
               <div class="ck-subl">Popular in the last</div>
               <div class="ck-sg">${[['views_7d:desc', '7 days'], ['views_30d:desc', '30 days'], ['views_90d:desc', '90 days'], ['views_total:desc', 'All time']].map(([k, l]) => `<button class="${d.sort === k ? 'on' : ''}" data-g="sort" data-v="${k}">${l}</button>`).join('')}</div>
               <div class="ck-subl">Other</div>
               <div class="ck-fc">${['title:asc', 'title:desc', 'year:desc', 'year:asc', 'relevance:desc'].map(k => sortChip(k)).join('')}${lessBtn('sort')}</div>`
            : `<div class="ck-fc">${shortSorts.map(k => sortChip(k, k === 'views_7d:desc' ? 'Popular' : null)).join('')}${moreBtn('sort', 'All 13')}</div>`;
        const statusNames = Object.keys(STATUSES);
        const shownStatus = open.status ? statusNames : statusNames.filter(s => s === 'Releasing' || s === 'Finished' || d.statuses.includes(s));
        const shownGenres = open.genres ? GENRES : GENRES.filter(g => FIRST_GENRES.includes(g) || d.genres[g]);
        const genresOn = Object.keys(d.genres).filter(g => GENRES.includes(g)).length;
        const minTyped = d.min && !['20', '50', '100'].includes(d.min) ? d.min : '';
        const moreOn = Object.keys(d.genres).filter(g => FORMATS.includes(g)).length + d.demos.length + (sameList(d.ratings, DEFAULT_RATINGS) ? 0 : 1) + ((d.yFrom || d.yTo) ? 1 : 0) + (d.keep.length ? 1 : 0);
        const fullHref = `/browse?${buildSearch(d)}#ck-full`;
        const moreBody = !open.more ? '' : `
    <div class="ck-fs"><div class="ck-fl">Formats</div><div class="ck-fc">${FORMATS.map(v => chip('genres', v, v, d.genres[v] === 'inc', d.genres[v])).join('')}</div></div>
    <div class="ck-fs"><div class="ck-fl">Demographic</div><div class="ck-fc">${Object.keys(DEMOS).map(v => chip('demos', v, v, d.demos.includes(v))).join('')}</div></div>
    <div class="ck-fs"><div class="ck-fl">Content rating</div><div class="ck-fc">${RATINGS.map(v => chip('ratings', v, v, d.ratings.includes(v))).join('')}</div></div>
    <div class="ck-fs"><div class="ck-fl">Release year</div><div class="ck-pair"><label class="ck-inp"><input data-in="yFrom" inputmode="numeric" placeholder="From" value="${esc(d.yFrom)}"></label>to<label class="ck-inp"><input data-in="yTo" inputmode="numeric" placeholder="Now" value="${esc(d.yTo)}"></label></div></div>
    <a class="ck-wide" href="${esc(fullHref)}" data-full><b>Tags, authors and artists</b><small>Opens comix.to's own full filter with these filters on</small></a>
    <a class="ck-wide" href="/browse#ck-lucky"><b>I'm feeling lucky</b><small>Opens a random title</small></a>`;
        sheet.innerHTML = `<div class="ck-grab"></div>
  <div class="ck-shd"><button data-act="reset">Reset</button><b>Filters</b><button class="r" data-act="apply">Done</button></div>
  <div class="ck-sbody">
    <div class="ck-fs"><div class="ck-fl">Sort by</div>${sortBody}</div>
    <div class="ck-fs"><div class="ck-fl">Type</div><div class="ck-sg">${TYPES.map(v => `<button class="${d.types.includes(v) ? 'on' : ''}" data-g="types" data-v="${v}">${v}</button>`).join('')}</div></div>
    <div class="ck-fs"><div class="ck-fl">Status</div><div class="ck-fc">${shownStatus.map(v => chip('statuses', v, v, d.statuses.includes(v))).join('')}${open.status ? lessBtn('status') : moreBtn('status', `${statusNames.length - shownStatus.length} more`)}</div></div>
    <div class="ck-fs"><div class="ck-fl">Genres<i>${genresOn ? genresOn + ' on' : ''}</i></div>
      ${open.genres ? `<div class="ck-sg"><button class="${d.match === 'all' ? 'on' : ''}" data-match="all">Must have all</button><button class="${d.match === 'any' ? 'on' : ''}" data-match="any">Any of them</button></div><div class="ck-legend">Tap once = must have. Tap twice = hide it. Tap again = off.</div>` : ''}
      <div class="ck-fc">${shownGenres.map(v => chip('genres', v, v, d.genres[v] === 'inc', d.genres[v])).join('')}${open.genres ? lessBtn('genres') : moreBtn('genres', `${GENRES.length - shownGenres.length} more`)}</div></div>
    <div class="ck-fs"><div class="ck-fl">Chapters, at least</div><div class="ck-fc">${chip('min', '', 'Any', d.min === '')}${['20', '50', '100'].map(v => chip('min', v, v, d.min === v)).join('')}<label class="ck-inp small"><input data-in="min" inputmode="numeric" placeholder="Type…" value="${esc(minTyped)}"></label></div></div>
    <button class="ck-mf ${open.more ? 'open' : ''}" data-open="more"><span><b>More filters</b><small>${moreOn ? `<i>${moreOn} on · </i>` : ''}Formats, demographic, rating, year, tags…</small></span>${open.more ? ICON.up : ICON.dn}</button>
    ${moreBody}
  </div>
  ${naming
        ? `<div class="ck-gobar naming"><label class="ck-name"><input id="ck-pname" placeholder="Name, like My usual" maxlength="24" enterkeyhint="done"></label><button class="ck-save" data-act="savename">${ICON.tick}Save</button></div>`
        : `<div class="ck-gobar"><button class="ck-save" data-act="save">${ICON.star}Save</button><button class="ck-go" data-act="apply">Show results</button></div>`}`;
        const body = sheet.querySelector('.ck-sbody');
        if (body) body.scrollTop = top;
    }

    function onSheetClick(e) {
        const b = e.target.closest('button, a');
        if (!b) return;
        const ds = b.dataset;
        if (ds.full !== undefined) { closeSheet(); return; }
        if (ds.g) {
            const g = ds.g, v = ds.v;
            if (g === 'sort') draft.sort = v;
            else if (g === 'min') draft.min = v;
            else if (g === 'genres') { const cur = draft.genres[v]; if (!cur) draft.genres[v] = 'inc'; else if (cur === 'inc') draft.genres[v] = 'exc'; else delete draft.genres[v]; }
            else { const list = draft[g]; const i = list.indexOf(v); if (i < 0) list.push(v); else list.splice(i, 1); }
            renderSheet();
            return;
        }
        if (ds.match) { draft.match = ds.match; renderSheet(); return; }
        if (ds.open) { open[ds.open] = !open[ds.open]; renderSheet(); return; }
        if (ds.act === 'reset') { const q = draft.q; draft = blankFilters(); draft.q = q; renderSheet(); return; }
        if (ds.act === 'apply') { applyDraft(); return; }
        if (ds.act === 'save') { naming = true; renderSheet(); setTimeout(() => { const i = document.getElementById('ck-pname'); if (i) i.focus(); }, 30); return; }
        if (ds.act === 'savename') savePreset();
    }
    function onSheetInput(e) {
        const k = e.target.dataset.in;
        if (!k) return;
        draft[k] = e.target.value.replace(/[^\d]/g, '');
        if (k === 'min') document.querySelectorAll('#ck-sheet [data-g="min"]').forEach(b => {
            const on = b.dataset.v === draft.min;
            b.classList.toggle('on', on);
        });
    }
    function savePreset() {
        const input = document.getElementById('ck-pname');
        const list = readPresets();
        const name = ((input && input.value) || '').trim() || `Saved ${list.length + 1}`;
        const f = JSON.parse(JSON.stringify(draft));
        f.q = '';
        list.push({ name, qs: buildSearch(f) });
        writePresets(list);
        applyDraft();
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
            closeSheet();
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
