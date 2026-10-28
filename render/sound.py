"""Build the sound of intro-01: the music, the wind and the flight of petals.

The wind and the petals are synthesised (seeded noise, so every build is the same and
there is no licence to check):
  wind    brown noise, band-limited to a soft low rush, two seeds for a wide stereo;
          its loudness breathes very slowly; at 3.0 s, when the wind comes into the
          frame, a strong gust (a quick intake, about 10 dB over the steady wind, with a
          little high whistle of air) that settles in ~2 s; then steady to the end
  petals  each petal is one flight heard two ways at once: a soft swish of air (noise
          through a band-pass gliding down) and the flutter of silk (noise trembling in
          loudness); the faster the air glides, the faster the silk trembles. While
          petals fly: the gust (3.1-5.2 s) and the lights flying home (15.5-17.9 s)
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


GUST = 2.6  # the gust's peak over the steady wind, x (about +10 dB)


def wind(path: Path) -> None:
    """Brown noise per channel, a low band, a slow breath of +-12 %; at 3.0 s a gust: up in
    0.3 s, back to the steady wind over ~2 s, with pink noise in a higher band only while
    it blows."""
    breath = "0.88+0.12*sin(2*PI*t/6.1)*sin(2*PI*t/9.7+1)"
    g0 = WIND_FROM
    bump = f"if(lt(t,{g0 + 0.3}),pow(max(0,(t-{g0})/0.3),2),exp(-(t-{g0 + 0.3})/0.7))"
    chain = (
        "highpass=f=90,lowpass=f=700,lowpass=f=1400,"
        f"volume='({breath})*(1+{GUST}*{bump})':eval=frame,"
        f"afade=t=in:st={g0}:d=0.25,afade=t=out:st={LENGTH - 1.5}:d=1.5"
    )
    hiss = f"highpass=f=400,lowpass=f=2500,volume='{0.35 * GUST}*{bump}':eval=frame"
    src = lambda color, seed: ["-f", "lavfi", "-i", f"anoisesrc=color={color}:seed={seed}:r={RATE}:d={LENGTH}"]
    run(
        [
            *src("brown", 11), *src("brown", 23), *src("pink", 31), *src("pink", 37),
            "-filter_complex",
            f"[0]{chain}[a];[1]{chain}[b];[2]{hiss}[c];[3]{hiss}[d];"
            "[a][c]amix=inputs=2:normalize=0[l];[b][d]amix=inputs=2:normalize=0[r];"
            f"[l][r]join=inputs=2:channel_layout=stereo,atrim=0:{LENGTH}",
            str(path),
        ]
    )


def _pcm(v: float) -> int:
    return max(-32767, min(32767, int(v * 32767)))


class BandPass:
    """RBJ band-pass biquad (constant peak gain), retuned every sample."""

    def __init__(self) -> None:
        self.x1 = self.x2 = self.y1 = self.y2 = 0.0

    def __call__(self, x: float, f: float, q: float) -> float:
        w = 2 * math.pi * f / RATE
        al, c = math.sin(w) / (2 * q), math.cos(w)
        a0 = 1 + al
        y = (al * x - al * self.x2 + 2 * c * self.y1 - (1 - al) * self.y2) / a0
        self.x2, self.x1, self.y2, self.y1 = self.x1, x, self.y1, y
        return y


AIR, SILK = 0.2, 0.5  # the two voices of a petal: as in the approved samples A and B


def petals(path: Path) -> None:
    """Every petal: a glide of air, eased in and out (sweep), and silk trembling at a rate
    that follows the speed of that glide; one envelope for both, one place in stereo."""
    rnd = random.Random(3)
    n = int(RATE * LENGTH)
    left, right = [0.0] * n, [0.0] * n
    for t0, t1 in PETALS:
        t = t0
        while t < t1:
            t += rnd.expovariate(3.5)
            fade = min(1, (t - t0) / 0.3, max(0, t1 - t) / 0.4)
            dur = rnd.uniform(0.45, 0.85)
            f0 = rnd.uniform(2200, 3200)
            f1 = f0 * rnd.uniform(0.4, 0.6)
            fc = rnd.uniform(900, 1600)
            spd = rnd.uniform(0.8, 1.2)
            pan = rnd.random()
            gl, gr = math.cos(pan * math.pi / 2), math.sin(pan * math.pi / 2)
            air, silk, phase = BandPass(), BandPass(), rnd.random() * 6.283
            start, m = int(t * RATE), int(dur * RATE)
            for i in range(m):
                k = start + i
                if k >= n:
                    break
                u = i / m
                pos = (1 - math.cos(math.pi * u)) / 2  # where the glide is
                speed = math.sin(math.pi * u)  # how fast it moves there (0..1)
                phase += 2 * math.pi * (8 + 22 * speed * spd) / RATE
                env = fade * math.sin(math.pi * u) ** 2
                v = AIR * air(rnd.uniform(-1, 1), f0 + (f1 - f0) * pos, 1.8)
                v += SILK * (0.55 + 0.45 * math.sin(phase)) * silk(rnd.uniform(-1, 1), fc * (1.3 - 0.3 * pos), 2.5)
                left[k] += env * v * gl
                right[k] += env * v * gr
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(
            b"".join(struct.pack("<hh", _pcm(a), _pcm(b)) for a, b in zip(left, right))
        )


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
    ap.add_argument("--petals", type=float, default=-5.0, help="petals level, dB")
    ap.add_argument("--out", type=Path, default=ROOT / "out" / "intro-01" / "mix.wav")
    args = ap.parse_args()

    args.out.parent.mkdir(parents=True, exist_ok=True)
    w, r = args.out.with_name("wind.wav"), args.out.with_name("petals.wav")
    wind(w)
    petals(r)
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
                f"[1]volume={args.wind}dB[w];[2]volume={args.petals}dB[r];"
                f"[m][w][r]amix=inputs=3:normalize=0,alimiter=limit=0.95,atrim=0:{LENGTH}"
            ),
            "-ar",
            str(RATE),
            str(args.out),
        ]
    )
    print(f"mix -> {args.out}  (wind {w.name}, petals {r.name})")


if __name__ == "__main__":
    main()
