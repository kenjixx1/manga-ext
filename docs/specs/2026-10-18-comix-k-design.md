# Comix K — personal Comix extension for Tachimanga (iPhone)

Status: approved design, 2026-10-18. Next step: write the implementation plan.
Human review copy (Claude Doc): https://claude.ai/code/artifact/c26c7ea7-9bf7-4209-ab05-ceb2d12f96fd

## Goal

Read comix.to / comix.ws in **Tachimanga on iPhone**, with no ads and no redirects to unsafe
sites, using **one device only** (no server, no Mac running while reading).

- The website itself opens TikTok / YouTube / Instagram / unknown sites on tap.
- The official keiyoushi Comix extension (`keiyoushi/extensions-source`, `src/en/comix`,
  versionCode 52, libVersion 1.6) is built for Android and fails on iPhone.
- We build our own copy, **Comix K**, in our own public GitHub repo, installed in Tachimanga.

## What we found (evidence from the 2026-10-18 session)

### Tachimanga facts
- Tachimanga supports extension lib 1.6 since v4.16 (2026-06-30); v4.21 fixed custom
  User-Agents in its WebView. Source: https://tachimanga.app/docs/changelogs.html
- The user has "Solve captchas" ON in the official Comix extension settings.

### The 3 checks comix runs, and what happened on the user's iPhone

| Check | What it is | Result on iPhone |
|---|---|---|
| "Is it an app?" | Server-side. Returns a page titled "Third-party apps are not supported" (HTTP 503 in the app). The text is NOT in the site's JS bundles, so the server decides from the request. Not `X-Requested-With` (tested: any value loads fine on desktop). Most likely the User-Agent. | Blocked with Tachimanga's **Default** UA. **Passed** after setting Tachimanga → Advanced → User agent → **Mobile Safari**. |
| Cloudflare | "Just a moment..." challenge. Plain HTTP (curl) gets 403. | Plain request → `Request timeout. Please refresh or check website in WebView`. **Passed** after solving it by hand in Tachimanga's WebView. |
| Comix's own puzzle (WAF) | Site API answers `403 captcha_required`, then the site loads `/@waf/challenge` (see `Comix.kt` comment near line 967). | **Fails**: `Chapter pages failed: HTTP 403` when opening a chapter (title `comix.ws/title/392n`, chapter 1). |

The user could read the chapter fine inside the **visible** WebView with the Mobile Safari UA.

### How the official extension works (read this code first)
- `Comix.kt` `runInWebView` (~line 663): uses `keiyoushi.utils.runWebView` (`NativeWebViewApi`).
  Loads the page HTML (fetched by OkHttp) into a hidden WebView with `loadData`, injects a
  bootstrap script, and calls the **site's own API client** from inside the page.
- `userAgent = headers["User-Agent"]` (~line 676): the hidden WebView copies the app's UA.
- `interceptRequest { … }` (~lines 680-704): blocks unused paths, and when the frame for
  `WAF_CHALLENGE_PATH = "/@waf/challenge"` loads (Accept contains text/html) it either rejects
  ("Open in WebView to solve the captcha…") or, with Solve captchas on, swaps in
  `assets/solve_captcha.js`.
- `assets/site_api.js`: finds the site's route function + GET helper by scanning the
  `/assets/.../main-*.js` chunks via `import()`.
- `assets/chapter_pages.js`: calls the chapter route; on error rejects with
  `Chapter pages failed: HTTP <status>` and **throws away the response body**.
- `assets/chapter_list.js` + `Swipe.kt`: fake finger taps/swipes (Android `MotionEvent`) — used
  **only for the chapter list**, not for chapter pages. So taps do not explain this 403.
- `Descrambler.kt`: un-scrambles V3 grid-scrambled images (keep as-is).

### Working hypothesis (not proven)
On iPhone, Apple's WKWebView has no API to intercept normal http/https page loads
(`WKURLSchemeHandler` cannot register http/https). So Tachimanga's `interceptRequest` probably
never fires for the `/@waf/challenge` frame → the solver never starts → the site's 403 bubbles up.
Stage 2 exists to prove or disprove this.

## Design

| Part | Value |
|---|---|
| Project folder | `~/Documents/manga-ext` |
| GitHub repo | `kenjixx1/manga-ext`, **public** (Tachimanga cannot read private repos). Neutral name, no "comix". |
| Build | GitHub Actions builds the `.apk` on push, signs with the user's own key (GitHub secret), publishes `index.min.json` + apk to a `repo` branch |
| Install link | `https://raw.githubusercontent.com/kenjixx1/manga-ext/repo/index.min.json` (added in Tachimanga next to keiyoushi) |
| Extension | **Comix K**, own name and source ID so it coexists with official Comix |

### How the repo is made
1. Plain copy of `keiyoushi/extensions-source` (NOT a GitHub fork).
2. Delete every extension except `src/en/comix`; keep build tooling (`core`, `lib`, `lib-multisrc`
   if needed by the build, `common`, `compiler`, `gradle`, root gradle files, CI scripts).
3. Rename to Comix K with its own ID (folder name drives the package; check keiyoushi's
   gradle plugin for how `name`/id are derived).
4. Add keiyoushi as git remote `upstream` so Comix fixes can be pulled later.
5. Adapt keiyoushi's GitHub workflow to build only Comix K, sign with our key, and publish the
   `repo` branch.

### Stage 2: the test build (first Comix K)
A probe only. No behaviour change beyond these 3 points:
1. **Always iPhone Safari UA** in both OkHttp headers and the hidden WebView, regardless of the
   app setting:
   `Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1`
2. **Show the 403 reason**: `chapter_pages.js` includes the first ~200 chars of the error
   response body (`e.response.data`) in the reject message.
3. **Show what the hidden browser saw**: count of `interceptRequest` calls, and whether a
   `/@waf/challenge` frame load was seen, appended to the error.

Target error shape:
`Chapter pages failed: HTTP 403 · reply: {"error":"captcha_required"} · checked loads: 0 · puzzle page: no`

| Error shows | Meaning | Stage 3 direction |
|---|---|---|
| `captcha_required` + checked loads 0 | iPhone can't intercept loads; solver never starts | Start the solver from inside the page (e.g. watch for the challenge iframe via JS / MutationObserver and run the solver there) |
| `captcha_required` + checked loads > 0 | Interception works, solver fails on iPhone | Fix the solver, or let the user solve once by hand in visible WebView |
| Other reason | Different check | New design from the reason text |

Stage 3 gets its own design after the user sends the Stage 2 error text.

## Testing
1. GitHub Actions build passes.
2. Tachimanga lists the repo and installs Comix K.
3. Open `comix.ws/title/392n`, chapter 1.
4. User sends the full error text → picks Stage 3.

## Risks
- Comix may check something iPhone cannot reproduce → Stage 3 may end at "solve the puzzle by
  hand once in a while".
- Comix changes often (official extension went v48 → v52 between 2026-10-13 and 2026-10-18).
- Android build tools are needed; GitHub Actions has them, the Mac does not need them.

## Out of scope
- Any server / helper on another device.
- New comix features (filters, search, settings stay as upstream made them).
- Other manga sites.

## User working rules (from ~/.codex/AGENTS.md)
- Plain, short English; define any technical word before using it; bullets over paragraphs.
- Never `git add -A` / `git add .`; commit named paths only.
- Plans/specs for approval are shown as a readable page, not raw markdown.
