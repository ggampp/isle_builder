"""Gera conceitos Gemini (image-to-3D), céu, logo e retrato do trem."""
from __future__ import annotations

import argparse
import os
import sys
from io import BytesIO
from pathlib import Path

from load_env import ROOT, load_env

STYLE_3D = (
    "Create a clean 3D-generation reference image. Centered single object, full object visible, "
    "plain light studio background, readable silhouette, stylized low-poly western desert railroad "
    "browser game, flat color zones, painterly PBR, Canyon Rails palette sand #e8a66c adobe cream "
    "#e6d3ae terracotta roof #b5432f locomotive blue #2f66c4 wood #6b4a2f turquoise accent #5fd3c8, "
    "three-quarter view, no motion blur, no cropped parts, no text, no people, no base, no stand, "
    "no ground plane, no watermark."
)

CONCEPTS: dict[str, tuple[str, str]] = {
    "locomotive": (
        "2K",
        STYLE_3D
        + " Game-ready 1915 steam locomotive named Workhorse: long blue boiler, dark blue cab on the left, "
        "black chimney, brass bell, cowcatcher on the right, four driving wheels, facing right so the "
        "front is clearly the cowcatcher side.",
    ),
    "wagon": (
        "2K",
        STYLE_3D
        + " Game-ready western wooden freight wagon, open-top gondola, weathered brown planks, "
        "iron wheels, no locomotive, empty cargo bed.",
    ),
    "cottage": (
        "2K",
        STYLE_3D
        + " Small western adobe cottage, cream walls, terracotta pitched roof, chimney, two windows, "
        "wooden door, stone base.",
    ),
    "house": (
        "2K",
        STYLE_3D
        + " Medium western house, cream siding, blue pitched roof, front porch with two posts, "
        "chimney, wooden door, several windows.",
    ),
    "manor": (
        "2K",
        STYLE_3D
        + " Large two-story western manor, cream walls, terracotta roofs on two volumes, "
        "front door, many windows, chimney, stone foundation.",
    ),
    "cabin": (
        "2K",
        STYLE_3D
        + " Western log cabin, stacked round logs, dark wood pitched roof, small chimney, "
        "simple door, no people.",
    ),
    "watertower": (
        "2K",
        STYLE_3D
        + " Wooden railroad water tower on four splayed stilts, round tank, conical blue cap, "
        "ladder, empty under the tank.",
    ),
    "windmill": (
        "2K",
        STYLE_3D
        + " Western windmill TOWER ONLY: tapered cream mill house, red conical cap, wooden door, "
        "NO blades, NO sails, NO vanes, NO propeller, just the tower and cap.",
    ),
    "shed": (
        "2K",
        STYLE_3D
        + " Small wooden storage shed, weathered planks, simple pitched roof, double barn doors, "
        "no windows clutter.",
    ),
    "lamp": (
        "2K",
        STYLE_3D
        + " Vintage western street lamp, tall wooden post, iron lantern with warm glass, "
        "standing upright, full height visible.",
    ),
    "bench": (
        "2K",
        STYLE_3D
        + " Wooden park bench, slatted seat and back, simple legs, western town square, "
        "full object visible.",
    ),
}

UI_IMAGES: dict[str, tuple[str, str, str]] = {
    "canyon-sky": (
        "public/assets/textures/canyon-sky.png",
        "4K",
        "Create a wide game background plate of a western desert mesa canyon at late afternoon. "
        "Layered red-orange buttes, sand mesa, hint of turquoise river in the far valley, "
        "warm peach sky with soft clouds, readable horizon, no foreground subject, no people, "
        "no text, suitable behind a real-time Three.js railroad scene.",
    ),
    "logo": (
        "public/assets/ui/logo.png",
        "1K",
        "Create a crisp game logo lockup for Canyon Rails: stylized low-poly blue steam locomotive "
        "mark plus bold western wood-type title, high contrast on a warm cream background, "
        "no tiny unreadable text, no photorealism, square-friendly.",
    ),
    "train-portrait": (
        "public/assets/ui/train-portrait.png",
        "1K",
        "Create a crisp game UI portrait of a blue 1915 steam locomotive pulling three wooden wagons, "
        "isometric low-poly western railroad, cream background, high contrast at small size, no text.",
    ),
}


def generate_one(client, prompt: str, filename: Path, resolution: str) -> None:
    from google.genai import types
    from PIL import Image as PILImage

    filename.parent.mkdir(parents=True, exist_ok=True)
    print(f"gerando {filename.relative_to(ROOT)} ({resolution})...")
    last_error: Exception | None = None
    response = None
    for model in (
        "gemini-3-pro-image-preview",
        "gemini-2.5-flash-image",
        "gemini-2.5-flash-image-preview",
    ):
        try:
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_modalities=["TEXT", "IMAGE"],
                    image_config=types.ImageConfig(image_size=resolution),
                ),
            )
            print(f"  modelo {model}")
            break
        except Exception as exc:
            last_error = exc
            print(f"  {model} falhou: {exc}")
    if response is None:
        raise last_error or RuntimeError("nenhum modelo de imagem Gemini respondeu")
    saved = False
    for part in response.parts:
        if part.text is not None:
            print(f"  nota: {part.text[:200]}")
        elif part.inline_data is not None:
            data = part.inline_data.data
            if isinstance(data, str):
                import base64

                data = base64.b64decode(data)
            image = PILImage.open(BytesIO(data))
            if image.mode == "RGBA":
                rgb = PILImage.new("RGB", image.size, (255, 255, 255))
                rgb.paste(image, mask=image.split()[3])
                rgb.save(filename, "PNG")
            else:
                image.convert("RGB").save(filename, "PNG")
            saved = True
    if not saved:
        raise RuntimeError(f"Gemini não devolveu imagem para {filename.name}")
    print(f"  salvo {filename} ({filename.stat().st_size} bytes)")


def main() -> int:
    load_env()
    parser = argparse.ArgumentParser()
    parser.add_argument("names", nargs="*", help="IDs específicos (default: todos)")
    args = parser.parse_args()

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        print("GEMINI_API_KEY ausente", file=sys.stderr)
        return 1

    # O SDK prefere GOOGLE_API_KEY se os dois existirem — isso pegou a cota free da máquina.
    os.environ.pop("GOOGLE_API_KEY", None)
    os.environ["GEMINI_API_KEY"] = key

    from google import genai

    client = genai.Client(api_key=key)
    wanted = set(args.names) if args.names else None
    errors: list[str] = []

    for name, (resolution, prompt) in CONCEPTS.items():
        if wanted and name not in wanted:
            continue
        path = ROOT / "assets" / "concepts" / f"{name}.png"
        try:
            generate_one(client, prompt, path, resolution)
        except Exception as exc:
            errors.append(f"{name}: {exc}")
            print(f"FALHA {name}: {exc}", file=sys.stderr)

    for name, (rel, resolution, prompt) in UI_IMAGES.items():
        if wanted and name not in wanted:
            continue
        path = ROOT / rel
        try:
            generate_one(client, prompt, path, resolution)
        except Exception as exc:
            errors.append(f"{name}: {exc}")
            print(f"FALHA {name}: {exc}", file=sys.stderr)

    if errors:
        print(f"{len(errors)} falha(s)", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
