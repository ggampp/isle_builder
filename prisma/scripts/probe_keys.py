"""Print SET/MISSING for asset keys. Never prints secret values."""
from __future__ import annotations

import os

from load_env import load_env

KEYS = ("TRIPO_API_KEY", "GEMINI_API_KEY", "ELEVENLABS_API_KEY", "FAL_KEY")


def main() -> None:
    load_env()
    for key in KEYS:
        print(f"{key}={'SET' if os.environ.get(key) else 'MISSING'}")


if __name__ == "__main__":
    main()
