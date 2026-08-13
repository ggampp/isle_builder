"""Gera SFX e ambiência via o script ElevenLabs da skill threejs-audio-generator."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from load_env import ROOT, load_env

SKILL_SCRIPT = Path.home() / ".claude" / "skills" / "threejs-audio-generator" / "scripts" / "threejs_audio_asset.py"

SOUNDS: list[tuple[str, str, float, bool, float]] = [
    (
        "atelier-ambience",
        "seamless looping quiet optical laboratory ambience, soft transformer hum, distant glass "
        "resonance, faint night air through high windows, no melody, no voice, no footsteps",
        14.0,
        True,
        0.42,
    ),
    (
        "place-mirror",
        "short glass mirror placement on a stone tile for a puzzle game, crisp glass set-down, "
        "tiny brass chime tail, close mic, no music, no voice",
        0.55,
        False,
        0.72,
    ),
    (
        "flip-mirror",
        "short glass pane rotate click for an optical puzzle, light brass hinge tick then glass "
        "shimmer, 0.4s tail, no music, no voice",
        0.5,
        False,
        0.7,
    ),
    (
        "remove-mirror",
        "short glass lift-off from a board for a puzzle game, soft suction then muted clack, "
        "no music, no voice",
        0.5,
        False,
        0.7,
    ),
    (
        "mix-beam",
        "short two colored light beams combining into a brighter prism tone, glassy harmonic swell, "
        "bright transient, 0.8s sparkle tail, no music, no voice",
        0.9,
        False,
        0.65,
    ),
    (
        "target-lit",
        "short crystal receptor lighting up for an optical puzzle, warm glass bloom then soft chime, "
        "no music, no voice",
        0.85,
        False,
        0.68,
    ),
    (
        "win",
        "short puzzle solved stinger, three rising glass chimes with a warm prism shimmer tail, "
        "no melody bed, no voice",
        1.4,
        False,
        0.62,
    ),
    (
        "ui-click",
        "tiny premium UI confirm click, soft brass latch, warm short sparkle tail, no harsh beep, no voice",
        0.5,
        False,
        0.8,
    ),
    (
        "ui-error",
        "short muted error thunk for a puzzle UI, low glass knock, no buzzer, no voice",
        0.5,
        False,
        0.75,
    ),
]


def main() -> int:
    load_env()
    if not os.environ.get("ELEVENLABS_API_KEY"):
        print("ELEVENLABS_API_KEY ausente", file=sys.stderr)
        return 1
    if not SKILL_SCRIPT.exists():
        print(f"script da skill ausente: {SKILL_SCRIPT}", file=sys.stderr)
        return 1
    out_dir = ROOT / "public" / "assets" / "audio"
    out_dir.mkdir(parents=True, exist_ok=True)
    wanted = set(sys.argv[1:]) if len(sys.argv) > 1 else None
    errors: list[str] = []
    env = os.environ.copy()
    for name, prompt, duration, loop, influence in SOUNDS:
        if wanted and name not in wanted:
            continue
        out = out_dir / f"{name}.mp3"
        cmd = [
            sys.executable,
            str(SKILL_SCRIPT),
            "sfx",
            "--prompt",
            prompt,
            "--duration",
            str(duration),
            "--prompt-influence",
            str(influence),
            "--out",
            str(out),
        ]
        if loop:
            cmd.append("--loop")
        print(f"gerando áudio {name}...")
        result = subprocess.run(cmd, env=env, cwd=str(ROOT))
        if result.returncode != 0:
            errors.append(name)
            print(f"FALHA {name}", file=sys.stderr)
        else:
            print(f"salvo {out} ({out.stat().st_size} bytes)")
    if errors:
        print(f"{len(errors)} falha(s)", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
