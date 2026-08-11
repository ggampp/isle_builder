# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Current State

This project recreates the "Isle Builder" game shown in `game_video.mp4` — a relaxing 2D top-down pixel-art island-painting sandbox that runs in the browser. **Sprints 01–07 are complete** (foundation through premium UI); see `sprints/ANDAMENTO.md`. **Sprint 08 (visual refit) is next**, inserted ahead of persistence/audio/release (now Sprint 09) and progression (now Sprint 10) — the game is playable but visually far from `game_video.mp4` (flat/procedural terrain+ocean, and the generated props/entity atlases are actively broken, see gotcha below). UI icons/logo are **procedural placeholders** in `src/ui/uiIcons.ts` until AI art per `assets/ART_PLAN.md`. Sprint 04-06 validation fixed 3 bugs — see `AIMemory/handoffs/2026-07-02-validacao-sprints-04-06.md`.

- `GAME_PLAN.md` — detailed video analysis (all observed features) and the phased construction plan (stack, architecture, acceptance criteria per phase)
- `sprints/` — the plan broken into 10 executable sprints, one file each with deliverable, scope, tasks and acceptance criteria; `sprints/ANDAMENTO.md` is the progress dashboard (update it when starting/finishing a sprint)
- `AIMemory/` — shared agent memory (Colmeia Handoff protocol): read `PROJECT_OVERVIEW.md`, the end of `work.log`, and the latest handoff at session start
- `mockups/` — approved UI mockups (static HTML) used as design reference before implementation
- `game_video.mp4` — the ~130 MB reference gameplay recording (4K@60fps, 1m50s), gitignored
- `post.md` — empty placeholder

## Commands

```bash
npm install       # install dependencies (three + vite + typescript + vitest)
npm run dev       # dev server with HMR
npm run build     # tsc --noEmit gate + production build into dist/
npm run preview   # serve the production build locally
npm run test      # Vitest — unit tests under src/world/, src/tools/, src/entities/ (52 total)
npx tsc --noEmit  # type-check only
```

**Always run `npm run build` (not just `npm run test`) before declaring a sprint done.** Vitest doesn't enforce `noUnusedLocals`/`noUnusedParameters` from `tsconfig.json` — only the `tsc` step in the build script does. A test file with an unused import can leave `npm run test` green while `npm run build` is actually broken (this happened once, see Sprint 03 validation handoff).

## Architecture

Orthographic-camera Three.js app (2D game, no perspective/3D). Source layout, one concern per top-level folder (see `GAME_PLAN.md` §4 for the full target shape):

- `src/core/` — `GameLoop` (rAF loop, clamped delta), `IsleCamera` (ortho camera; continuous 0.5x–1x zoom (starts at 0.5x) eased and re-anchored to the cursor every frame; `screenToWorld()`), `InputManager` (raw pointer/keyboard/wheel state; `setForcePan` enables left-click drag for Hand tool), `DebugOverlay` (FPS counter, gated by `import.meta.env.DEV`).
- `src/render/` — `Ocean`; `art/terrainAtlas.ts` + `art/propsAtlas.ts`; `entityAtlas.ts` + `entityrenderer.ts` (InstancedMesh agents); `chunkmesh.ts`; `terrainrenderer.ts`; `coastrenderer.ts`; `proprenderer.ts`; `proppreviewrenderer.ts`; `previewrenderer.ts`.
- `src/world/` — tilemap, layers, autotiler, coast.
- `src/props/` — `props.json` + `catalog.ts` (53 props data-driven); `propmap.ts`; `placement.ts`; `propplacement.ts`.
- `src/tools/` — ToolSystem, brush/line/rect/bucket/eraser/dropper/hand, `history.ts` (terrain + prop undo/redo).
- `src/ui/` — `UIManager` (orchestrates all DOM UI), `toolbar.ts`, `topbar.ts`, `sidepanel.ts` (6 tabs), `worldtab.ts`, `maptab.ts`, `helptab.ts`, `systembuttons.ts`, `settingsModal.ts`, `uiIcons.ts` (procedural pixel icons + logo), `styles.css`, `toast.ts`.
- `src/entities/` — `manager.ts` (ECS leve, 30Hz fixed step, `EntityManager`), `census.ts` (`TerrainCensusTracker`, land-component labeling for bridge crossing), `walkability.ts`, `config.ts` (`SIM_CONFIG` caps/speeds). All movement (villagers, marine, ships) validates the next tile **before** committing the move — never rely on soft steering alone to enforce a hard "never enters X" rule.
- `src/persistence/` — still empty (Sprint 09).

Painting is **poll-based**: `main.ts`'s game loop checks `input.isButtonDown(0)` + `input.pointer` each frame and drives `ToolSystem` directly — no dedicated mouse listeners for painting, reusing `InputManager`'s existing raw state.

## Known gotchas

- `npm create vite@latest <windows-absolute-path>` mangles the path in this environment (strips `:`/`\`) and scaffolds relative to the wrong cwd. Always `cd` into the target directory first and scaffold with `.` from PowerShell (not Bash, which uses POSIX-style paths that confuse it too).
- The current Vite vanilla-ts template enables `erasableSyntaxOnly` in `tsconfig.json`: constructor parameter properties (`constructor(private readonly x: Foo)`) fail with TS1294. Declare the field and assign it manually in the constructor body instead.
- Avoid `const enum` for anything crossing file boundaries — it doesn't work reliably under Vite/esbuild's `isolatedModules`. Use `as const` objects instead (see `TerrainLayer`, `MaskBit`).
- Browser automation here (`claude-in-chrome`) can't simulate a real middle-click drag or a held key during drag. Pan/zoom were validated with synthetic `PointerEvent`/`WheelEvent` sequences via the JS execution tool.
- **The `claude-in-chrome`-controlled tab frequently reports `document.hidden = true`**, which makes Chrome suspend `requestAnimationFrame` — anything poll-based tied to the game loop (e.g. brush painting) then won't advance no matter how many synthetic events you dispatch synchronously (no real time passes between them for a frame to run). To verify loop-dependent logic: manipulate the relevant systems directly and time with `performance.now()` instead of relying on rAF; to verify rendering, force a `renderer.render(...)` call and read pixels with `gl.readPixels()` rather than trusting screenshots — the `computer` tool's screenshots are JPEG and can show a false "dot pattern" on large flat-color areas (compression artifact). **But don't assume every dot pattern is JPEG**: the tile-aligned dark dots on sand/grass were assumed to be this artifact in one session and later confirmed REAL (corner-notch holes at every 4-tile vertex — see `AIMemory/handoffs/2026-07-02-sprint-08-task4-diagnostico-dots.md`). Two reliable ways to tell: (1) zoom the game camera with a synthetic `WheelEvent` — real world content scales with zoom, compression artifacts don't; (2) inspect generated canvases pixel-by-pixel by importing the module straight into the page via the Vite dev server (`await import('/src/render/art/terrainAtlas.ts')` in the JS tool) — works even when the tab is `document.hidden`. Real UI clicks (via the `computer` tool) work fine since they don't depend on rAF; the `computer` tool's `scroll` action does NOT reach the canvas as wheel-zoom, use synthetic `WheelEvent`s.
- **Tool/history logic (`Tilemap`, `HistoryManager`, `BucketTool`, etc.) has zero DOM/Three.js dependency** — for acceptance criteria like "N strokes + undo + redo reproduce the map exactly", a standalone script run with `npx vite-node file.mjs` from the project root (so relative imports resolve) is far faster and more reliable than fighting the browser. When hashing map state for comparison, hash **logical content** (`getLayer` per coordinate), not raw chunk structure — an existing-but-zeroed chunk after undo isn't structurally identical to a chunk that was never created, even though they're logically the same map.
- Three.js sorts transparent objects by `renderOrder` **before** Z-distance (`WebGLRenderList.painterSortStable`) — setting a mesh's Z position alone doesn't guarantee it draws on top of another transparent mesh at the same location if that mesh has a higher `renderOrder`. Current chain (respect this when adding a new transparent mesh): coast(0.3) < bridge-shadow(0.8) < sand(1) < grass(2) < path(3) < bridge(4) < cliff(5) < terrain-preview(6) < props(10–11.9, fixed range) < entities(11.5–12) < prop-preview(20).
- **Never use an unbounded incrementing counter for `renderOrder`** when the item count can vary (e.g., one `renderOrder` per placed prop) — it grows without limit and can exceed another system's fixed `renderOrder` once there are enough items. Normalize into a fixed range instead (e.g. `10 + (i / (total - 1)) * 1.9`), preserving relative order, not the raw count. Real bug found: with only 17 props, a `10, 11, 12...` counter reached 27, above entities' `renderOrder=12` and the prop-preview's `renderOrder=20`.
- **World axis convention, confirmed empirically (not just by reading code)**: `+Y = North = top of screen`, `-Y = South = bottom of screen/closer to camera` (verified by rendering two colored quads at opposite Y and screenshotting). Any new depth/Y-sort logic must remember that smaller Y (further south) = closer to the camera = should draw on top.
- **"Never"/"always" acceptance criteria about agent movement (e.g. "ships never cross land") are not guaranteed by soft steering** (a repulsion force added to velocity) — that only reduces frequency, it doesn't eliminate the case. The correct approach is to validate the next position *before* committing the move (only advance if the destination tile is valid; otherwise turn and retry next tick) — the pattern `EntityManager.updateVillager` already used. To verify this kind of criterion, a short test isn't enough: run a multi-minute stress simulation on an irregular coastline (worst case), counting real tile-by-tile violations — a real bug was found this way (~360 violations in 2 simulated minutes) that a short simulation wouldn't have surfaced.
- `game_video.mp4` must never be committed — already covered by `.gitignore`.
- **`loadPropsAtlasFromImage`/`loadEntityAtlasFromImage` (`src/render/art/propsAtlas.ts`, `src/render/entityAtlas.ts`) only fall back to the procedural atlas if the PNG fails to *load* (network/404) — a PNG that loads fine but has wrong/garbled content (e.g. an AI-generation batch that merged multiple sprites into one cell instead of isolating them) is drawn as-is, silently, with no error.** Found 2026-07-02: `public/assets/atlas/props-atlas.png` and `entity-atlas.png` contained whole miniature island-scene thumbnails (with watermark text) per cell instead of isolated transparent sprites — visually worse than the procedural placeholder it was supposed to replace. Before trusting a newly generated atlas, visually inspect it directly (`Read` the PNG) rather than only checking that the game boots without console errors.
