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
    "stylized low-poly western desert railroad browser game asset, flat color zones, "
    "Canyon Rails palette sand adobe cream terracotta locomotive blue wood, "
    "readable silhouette, PBR, centered, no text, no people, no base, no stand"
)

PROMPTS: dict[str, str] = {
    "locomotive": (
        "stylized low poly toy steam train engine, blue cylindrical boiler, wooden cabin, "
        "funnel chimney, four spoked wheels, readable silhouette, PBR, centered studio, no text"
    ),
    "wagon": (
        f"game-ready western wooden freight wagon, open-top gondola, weathered brown planks, "
        f"iron wheels, empty cargo bed, no locomotive, {STYLE}"
    ),
    "cottage": f"small western adobe cottage, cream walls, terracotta pitched roof, chimney, wooden door, {STYLE}",
    "house": f"medium western house, cream siding, blue pitched roof, front porch, chimney, {STYLE}",
    "manor": f"large two-story western manor, cream walls, terracotta roofs, many windows, stone foundation, {STYLE}",
    "cabin": f"western log cabin, stacked round logs, dark wood pitched roof, small chimney, {STYLE}",
    "watertower": f"wooden railroad water tower on four splayed stilts, round tank, conical blue cap, ladder, {STYLE}",
    "windmill": (
        f"western windmill tower only, tapered cream mill house, red conical cap, wooden door, "
        f"NO blades, NO sails, NO vanes, {STYLE}"
    ),
    "shed": f"small wooden storage shed, weathered planks, simple pitched roof, double barn doors, {STYLE}",
    "lamp": f"vintage western street lamp, tall wooden post, iron lantern with warm glass, upright, {STYLE}",
    "bench": f"wooden park bench, slatted seat and back, simple legs, full object visible, {STYLE}",
}

MODELS = list(PROMPTS)

FACE_LIMIT = {
    "locomotive": 16000,
    "wagon": 10000,
    "manor": 14000,
    "watertower": 12000,
    "windmill": 10000,
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
    print(f"enviando {name} ({image.name}) para Fal image-to-3d...", flush=True)
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
    print(f"enviando {name} para Fal text-to-3d...", flush=True)
    return fal_client.subscribe(
        "tripo3d/h3.1/text-to-3d",
        arguments={
            "prompt": prompt,
            "negative_prompt": "text, watermark, base, stand, exploded parts",
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
    print(f"salvo {out} ({out.stat().st_size} bytes)", flush=True)


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
