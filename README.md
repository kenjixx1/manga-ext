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
