# Splinter — plano do jogo

> Recriação original, para browser, do playground de destruição voxel do post
> https://x.com/parazar/status/2087567094741176323 (vídeo `shotgun.mp4`, ~98s,
> 1954×1316, analisado quadro a quadro; não foi commitado). Mesmo processo dos
> outros jogos do repositório: análise do vídeo → regras próprias →
> implementação do zero. Código, arte e nome são originais.

## 1. O que o vídeo mostra

FPS em primeira pessoa num deserto claro. No centro, um pórtico de saloon em
voxels: quatro pilares de adobe, viga no alto, portas batentes de madeira com
dobradiças de aço, lanternas penduradas em correntes de elos cúbicos. O chão é
areia em cubos; o palco é um deck circular de madeira.

Cinco armas na barra inferior: **Bullet** (revólver), **Shotgun**, **Lever
Rifle**, **Bomb** (dinamite) e **Laser**. O nome da arma ativa aparece no topo
em letra western. Cada tiro arranca voxels; os pedaços caem e empilham. Um tiro
fraco nas portas só as faz balançar na dobradiça; um tiro de frente na junta
desestabiliza o vão inteiro. As correntes de aço das lanternas balançam de
verdade. O laser derrete a viga; a bomba abre um buraco largo.

O original cita Three.js + Box3D.js. Aqui a física é **Rapier** (WASM), o
padrão deste repositório para simulação 3D no browser.

## 2. As regras que adotei

- **Grade 6-conectada**: cada voxel só se apoia nos seis vizinhos ortogonais.
- **Suporte**: um componente de `structure` é estático se algum voxel toca o
  deck (`iy === 1`) ou o chão (`iy <= 0`). Sem isso, vira corpo dinâmico.
- **Portas**: grupo próprio, sempre dinâmico, presas por juntas revolute no
  pilar. Destruir os voxels `hinge` solta a porta.
- **Correntes**: cada elo é um corpo com junta esférica; quebrar um elo derruba
  o resto e a lanterna.
- **Materiais**: madeira/prancha (fracos), adobe (médio), aço/dobradiça (fortes),
  lanterna (frágil e emissiva). O dano cai com a distância ao centro do impacto.
- **Armas**: revólver 1 pellet preciso; escopeta 8 pellets em leque; rifle 1
  pellet pesado; bomba com pavio e raio grande; laser contínuo enquanto o gatilho
  está preso.
- **Objetivo**: derrubar a vila. A integridade é a fração de voxels de
  estrutura ainda no lugar. Abaixo de 20% o conjunto “caiu”. `R` reconstrói.
  Além do pórtico há um coreto na praça, casinha, poço, caixas e cerca.

## 3. Arquitetura

Vite + TypeScript + Three.js + `@dimforge/rapier3d-compat`.

- `src/voxels/` — lógica pura: materiais, grade, DDA, componentes conexos, planta
  do saloon. Sem DOM, sem Rapier. É o que os testes cobrem.
- `src/physics/` — mundo Rapier, passo fixo 1/60, corpos compostos, juntas,
  projéteis com CCD, sincronia mesh↔corpo.
- `src/render/` — cena, iluminação, InstancedMesh por material, viewmodels
  (GLB via Fal `tripo3d/h3.1/text-to-3d`, com fallback de caixas), céu e deck.
- `src/weapons/` — catálogo (dano, leque, recarga) e disparo.
- `src/game/` — loop, pointer lock, pontuação, reset.
- `src/ui/` — HUD western (hotbar, nome da arma, integridade, pausa).
- `src/audio/` — SFX e ambiência gerados com ElevenLabs; o runtime só toca
  arquivos locais via Web Audio depois do gesto do usuário.

## 4. Estado

Jogo completo e jogável: cinco armas, portas com dobradiça, lanternas em
corrente, destruição com entulho, reset e HUD. Viewmodels GLB gerados com Fal
(`python scripts/generate_weapons_fal.py`, `FAL_KEY` no ambiente); o pórtico
continua voxel. Testes cobrem conectividade, suporte, dano com atenuação e o
catálogo de armas.
