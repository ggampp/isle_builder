"""Gera conceitos Gemini (image-to-3D), céu, textura e logo do Prisma."""
from __future__ import annotations

import argparse
import os
import sys
import urllib.request
from pathlib import Path

from load_env import ROOT, load_env

STYLE_3D = (
    "Create a clean 3D-generation reference image. Centered single object, full object visible, "
    "plain light studio background, readable silhouette, stylized low-poly optical laboratory "
    "prism atelier browser game, dark slate metal #1a1f2a, brushed brass #c4a35a, faceted glass, "
    "painterly PBR, three-quarter view, no motion blur, no cropped parts, no text, no people, "
    "no base, no stand, no ground plane, no watermark."
)

CONCEPTS: dict[str, tuple[str, str]] = {
    "emitter": (
        "2K",
        STYLE_3D
        + " Game-ready optical light projector lantern that sits on one board tile: compact hexagonal "
        "dark metal body, large circular glass lens on the front, brass rings, short chimney vents, "
        "no colored light beam coming out, no cable.",
    ),
    "target": (
        "2K",
        STYLE_3D
        + " Game-ready crystal light receptor: dark brass ring standing on a short hexagonal pedestal, "
        "hollow center with a faceted glass gem, optical laboratory, no beam, no glow bloom.",
    ),
    "mirror": (
        "2K",
        STYLE_3D
        + " Game-ready standing rectangular glass mirror pane in a thin brass frame, the glass is a "
        "clear diagonal slab suitable as a puzzle piece, full object visible, no stand, no base, "
        "no wooden easel.",
    ),
    "wall": (
        "2K",
        STYLE_3D
        + " Game-ready dark obsidian cube block, faceted top, slightly beveled edges, optical laboratory "
        "barrier, single cube only, no other objects.",
    ),
    "tile": (
        "2K",
        STYLE_3D
        + " Game-ready square floor tile, dark slate with rounded corners, very low height, thin brass "
        "inlay border, optical board cell, single tile, no other objects.",
    ),
    "crystal": (
        "2K",
        STYLE_3D
        + " Game-ready faceted diamond prism crystal, pointed top and bottom, clear glass, optical mix "
        "node, floating object, no base, no stand.",
    ),
    "lamp": (
        "2K",
        STYLE_3D
        + " Game-ready hanging laboratory lamp, dark metal shade, warm glass bulb, short chain, optical "
        "atelier, upright, full object visible.",
    ),
    "column": (
        "2K",
        STYLE_3D
        + " Game-ready dark marble column with brass capital and base, optical laboratory architecture, "
        "full height visible, single column, no people.",
    ),
}

UI_IMAGES: dict[str, tuple[str, str, str]] = {
    "sky": (
        "public/assets/textures/sky.png",
        "4K",
        "Create a wide game background plate of a night optical observatory atrium. Dark indigo sky "
        "with faint magenta and teal nebula, distant arched windows and brass ribs, layered depth, "
        "readable horizon, no foreground subject, no people, no text, suitable behind a real-time "
        "Three.js puzzle board.",
    ),
    "floor": (
        "public/assets/textures/slate.png",
        "2K",
        "Create a seamless game texture reference for dark honed slate marble with faint brass veins. "
        "Orthographic top-down, PBR-friendly albedo, clear material variation, no perspective, "
        "no baked strong shadows, no text.",
    ),
    "logo": (
        "public/assets/ui/logo.png",
        "1K",
        "Create a crisp game logo lockup for Prisma: a faceted triangular glass prism mark splitting "
        "white light into red, yellow and blue bands, high contrast on a dark navy background, "
        "no tiny unreadable text, square-friendly, no photorealism.",
    ),
}


def save_bytes_image(data: bytes, filename: Path) -> None:
    from io import BytesIO

    from PIL import Image as PILImage

    filename.parent.mkdir(parents=True, exist_ok=True)
    image = PILImage.open(BytesIO(data))
    if image.mode == "RGBA":
        rgb = PILImage.new("RGB", image.size, (255, 255, 255))
        rgb.paste(image, mask=image.split()[3])
        rgb.save(filename, "PNG")
    else:
        image.convert("RGB").save(filename, "PNG")


def generate_gemini_flash(prompt: str, filename: Path, api_key: str) -> bool:
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    last_error: Exception | None = None
    for model in ("gemini-2.5-flash-image", "gemini-2.0-flash-preview-image-generation"):
        try:
            print(f"  tentando Gemini {model}...")
            response = client.models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]),
            )
            for part in response.parts:
                if part.inline_data is None:
                    continue
                data = part.inline_data.data
                if isinstance(data, str):
                    import base64

                    data = base64.b64decode(data)
                save_bytes_image(data, filename)
                print(f"  Gemini {model} ok")
                return True
        except Exception as exc:
            last_error = exc
            print(f"  {model} falhou: {exc}")
    if last_error:
        print(f"  Gemini flash indisponível: {last_error}")
    return False


def generate_fal_flux(prompt: str, filename: Path, size: str) -> None:
    import fal_client

    print("  fallback Fal Flux schnell...")
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
        raise RuntimeError(f"sem imagem Fal: {data}")
    url = images[0].get("url") if isinstance(images[0], dict) else None
    if not url:
        raise RuntimeError(f"sem URL Fal: {images[0]}")
    filename.parent.mkdir(parents=True, exist_ok=True)
    urllib.request.urlretrieve(str(url), filename)


def generate_one(prompt: str, filename: Path, resolution: str, api_key: str) -> None:
    filename.parent.mkdir(parents=True, exist_ok=True)
    print(f"gerando {filename.relative_to(ROOT)} ({resolution})...")
    if generate_gemini_flash(prompt, filename, api_key) and filename.exists():
        print(f"  salvo {filename} ({filename.stat().st_size} bytes)")
        return
    size = "landscape_16_9" if resolution == "4K" else "square_hd"
    generate_fal_flux(prompt, filename, size)
    if not filename.exists():
        raise RuntimeError(f"nenhum gerador devolveu {filename.name}")
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

    os.environ.pop("GOOGLE_API_KEY", None)
    os.environ["GEMINI_API_KEY"] = key

    wanted = set(args.names) if args.names else None
    errors: list[str] = []

    for name, (resolution, prompt) in CONCEPTS.items():
        if wanted and name not in wanted:
            continue
        path = ROOT / "assets" / "concepts" / f"{name}.png"
        try:
            generate_one(prompt, path, resolution, key)
        except Exception as exc:
            errors.append(f"{name}: {exc}")
            print(f"FALHA {name}: {exc}", file=sys.stderr)

    for name, (rel, resolution, prompt) in UI_IMAGES.items():
        if wanted and name not in wanted:
            continue
        path = ROOT / rel
        try:
            generate_one(prompt, path, resolution, key)
        except Exception as exc:
            errors.append(f"{name}: {exc}")
            print(f"FALHA {name}: {exc}", file=sys.stderr)

    if errors:
        print(f"{len(errors)} falha(s)", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
