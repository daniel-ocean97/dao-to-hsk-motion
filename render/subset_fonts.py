"""Cut the brand fonts down to the glyphs the videos use and put them into fonts/.

Noto Serif SC holds ~30 000 characters (25 MB). The videos need a handful, so the
committed fonts/NotoSerifSC-subset.ttf keeps only the Chinese characters found in
videos/ and shared/. Latin text is set in Onest (pinyin) or Cormorant Garamond. After
adding a new character to a scene, run this script again and commit the new subset.

Onest and Cormorant Garamond are small and committed whole; the script only checks
they are there.

The full fonts are downloaded once into out/fonts-src/ (not in git) and checked by
SHA-256. Subsetting uses fonttools through uvx, so it is not a project dependency.

    uv run render/subset_fonts.py
"""

import hashlib
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FONTS = ROOT / "fonts"
SRC = ROOT / "out" / "fonts-src"
FONTTOOLS = "fonttools==4.66.1"

GOOGLE = "https://raw.githubusercontent.com/google/fonts/main/ofl/"
NOTO = (
    GOOGLE + "notoserifsc/NotoSerifSC%5Bwght%5D.ttf",
    "NotoSerifSC.ttf",
    "050080d9255a86808f2945bffac582b31ef32bc36411ce29563b4961670c66f9",
)

# CJK Unified Ideographs (+ extension A) and CJK punctuation
HANZI = re.compile("[\\u3000-\\u303f\\u3400-\\u4dbf\\u4e00-\\u9fff\\uff00-\\uffef]")


def fetch(url: str, name: str, sha: str) -> Path:
    path = SRC / name
    if not path.exists():
        SRC.mkdir(parents=True, exist_ok=True)
        print(f"download {url}")
        urllib.request.urlretrieve(url, path)
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest != sha:
        sys.exit(
            f"{path}: SHA-256 {digest} does not match the pinned {sha}; check the new file and update"
        )
    return path


def used_hanzi() -> str:
    found: set[str] = set()
    for folder in ("videos", "shared"):
        for path in (ROOT / folder).rglob("*"):
            if path.suffix in {".html", ".js"}:
                found |= set(HANZI.findall(path.read_text(encoding="utf-8")))
    return "".join(sorted(found))


def main() -> None:
    chars = used_hanzi()
    print(f"{len(chars)} characters: {chars}")
    src = fetch(*NOTO)
    FONTS.mkdir(exist_ok=True)
    out = FONTS / "NotoSerifSC-subset.ttf"
    subprocess.run(
        [
            "uvx",
            "--from",
            FONTTOOLS,
            "pyftsubset",
            str(src),
            f"--text={chars}",
            "--unicodes=U+0020",
            f"--output-file={out}",
            "--layout-features=*",
            "--no-hinting",
            "--name-IDs=*",
            "--name-languages=*",
        ],
        check=True,
    )
    print(f"{out.relative_to(ROOT)}: {out.stat().st_size // 1024} KB")
    for name in ("Onest.ttf", "CormorantGaramond.ttf", "CormorantGaramond-Italic.ttf"):
        if not (FONTS / name).exists():
            sys.exit(f"fonts/{name} is missing")


if __name__ == "__main__":
    main()
