# Comix K Stage 2 (probe build) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Invoke `cc-bridge` before dispatching any implementer.

**Goal:** Ship the first Comix K build to Tachimanga: a copy of keiyoushi's Comix with its own name/ID, a Safari user agent, and an error message that tells us why chapter pages fail with HTTP 403 on iPhone.

**Architecture:** Plain copy of `keiyoushi/extensions-source` at commit `bca16780620c6a53dd02312a475593c4846c2126`, cut down to the build tooling plus `src/en/comix`. The folder stays `src/en/comix` (smaller diff against upstream); identity changes through the build DSL (`name`, `pkgName`). One GitHub Actions job builds, signs, and publishes a keiyoushi-format repo (`index.pb` + `index.json` + `repo.json` on branch `repo`, APK/JAR files in a GitHub Release).

**Tech Stack:** Kotlin Android extension (keiyoushi build-logic, Gradle 9.8.1, AGP, KSP), injected browser JavaScript, Python 3 + protobuf 7.35.1 publish script, GitHub Actions.

**Spec:** `docs/specs/2026-10-18-comix-k-design.md`

## Global Constraints

- Upstream base commit: `bca16780620c6a53dd02312a475593c4846c2126` (keiyoushi/extensions-source, 2026-10-17, Comix versionCode 52).
- GitHub repo: `kenjixx1/manga-ext`, **public**. Default branch `main`. Published branch `repo`.
- Extension name: `Comix K`. Package: `eu.kanade.tachiyomi.extension.en.comixk` (`pkgName = "en.comixk"`). Source ID: `3285188625626617474` (official Comix is `7537715367149829912`; they must differ).
- `libVersion = "1.6"`, `versionCode = 1` for this build (Android versionCode `106001`, versionName `1.6.1`, APK `tachiyomi-en.comixk-v1.6.1.apk`).
- Install link for Tachimanga: `https://github.com/kenjixx1/manga-ext/raw/repo/index.pb` (spec said `index.min.json`; keiyoushi retired that format, see "Spec deviations").
- Fallback iPhone Safari UA (exact): `Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1`
- Error separator is ` · ` (space, U+00B7 middle dot, space). Target error:
  `Chapter pages failed: HTTP 403 · reply: {"error":"captcha_required"} · checked loads: 0 · puzzle page: no · ua: app`
- No behaviour change beyond the 3 probe points. Do not touch filters, search, settings, `Descrambler.kt`, `Swipe.kt`, `chapter_list.js`, `solve_captcha.js`, `site_api.js`.
- Never commit `signingkey.jks`, passwords, or anything from `~/.manga-ext-signing/`. `.gitignore` already has `*.jks`.
- Git: never `git add -A` / `git add .`. Stage named paths only.
- Local build needs `ANDROID_HOME=$HOME/Library/Android/sdk` and `local.properties` with `sdk.dir=...` (gitignored). JDK 21 is on PATH and works (tested 2026-10-18: upstream Comix builds in ~90 s).

## Spec deviations (approved on the review page)

1. **Install link format.** keiyoushi's `index.min.json` now lists only an "Outdated App" stub; real extensions are in `index.pb` (protobuf "index v2") with APK/JAR in GitHub Releases. The user's working Comix install came from that format, so we publish the same format.
2. **User agent (D1).** Tachimanga's "Mobile Safari" UA is an iOS 26 string (changelog v4.10, 2025-11-18). Cloudflare ties its pass cookie to the UA. Forcing our iOS 18.5 string could break the Cloudflare check that already passes. So: keep the app UA when it is already iPhone Safari; otherwise use the fallback string. The error ends with `ua: app` or `ua: forced` so we know which one ran.
3. **Probe adds `ua:` tag** to the error (see 2).

## File map

| File | Status | Responsibility |
|---|---|---|
| `build.gradle.kts`, `settings.gradle.kts`, `gradle.properties`, `gradlew*`, `gradle/**`, `core/**`, `compiler/**`, `common/**`, `.editorconfig`, `.gitattributes`, `.gitignore`, `ktlintCodeStyle.xml`, `LICENSE`, `CONTRIBUTING.md` | copied from upstream, unchanged | Build tooling |
| `src/en/comix/**` | copied from upstream | The extension |
| `src/en/comix/build.gradle.kts` | modify | Name, pkgName, versionCode |
| `src/en/comix/src/eu/kanade/tachiyomi/extension/en/comix/Comix.kt` | modify | UA choice (Task 4), probe counters (Task 5) |
| `src/en/comix/assets/chapter_pages.js` | modify | Reply text in the error (Task 3) |
| `.github/scripts/{github_utils.py,index.proto,index_pb2.py,index_pb2.pyi,publish-repo.py}` | copied; `github_utils.py` + `publish-repo.py` modified | Publish the repo branch |
| `.github/workflows/build_push.yml` | create (new content) | Build, sign, publish |
| `tools/check_source_info.py` | create | Asserts the built identity |
| `tools/tests/chapter_pages.test.mjs` | create | Node test for the error text |
| `tools/tests/test_publish_repo.py` | create | Runs publish script against fake `gh` |
| `README.md`, `AGENTS.md` | create (ours) | What this repo is, how to sync upstream |

Not copied: all other `src/*`, `lib/`, `lib-multisrc/`, `ext-bootstrap.py`, upstream `AGENTS.md`/`CLAUDE.md`/`README.md`, `.github/ISSUE_TEMPLATE`, `.github/renovate.json`, `.github/pull_request_template.md`, other workflows, other scripts.

## Lanes

Task 1 runs first. Then two lanes share no file:

- **Lane A (extension):** Task 2 → 3 → 4 → 5. Files under `src/en/comix/` and `tools/check_source_info.py`, `tools/tests/chapter_pages.test.mjs`.
- **Lane B (pipeline):** Task 6 → 7. Files under `.github/` and `tools/tests/test_publish_repo.py`.

Task 8 (GitHub setup, outward-facing, run by the main session, not a cheap implementer) can run any time after Task 1. **Join:** Task 9 needs all of 1–8.

No task changes a screen, so there are no screenshot checks. The device test is Task 9's last step and is done by the user.

---

### Task 1: Import upstream build tooling and Comix

**Brief check:** files = everything in the "copied" rows of the file map plus `README.md`, `AGENTS.md`. Upstream SHA exact: `bca16780620c6a53dd02312a475593c4846c2126`. No code edits in this task.

**Files:**
- Create: copied tree (see file map), `README.md`, `AGENTS.md`

**Interfaces:**
- Produces: `./gradlew :src:en:comix:assembleRelease` works from the repo root; output in `src/en/comix/build/`.

- [ ] **Step 1: Fetch upstream at the pinned commit**

```bash
UP="$TMPDIR/kei-upstream"
rm -rf "$UP" && git init -q "$UP"
git -C "$UP" remote add origin https://github.com/keiyoushi/extensions-source.git
git -C "$UP" fetch -q --depth 1 --filter=blob:none origin bca16780620c6a53dd02312a475593c4846c2126
git -C "$UP" rev-parse FETCH_HEAD
```
Expected: `bca16780620c6a53dd02312a475593c4846c2126`

- [ ] **Step 2: Copy the kept paths into the repo**

```bash
cd ~/Documents/manga-ext
git -C "$UP" archive FETCH_HEAD \
  .editorconfig .gitattributes .gitignore LICENSE CONTRIBUTING.md \
  build.gradle.kts settings.gradle.kts gradle.properties gradlew gradlew.bat ktlintCodeStyle.xml \
  common compiler core gradle src/en/comix \
  .github/scripts/github_utils.py .github/scripts/index.proto \
  .github/scripts/index_pb2.py .github/scripts/index_pb2.pyi .github/scripts/publish-repo.py \
  | tar -x -C .
ls src src/en
```
Expected: `src` has only `en`; `src/en` has only `comix`.

- [ ] **Step 3: Write `README.md`**

```markdown
# manga-ext

Personal Tachimanga (iPhone) extension repo. One extension: **Comix K**, a copy of keiyoushi's
Comix with its own name and ID, so both can be installed side by side.

## Install in Tachimanga

Add this repo URL: `https://github.com/kenjixx1/manga-ext/raw/repo/index.pb`

## Where the code came from

Copied (not forked) from https://github.com/keiyoushi/extensions-source at
`bca16780620c6a53dd02312a475593c4846c2126`, cut down to the build tooling and `src/en/comix`.
License: Apache 2.0 (see `LICENSE`).

## Build

GitHub Actions builds, signs and publishes on every push to `main`
(`.github/workflows/build_push.yml`). Local build:

    export ANDROID_HOME=$HOME/Library/Android/sdk
    echo "sdk.dir=$ANDROID_HOME" > local.properties
    ./gradlew :src:en:comix:assembleRelease

Bump `versionCode` in `src/en/comix/build.gradle.kts` on every change, or Tachimanga will not
offer the update.
```

- [ ] **Step 4: Write `AGENTS.md`**

```markdown
# Agent rules for this repo

- This is a cut-down copy of keiyoushi/extensions-source (base `bca16780620c6a53dd02312a475593c4846c2126`).
  Read `CONTRIBUTING.md` before touching extension code; it is upstream's rulebook.
- The only extension is `src/en/comix` (published as **Comix K**, package `en.comixk`).
  Keep the folder name: a small diff against upstream makes Comix fixes easy to pull.
- Do not edit `core/`, `compiler/`, `common/`, `gradle/` unless the task says so.
- Pulling upstream fixes: `git fetch upstream`, then
  `git diff <old-base> <new-base> -- src/en/comix core compiler common gradle | git apply -3`,
  fix conflicts, update the base SHA here and in `README.md`.
- Check before commit: `./gradlew :src:en:comix:spotlessCheck :src:en:comix:assembleRelease`.
- Git: never `git add -A` or `git add .`. Stage named paths only.
- Never commit `*.jks`, passwords, or `local.properties`.
```

- [ ] **Step 5: Add the upstream remote and local SDK path**

```bash
git remote add upstream https://github.com/keiyoushi/extensions-source.git
echo "sdk.dir=$HOME/Library/Android/sdk" > local.properties
```

- [ ] **Step 6: Build to prove the copy is complete**

Run: `ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew :src:en:comix:assembleRelease`
Expected: `BUILD SUCCESSFUL`, and `ls src/en/comix/build/outputs/apk/release/` shows `tachiyomi-en.comix-v1.6.52.apk`.

- [ ] **Step 7: Commit**

```bash
git add .editorconfig .gitattributes .gitignore LICENSE CONTRIBUTING.md README.md AGENTS.md \
  build.gradle.kts settings.gradle.kts gradle.properties gradlew gradlew.bat ktlintCodeStyle.xml \
  common compiler core gradle src/en/comix .github/scripts
git status --short   # must show nothing untracked except local.properties is ignored
git commit -m "chore: import keiyoushi build tooling and Comix at bca1678"
```

---

### Task 2: Give the extension its own identity (Comix K)

**Brief check:** files = `src/en/comix/build.gradle.kts`, `tools/check_source_info.py`. Exact values: name `Comix K`, `pkgName = "en.comixk"`, `versionCode = 1`, expected source ID `3285188625626617474`. Source ID is `md5("comix k/en/1")` first 8 bytes, masked to a positive Long (`ExtensionPlugin.kt` `computeSourceId`); verified against the live Comix ID.

**Files:**
- Create: `tools/check_source_info.py`
- Modify: `src/en/comix/build.gradle.kts`

**Interfaces:**
- Produces: `python3 tools/check_source_info.py <path-to-keiyoushi-source-info.json>` exits 0 when identity is right, 1 with a list of problems otherwise. Task 7's workflow calls it.

- [ ] **Step 1: Write the failing check**

`tools/check_source_info.py`:
```python
import json
import sys

EXPECTED = {
    "name": "Comix K",
    "packageName": "eu.kanade.tachiyomi.extension.en.comixk",
    "extensionLib": "1.6",
}
EXPECTED_SOURCE = {"id": 3285188625626617474, "name": "Comix K", "lang": "en"}
OFFICIAL_COMIX_SOURCE_ID = 7537715367149829912


def problems(info: dict) -> list[str]:
    found = [
        f"{key}: expected {value!r}, got {info.get(key)!r}"
        for key, value in EXPECTED.items()
        if info.get(key) != value
    ]
    sources = info.get("sources", [])
    if len(sources) != 1:
        found.append(f"sources: expected 1, got {len(sources)}")
    for source in sources:
        if source.get("id") == OFFICIAL_COMIX_SOURCE_ID:
            found.append("source id equals the official Comix id")
        for key, value in EXPECTED_SOURCE.items():
            if source.get(key) != value:
                found.append(f"source {key}: expected {value!r}, got {source.get(key)!r}")
    return found


def main() -> None:
    _, path = sys.argv
    with open(path, encoding="utf-8") as f:
        found = problems(json.load(f))
    for problem in found:
        print(problem)
    sys.exit(1 if found else 0)


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Run it against the Task 1 build to see it fail**

Run: `python3 tools/check_source_info.py src/en/comix/build/keiyoushi-source-info.json`
Expected: exit 1, prints `name: expected 'Comix K', got 'Comix'`, `packageName: ...`, `source id equals the official Comix id`, and source id/name lines.

- [ ] **Step 3: Change the build DSL**

In `src/en/comix/build.gradle.kts` replace

```kotlin
    name = "Comix"
    versionCode = 52
```
with
```kotlin
    name = "Comix K"
    pkgName = "en.comixk"
    versionCode = 1
```
Leave everything else in the file as it is.

- [ ] **Step 4: Rebuild and run the check**

```bash
ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew :src:en:comix:assembleRelease
python3 tools/check_source_info.py src/en/comix/build/keiyoushi-source-info.json; echo "exit=$?"
ls src/en/comix/build/outputs/apk/release/ src/en/comix/build/outputs/jar/release/
```
Expected: `exit=0`, files `tachiyomi-en.comixk-v1.6.1.apk` and `tachiyomi-en.comixk-v1.6.1.jar`.

- [ ] **Step 5: Commit**

```bash
git add tools/check_source_info.py src/en/comix/build.gradle.kts
git commit -m "feat: rename extension to Comix K with its own package and source id"
```

---

### Task 3: Show the 403 reason in the error

**Brief check:** file = `src/en/comix/assets/chapter_pages.js`, test `tools/tests/chapter_pages.test.mjs`. The asset is one JS arrow function that Kotlin inlines as text, so it must stay a single expression with no `export`/`import`. Separator ` · ` exact. Reply cut to the first 200 characters. Test stubs: `globalThis.document = { readyState: "complete" }`, fake `siteApi`.

**Files:**
- Modify: `src/en/comix/assets/chapter_pages.js` (the `start` function, lines 22-25)
- Test: `tools/tests/chapter_pages.test.mjs`

**Interfaces:**
- Produces: reject text `Chapter pages failed: HTTP <status> · reply: <first 200 chars of body>`; without a body the text is unchanged from upstream. Task 5 appends its probe text after this.

- [ ] **Step 1: Write the failing test**

`tools/tests/chapter_pages.test.mjs`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../../src/en/comix/assets/chapter_pages.js", import.meta.url), "utf8");
const chapterPages = (0, eval)(`(${source})`);
globalThis.document = { readyState: "complete" };

const failWith = (error) => () => async () => async () => {
    throw error;
};

const rejectionOf = (siteApi) => new Promise((resolve, reject) => {
    chapterPages(siteApi, 1, () => reject(new Error("should not pass")), resolve);
});

test("403 with a JSON body shows the reply", async () => {
    const message = await rejectionOf(failWith({ response: { status: 403, data: { error: "captcha_required" } } }));
    assert.equal(message, 'Chapter pages failed: HTTP 403 · reply: {"error":"captcha_required"}');
});

test("a text body is cut to 200 characters", async () => {
    const message = await rejectionOf(failWith({ response: { status: 403, data: "x".repeat(500) } }));
    assert.equal(message, `Chapter pages failed: HTTP 403 · reply: ${"x".repeat(200)}`);
});

test("an error without a response keeps the upstream text", async () => {
    const message = await rejectionOf(failWith(new Error("boom")));
    assert.equal(message, "Chapter pages failed: boom");
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test 'tools/tests/*.test.mjs'`
Expected: test 1 and 2 FAIL (actual `Chapter pages failed: HTTP 403`), test 3 PASS.

- [ ] **Step 3: Change `start` in `chapter_pages.js`**

Replace
```js
    const start = () => read().catch((e) => {
        const status = e && e.response && e.response.status;
        reject(`Chapter pages failed: ${status ? `HTTP ${status}` : e && e.message || e}`);
    });
```
with
```js
    const start = () => read().catch((e) => {
        const status = e && e.response && e.response.status;
        const data = e && e.response && e.response.data;
        const reply = data === undefined || data === null
            ? ""
            : ` · reply: ${(typeof data === "string" ? data : JSON.stringify(data)).slice(0, 200)}`;
        reject(`Chapter pages failed: ${status ? `HTTP ${status}` : e && e.message || e}${reply}`);
    });
```

- [ ] **Step 4: Run the tests to see them pass**

Run: `node --test 'tools/tests/*.test.mjs'`
Expected: 3 pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
git add src/en/comix/assets/chapter_pages.js tools/tests/chapter_pages.test.mjs
git commit -m "feat: include the site's reply in the chapter pages error"
```

---

### Task 4: Send an iPhone Safari user agent

**Brief check:** file = `Comix.kt` only. `KeiSource.headersBuilder()` = app headers (app UA) → `Referer`/`Origin` → `configureHeaders()`. `headers` is rebuilt on every read, and `runInWebView` already copies `headers["User-Agent"]` into the hidden WebView (line ~676), so one change covers OkHttp and WebView. Exact fallback UA in Global Constraints. There is no unit-test setup for extension modules; this task is checked by build + spotless, and on the device by the `ua:` tag added in Task 5.

**Files:**
- Modify: `src/en/comix/src/eu/kanade/tachiyomi/extension/en/comix/Comix.kt:175` and the `companion object`

**Interfaces:**
- Produces: `IPHONE_SAFARI_UA` constant in the companion object (Task 5 compares against it).

- [ ] **Step 1: Replace `configureHeaders`**

Replace line 175
```kotlin
    override fun Headers.Builder.configureHeaders() = add("Accept", "*/*")
```
with
```kotlin
    // Comix answers "Third-party apps are not supported" to non-Safari user agents. A Safari UA from the app is
    // kept, because Cloudflare ties its pass cookie to the UA the user solved it with.
    override fun Headers.Builder.configureHeaders(): Headers.Builder {
        if (!get("User-Agent").orEmpty().isIphoneSafari()) set("User-Agent", IPHONE_SAFARI_UA)
        return add("Accept", "*/*")
    }

    private fun String.isIphoneSafari() = "iPhone" in this && "Safari/" in this && "CriOS" !in this && "FxiOS" !in this
```

- [ ] **Step 2: Add the constant**

In the `companion object`, directly after `private const val WAF_PATH = "/@waf/"`, add:
```kotlin

        private const val IPHONE_SAFARI_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) " +
            "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1"
```
Check the joined string equals the Global Constraints value exactly (one space after `X)`).

- [ ] **Step 3: Format check and build**

Run: `ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew :src:en:comix:spotlessCheck :src:en:comix:assembleRelease`
Expected: `BUILD SUCCESSFUL`. If spotless fails, run `:src:en:comix:spotlessApply`, review the diff, rebuild.

- [ ] **Step 4: Commit**

```bash
git add src/en/comix/src/eu/kanade/tachiyomi/extension/en/comix/Comix.kt
git commit -m "feat: send an iPhone Safari user agent unless the app already does"
```

---

### Task 5: Show what the hidden browser saw

**Brief check:** file = `Comix.kt` only, inside `runInWebView` (~lines 663-753). Counters must be thread-safe (`interceptRequest` runs on WebView background threads): `AtomicInteger`, `AtomicBoolean`. Append text exact: ` · checked loads: <n> · puzzle page: yes|no · ua: forced|app`. Applies to every JS reject and to the poll timeout; the existing "Open in WebView to solve the captcha" reject stays as is. Checked by build + spotless; real check is on the device.

**Files:**
- Modify: `src/en/comix/src/eu/kanade/tachiyomi/extension/en/comix/Comix.kt`

**Interfaces:**
- Consumes: `IPHONE_SAFARI_UA` (Task 4); the error text from `chapter_pages.js` (Task 3).

- [ ] **Step 1: Import `AtomicBoolean`**

After `import java.io.IOException` add:
```kotlin
import java.util.concurrent.atomic.AtomicBoolean
```

- [ ] **Step 2: Add counters and the probe text**

In `runInWebView`, after
```kotlin
        val dataRequests = AtomicInteger()
```
add
```kotlin
        // Stage 2 probe: does the app pass page loads to interceptRequest, and does the captcha frame show up
        val checkedLoads = AtomicInteger()
        val sawPuzzlePage = AtomicBoolean()
        fun probeInfo() = " · checked loads: ${checkedLoads.get()}" +
            " · puzzle page: ${if (sawPuzzlePage.get()) "yes" else "no"}" +
            " · ua: ${if (headers["User-Agent"] == IPHONE_SAFARI_UA) "forced" else "app"}"
```

- [ ] **Step 3: Count inside `interceptRequest`**

Replace
```kotlin
            interceptRequest { request ->
                val requestUrl = request.url?.toString()?.toHttpUrlOrNull()
```
with
```kotlin
            interceptRequest { request ->
                checkedLoads.incrementAndGet()
                val requestUrl = request.url?.toString()?.toHttpUrlOrNull()
```
and replace
```kotlin
                if (requestUrl.encodedPath == WAF_CHALLENGE_PATH && isFrameLoad) {
                    if (!preferences.solveCaptchas()) {
```
with
```kotlin
                if (requestUrl.encodedPath == WAF_CHALLENGE_PATH && isFrameLoad) {
                    sawPuzzlePage.set(true)
                    if (!preferences.solveCaptchas()) {
```

- [ ] **Step 4: Append the probe text to rejects**

Replace
```kotlin
            jsBridge(errorBridgeName) { reject(Exception(it)) }
```
with
```kotlin
            jsBridge(errorBridgeName) { reject(Exception(it + probeInfo())) }
```
and replace
```kotlin
                    reject(Exception(message))
```
with
```kotlin
                    reject(Exception(message + probeInfo()))
```

- [ ] **Step 5: Format check, build, identity check, JS tests**

```bash
ANDROID_HOME=$HOME/Library/Android/sdk ./gradlew :src:en:comix:spotlessCheck :src:en:comix:assembleRelease
python3 tools/check_source_info.py src/en/comix/build/keiyoushi-source-info.json
node --test 'tools/tests/*.test.mjs'
```
Expected: `BUILD SUCCESSFUL`, check exit 0, 3 JS tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/en/comix/src/eu/kanade/tachiyomi/extension/en/comix/Comix.kt
git commit -m "feat: report intercepted loads, captcha frame and UA source in WebView errors"
```

---

### Task 6: Adapt the publish script to this repo

**Brief check:** files = `.github/scripts/publish-repo.py`, `.github/scripts/github_utils.py`, `tools/tests/test_publish_repo.py`. Env inputs (exact names): `GITHUB_REPOSITORY`, `ARTIFACTS_DIR`, `SIGNING_KEY_SHA256`. Index name `Kenji`, badge `K`. First run has no `index.json`. Test stub: a fake `gh` shell script on `PATH` that logs its arguments. protobuf version `7.35.1` (matches `index_pb2.py` header).

**Files:**
- Modify: `.github/scripts/github_utils.py:4`, `.github/scripts/publish-repo.py`
- Test: `tools/tests/test_publish_repo.py`

**Interfaces:**
- Produces: `python -u publish-repo.py '[]' <sha> true` run inside the checked-out `repo` branch writes `index.json`, `index.pb`, `index.html`, `release-assets.json`, `repo.json`, and creates/uploads GitHub Release `<sha[:7]>` via `gh`. Task 7 calls it like this.

- [ ] **Step 1: Write the failing test**

`tools/tests/test_publish_repo.py`:
```python
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / ".github/scripts/publish-repo.py"
FINGERPRINT = "ab" * 32
FAKE_GH = """#!/bin/sh
echo "$@" >> "$GH_LOG"
if [ "$1 $2" = "release view" ]; then
  case "$*" in
    *tagName*) echo "release not found" >&2; exit 1 ;;
    *assets*) echo '{"assets": []}' ;;
  esac
fi
exit 0
"""
INFO = {
    "module": "en.comix",
    "theme": None,
    "packageName": "eu.kanade.tachiyomi.extension.en.comixk",
    "name": "Comix K",
    "versionCode": 106001,
    "versionName": "1.6.1",
    "extensionLib": "1.6",
    "contentWarning": 2,
    "sources": [{
        "id": 3285188625626617474,
        "name": "Comix K",
        "lang": "en",
        "baseUrl": "https://comix.to",
        "mirrorUrls": ["https://comix.to", "https://comix.ws"],
    }],
}
APK = "tachiyomi-en.comixk-v1.6.1.apk"
JAR = "tachiyomi-en.comixk-v1.6.1.jar"


class PublishRepoTest(unittest.TestCase):
    def setUp(self):
        tmp = Path(tempfile.mkdtemp())
        build = tmp / "build"
        (build / "outputs/apk/release").mkdir(parents=True)
        (build / "outputs/jar/release").mkdir(parents=True)
        (build / "keiyoushi-source-info.json").write_text(json.dumps(INFO))
        (build / "outputs/apk/release" / APK).write_bytes(b"apk")
        (build / "outputs/jar/release" / JAR).write_bytes(b"jar")
        self.repo = tmp / "repo"
        self.repo.mkdir()
        bin_dir = tmp / "bin"
        bin_dir.mkdir()
        gh = bin_dir / "gh"
        gh.write_text(FAKE_GH)
        gh.chmod(0o755)
        self.gh_log = tmp / "gh.log"
        self.env = {
            **os.environ,
            "PATH": f"{bin_dir}:{os.environ['PATH']}",
            "GH_LOG": str(self.gh_log),
            "ARTIFACTS_DIR": str(build),
            "GITHUB_REPOSITORY": "kenjixx1/manga-ext",
            "SIGNING_KEY_SHA256": FINGERPRINT,
        }

    def publish(self):
        subprocess.run(
            [sys.executable, "-u", str(SCRIPT), "[]", "abc1234def5678", "true"],
            cwd=self.repo, env=self.env, check=True,
        )

    def test_first_run_builds_index_from_nothing(self):
        self.publish()
        index = json.loads((self.repo / "index.json").read_text())
        self.assertEqual(index["name"], "Kenji")
        self.assertEqual(index["badgeLabel"], "K")
        self.assertEqual(index["signingKey"], FINGERPRINT)
        [ext] = index["extensionList"]["extensions"]
        self.assertEqual(ext["packageName"], "eu.kanade.tachiyomi.extension.en.comixk")
        self.assertEqual(
            ext["resources"]["apkUrl"],
            f"https://github.com/kenjixx1/manga-ext/releases/download/abc1234/{APK}",
        )
        self.assertEqual(
            ext["resources"]["jarUrl"],
            f"https://github.com/kenjixx1/manga-ext/releases/download/abc1234/{JAR}",
        )
        self.assertEqual(
            ext["resources"]["iconUrl"],
            "https://cdn.jsdelivr.net/gh/kenjixx1/manga-ext@main/src/en/comix/res/mipmap-xhdpi/ic_launcher.png",
        )
        self.assertEqual(ext["sources"][0]["id"], "3285188625626617474")
        self.assertTrue((self.repo / "index.pb").is_file())

    def test_writes_repo_json(self):
        self.publish()
        repo_json = json.loads((self.repo / "repo.json").read_text())
        self.assertEqual(repo_json["index_v2"], "https://github.com/kenjixx1/manga-ext/raw/repo/index.pb")
        self.assertEqual(repo_json["meta"]["name"], "Kenji")
        self.assertEqual(repo_json["meta"]["signingKeyFingerprint"], FINGERPRINT)

    def test_uploads_to_this_repos_release(self):
        self.publish()
        log = self.gh_log.read_text()
        self.assertIn("release create abc1234 --repo kenjixx1/manga-ext", log)
        self.assertIn("release upload abc1234", log)
        self.assertNotIn("keiyoushi", log)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 2: Run it to see it fail**

Run: `uv run --with protobuf==7.35.1 python -m unittest tools/tests/test_publish_repo.py -v`
Expected: 3 errors (`CalledProcessError`; the script output above it shows `FileNotFoundError` for `index.json`).

- [ ] **Step 3: Read the repo name from the environment**

In `.github/scripts/github_utils.py` replace
```python
import subprocess
import time

REPO_NAME = "keiyoushi/extensions"
```
with
```python
import os
import subprocess
import time

REPO_NAME = os.environ["GITHUB_REPOSITORY"]
```

- [ ] **Step 4: Edit `publish-repo.py`**

4a. Imports: after `import math` add `import os`.

4b. Replace
```python
ARTIFACTS_DIR = Path.home() / "apk-artifacts"
```
with
```python
ARTIFACTS_DIR = Path(os.environ.get("ARTIFACTS_DIR", Path.home() / "apk-artifacts"))
```

4c. Replace
```python
ICON_BASE_URL = "https://cdn.jsdelivr.net/gh/keiyoushi/extensions-source@main"
```
with
```python
ICON_BASE_URL = f"https://cdn.jsdelivr.net/gh/{REPO_NAME}@main"
SIGNING_KEY = os.environ["SIGNING_KEY_SHA256"]
```

4d. Replace
```python
with REPO_DIR.joinpath("index.json").open() as f:
    remote_proto = json_format.Parse(f.read(), index_pb2.Index())
```
with
```python
remote_proto = index_pb2.Index()
index_path = REPO_DIR.joinpath("index.json")
if index_path.exists():
    with index_path.open() as f:
        json_format.Parse(f.read(), remote_proto)
```

4e. Replace the `index = index_pb2.Index(...)` block (name `Keiyoushi` … `discord=...` …) with
```python
index = index_pb2.Index(
    name="Kenji",
    badgeLabel="K",
    signingKey=SIGNING_KEY,
    contact=index_pb2.Contact(website=f"https://github.com/{REPO_NAME}"),
    extensionList=index_pb2.ExtensionList(extensions=final_extensions),
)
```

4f. After the block that writes `index.pb`, add
```python
with REPO_DIR.joinpath("repo.json").open("w", encoding="utf-8") as f:
    json.dump(
        {
            "index_v2": f"https://github.com/{REPO_NAME}/raw/repo/index.pb",
            "meta": {
                "name": "Kenji",
                "website": f"https://github.com/{REPO_NAME}",
                "signingKeyFingerprint": SIGNING_KEY,
            },
        },
        f,
        indent=2,
    )
    f.write("\n")
```

4g. In `create_release`, replace
```python
        f"Automated update from keiyoushi/extensions-source@{current_sha}",
```
with
```python
        f"Automated update from {REPO_NAME}@{current_sha}",
```

- [ ] **Step 5: Run the tests to see them pass**

Run: `uv run --with protobuf==7.35.1 python -m unittest tools/tests/test_publish_repo.py -v`
Expected: 3 tests OK. Also `grep -n keiyoushi .github/scripts/publish-repo.py .github/scripts/github_utils.py` prints exactly one line, the `keiyoushi-source-info.json` glob (a file name, keep it).

- [ ] **Step 6: Commit**

```bash
git add .github/scripts/publish-repo.py .github/scripts/github_utils.py tools/tests/test_publish_repo.py
git commit -m "feat: publish the extension repo to this GitHub repo with our signing key"
```

---

### Task 7: Build-and-publish workflow

**Brief check:** file = `.github/workflows/build_push.yml` (new). Secrets (exact names): `SIGNING_KEY` (base64 keystore), `ALIAS`, `KEY_STORE_PASSWORD`, `KEY_PASSWORD`. The build plugin reads `signingkey.jks` at the repo root and the last 3 as env vars (`ExtensionPlugin.kt` `signingConfigs`). Action pins are upstream's (same SHAs). Secrets go through `env:`, never `${{ }}` inside `run:`. Branch `repo` must already exist (Task 8).

**Files:**
- Create: `.github/workflows/build_push.yml`

**Interfaces:**
- Consumes: `tools/check_source_info.py` (Task 2), `publish-repo.py` CLI and env (Task 6).

- [ ] **Step 1: Write the workflow**

```yaml
name: Build Comix K

on:
  push:
    branches:
      - main
    paths-ignore:
      - '**.md'
      - 'docs/**'
  workflow_dispatch:

permissions: {}

concurrency:
  group: ${{ github.workflow }}
  cancel-in-progress: true

jobs:
  build-and-publish:
    name: Build and publish
    runs-on: ubuntu-latest
    timeout-minutes: 30
    permissions:
      contents: write
    steps:
      - name: Checkout main branch
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          path: main
          persist-credentials: false

      - name: Set up Java
        uses: actions/setup-java@de7274f081f381c8f8158605e0321c36c376e2e6 # v6.0.1
        with:
          java-version: 25
          distribution: temurin

      - name: Set up Gradle
        uses: gradle/actions/setup-gradle@3f5f9adaf7d9fecd50b5935e54106014257a94e6 # v6.4.0

      - name: Prepare signing key
        working-directory: main
        env:
          SIGNING_KEY: ${{ secrets.SIGNING_KEY }}
          ALIAS: ${{ secrets.ALIAS }}
          KEY_STORE_PASSWORD: ${{ secrets.KEY_STORE_PASSWORD }}
        run: |
          echo "$SIGNING_KEY" | base64 -d > signingkey.jks
          fingerprint=$(keytool -exportcert -alias "$ALIAS" -keystore signingkey.jks -storepass "$KEY_STORE_PASSWORD" | sha256sum | cut -d' ' -f1)
          echo "SIGNING_KEY_SHA256=$fingerprint" >> "$GITHUB_ENV"
          echo "Signing key fingerprint: $fingerprint"

      - name: Build Comix K
        working-directory: main
        env:
          ALIAS: ${{ secrets.ALIAS }}
          KEY_STORE_PASSWORD: ${{ secrets.KEY_STORE_PASSWORD }}
          KEY_PASSWORD: ${{ secrets.KEY_PASSWORD }}
        run: ./gradlew :src:en:comix:assembleRelease

      - name: Check extension identity
        working-directory: main
        run: python3 tools/check_source_info.py src/en/comix/build/keiyoushi-source-info.json

      - name: Clean up signing key
        if: always()
        working-directory: main
        run: rm -f signingkey.jks

      - name: Checkout repo branch
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1
        with:
          ref: repo
          path: repo
          persist-credentials: true

      - name: Publish repo
        working-directory: repo
        env:
          GH_TOKEN: ${{ github.token }}
          ARTIFACTS_DIR: ${{ github.workspace }}/main/src/en/comix/build
        run: |
          pip install protobuf==7.35.1
          python -u ../main/.github/scripts/publish-repo.py '[]' "$GITHUB_SHA" true
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git config user.name "github-actions[bot]"
          git add index.json index.pb index.html release-assets.json repo.json
          if git diff --cached --quiet; then
            echo "No changes to commit"
          else
            git commit -m "Update extension repo"
            git push
          fi
```

- [ ] **Step 2: Check the YAML parses and has no keiyoushi leftovers**

```bash
uv run --with pyyaml python -c "import yaml,sys; d=yaml.safe_load(open('.github/workflows/build_push.yml')); print(list(d['jobs']))"
grep -n 'keiyoushi\|BOT_PAT\|secrets\.' .github/workflows/build_push.yml
```
Expected: prints `['build-and-publish']`; grep shows only `secrets.SIGNING_KEY`, `secrets.ALIAS`, `secrets.KEY_STORE_PASSWORD`, `secrets.KEY_PASSWORD` lines, each under an `env:` key.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/build_push.yml
git commit -m "ci: build, sign and publish Comix K on push to main"
```

---

### Task 8: GitHub repo, signing key, secrets, `repo` branch (main session only)

**Brief check:** outward-facing (creates a public repo). Do it in the main session after the user approved the plan. Key folder `~/.manga-ext-signing/` (outside the repo, `chmod 700`). PKCS12 keystore: one password for store and key. Alias `manga-ext`. Never print the password; pipe it.

**Files:** none in the repo.

- [ ] **Step 1: Create the signing key**

```bash
mkdir -p ~/.manga-ext-signing && chmod 700 ~/.manga-ext-signing
cd ~/.manga-ext-signing
openssl rand -base64 24 | tr -d '\n' > password.txt && chmod 600 password.txt
keytool -genkeypair -keystore signingkey.jks -alias manga-ext -keyalg RSA -keysize 4096 \
  -validity 36500 -storepass:file password.txt -keypass:file password.txt -dname "CN=manga-ext"
keytool -exportcert -alias manga-ext -keystore signingkey.jks -storepass:file password.txt | shasum -a 256
```
Expected: one 64-hex fingerprint. Write it down; CI prints the same value in Task 9.
Tell the user: back up `~/.manga-ext-signing/` (losing it means every update needs an uninstall/reinstall).

- [ ] **Step 2: Create the empty GitHub repo (do not push `main` yet)**

`main` is pushed in Task 9, after the secrets and the `repo` branch exist, so the first CI run can succeed.

```bash
gh auth setup-git
gh repo create kenjixx1/manga-ext --public --description "Personal Tachimanga extension repo"
cd ~/Documents/manga-ext
git remote add origin https://github.com/kenjixx1/manga-ext.git
```

- [ ] **Step 3: Set the 4 secrets**

```bash
cd ~/.manga-ext-signing
base64 -i signingkey.jks | gh secret set SIGNING_KEY -R kenjixx1/manga-ext
printf manga-ext | gh secret set ALIAS -R kenjixx1/manga-ext
gh secret set KEY_STORE_PASSWORD -R kenjixx1/manga-ext < password.txt
gh secret set KEY_PASSWORD -R kenjixx1/manga-ext < password.txt
gh secret list -R kenjixx1/manga-ext
```
Expected: 4 names listed.

- [ ] **Step 4: Create the empty `repo` branch**

```bash
W="$TMPDIR/manga-ext-repo-branch"
rm -rf "$W" && git init -q -b repo "$W"
printf '# manga-ext extension repo\n\nAdd to Tachimanga: https://github.com/kenjixx1/manga-ext/raw/repo/index.pb\n' > "$W/README.md"
git -C "$W" add README.md
git -C "$W" commit -q -m "Start extension repo branch"
git -C "$W" push https://github.com/kenjixx1/manga-ext.git repo
```
Expected: `gh api repos/kenjixx1/manga-ext/branches --jq '.[].name'` lists `repo`.

---

### Task 9: Run CI, verify the published repo, hand over the device test (join)

**Brief check:** needs Tasks 1-8. Outward-facing (first push of `main` to the public repo); main session only.

- [ ] **Step 1: Push `main` and watch the CI run it starts**

First merge the work branch into `main` (found in final review: without it the push sends no workflow). Right after the push, make `main` the default branch: pushing `repo` first made `repo` the default, and release tags would then point at `repo` commits.

```bash
cd ~/Documents/manga-ext
git merge --no-ff stage2
git push -u origin main
gh repo edit kenjixx1/manga-ext --default-branch main
gh run list -R kenjixx1/manga-ext -L1 --json databaseId,status,headSha
gh run watch -R kenjixx1/manga-ext "$(gh run list -R kenjixx1/manga-ext -L1 --json databaseId -q '.[0].databaseId')" --exit-status
```
If `run list` is empty, wait a few seconds and run it again (the run takes a moment to appear).
Expected: success. The "Prepare signing key" log shows the same fingerprint as Task 8 Step 1.

- [ ] **Step 2: Verify what was published**

```bash
curl -sL https://github.com/kenjixx1/manga-ext/raw/repo/repo.json
curl -sL https://github.com/kenjixx1/manga-ext/raw/repo/index.json | python3 -c "import json,sys; d=json.load(sys.stdin); e=d['extensionList']['extensions'][0]; print(d['signingKey'], e['name'], e['packageName'], e['versionName'], e['sources'][0]['id'], e['resources']['apkUrl'])"
curl -sIL "$(curl -sL https://github.com/kenjixx1/manga-ext/raw/repo/index.json | python3 -c "import json,sys; print(json.load(sys.stdin)['extensionList']['extensions'][0]['resources']['apkUrl'])")" | grep -i '^http' | tail -1
```
Expected: fingerprint matches; `Comix K eu.kanade.tachiyomi.extension.en.comixk 1.6.1 3285188625626617474 https://github.com/kenjixx1/manga-ext/releases/download/<sha7>/tachiyomi-en.comixk-v1.6.1.apk`; last line `HTTP/2 200`.

- [ ] **Step 3: Hand the device test to the user**

Send these steps:
1. Tachimanga → Extensions → repos → add `https://github.com/kenjixx1/manga-ext/raw/repo/index.pb`.
2. Install **Comix K**. Official Comix stays installed.
3. Keep Tachimanga → Advanced → User agent = **Mobile Safari**.
4. Comix K settings → turn **Solve captchas** ON (Comix K has its own settings; it starts OFF).
5. Open `comix.ws/title/392n` in Comix K, chapter 1. If Cloudflare asks, solve it in WebView first.
6. Copy the full error text and send it back. It picks Stage 3 (table in the spec).

If the repo URL is refused, try `https://raw.githubusercontent.com/kenjixx1/manga-ext/repo/index.pb`, then report which form Tachimanga uses for keiyoushi.
