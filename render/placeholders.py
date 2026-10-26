"""Render stand-in Rita images for the rig into out/rita-placeholder/.

The real art comes from an image generator (docs/rita-generation.md). Until it
exists, these stills of the code-drawn Rita let the rig be built and tested.

    uv run render/placeholders.py
"""

from playwright.sync_api import sync_playwright
from render import ROOT, launch, serve

PAGE = ROOT / "characters" / "rita" / "placeholder.html"
OUT = ROOT / "out" / "rita-placeholder"


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p, serve() as url:
        browser = launch(p)
        page = browser.new_page(
            viewport={"width": 1024, "height": 1536}, device_scale_factor=1
        )
        page.goto(url(PAGE))
        page.wait_for_function("typeof window.renderAt === 'function'")
        for shot in page.evaluate("window.SHOTS"):
            page.goto(url(PAGE) + f"?shot={shot}")
            page.wait_for_function("typeof window.renderAt === 'function'")
            path = OUT / f"{shot}.png"
            page.screenshot(
                path=str(path), clip={"x": 0, "y": 0, "width": 1024, "height": 1536}
            )
            print(f"{shot} -> {path.relative_to(ROOT)}")
        browser.close()


if __name__ == "__main__":
    main()
