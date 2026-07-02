# Sprint 02 — Tilemap e pintura de terreno com auto-tiling

- **Status:** Concluído
- **Duração sugerida:** 1–2 semanas (coração técnico do jogo)
- **Início / Fim:** 2026-07-02 / 2026-07-02
- **Dependências:** Sprint 01
- **Referências:** `GAME_PLAN.md` §2.2 e §4; `AIMemory/knowledge/2026-07-02-stack-threejs-orto.md`

## Objetivo

Permitir pintar ilhas: um tilemap em chunks com camadas de terreno empilhadas
por prioridade (água < areia < grama) e auto-tiling que gera as bordas
orgânicas automaticamente, exatamente como no vídeo de referência.

## Entregável

O usuário desenha uma ilha com o pincel (areia e grama sobre o oceano) e as
transições praia/água e grama/areia aparecem corretas em tempo real, com
slider de tamanho do pincel funcionando.

## Escopo

**Dentro:**
- Estrutura de dados do mundo, auto-tiler, render de chunks, pincel e slider SIZE.
- Tileset **placeholder** (gerado proceduralmente ou provisório) — a arte final vem na Sprint 05.

**Fora:**
- Demais ferramentas (linha/retângulo/fill), undo/redo, recifes/água rasa,
  Dirt Path/Bridge/Cliff, UI final do painel.

## Tarefas

- [x] `world/tilemap.ts`: `Tilemap`/`Chunk` — grid esparso em chunks de 32×32 tiles (`Map<string, Chunk>`); mundo efetivamente ilimitado, com suporte a coordenadas negativas.
- [x] Modelo de camadas: `world/layers.ts` (`TerrainLayer` — objeto `as const`, não `const enum`, ver nota abaixo). `Tilemap.setLayer` é o setter bruto; `Tilemap.paintLayer` aplica a regra de jogo: só eleva uma camada por vez (`desiredLayer > current+1` é bloqueado), descer é sempre permitido.
- [x] `world/autotiler.ts`: `computeBlobMask` (puro, testável) + `sampleNeighbors` (amostra o `Tilemap`); bitmask de 8 vizinhos com gating de canto (corner bit só conta se as 2 arestas adjacentes também contam) → 47 variantes visuais distintas dentro do espaço de 256 valores. Cálculo é **por camada** (`threshold`), então areia↔água e grama↔areia têm máscaras independentes.
- [x] `render/placeholderAtlas.ts`: atlas 16×16 (256 células = mask direto) gerado em canvas, cores chapadas (`#d9c789` areia, `#5fa851` grama); áreas não cobertas ficam transparentes (`destination-out` para o entalhe côncavo), deixando a camada de baixo aparecer por composição, sem precisar saber a cor dela.
- [x] `render/chunkmesh.ts` (`buildLayerGeometry`) + `render/terrainrenderer.ts` (`TerrainRenderer`): 1 mesh por chunk por camada (sand/grass), UV mapeado no atlas; re-mesh só de chunks com `chunk.dirty`; culling via frustum padrão do Three.js (`geometry.computeBoundingSphere()`).
- [x] `tools/brush.ts` (`Brush`): pincel circular (raio 1–10 tiles, clamped), com interpolação linear entre o último ponto e o atual proporcional à distância/raio — sem buracos em arrastos rápidos.
- [x] `ui/terrainpanel.ts` (`TerrainPanel`): painel funcional simples (botões Water/Sand/Grass + slider SIZE), estilo provisório.
- [x] Testes unitários: `world/autotiler.test.ts` (7 casos: mask 0, mask 255, aresta isolada, gating de canto com/sem diagonal, os 4 cantos independentes) e `world/tilemap.test.ts` (8 casos: default água, cross-chunk incl. negativos, regra de elevação de `paintLayer`, dirty-marking incl. chunk vizinho na borda). `npm run test` (Vitest, adicionado como devDependency).

## Critérios de aceite

1. **Verificado (via medição direta, não via FPS overlay — ver nota de ambiente)** —
   uma ilha de 200×200 tiles (~31k tiles, ~49 chunks) pintada de uma vez levou
   24ms para mutar os dados + 112ms para reconstruir TODOS os 49 chunks de uma
   vez (custo único artificial). O caso realista — um stroke de pincel raio 25
   (acima do máximo de 10) sujando 8 chunks simultaneamente, pior caso plausível
   num único frame de arrasto — reconstruiu em **8.1ms**, dentro do orçamento de
   16.7ms/frame a 60fps.
2. **Verificado** — coastline (areia↔água) e borda grama↔areia renderizam com
   contorno orgânico/serrilhado correto (confirmado visualmente em zoom
   moderado). Mask 255 (tile totalmente cercado) confirmado como preenchimento
   sólido via leitura direta de pixels (`gl.readPixels`) — RGBA uniforme, sem
   artefatos. UV de um tile interior confirmado apontando exatamente para a
   célula 255 do atlas.
3. **Confirmado** — `paintLayer` bloqueia grama pulando direto na água (coberto
   por teste unitário); pintar água diretamente sobre grama/areia sempre limpa
   o tile (não há restrição para descer).
4. **Coberto por design** — culling usa o frustum automático do Three.js
   (`frustumCulled` padrão + bounding sphere por chunk), não há verificação
   manual por frame; validado indiretamente pelos números de performance do
   item 1.

## Notas de verificação (ambiente de teste)

Durante a verificação no Chrome via `claude-in-chrome`, a aba ficou presa em
`document.hidden = true` na maior parte da sessão, o que o Chrome usa para
**suspender `requestAnimationFrame`** — como a pintura é *poll-based* (checada
a cada frame do game loop), simular arrasto via eventos sintéticos síncronos
não funcionava (nenhum frame rodava entre pointerdown/pointerup). A validação
robusta usada foi: (a) manipular `Tilemap`/`TerrainRenderer` diretamente e
medir com `performance.now()`, sem depender de rAF; (b) ler pixels reais via
`gl.readPixels()` após um `renderer.render()` forçado, em vez de confiar em
screenshots (que mostraram um falso "padrão de pontos" — artefato de
compressão JPEG em áreas de cor sólida, não um bug real). Cliques reais de
botão (`computer` tool) funcionaram normalmente, confirmando que só o fluxo
dependente de rAF é afetado pelo ambiente, não a lógica do jogo. Detalhes em
`AIMemory/PROJECT_OVERVIEW.md` (armadilhas conhecidas).

## Riscos

- Auto-tiling multicamada era a armadilha nº 1 do projeto — resolvido com o
  design de blob-mask por camada + gating de canto, coberto por testes
  unitários que fixam o comportamento.
- `const enum` foi evitado propositalmente (`TerrainLayer`, `MaskBit` são
  objetos `as const`) — `const enum` não atravessa bem módulos sob o
  `isolatedModules` do esbuild/Vite (ver `PROJECT_OVERVIEW.md`).
- Re-mesh de chunk durante stroke rápido: já é O(chunks sujos), não O(mundo);
  números medidos (8ms para 8 chunks) dão margem confortável mesmo em
  arrastos que cruzem várias fronteiras de chunk no mesmo frame.
