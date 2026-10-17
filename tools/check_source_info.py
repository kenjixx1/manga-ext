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
