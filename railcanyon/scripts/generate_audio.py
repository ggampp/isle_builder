"""Gera SFX e ambiência via o script ElevenLabs da skill threejs-audio-generator."""
from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path

from load_env import ROOT, load_env

SKILL_SCRIPT = Path.home() / ".claude" / "skills" / "threejs-audio-generator" / "scripts" / "threejs_audio_asset.py"

SOUNDS: list[tuple[str, str, float, bool, float]] = [
    # id, prompt, duration, loop, influence
    (
        "canyon-wind",
        "seamless looping western desert canyon ambience, dry wind over sandstone mesas, "
        "distant river hush, sparse insect bed, no melody, no voice, no train",
        14.0,
        True,
        0.42,
    ),
    (
        "chuff",
        "short steam locomotive chuff for a western railroad game, single piston exhaust burst, "
        "soft steam hiss tail, close mic, no whistle, no music, no voice",
        0.55,
        False,
        0.7,
    ),
    (
        "whistle",
        "steam locomotive whistle for a western railroad game, two-tone chord, warm brass, "
        "clear attack, 1 second tail, no music, no voice",
        1.3,
        False,
        0.68,
    ),
    (
        "boom",
        "short dynamite explosion in a desert canyon, rock crack then low boom, gravel rain tail, "
        "no scream, no music, no voice",
        1.4,
        False,
        0.72,
    ),
    (
        "ui-click",
        "tiny premium wooden UI confirm click, soft latch, warm short sparkle tail, no harsh beep, no voice",
        0.5,
        False,
        0.8,
    ),
    (
        "coins",
        "short cheerful coin reward arpeggio for a western railroad tycoon UI, three bright chimes, "
        "no music bed, no voice",
        0.85,
        False,
        0.7,
    ),
    (
        "ui-error",
        "short muted error thunk for a western game UI, low wooden knock, no buzzer, no voice",
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
