# Handoff — Validação das Sprints 04, 05 e 06 (+ dívida técnica da 03)

- **Data:** 2026-07-02T20:48Z
- **Agente:** Claude Code (Sonnet 5)
- **Estado:** Sprints 04-06 validadas, 3 bugs reais encontrados e corrigidos; build/testes verdes; Sprint 07 não iniciada
- **Contexto:** Sprints 04 (Costa viva), 05 (Arte e props) e 06 (Simulação viva), e a
  resolução da dívida técnica da Sprint 03, foram implementadas por outro agente
  ("Cursor/Composer") enquanto esta sessão estava com outro usuário. Esta é uma
  **auditoria independente** dessas quatro entregas — não uma nova implementação.

## Metodologia

Como já documentado desde a validação da Sprint 03, a lógica de simulação/mundo
não depende de DOM/Three.js — a maior parte da verificação usou scripts
standalone (`npx vite-node arquivo.mjs` da raiz do projeto) para medir
performance e rodar simulações de estresse sem depender do navegador. Para os
achados de renderização (y-sort, `renderOrder`), usei um hook de debug
temporário (`window.__isle`, removido antes de finalizar) para manipular a
cena Three.js real diretamente via `javascript_tool`, e confirmei a convenção
de eixo (`+Y = Norte = topo da tela`) renderizando dois quads coloridos em
posições opostas antes de confiar em qualquer raciocínio sobre y-sort.

## Bugs reais encontrados e corrigidos

### 1. Fauna marinha e navios entravam em água rasa/terra proibida (Sprint 06)

**Achado:** `EntityManager.updateMarine`/`updateShip` computavam uma direção de
"afastamento da costa" (steering) mas **nunca validavam o próximo tile antes de
mover** — o steering era só uma dica suave, insuficiente perto de penínsulas.
Um teste de estresse de 2 minutos simulados numa ilha em formato de estrela
(pior caso para litoral complexo) encontrou:
- **~359 violações** de baleia/tubarão/orca/espadarte entrando em água rasa
  (a maioria em Orca: 309; Whale: 49; Shark: 1; Swordfish: 0).
- **1 violação** de Galeão entrando em água rasa.
- **14 violações** de Bote a remo entrando em terra.

Isso viola diretamente o critério de aceite #4 da Sprint 06 ("navios nunca
cruzam terra nem água rasa; baleias nunca entram na água rasa").

**Correção:** apliquei o mesmo padrão que `updateVillager` já usava
corretamente — calcular a posição seguinte, checar se o tile de destino é
válido, e só then commitar o movimento (senão, girar mais e tentar de novo no
próximo tick). Aplicado em `updateMarine` (deve ser água profunda) e
`updateShip` (Galeão: água profunda; Bote: rasa OU profunda, nunca terra).

**Reverificação:** 3 minutos simulados (mais que o teste original) → **zero
violações** nas 4 categorias. Custo de `EntityManager.update()` continua em
~1.6-3.1ms na população máxima (sem regressão de performance).

### 2. Y-sort de props invertido (Sprint 05)

**Achado:** `PropRenderer.rebuildAll()` ordenava por Y ascendente e atribuía
`renderOrder` crescente na mesma direção — mas como o mundo usa `+Y = Norte
= topo da tela` (confirmado empiricamente renderizando dois quads), a prop
mais ao Sul (mais perto da câmera) deveria desenhar **por cima**, não por
baixo. O código fazia o oposto: duas construções sobrepostas (Sul: tileY=0,
Norte: tileY=2) renderizavam com a do Norte por cima — exatamente invertido.
Isso viola o critério de aceite #2 da Sprint 05 ("duas construções sobrepostas
em Y renderizam na ordem correta").

**Correção:** invertida a direção da comparação no sort (`propSortY(db) -
propSortY(da)` em vez de `propSortY(da) - propSortY(db)`).

**Reverificação:** com o mesmo cenário de duas construções, a do Sul agora
recebe `renderOrder` maior (desenha por cima) — confirmado via inspeção direta
dos meshes reais no `PropRenderer`.

### 3. `renderOrder` de props sem teto colidia com entidades e com o preview (Sprint 05)

**Achado:** o mesmo método usava um contador incremental sem limite
(`order = 10, 11, 12, 13...`, um a mais por prop) para o `renderOrder` de cada
prop. Com **17 props** no mapa, o valor máximo chegava a **27** — muito acima
do `renderOrder` fixo das entidades (`12`, em `entityrenderer.ts`) e do
preview fantasma de props (`20`, em `proppreviewrenderer.ts`). Na prática:
qualquer ilha com mais de ~2 props já fazia entidades desenharem atrás de
algumas props (independente da posição real), e mais de ~10 props já fazia o
preview fantasma ficar invisível atrás de props "mais antigas" no sort.

**Correção:** o `renderOrder` agora é normalizado para uma faixa **fixa**
`[10, 11.9]` via `10 + (i / (total - 1)) * 1.9`, independente de quantas props
existem — preserva a ordem relativa (Sul ainda por cima do Norte) mas nunca
ultrapassa 11.9, com folga segura abaixo de 12 (entidades) e 20 (preview).

**Reverificação:** com 22 props, `renderOrder` ficou sempre em `[10, 11.9]`,
ordem relativa Sul-sobre-Norte preservada, ambos abaixo de 12 e 20.

## O que foi verificado e confirmado correto (sem correção necessária)

- **Sprint 04 (Costa viva):** determinismo da decoração procedural
  (`cellHash01`), regras de pintura/borracha de Path/Bridge/Cliff, cache por
  chunk do `CoastManager` (O(1) na maioria das chamadas, só recalcula BFS em
  cache miss) — tudo confirmado por leitura de código + os 9 testes
  (`coast.test.ts` + `tilemap.sprint04.test.ts`) existentes, que são
  significativos, não tautológicos.
- **Sprint 06, critério de performance** (200 aldeões + 150 peixes + 8 fauna +
  6 navios a 60fps): medido diretamente — `EntityManager.update()` ~3.1ms,
  `EntityRenderer.sync()` ~0.22ms, ambos por chamada na população máxima. Não
  havia número concreto registrado no handoff original; agora há.
- **Sprint 06, critério de resgate** (terreno apagado sob aldeão): teste
  existente em `simulation.test.ts` é válido.
- **Sprint 06, critério de travessia de ponte:** o teste existente só cobria a
  escolha do alvo (`pickWalkTarget`), não o trajeto real. Escrevi uma
  verificação de integração adicional: um aldeão que nasceu fora da ponte
  efetivamente **andou até ela em 3.9s** simulados (bem abaixo do limite de
  60s do critério).
- **Dívida técnica da Sprint 03** (Hand tool pan, toast de estouro do balde,
  testes de geometria): confirmada como genuinamente resolvida —
  `InputManager.setForcePan()` existe e é usado corretamente, `toast.ts` é
  funcional, `geometry.test.ts` tem 12 testes reais (Bresenham, retângulo,
  flood fill).
- Cadeia completa de `renderOrder` entre todos os renderers está consistente
  após as correções: coast(0.3) < bridge-shadow(0.8) < sand(1) < grass(2) <
  path(3) < bridge(4) < cliff(5) < terrain-preview(6) < props(10-11.9) <
  entidades(11.5-12) < prop-preview(20).

## Onde parei / próximo passo

**Sprint 07 (UI premium) ainda não iniciada.** Ler
`sprints/SPRINT_07_ui_premium.md` por inteiro antes de começar — o design das
abas World/Map/Help já foi aprovado (`mockups/ui-abas-mockup.html`).

Pontos que o próximo agente deve saber:

- Ao adicionar QUALQUER novo mesh transparente à cena, verificar contra a
  cadeia de `renderOrder` acima — nunca usar um contador incremental sem teto
  quando o valor pode colidir com renderOrder fixo de outro sistema (foi
  exatamente esse o bug #3 acima).
- Convenção de eixo confirmada empiricamente (não só por leitura de código):
  mundo **+Y = Norte = topo da tela**, `-Y` = Sul = base da tela/mais perto da
  câmera. Qualquer lógica de profundidade/y-sort nova deve lembrar que "mais
  ao sul" = "mais perto" = deve desenhar por cima.
- `EntityManager.updateMarine`/`updateShip` agora seguem o mesmo padrão de
  "valida antes de mover" que `updateVillager` já usava — se adicionar um novo
  tipo de agente móvel, replicar esse padrão desde o início em vez de confiar
  só em steering suave.

## Ajustes/observações menores (não corrigidos, baixa prioridade)

- `Tilemap.eraseLayer` para Cliff sempre volta para Grass, mesmo que o Cliff
  tenha sido originalmente pintado sobre Sand (a regra de pintura permite
  ambos) — perde a informação de qual era a camada original. Cosmético, não
  viola nenhum critério de aceite explícito.
- Após undo/redo/clear, `main.ts` chama `coastManager.invalidateAll()` mas
  **não** chama `entityManager.onTerrainChanged()` — o censo de terreno da
  simulação só se atualiza no próprio timer periódico (até 1.5s de atraso).
  Não é um bug funcional (a lógica de resgate já cobre agentes em tiles
  inválidos), só uma janela pequena e auto-corrigível de inconsistência.
- Shallow-water/grass mesh (`shouldRenderTile` em `chunkmesh.ts`) trata Bridge
  como "conectado" para fins de máscara de blob da grama (`layer >= threshold`
  na amostragem de vizinhos) mas exclui Bridge do próprio mesh da grama — pode
  criar uma pequena costura visual onde grama encontra ponte. Não verificado
  visualmente; baixo risco/impacto.

## Avisos

- Nenhum servidor de dev ficou rodando ao fim da sessão.
- Nenhum commit git foi feito nesta sessão.
- O hook de debug temporário (`window.__isle`) usado para os testes de
  renderização foi removido do `main.ts` antes de finalizar.
- Todos os scripts de bench/verificação (`bench-*.mjs`, `verify-*.mjs`) foram
  descartáveis, criados na raiz do projeto e removidos logo após o uso.
