"""Build the intro for a route of three places in one command.

The route is three location ids (docs/locations.md): two day places, then a night one.
Steps: the sound (out/intro-01/mix.wav, built once with render/sound.py, the same for
every route), the frames, the MP4, a check of the MP4 with ffprobe, and a contact sheet
of the seams between the scenes (seams.png) to look at before watching.

    uv run render/build_intro.py --route guilin,wall,shanghai
    uv run render/build_intro.py --route guilin,wall,shanghai --seams-only   # ~30 s

Output: out/<name>/<name>.mp4 and out/<name>/seams.png, name = route-<id>-<id>-<id>.
"""

import argparse
import base64
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from playwright.sync_api import sync_playwright  # noqa: E402
from render import ROOT, assemble, find_tool, launch, render_frames  # noqa: E402

INTRO = ROOT / "videos" / "intro-01" / "index.html"
MIX = ROOT / "out" / "intro-01" / "mix.wav"
TRACK = ROOT / "music" / "local" / "kaazoom-By-The-Quiet-Water-30-sec-edit-Traditional-Chinese-Style-Music.mp3"
MUSIC_START = 3.90  # where the track starts so its accents land on the video (sound.py)
FPS = 60
LENGTH = 26.4
# Moments around the seams, video time: prologue -> slot 1, slot 1 -> 2 (mist),
# slot 2 -> 3 (night), slot 3 -> the lake, the finale.
SEAMS = [4.9, 5.4, 7.0, 9.2, 9.6, 10.2, 12.2, 12.6, 13.2, 15.3, 15.8, 22.5]


def ensure_mix() -> Path:
    if MIX.exists():
        return MIX
    if not TRACK.exists():
        sys.exit(f"no sound: {MIX} is missing and the track {TRACK} is not there to build it")
    print("building the sound once (render/sound.py)")
    subprocess.run(["uv", "run", str(ROOT / "render" / "sound.py"), str(TRACK),
                    "--music-start", f"{MUSIC_START}"], check=True, cwd=ROOT)
    return MIX


def contact_sheet(images: list[Path], labels: list[str], out: Path, cols: int = 3) -> None:
    """A sheet in `cols` columns of the images, 640 px wide each, with its label written on it.
    Laid out as a page in the browser (this FFmpeg has no text filter)."""
    ffmpeg = find_tool("ffmpeg")
    cells = []
    for img, label in zip(images, labels):
        small = subprocess.run([ffmpeg, "-loglevel", "error", "-i", str(img), "-vf", "scale=640:-1",
                                "-f", "image2pipe", "-c:v", "mjpeg", "-q:v", "3", "-"],
                               check=True, capture_output=True).stdout
        cells.append(f'<figure><img src="data:image/jpeg;base64,{base64.b64encode(small).decode()}">'
                     f"<figcaption>{label}</figcaption></figure>")
    html = (f"<style>body{{margin:0;background:#141414}}main{{display:grid;grid-template-columns:repeat({cols},640px);gap:4px}}"
            "figure{margin:0;position:relative}img{display:block;width:640px}"
            "figcaption{position:absolute;left:8px;top:8px;padding:2px 8px;background:#000a;color:#fff;"
            "font:20px sans-serif}</style><main>" + "".join(cells) + "</main>")
    with sync_playwright() as p:
        browser = launch(p)
        page = browser.new_page(viewport={"width": cols * 644, "height": 400}, device_scale_factor=1)
        page.set_content(html)
        page.screenshot(path=str(out), full_page=True)
        browser.close()


def probe(mp4: Path) -> list[str]:
    """Check the MP4 against the project format; returns the problems found."""
    info = json.loads(subprocess.run(
        [find_tool("ffprobe"), "-v", "error", "-show_streams", "-show_format", "-of", "json", str(mp4)],
        check=True, capture_output=True, text=True).stdout)
    v = next((s for s in info["streams"] if s["codec_type"] == "video"), None)
    a = next((s for s in info["streams"] if s["codec_type"] == "audio"), None)
    problems = []
    if not v:
        return ["no video stream"]
    for key, want in [("codec_name", "h264"), ("width", 1920), ("height", 1080), ("pix_fmt", "yuv420p"), ("r_frame_rate", f"{FPS}/1")]:
        if v.get(key) != want:
            problems.append(f"video {key} = {v.get(key)}, want {want}")
    if not a or a.get("codec_name") != "aac":
        problems.append("no AAC audio")
    dur = float(info["format"]["duration"])
    if abs(dur - LENGTH) > 0.05:
        problems.append(f"duration {dur:.2f} s, want {LENGTH}")
    print(f"ffprobe: {v['codec_name']} {v['width']}x{v['height']} {v['r_frame_rate']} {v['pix_fmt']}, "
          f"{a['codec_name'] + ' ' + a['sample_rate'] + ' Hz' if a else 'no audio'}, {dur:.2f} s")
    return problems


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--route", required=True, help="three location ids, e.g. wall,guilin,shanghai")
    ap.add_argument("--name", help="output name (default: route-<ids>)")
    ap.add_argument("--seams-only", action="store_true", help="only the contact sheet of the seams")
    args = ap.parse_args()

    ids = [s.strip() for s in args.route.split(",") if s.strip()]
    if len(ids) != 3:
        sys.exit(f"--route needs three ids, got {ids}")
    route = ",".join(ids)
    name = args.name or "route-" + "-".join(ids)
    out_dir = ROOT / "out" / name
    query = f"route={route}"

    if args.seams_only:
        stills = render_frames(INTRO, out_dir / "seams", FPS, SEAMS, query)
        contact_sheet(stills, [f"{t:.2f} s" for t in SEAMS], out_dir / "seams.png")
        print(f"seams -> {out_dir / 'seams.png'}")
        return

    mix = ensure_mix()
    frames_dir = out_dir / "frames"
    if frames_dir.exists():
        shutil.rmtree(frames_dir)
    render_frames(INTRO, frames_dir, FPS, None, query)
    mp4 = out_dir / f"{name}.mp4"
    assemble(frames_dir, FPS, mp4, mix)
    seams = [frames_dir / f"{round(t * FPS):05d}.png" for t in SEAMS]
    contact_sheet(seams, [f"{t:.2f} s" for t in SEAMS], out_dir / "seams.png")
    problems = probe(mp4)
    print(f"video -> {mp4}\nseams -> {out_dir / 'seams.png'}")
    if problems:
        sys.exit("ffprobe found problems:\n  " + "\n  ".join(problems))


if __name__ == "__main__":
    main()
