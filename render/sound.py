"""Build the sound of intro-01: the music, a steady wind and the rustle of petals.

The wind and the rustle are synthesised (seeded noise, so every build is the same and
there is no licence to check):
  wind    brown noise, band-limited to a soft low rush, two seeds for a wide stereo;
          its loudness breathes very slowly (no gusts); from 3.0 s, when the wind comes
          into the frame, faded in, held to the end
  rustle  short soft grains of high, band-limited noise, panned at random, while petals
          fly: the gust (3.1-5.2 s) and the lights flying home (15.5-17.9 s)
The music: the track from --music-start, faded in over --music-fade-in (the video opens
on a drop of ink), faded out over the last --music-fade-out seconds (the track is cut
where its own ending has almost died away).

    uv run render/sound.py music/local/by-the-quiet-water-30s.mp3 --music-start 3.88
    uv run render/render.py videos/intro-01/index.html --reuse-frames --audio out/intro-01/mix.wav
"""

import argparse
import math
import random
import shutil
import struct
import subprocess
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RATE = 48000
LENGTH = 24.4  # the video, s (videos/intro-01/index.html)
WIND_FROM = 3.0
PETALS = [(3.1, 5.2), (15.5, 17.9)]  # when petals fly in the frame, s


def ffmpeg() -> str:
    return shutil.which("ffmpeg") or sys.exit("ffmpeg not found")


def run(args: list[str]) -> None:
    subprocess.run([ffmpeg(), "-y", "-v", "error", *args], check=True)


def wind(path: Path) -> None:
    """Brown noise per channel, a low band, a slow breath of +-12 %, faded in at 3.0 s."""
    breath = "0.88+0.12*sin(2*PI*t/6.1)*sin(2*PI*t/9.7+1)"
    chain = (
        "highpass=f=90,lowpass=f=700,lowpass=f=1400,"
        f"volume='{breath}':eval=frame,"
        f"afade=t=in:st={WIND_FROM}:d=1.2,afade=t=out:st={LENGTH - 1.5}:d=1.5"
    )
    run(
        [
            "-f",
            "lavfi",
            "-i",
            f"anoisesrc=color=brown:seed=11:r={RATE}:d={LENGTH}",
            "-f",
            "lavfi",
            "-i",
            f"anoisesrc=color=brown:seed=23:r={RATE}:d={LENGTH}",
            "-filter_complex",
            f"[0]{chain}[l];[1]{chain}[r];[l][r]join=inputs=2:channel_layout=stereo,atrim=0:{LENGTH}",
            str(path),
        ]
    )


def _pcm(v: float) -> int:
    return max(-32767, min(32767, int(v * 32767)))


def rustle(path: Path) -> None:
    """Grains of white noise with a fast attack and a short decay, written raw, then
    band-limited by FFmpeg to the papery 2-7 kHz."""
    rnd = random.Random(7)
    n = int(RATE * LENGTH)
    left, right = [0.0] * n, [0.0] * n
    for t0, t1 in PETALS:
        t = t0
        while t < t1:
            t += rnd.expovariate(14)  # ~14 grains per second
            dur = rnd.uniform(0.02, 0.07)
            amp = rnd.uniform(0.15, 0.55) * min(1, (t - t0) / 0.3, (t1 - t) / 0.4)
            pan = rnd.random()
            start = int(t * RATE)
            for i in range(int(dur * RATE)):
                k = start + i
                if k >= n:
                    break
                x = i / RATE
                env = min(1, x / 0.004) * math.exp(-x / (dur * 0.35))
                v = amp * env * rnd.uniform(-1, 1)
                left[k] += v * (1 - pan)
                right[k] += v * pan
    raw = path.with_suffix(".raw.wav")
    with wave.open(str(raw), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(
            b"".join(struct.pack("<hh", _pcm(a), _pcm(b)) for a, b in zip(left, right))
        )
    run(["-i", str(raw), "-af", "highpass=f=2000,lowpass=f=7000", str(path)])
    raw.unlink()


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("music", type=Path)
    ap.add_argument(
        "--music-start", type=float, default=0.0, help="start the track at this second"
    )
    ap.add_argument("--music-fade-in", type=float, default=1.0)
    ap.add_argument("--music-fade-out", type=float, default=1.2)
    ap.add_argument("--wind", type=float, default=-16.0, help="wind level, dB")
    ap.add_argument("--rustle", type=float, default=-10.0, help="rustle level, dB")
    ap.add_argument("--out", type=Path, default=ROOT / "out" / "intro-01" / "mix.wav")
    args = ap.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)
    w, r = args.out.with_name("wind.wav"), args.out.with_name("rustle.wav")
    wind(w)
    rustle(r)
    run(
        [
            "-ss",
            f"{args.music_start:.3f}",
            "-t",
            f"{LENGTH}",
            "-i",
            str(args.music),
            "-i",
            str(w),
            "-i",
            str(r),
            "-filter_complex",
            (
                f"[0]aresample={RATE},afade=t=in:st=0:d={args.music_fade_in},"
                f"afade=t=out:st={LENGTH - args.music_fade_out}:d={args.music_fade_out},apad=whole_dur={LENGTH}[m];"
                f"[1]volume={args.wind}dB[w];[2]volume={args.rustle}dB[r];"
                f"[m][w][r]amix=inputs=3:normalize=0,alimiter=limit=0.95,atrim=0:{LENGTH}"
            ),
            "-ar",
            str(RATE),
            str(args.out),
        ]
    )
    print(f"mix -> {args.out}  (wind {w.name}, rustle {r.name})")


if __name__ == "__main__":
    main()
