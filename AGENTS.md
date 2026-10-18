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
- Testing in the real app: use the `test-comix-k-on-mac` skill (`.claude/skills/test-comix-k-on-mac/SKILL.md`). It drives
  the Tachimanga Mac app with `tools/mac-ui/ui.sh` and reads the Comix K Diagnostics.
