"""Gera GLBs via Fal Tripo H3.1 (image-to-3D se houver conceito, senão text-to-3D)."""
from __future__ import annotations

import json
import os
import sys
import urllib.request
from pathlib import Path

import fal_client

from load_env import ROOT, load_env

STYLE = (
    "stylized low-poly optical laboratory prism atelier browser game asset, dark slate metal, "
    "brushed brass, faceted glass, readable silhouette, PBR, centered, no text, no people, "
    "no base, no stand"
)

PROMPTS: dict[str, str] = {
    "emitter": (
        f"game-ready compact optical light projector lantern, hexagonal dark metal body, "
        f"circular glass lens, brass rings, {STYLE}"
    ),
    "target": (
        f"game-ready crystal light receptor, dark brass ring on a short pedestal, "
        f"faceted glass gem in the hollow center, {STYLE}"
    ),
    "mirror": (
        f"game-ready standing rectangular glass mirror pane in a thin brass frame, "
        f"clear diagonal slab, {STYLE}"
    ),
    "wall": f"game-ready dark obsidian cube block, faceted top, beveled edges, {STYLE}",
    "tile": f"game-ready square dark slate floor tile, rounded corners, brass inlay border, very low, {STYLE}",
    "crystal": f"game-ready faceted diamond prism crystal, pointed top and bottom, clear glass, {STYLE}",
    "lamp": f"game-ready hanging laboratory lamp, dark metal shade, warm glass bulb, short chain, {STYLE}",
    "column": f"game-ready dark marble column with brass capital and base, {STYLE}",
}

MODELS = list(PROMPTS)

FACE_LIMIT = {
    "emitter": 10000,
    "target": 10000,
    "mirror": 8000,
    "wall": 6000,
    "tile": 4000,
    "crystal": 5000,
    "lamp": 8000,
    "column": 8000,
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
    raise RuntimeError(f"sem URL de GLB: {json.dumps(data, default=str)[:800]}")


def generate_from_image(name: str, image: Path) -> object:
    print(f"enviando {name} ({image.name}) para Fal image-to-3d...")
    uploaded = fal_client.upload_file(str(image))
    return fal_client.subscribe(
        "tripo3d/h3.1/image-to-3d",
        arguments={
            "image_url": uploaded,
            "texture": True,
            "pbr": True,
            "face_limit": FACE_LIMIT.get(name, 8000),
            "texture_quality": "detailed",
            "geometry_quality": "detailed",
            "texture_alignment": "original_image",
            "orientation": "align_image",
            "auto_size": True,
        },
        with_logs=True,
    )


def generate_from_text(name: str) -> object:
    prompt = PROMPTS[name]
    print(f"enviando {name} para Fal text-to-3d...")
    return fal_client.subscribe(
        "tripo3d/h3.1/text-to-3d",
        arguments={
            "prompt": prompt,
            "negative_prompt": "text, watermark, base, stand, exploded parts, people",
            "texture": True,
            "pbr": True,
            "face_limit": FACE_LIMIT.get(name, 8000),
            "texture_quality": "detailed",
            "geometry_quality": "detailed",
            "auto_size": True,
        },
        with_logs=True,
    )


def generate(name: str, image: Path | None, out: Path) -> None:
    result = generate_from_image(name, image) if image else generate_from_text(name)
    url = mesh_url(result)
    out.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, out)
    print(f"salvo {out} ({out.stat().st_size} bytes)")


def main() -> int:
    load_env()
    if not os.environ.get("FAL_KEY"):
        print("FAL_KEY ausente", file=sys.stderr)
        return 1
    wanted = sys.argv[1:] or MODELS
    concepts = ROOT / "assets" / "concepts"
    out_dir = ROOT / "public" / "assets" / "models"
    errors: list[str] = []
    for name in wanted:
        image_path = concepts / f"{name}.png"
        image = image_path if image_path.exists() else None
        if name not in PROMPTS:
            errors.append(f"{name}: prompt desconhecido")
            print(errors[-1], file=sys.stderr)
            continue
        dest = out_dir / f"{name}.glb"
        if dest.exists() and dest.stat().st_size > 1000:
            print(f"já existe {dest.name}, pulando")
            continue
        try:
            generate(name, image, out_dir / f"{name}.glb")
        except Exception as exc:
            errors.append(f"{name}: {exc}")
            print(f"FALHA {name}: {exc}", file=sys.stderr)
    if errors:
        print(f"{len(errors)} falha(s)", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
