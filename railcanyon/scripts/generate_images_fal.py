"""Gera conceitos e UI via Fal Flux quando o Gemini não tem cota de imagem."""
from __future__ import annotations

import os
import sys
import urllib.request
from pathlib import Path

import fal_client

from load_env import ROOT, load_env

CONCEPTS: dict[str, str] = {
    "locomotive": (
        "clean 3D-generation reference, centered toy steam train engine, blue boiler, "
        "wooden cabin, funnel chimney, four wheels, three-quarter view, plain white studio "
        "background, stylized low-poly western railroad game asset, no text, no people"
    ),
    "wagon": (
        "clean 3D-generation reference, centered wooden freight wagon, open top, brown planks, "
        "iron wheels, plain white studio background, low-poly western game asset, no text, no people"
    ),
    "cottage": (
        "clean 3D-generation reference, small adobe cottage, cream walls, terracotta roof, chimney, "
        "plain white studio background, low-poly western game house, no text, no people"
    ),
    "house": (
        "clean 3D-generation reference, medium western house, cream siding, blue roof, porch, "
        "plain white studio background, low-poly game building, no text, no people"
    ),
    "manor": (
        "clean 3D-generation reference, large two-story western manor, cream walls, terracotta roofs, "
        "plain white studio background, low-poly game building, no text, no people"
    ),
    "cabin": (
        "clean 3D-generation reference, log cabin, stacked logs, dark wood roof, "
        "plain white studio background, low-poly western game asset, no text, no people"
    ),
    "watertower": (
        "clean 3D-generation reference, wooden railroad water tower on stilts, round tank, conical cap, "
        "plain white studio background, low-poly game prop, no text, no people"
    ),
    "windmill": (
        "clean 3D-generation reference, western mill tower without blades, tapered cream house, red cap, "
        "plain white studio background, low-poly game building, no sails, no people, no text"
    ),
    "shed": (
        "clean 3D-generation reference, small wooden storage shed, pitched roof, barn doors, "
        "plain white studio background, low-poly game building, no text, no people"
    ),
    "lamp": (
        "clean 3D-generation reference, vintage street lamp, wooden post, warm lantern glass, "
        "plain white studio background, low-poly game prop, no text, no people"
    ),
    "bench": (
        "clean 3D-generation reference, wooden park bench, slatted seat, "
        "plain white studio background, low-poly game prop, no text, no people"
    ),
}

UI: dict[str, tuple[str, str, str]] = {
    "canyon-sky": (
        "public/assets/textures/canyon-sky.png",
        "landscape_16_9",
        "wide western desert mesa canyon at late afternoon, red-orange buttes, sand plateau, "
        "hint of turquoise river in the far valley, warm peach sky, no people, no text, "
        "game background plate",
    ),
    "logo": (
        "public/assets/ui/logo.png",
        "square_hd",
        "crisp game logo, stylized low-poly blue steam train mark, bold western wood-type title "
        "Canyon Rails, warm cream background, high contrast, no tiny text",
    ),
    "train-portrait": (
        "public/assets/ui/train-portrait.png",
        "landscape_4_3",
        "game UI portrait of a blue toy steam train pulling three wooden wagons, isometric low-poly, "
        "cream background, no text, no people",
    ),
}


def save_image(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(url, dest)
    print(f"salvo {dest} ({dest.stat().st_size} bytes)")


def flux(prompt: str, size: str) -> str:
    result = fal_client.subscribe(
        "fal-ai/flux/schnell",
        arguments={
            "prompt": prompt,
            "image_size": size,
            "num_images": 1,
            "output_format": "png",
            "enable_safety_checker": True,
        },
        with_logs=True,
    )
    data = result if isinstance(result, dict) else getattr(result, "__dict__", {})
    images = data.get("images") if isinstance(data, dict) else None
    if not images:
        raise RuntimeError(f"sem imagem na resposta: {data}")
    url = images[0].get("url") if isinstance(images[0], dict) else None
    if not url:
        raise RuntimeError(f"sem URL: {images[0]}")
    return str(url)


def main() -> int:
    load_env()
    if not os.environ.get("FAL_KEY"):
        print("FAL_KEY ausente", file=sys.stderr)
        return 1
    wanted = set(sys.argv[1:]) if len(sys.argv) > 1 else None
    errors: list[str] = []

    for name, prompt in CONCEPTS.items():
        if wanted and name not in wanted:
            continue
        path = ROOT / "assets" / "concepts" / f"{name}.png"
        print(f"gerando conceito {name}...")
        try:
            save_image(flux(prompt, "square_hd"), path)
        except Exception as exc:
            errors.append(f"{name}: {exc}")
            print(f"FALHA {name}: {exc}", file=sys.stderr)

    for name, (rel, size, prompt) in UI.items():
        if wanted and name not in wanted:
            continue
        path = ROOT / rel
        print(f"gerando UI {name}...")
        try:
            save_image(flux(prompt, size), path)
        except Exception as exc:
            errors.append(f"{name}: {exc}")
            print(f"FALHA {name}: {exc}", file=sys.stderr)

    if errors:
        print(f"{len(errors)} falha(s)", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
