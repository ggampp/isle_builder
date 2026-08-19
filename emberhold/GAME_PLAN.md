# Emberhold — plano do jogo

> Recreação original, para browser, do sandbox de mineração e defesa do post
> https://x.com/Fortryv/status/2089053430379667464 (vídeo de ~43s, 1920×1080
> @60fps, analisado quadro a quadro; não foi commitado). Mesmo processo dos
> outros jogos do repositório: análise do vídeo → regras próprias →
> implementação do zero. Código, arte e nome são originais.

## 1. O que o vídeo mostra

Um campo gramado em **pixel art isométrico** (visão 3/4, como um Diablo de
brinquedo cruzado com um RTS). No centro, uma **fortaleza de pedra** cercada
por **estacas de madeira**, torres de telhado azul, casas e um poço. Chove
fino. O herói (no vídeo, samurai / summoner de nível alto) anda livremente,
mina e constrói; soldados de armadura prateada ficam de guarda.

A HUD é densa, estilo ARPG:

- Barra de recursos no topo (madeira, pedra, ouro, comida, relógio, população).
- Globos de vida (vermelho) e mana (azul) embaixo, com uma barra de skills
  entre eles e XP roxa na base.
- Log de construção no canto (“Built a Wood Tower…”, “Training a worker…”).
- Um painel de personagem à direita (equipamento, inventário, stats).

O patch 0.5.21 do tweet é o recorte jogável: **estruturas se reparam sob
ataque**, **trabalhadores largam a tarefa quando o prédio cai abaixo de 50%
de vida**, **clique direito repara**, **patrulhas priorizam a base em chamas
em vez de continuar cortando árvore**, torres com mais alcance/dano, e um
**cartão de pet que vira** para mostrar detalhes.

## 2. As regras que adotei

Como o jogo é original, as regras foram fixadas de forma explícita e testável:

- **Mover**: WASD ou clique no chão. O herói desliza no contínuo e não atravessa
  pedra, árvore nem prédio.
- **Minerar (esquerdo / espaço)**: picareta em nós de madeira, pedra ou cristal.
  Dano por golpe; o nó some e solta o recurso.
- **Magia (F)**: gasta 6 de mana, projétil de âmbar no inimigo mais próximo.
- **Construir (1–4)**: parede, torre, casa, fortaleza. Custa madeira/pedra,
  encaixa na grade, não sobrepõe. Casa sobe o teto de população e **treina um
  trabalhador** em 8 s.
- **Reparar (direito)**: o herói cura o prédio alvo mesmo **enquanto ele toma
  dano**. Trabalhadores fazem o mesmo automaticamente se `hp < 50%` do máximo
  — largam o corte de árvore, vão até lá, e só voltam à tarefa quando o prédio
  passa de 80%.
- **Patrulha**: soldados circundam o perímetro. Se qualquer prédio tomou dano
  nos últimos 4 s (`underAttack`), abandonam a ronda e vão brigar. Não cortam
  árvore com a cidade em chamas.
- **Torre**: dispara no inimigo mais próximo dentro de 6,5 tiles, 14 de dano,
  0,7 s de recarga. O tiro é visível e tem SFX.
- **Ondas**: a cada ~22 s, lobos e gosmas nascem nas bordas e atacam a parede
  mais próxima. Um bruto entra nas ondas ímpares.
- **Pet**: uma raposa de brasas segue o herói, morde o que chegar perto, e o
  cartão na HUD vira para mostrar bônus (o “flip” do tweet).
- **Morte**: overlay, R recomeça. Subir de nível enche HP/MP e aumenta o dano
  da picareta.

## 3. Arquitetura

Vite + TypeScript + **Canvas 2D** (isométrico pixel-perfect; o Three.js dos
outros títulos não ajuda um tileset 2:1). A lógica continua pura:

- `src/sim/` — mapa, prédios, unidades, combate, ondas. É o que os testes cobrem.
- `src/render/` — atlas procedural (caminhada 4 direções, ataque, corte,
  reparo) e y-sort isométrico.
- `src/game/` — loop, câmera, input, chuva.
- `src/ui/` — globos, barra de construção, log, cartão do pet.
- `src/audio/` — Web Audio sintetizado (picareta, torre, onda, level-up).

## 4. Estado

Jogo completo e jogável: campo gerado, coleta, construção, trabalhadores que
reparam, patrulha que defende, torres que atiram, ondas, pet com cartão
virável, sprites animados. A lógica em `src/sim/` permanece pura.
