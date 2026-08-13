"""Gera viewmodels GLB via Fal (Tripo H3.1). Usa FAL_KEY do ambiente."""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

import fal_client

WEAPONS = {
    "shotgun": (
        "game-ready first-person pump-action shotgun, dark steel barrel and receiver, "
        "worn walnut pump and stock, readable silhouette, PBR materials, centered, "
        "no hands, no holster, no text"
    ),
    "bullet": (
        "game-ready first-person western revolver, short dark metal barrel, wooden grip, "
        "readable silhouette, PBR, centered, no hands, no text"
    ),
    "rifle": (
        "game-ready first-person lever-action rifle, long barrel, brass receiver, "
        "wooden stock and lever, readable silhouette, PBR, centered, no hands, no text"
    ),
    "bomb": (
        "game-ready stick of red dynamite with a short fuse, western cartoon, "
        "readable silhouette, PBR, centered, no hands, no text"
    ),
    "laser": (
        "game-ready first-person steampunk laser gun, dark metal and brass, "
        "glowing cyan chamber, readable silhouette, PBR, centered, no hands, no text"
    ),
}


def mesh_url(result: object) -> str:
    data = result if isinstance(result, dict) else getattr(result, "__dict__", {})
    mesh = data.get("model_mesh") if isinstance(data, dict) else None
    if isinstance(mesh, dict) and mesh.get("url"):
        return str(mesh["url"])
    urls = data.get("model_urls") if isinstance(data, dict) else None
    if isinstance(urls, dict):
        glb = urls.get("glb") or urls.get("pbr_model")
        if isinstance(glb, dict) and glb.get("url"):
            return str(glb["url"])
        if isinstance(glb, str) and glb.startswith("http"):
            return glb
    raise RuntimeError(f"sem URL de GLB na resposta: {json.dumps(data, default=str)[:800]}")


def generate(name: str, prompt: str, out: Path) -> None:
    print(f"gerando {name}...")
    result = fal_client.subscribe(
        "tripo3d/h3.1/text-to-3d",
        arguments={
            "prompt": prompt,
            "negative_prompt": "hands, arms, character, watermark, text, base, stand, exploded parts",
            "texture": True,
            "pbr": True,
            "face_limit": 12000,
            "texture_quality": "standard",
            "geometry_quality": "standard",
            "auto_size": True,
        },
        with_logs=True,
    )
    url = mesh_url(result)
    out.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, out)
    print(f"salvo {out} ({out.stat().st_size} bytes)")


def main() -> int:
    if not os.environ.get("FAL_KEY"):
        print("FAL_KEY ausente", file=sys.stderr)
        return 1
    root = Path(__file__).resolve().parents[1] / "public" / "assets" / "models"
    wanted = sys.argv[1:] or list(WEAPONS)
    for name in wanted:
        prompt = WEAPONS.get(name)
        if not prompt:
            print(f"arma desconhecida: {name}", file=sys.stderr)
            return 1
        generate(name, prompt, root / f"{name}.glb")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
