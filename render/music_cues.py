"""Find where to start a music track so that its accents land on the video's events.

The track is decoded with FFmpeg to a mono loudness envelope (100 values per second);
an accent is a sudden rise of loudness (onset). For every possible start point the
script scores how strong the onsets are near the cue times of the video, the first cue
counting most, and prints the best start points with what lands where.

Cues of intro-01 (docs/intro-01-storyboard.md): the gust at 3.0 s, the first stroke of
道 at 16.0 s (the main accent), the end at 20.0 s (the track should be calm there).

    uv run render/music_cues.py music/local/track.mp3
    uv run render/music_cues.py music/local/track.mp3 --cues 16.0 3.0 --length 20
"""

import argparse
import math
import shutil
import subprocess
import sys
from array import array
from pathlib import Path

RATE = 8000  # Hz of the decoded mono signal
HOP = RATE // 100  # one envelope value per 10 ms


def envelope(path: Path) -> list[float]:
    """Loudness in dB per 10 ms window."""
    ffmpeg = shutil.which("ffmpeg") or sys.exit("ffmpeg not found")
    raw = subprocess.run(
        [
            ffmpeg,
            "-v",
            "error",
            "-i",
            str(path),
            "-ac",
            "1",
            "-ar",
            str(RATE),
            "-f",
            "s16le",
            "-",
        ],
        check=True,
        capture_output=True,
    ).stdout
    pcm = array("h")
    pcm.frombytes(raw[: len(raw) // 2 * 2])
    env = []
    for i in range(0, len(pcm) - HOP, HOP):
        win = pcm[i : i + HOP]
        rms = math.sqrt(sum(v * v for v in win) / HOP) / 32768
        env.append(20 * math.log10(rms + 1e-5))
    return env


def onsets(env: list[float]) -> list[float]:
    """Onset strength: how much louder than the last 150 ms, only rises count."""
    out = []
    for i, v in enumerate(env):
        past = env[max(0, i - 15) : i] or [v]
        out.append(max(0.0, v - sum(past) / len(past)))
    return out


def peak_near(on: list[float], t: float, tol: float = 0.12) -> tuple[float, float]:
    """The strongest onset within tol seconds of t: (strength, its time)."""
    a, b = max(0, int((t - tol) * 100)), min(len(on), int((t + tol) * 100) + 1)
    if a >= b:
        return 0.0, t
    i = max(range(a, b), key=lambda j: on[j])
    return on[i], i / 100


def main() -> None:
    ap = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    ap.add_argument("track", type=Path)
    ap.add_argument(
        "--cues",
        type=float,
        nargs="+",
        default=[16.0, 3.0],
        help="video times, most important first",
    )
    ap.add_argument("--length", type=float, default=20.0, help="video length, s")
    ap.add_argument("--top", type=int, default=5)
    args = ap.parse_args()

    env = envelope(args.track)
    on = onsets(env)
    dur = len(env) / 100
    print(f"{args.track.name}: {dur:.1f} s")
    if dur < args.length:
        print(
            f"  shorter than the video ({args.length:.0f} s): it would need a loop or a second track"
        )
        return
    weights = [1.0 / (k + 1) ** 0.5 for k in range(len(args.cues))]
    results = []
    for s100 in range(0, int((dur - args.length) * 100) + 1, 5):  # every 50 ms
        s = s100 / 100
        score = 0.0
        for w, c in zip(weights, args.cues):
            strength, at = peak_near(on, s + c)
            # an accent counts less the further it lands from the cue (40 dB per second)
            score += w * max(0.0, strength - 40 * abs(at - (s + c)))
        # the end should be calm: penalise loud onsets in the last second
        tail = max(
            on[int((s + args.length - 1) * 100) : int((s + args.length) * 100)] or [0]
        )
        results.append((score - 0.5 * tail, s))
    results.sort(reverse=True)
    picked: list[float] = []
    for score, s in results:
        if any(abs(s - p) < 1.0 for p in picked):
            continue  # keep the suggestions apart
        picked.append(s)
        parts = []
        for c in args.cues:
            strength, at = peak_near(on, s + c)
            parts.append(
                f"cue {c:.1f} s: accent +{strength:.1f} dB at video {at - s:.2f} s"
            )
        lands = "; ".join(parts)
        print(f"  start at {s:6.2f} s  score {score:5.1f}  {lands}")
        if len(picked) >= args.top:
            break


if __name__ == "__main__":
    main()
