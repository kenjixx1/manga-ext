---
name: test-comix-k-on-mac
description: Test Comix K yourself in the Tachimanga Mac app (screenshots + clicks), read its Diagnostics, and install a new build. Use whenever a Comix K change needs checking in the real app, or the user asks you to test, check, or try Comix K / Tachimanga yourself.
---

# Test Comix K in Tachimanga on this Mac

Tachimanga is an iPad app that also runs on this Apple-silicon Mac (`/Applications/Tachimanga.app`). It runs the same
Comix K JAR and uses Apple's WebKit, so it reproduces most iPhone behaviour. **The user's iPhone stays the final check**
(see "Mac is not iPhone" below).

You drive it with `tools/mac-ui/ui.sh`: take a screenshot of the window, read it, click by coordinates read off that
image. Never guess coordinates from an older screenshot: dialogs resize and buttons move. Screenshot, then click.

## Setup check (once per session)

```bash
ls -d /Applications/Tachimanga.app          # app installed
which cliclick || brew install cliclick      # clicking/typing tool
tools/mac-ui/ui.sh win start                 # must print a path + size like 1512x949
```

Then Read the printed PNG. If the image shows another app instead of Tachimanga, or the command fails: the Terminal
app needs **Accessibility** and **Screen Recording** in System Settings → Privacy & Security. Ask the user to allow
them. You cannot grant them yourself.

The repo `https://github.com/kenjixx1/manga-ext/raw/repo/index.pb` is already added in the Mac app, and Comix K is
installed. If Tachimanga ever shows an agreement dialog (for example "To add third-party extension stores, you need to
agree..."), **stop and ask the user to accept it**. It is an agreement in their name.

## The helper

| Command | Does |
|---|---|
| `tools/mac-ui/ui.sh win NAME` | Brings Tachimanga to the front, screenshots its window, prints the PNG path. Read that PNG. |
| `tools/mac-ui/ui.sh wclick X Y` | Clicks at X,Y **as measured on the last `win` image** (image pixels = window points). |
| `tools/mac-ui/ui.sh paste TEXT` | Puts TEXT on the clipboard and presses cmd+V into the focused field. |
| `tools/mac-ui/ui.sh key return` | Presses a key (`return`, `esc`, `tab`, `arrow-down`, ...). |

Wait about 1.5 s after a click before the next `win`. To read small text, crop the PNG with
`sips -c HEIGHT WIDTH --cropOffset Y X in.png --out out.png` and Read the crop.

## Open Comix K (the user's steps)

1. **Browse → Extensions.** In the top bar click **Browse**, then the **Extensions** pill under it. You should see
   "Installed: Comix K, English 1.6.x" with a **Settings** link on the right.
2. **Click the Comix K row.** The extension page opens: big Comix K icon, `en.comixk`, Version, Language,
   Package format **JAR**, buttons **Remove** / **Changelogs**, and below them a "Comix K English" row with 3 icons
   on the right: gear, pin, and a badge with an "!" inside.
3. **Click the "!" badge** (the right-most icon on that row). This opens the source.
4. **The Comix K browse page.** Title "Comix K", `https://comix.to`, pills **Popular / Latest / Filter**, and top right a
   search icon and a **⋯** button. Titles load here, or an error shows with **Retry / Web View / Help**.
   - **⋯ → Settings** opens the Comix K settings with the **Diagnostics 1/2/3** entries at the top. On the Mac the
     window is wide, so the full Diagnostics text is visible. Read it from the screenshot. No copying needed.
   - **⋯ → Open in Web View** opens the site in Tachimanga's visible browser.

## Read Diagnostics

- **Box 1 (connection):** `cf pass now` (count and value starts), `ua now`, `last request` (path, UA sent, result),
  `last step` (what the app-routed browse got to).
- **Boxes 2–3 (hidden browser):** one step per line. `captured N chars` means the hidden view handed back the signed API
  URL. Lines like `fetch ... 403 Just a moment` mean Cloudflare blocked the hidden view itself.

## Cloudflare checks

When browse shows **"Cloudflare check needed: tap Web View..."**: click **Web View**, screenshot, and look for the
check. If it is the "Verify you are human" box, click it once. If the check will not pass from an automated click,
**ask the user to click it**. Then go back (top-left arrow) and click **Retry**.

## Install a new build

- **Through the repo (what the user does):** after CI publishes, Tachimanga may keep showing the old version for
  10–20 minutes (it caches the repo list). Then: Browse → Extensions → Comix K → update.
- **Directly from a local build (faster, try first):** in Browse → Extensions click **+** (top right) → **Install
  extension (select a file)**. In the file dialog press cmd+shift+G, `paste` the JAR's full path, press `return` twice.
  The JAR is `src/en/comix/build/outputs/jar/release/tachiyomi-en.comixk-v1.6.N.jar` after
  `./gradlew :src:en:comix:assembleRelease`. This route was **not yet tried**. Note what happens and update this file.

## Mac is not iPhone

Known differences seen on 2026-10-18:
- Tachimanga's app requests on the Mac send an **iPad** UA (`Mozilla/5.0 (iPad; CPU OS 18_7 like Mac OS X) ...`), even
  though Comix K sets an iPhone Safari UA. The app overrides the extension's UA there.
- The hidden browser view sends the Mac's built-in UA (`... Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)`).
  The iPhone sends the iPhone built-in UA instead.
- The user reported Comix's "third-party apps are not supported" check behaves differently on the Mac than on the
  iPhone.

So a result on the Mac shows the mechanism works or fails. Ask the user to confirm on the iPhone before calling a fix
done.
