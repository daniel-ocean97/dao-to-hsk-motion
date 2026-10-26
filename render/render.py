"""Render an HTML scene to PNG frames with Playwright and assemble an MP4 with FFmpeg.

The scene must expose window.renderAt(t) and window.DURATION (seconds).
Frame i is rendered at t = i / fps, so frames are reproducible in any order.

Pages are served from the repository root over a local HTTP server: images
loaded from file:// would taint canvas and WebGL, so pixel access would fail.
Set CHROMIUM_EXECUTABLE to use a browser other than Playwright's own.

Examples:
    uv run render/render.py videos/probe-rita/index.html
    uv run render/render.py videos/probe-rita/index.html --stills 1.0 4.5
    uv run render/render.py videos/probe-rita/index.html --audio music/track.wav
"""

import argparse
import contextlib
import functools
import glob
import http.server
import os
import shutil
import subprocess
import sys
import threading
import time
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent


def find_tool(name: str) -> str:
    """Locate ffmpeg/ffprobe even when the shell PATH predates the winget install."""
    found = shutil.which(name)
    if found:
        return found
    local = os.environ.get("LOCALAPPDATA", "")
    patterns = [
        os.path.join(local, "Microsoft", "WinGet", "Links", f"{name}.exe"),
        os.path.join(local, "Microsoft", "WinGet", "Packages", "Gyan.FFmpeg*", "*", "bin", f"{name}.exe"),
    ]
    for pattern in patterns:
        hits = glob.glob(pattern)
        if hits:
            return hits[0]
    sys.exit(f"{name} not found: install FFmpeg first")


@contextlib.contextmanager
def serve(root: Path = ROOT):
    """Serve root on a free localhost port; yield a function mapping a path to its URL."""

    class Quiet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *args) -> None:
            pass

    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=str(root)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_address[1]}/"
    try:
        yield lambda path: base + path.resolve().relative_to(root).as_posix()
    finally:
        server.shutdown()


def launch(p):
    exe = os.environ.get("CHROMIUM_EXECUTABLE")
    return p.chromium.launch(executable_path=exe) if exe else p.chromium.launch()


def render_frames(html: Path, frames_dir: Path, fps: int, times: list[float] | None) -> list[Path]:
    frames_dir.mkdir(parents=True, exist_ok=True)
    written = []
    with sync_playwright() as p, serve() as url:
        browser = launch(p)
        page = browser.new_page(viewport={"width": 1920, "height": 1080}, device_scale_factor=1)
        page.goto(url(html) + "?render")
        page.wait_for_function("typeof window.renderAt === 'function'")
        duration = page.evaluate("window.DURATION")
        if times is None:
            count = round(duration * fps)
            jobs = [(i, i / fps, frames_dir / f"{i:05d}.png") for i in range(count)]
        else:
            jobs = [(i, t, frames_dir / f"still_{t:06.2f}.png") for i, t in enumerate(times)]
        started = time.time()
        for n, (i, t, path) in enumerate(jobs):
            page.evaluate("t => window.renderAt(t)", t)
            page.screenshot(path=str(path), clip={"x": 0, "y": 0, "width": 1920, "height": 1080})
            written.append(path)
            if n % 30 == 0 or n == len(jobs) - 1:
                print(f"frame {n + 1}/{len(jobs)}  t={t:.3f}s  {time.time() - started:.0f}s elapsed", flush=True)
        browser.close()
    return written


def assemble(frames_dir: Path, fps: int, out_mp4: Path, audio: Path | None) -> None:
    cmd = [find_tool("ffmpeg"), "-y", "-loglevel", "error", "-framerate", str(fps),
           "-i", str(frames_dir / "%05d.png")]
    if audio:
        cmd += ["-i", str(audio)]
    cmd += ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p",
            "-r", str(fps), "-movflags", "+faststart"]
    if audio:
        cmd += ["-c:a", "aac", "-b:a", "192k", "-shortest"]
    cmd.append(str(out_mp4))
    subprocess.run(cmd, check=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("html", type=Path, help="scene HTML with window.renderAt(t)")
    ap.add_argument("--fps", type=int, default=60)
    ap.add_argument("--name", help="output name (default: scene folder name)")
    ap.add_argument("--stills", type=float, nargs="+", help="render only these times as PNG")
    ap.add_argument("--audio", type=Path, help="audio file to mux as AAC")
    args = ap.parse_args()

    name = args.name or args.html.resolve().parent.name
    out_dir = ROOT / "out" / name
    if args.stills:
        render_frames(args.html, out_dir / "stills", args.fps, args.stills)
        print(f"stills -> {out_dir / 'stills'}")
        return

    frames_dir = out_dir / "frames"
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    render_frames(args.html, frames_dir, args.fps, None)
    out_mp4 = out_dir / f"{name}.mp4"
    assemble(frames_dir, args.fps, out_mp4, args.audio)
    print(f"video -> {out_mp4}" + ("" if args.audio else "  (no audio track)"))


if __name__ == "__main__":
    main()
