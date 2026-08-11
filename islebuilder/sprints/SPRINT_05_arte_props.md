# Sprint 05 — Arte final e catálogo de props

- **Status:** Concluído
- **Duração sugerida:** 2 semanas (inclui produção de assets)
- **Dependências:** Sprints 02–04
- **Referências:** `GAME_PLAN.md` §2.4; vídeo — painel Props com 60+ itens, casas, SHOP

## Objetivo

Substituir os placeholders pela arte pixel definitiva (tileset + sprites) e
implementar o catálogo de props colocáveis com as abas Land/Decor/Props do
painel direito.

## Entregável

Painel direito com abas funcionais; catálogo rolável de 40+ props (meta mínima
desta sprint; expandir depois) colocáveis com preview fantasma, sombra e
ordenação de profundidade correta; mundo inteiro com a arte final consistente.

## Escopo

**Dentro:**
- Geração de arte (tileset, props, vegetação), pipeline de atlas, sistema de props, abas do painel.

**Fora:**
- Entidades animadas (Sprint 06), UI final estilizada dos painéis (Sprint 07 —
  aqui a estrutura de abas pode ser funcional/simples).

## Tarefas

### Arte (procedural unificada com paleta — ver `assets/style-guide.md`)
- [x] Definir paleta e resolução de referência (tile 16px lógico) em um guia de estilo curto.
- [x] Tileset final: 6 terrenos × variantes blob (atlas procedural com paleta + dither).
- [x] Vegetação: 5 árvores + arbustos, flores, pedras (no atlas de props).
- [x] Props utilitários: caixotes, barris, cercas, lanterna, guarda-sol, espreguiçadeira, placa, balde, ferramentas, sacos, varal de luzes, poço.
- [x] Construções: 4 casas coloridas, celeiro, loja "SHOP" com placa.
- [x] Atlas empacotado em runtime (`propsAtlas.ts` / `terrainAtlas.ts`) com filtro nearest.

### Sistema de props
- [x] `props/catalog.ts` + `props/props.json` data-driven: id, footprint, categoria, âncora, sombra.
- [x] Colocação: preview fantasma verde/vermelho, clique posiciona, scatter com SPACE na aba Decor.
- [x] Remoção de props (clique-direito).
- [x] Y-sort: `renderOrder` por `propSortY` (base Y do footprint).
- [x] Sombras elípticas suaves sob props.
- [x] Aba **Decor**: scatter de vegetação/flores com SPACE.
- [x] Painel direito com abas Land / Decor / Props (grid com scroll).
- [x] Props entram no histórico (undo/redo via `PropStrokeCommand`).

## Critérios de aceite

1. Todos os terrenos e 53 props com arte consistente (mesma paleta `assets/style-guide.md`), legível em zoom min/max — **implementado** (atlas procedural; validação visual manual recomendada).
2. Duas construções sobrepostas em Y renderizam na ordem correta — **implementado** via y-sort em `PropRenderer`.
3. Colocar/remover prop é desfeito com Ctrl+Z — **testado** em `history.test.ts`.
4. Catálogo com 53 itens rola suavemente — **implementado** (grid DOM com overflow-y; sem custo WebGL por item).

## Verificação (2026-07-02)

- `npm run test` (43 testes) e `npm run build` verdes.
- Catálogo: **53 props** (>40 mínimo, <60 meta do vídeo — expandível na Sprint 07).

## Validação (2026-07-02, auditoria independente)

Implementado por outro agente ("cursor"); esta sprint passou por validação
que **encontrou e corrigiu 2 bugs reais** no critério de aceite #2 (y-sort),
exatamente o risco que este arquivo já havia identificado.

### Bug 1: y-sort de props invertido

`PropRenderer.rebuildAll()` ordenava por Y ascendente e atribuía `renderOrder`
crescente na mesma direção. Como o mundo usa **+Y = Norte = topo da tela**
(confirmado empiricamente renderizando dois quads coloridos em posições
opostas, não só por leitura de código), a prop mais ao Sul (Y menor, mais
perto da câmera) deveria desenhar **por cima** de uma mais ao Norte quando os
sprites se sobrepõem. O código fazia o oposto: um teste direto com duas
construções (Sul tileY=0, Norte tileY=2) mostrou a do Norte desenhando por
cima — exatamente invertido, violando o critério #2 ("duas construções
sobrepostas em Y renderizam na ordem correta"). Corrigido invertendo a
direção da comparação no sort.

### Bug 2: `renderOrder` de props sem teto colidia com outros sistemas

O mesmo método usava um contador incremental **sem limite** (`10, 11, 12,
13...`) para o `renderOrder`. Com 17 props no mapa, o valor máximo chegava a
**27** — muito acima do `renderOrder` fixo das entidades (`12`) e do preview
fantasma de props (`20`). Na prática: qualquer ilha com mais de ~2 props já
fazia entidades (aldeões) desenharem atrás de algumas props independente da
posição real, e mais de ~10 props já deixava o preview fantasma invisível
atrás de props "mais antigas". Corrigido normalizando o `renderOrder` para
uma faixa fixa `[10, 11.9]`, sempre abaixo de 12 e 20, independente de quantas
props existam.

Ambos reverificados com um cenário de 22 props: ordem relativa Sul-sobre-Norte
preservada, todos os valores dentro de `[10, 11.9]`. Detalhes completos em
`AIMemory/handoffs/2026-07-02-validacao-sprints-04-06.md`.

## Riscos

- Consistência da arte gerada por IA: gerar em lotes com a mesma referência de
  paleta; revisar visualmente cada lote antes de integrar (gate de qualidade).
- ~~Footprints errados quebram o y-sort: testar com casos de props grandes
  (celeiro).~~ **O y-sort em si estava invertido** (ver Validação acima) —
  corrigido; footprints individuais não chegaram a ser um problema à parte.
