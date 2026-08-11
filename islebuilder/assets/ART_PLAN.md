# Plano de Arte com IA — Isle Builder

> **Objetivo:** substituir a arte procedural atual (`propsAtlas.ts`, `entityAtlas.ts`, `terrainAtlas.ts`) por PNGs pixel art gerados via Gemini (`threejs-image-generator`), mantendo o pipeline de atlas existente.
>
> **Referências:** `assets/style-guide.md`, `game_video.mp4`, `mockups/ui-abas-mockup.html`, paleta Stardew-like saturada.

---

## 1. Inventário completo de assets

### 1.1 Terreno (prioridade alta — ocupa ~80% da tela)

| Asset | Célula | Variantes | Atlas alvo | Notas |
|-------|--------|-----------|------------|-------|
| Sand blob | 64×64 px | 256 máscaras (0–255) | `terrain-sand.png` 1024×1024 | Transições areia↔água |
| Grass blob | 64×64 px | 256 | `terrain-grass.png` | Transições grama↔areia |
| Path blob | 64×64 px | 256 | `terrain-path.png` | Trilha de terra |
| Bridge blob | 64×64 px | 256 | `terrain-bridge.png` | Pranchas de madeira |
| Cliff blob | 64×64 px | 256 | `terrain-cliff.png` | Penhasco/rocha |
| Shallow water | tile 16×16 | animação shader | opcional textura | Hoje é shader; textura opcional |
| Ocean deep | fullscreen | animado | opcional | Hoje é shader procedural |
| Coast deco | 48×48 | 4 tipos | reutiliza props | coral, alga, seixo — já no catálogo |

**Estratégia IA para terreno:** gerar **1 tile de referência por material** + **8 tiles de borda** (N/S/E/W + cantos) em sheet 512×512; depois expandir programaticamente para as 256 células do autotiler **ou** gerar sheet completa 1024×1024 por material (mais caro, mais fiel ao vídeo).

### 1.2 Props — 53 itens (`src/props/props.json`)

Célula atlas: **48×48 px**, fundo transparente, contorno `#2a1810`, luz vinda do NW.

#### Decor / scatter (20)
| ID | Nome | Tiles |
|----|------|-------|
| flower_red | Red Flower | 1×1 |
| flower_yellow | Yellow Flower | 1×1 |
| flower_white | White Flower | 1×1 |
| flower_pink | Pink Flower | 1×1 |
| bush_small | Small Bush | 1×1 |
| bush_large | Large Bush | 1×1 |
| rock_small | Small Rock | 1×1 |
| rock_large | Large Rock | 1×1 |
| shell | Shell | 1×1 |
| starfish | Starfish | 1×1 |
| grass_tuft | Grass Tuft | 1×1 |
| mushroom | Mushroom | 1×1 |
| clover | Clover | 1×1 |
| fern | Fern | 1×1 |
| pebble | Pebble | 1×1 |
| driftwood | Driftwood | 1×1 |
| coral_piece | Coral | 1×1 |
| lily | Lily Pad | 1×1 |
| tulip | Tulip | 1×1 |
| daisy | Daisy | 1×1 |

#### Vegetation (5)
| ID | Nome | Footprint |
|----|------|-----------|
| tree_oak | Oak Tree | 1×2 (16×48 world) |
| tree_pine | Pine Tree | 1×2 |
| tree_palm | Palm Tree | 1×2 |
| tree_apple | Apple Tree | 1×2 |
| tree_cherry | Cherry Tree | 1×2 |

#### Utility (22)
crate, barrel, bucket_item, shovel, fork_tool, sign_post, lantern, fence, fence_corner, umbrella, chair, lounger (2×1), rope_coil, sack, watering_can, bottle, milk_pail, stool, wheelbarrow, hay_bale, light_string (2×1), well (2×2)

#### Buildings (6)
house_red, house_blue, house_green, house_yellow (2×2), barn (3×2), shop (3×2)

**Atlas final props:** grid 8 colunas × 7 linhas = 384×336 px mínimo → gerar **sheet 512×512** com padding.

### 1.3 Entidades simuladas (`entityAtlas.ts`)

Célula: **32×32 px**, fundo transparente, spritesheet horizontal por tipo.

| Tipo | Frames | Variantes | Sheet |
|------|--------|-----------|-------|
| Aldeão | 4 walk | 4 skins (cabelo/roupa) | `entity-villager.png` 128×128 (4×4 grid: dir×frame simplificado top-down) |
| Peixe cardume | 4 | 4 cores | `entity-fish.png` 128×32 |
| Baleia | 4 | 1 | `entity-whale.png` 128×32 |
| Tubarão | 4 | 1 | `entity-shark.png` 128×32 |
| Orca | 4 | 1 | `entity-orca.png` 128×32 |
| Espadarte | 4 | 1 | `entity-swordfish.png` 128×32 |
| Bote | 2 | 1 | `entity-rowboat.png` 64×32 |
| Galeão | 4 velas | 1 | `entity-galleon.png` 128×32 |
| Jato baleia | 3 | 1 | `entity-spray.png` 96×32 |

**Total entidades:** ~9 sheets, ~35 frames únicos.

### 1.4 UI (`src/ui/` — hoje emojis)

| Asset | Tamanho | Qty |
|-------|---------|-----|
| Logo "Isle BUILDER" | ~240×80 | 1 |
| Ícones abas (Land/Decor/Props/World/Map/Help) | 32×32 | 6 |
| Ícones ferramentas (brush…hand) | 32×32 | 7 |
| Top bar (Undo/Redo/Clear) | 32×32 | 3 |
| Sistema (Settings/Pause/Toggle/Screenshot) | 32×32 | 4 |
| Terrenos painel Land (6 chips) | 32×32 | 6 |
| **Subtotal UI** | | **27 ícones + logo** |

---

## 2. Validação do estado do desenvolvimento (2026-07-02)

| Sprint | Status real | Evidência |
|--------|-------------|-----------|
| 01–06 | ✅ Concluídas | 49 testes + build verdes; handoff `validacao-sprints-04-06.md` |
| 07 UI premium | 🟡 ~75% | UI nova existe (`UIManager`, 6 abas, World/Map/Help); **faltam** logo PNG, ícones pixel, settings, minimapa com viewport/clique, scorecard visual |
| 08 Release | ❌ Não iniciada | Sem save/load, áudio, QA release |

**Conclusão:** o **jogo jogável** está pronto (pintar, props, simulação). O **produto final** do plano de 8 sprints **não** — faltam Sprint 07 (polish) e Sprint 08 (persistência/áudio/release).

---

## 3. Pipeline de geração (Gemini / `threejs-image-generator`)

### Prompt base (colar em todos os props/entidades)
```text
Stardew Valley inspired island builder pixel art. Top-down view, 3/4 slight angle.
Saturated cheerful palette: grass #5fa851, sand #d9c789, wood #a0724a, outline #2a1810.
Light from top-left. 1px dark outline. Transparent background. Nearest-neighbor crisp pixels.
NO text, NO watermark, NO blur, NO anti-aliasing.
```

### Fase A — Concept board (1 imagem, ~30 min)
Gerar **1 sheet de referência** com amostras: flor, árvore, casa, aldeão, peixe, tile grama, tile areia.

**Gate:** usuário aprova paleta/silhueta antes de gerar o lote completo.

### Fase B — Props (53 sprites, ~2–3 h com batches)

**Batch 1 — Decor flores/plantas (10)** — sheet 512×256, células 48×48.
**Batch 2 — Decor costa/rochas (10)**
**Batch 3 — Árvores (5)** — células 48×96 ou 48×48 com árvore centrada
**Batch 4 — Utility (22)** — 2–3 sheets
**Batch 5 — Buildings (6)** — células 96×96 ou 144×96 para footprint 2×2 e 3×2

### Fase C — Entidades (9 sheets, ~1–2 h)
Repetir pipeline de geração por sprite sheet (aldeão, peixe, baleia).

### Fase D — Terreno (~2–4 h, mais complexo)
Gerar **tile sólido + 8 bordas + 4 cantos internos** por material e integrar no autotiler procedural.

### Fase E — UI (27 ícones + logo, ~1 h)
Gerar as abas, ícones de ferramenta e logo.

---

## 4. Integração técnica (após assets gerados)

| Arquivo atual | Mudança |
|---------------|---------|
| `src/render/art/propsAtlas.ts` | `loadPropsAtlasFromImage('/assets/atlas/props-atlas.png')` + fallback procedural |
| `src/render/art/terrainAtlas.ts` | Carregar PNG(s) ou manter procedural com swap de paleta |
| `src/render/entityAtlas.ts` | Carregar spritesheets PNG por espécie |
| `src/ui/logo.ts` | Apontar para `assets/ui/logo.png` (hoje `/assets/logo.png` **não existe**) |
| `src/ui/*.ts` | Trocar emojis por `<img src="icons/{id}.png">` ou CSS sprite sheet |

---

## 5. Cronograma sugerido

| Dia | Entrega | Assets |
|-----|---------|--------|
| 1 | Style board aprovado + pipeline recorte | 1 concept |
| 2 | Props decor + vegetation | 25 sprites |
| 3 | Props utility + buildings | 28 sprites |
| 4 | Entidades + integração atlas | 9 sheets |
| 5 | Terreno (híbrido) + UI icons + logo | 5 terrain + 28 UI |
| 6 | QA visual, ajustes `--input-image` edit | fixes |

---

## 6. Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Inconsistência entre batches | Sempre anexar `style-board.png` como `--input-image` de referência |
| Tamanho de célula errado | Pós-processar com script que redimensiona nearest-neighbor para 48×48 exatos |
| Footprint building errado | Gerar com margem; ajustar `anchorX/Y` no JSON se necessário |
| Gemini sem chave | Manter fallback procedural atual (já funciona) |

---

## 7. Status da Execução (Atualizado em 2026-07-02)

### O que foi concluído:
1. **Pipeline de Código Preparada:**
   - O código TypeScript em `src/render/art/propsAtlas.ts` foi atualizado com a função assíncrona `loadPropsAtlasFromImage`, permitindo o carregamento de um atlas PNG completo.
   - Um sistema de *fallback* robusto está no ar: caso o PNG falhe ao carregar (ou falte sprites), o jogo recorre instantaneamente à arte procedural, mantendo a jogabilidade intacta. O `main.ts` agora aguarda o PNG no *startup*.
2. **Geração de Assets Base (Batches 1, 2 e 3):**
   - Foram geradas imagens para as categorias de Decorações, Árvores e Utilidades usando IA.
3. **Script Automático de Costura (Slicing):**
   - Foi escrito o script Node.js `scripts/slice_atlas.js` (utilizando `jimp`).
   - O script lê as imagens geradas, tenta limpar os fundos "quase brancos", encontra os limites (bounding boxes) de cada sprite gerado e costura eles no grid de 48x48 do arquivo final `public/assets/atlas/props-atlas.png`.

### Desafios Encontrados na Pipeline (Limitações da IA)
Apesar da infraestrutura de código estar 100% pronta para receber a arte final, a geração em lote (batching) com IA introduz um obstáculo técnico severo no recorte:

1. **Fundo não-transparente ruidoso:** Modelos de IA não produzem um canal Alpha (transparente) perfeito por padrão, nem um branco (`#FFFFFF`) uniforme. Muitas vezes há sutis transições, o que quebra filtros automáticos simples.
2. **Fusão de Bounding Boxes (O maior problema):** Devido a essa "sujeira" (pixels claros invisíveis a olho nu) entre um item e outro nas imagens brutas da IA, o script matemático de recorte considera o grid inteiro gerado pela IA como **um único objeto gigante**. Assim, ao invés de extrair 15 itens pequenos, o script extrai um item colossal e o amassa na célula de 48x48.
3. **Desalinhamento Espacial:** A IA não respeita a grade matemática. Uma folha de árvore solta de uma célula pode invadir os limites (bounding box) do item adjacente.

### Próximos Passos Recomendados para Resolução
Para finalizar a arte com perfeição, precisamos abandonar o recorte automático "cego" e optar por uma destas vias:

- **Via Automatizada Unitária:** Configurar uma chave de API para rodarmos um script onde a IA gere **um asset de cada vez**. O script recebe a imagem de uma flor isolada, centraliza em 48x48, salva, e repete. Isso acaba com o problema do agrupamento errôneo.
- **Via Assistida por Humano:** Gerar os "batches" da mesma maneira que fizemos hoje. O artista técnico (humano) abre essas imagens no Photoshop/Aseprite, varinha mágica para deletar o fundo com tolerância, exporta um PNG 100% limpo, e então roda o `slice_atlas.js`.
