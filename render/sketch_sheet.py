"""A sheet of sketch variants of one place, to choose a composition by pictures.

The place file paints its variants by k.variant (docs/locations.md, skill `location`).
Each variant is rendered on the probe page at the given animation times (0..2.5 s) and
put on one sheet, a row per variant:

    uv run render/sketch_sheet.py --place huangshan --variants 1 2 3 4
    uv run render/sketch_sheet.py --place huangshan --variants 2 --times 0.3 1.2 2.4

Output: out/sketch-<place>/sheet.png (and the frames next to it).
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_intro import contact_sheet  # noqa: E402
from render import ROOT, render_frames  # noqa: E402

PROBE = ROOT / "videos" / "probe-places" / "index.html"


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--place", required=True, help="location id (locations/<id>.js)")
    ap.add_argument("--variants", nargs="+", default=["1"], help="variant names, e.g. 1 2 3")
    ap.add_argument("--times", type=float, nargs="+", default=[1.2], help="animation times, s (0..2.5)")
    args = ap.parse_args()

    out_dir = ROOT / "out" / f"sketch-{args.place}"
    images, labels = [], []
    for v in args.variants:
        stills = render_frames(PROBE, out_dir / f"v{v}", 60, args.times, f"place={args.place}&variant={v}")
        images += stills
        labels += [f"вариант {v} · {t:.1f} s" for t in args.times]
    # one row per variant when several times are asked, otherwise three per row
    sheet = out_dir / "sheet.png"
    contact_sheet(images, labels, sheet, cols=len(args.times) if len(args.times) > 1 else 3)
    print(f"sheet -> {sheet}")


if __name__ == "__main__":
    main()
