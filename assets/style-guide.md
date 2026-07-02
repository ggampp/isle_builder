# Isle Builder — Style Guide (Sprint 05)

Reference palette and resolution for all pixel art in this project.

## Resolution

- **Logical tile:** 16×16 world units (= 16px at zoom 1×)
- **Terrain blob cell:** 64×64 px in atlas (4× tile for smooth blob edges)
- **Prop sprite cell:** 48×48 px in atlas (supports 1×1 to 3×3 tile footprints)

## Palette (Stardew-inspired, saturated & cheerful)

| Token | Hex | Usage |
|-------|-----|-------|
| `waterDeep` | `#0d2b4a` | Deep ocean |
| `waterMid` | `#1c5c93` | Ocean base |
| `waterShallow` | `#4ecdc4` | Shallow coast |
| `waterShallowDark` | `#2a9d8f` | Shallow ripple |
| `sand` | `#d9c789` | Beach |
| `sandLight` | `#e8d5a0` | Sand patches, paths highlight |
| `grass` | `#5fa851` | Grass |
| `grassDark` | `#4a8539` | Grass shadow |
| `path` | `#8b6914` | Dirt path |
| `wood` | `#a0724a` | Bridge, crates, fences |
| `woodDark` | `#6b4423` | Wood shadow |
| `cliff` | `#6b5344` | Cliff rock |
| `roofRed` | `#c44b4b` | House roofs |
| `roofBlue` | `#4a7ec4` | House roofs |
| `roofGreen` | `#4a9e5c` | House roofs |
| `roofYellow` | `#d4a832` | House roofs |
| `flowerRed` | `#e84545` | Flowers |
| `flowerYellow` | `#ffd23f` | Flowers |
| `flowerWhite` | `#f5f0e8` | Flowers |
| `shadow` | `#0a1a2e` | Elliptical prop shadows (35% opacity) |

## Art rules

1. All sprites use **nearest-neighbor** filtering (no blur).
2. Outlines: 1px `#2a1810` on props and buildings; terrain uses blob alpha only.
3. Light source: top-left (highlights NW, shadows SE).
4. Buildings: 2×2 or 3×2 tile footprint; door faces south.
5. Decor scatter items: 1×1, no walkable requirement.
