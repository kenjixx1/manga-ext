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
