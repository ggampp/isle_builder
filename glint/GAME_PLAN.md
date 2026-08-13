# Glint — plano do jogo

> Recreação original, para browser, do action RPG do post
> https://x.com/Sthilhearts/status/2087471340911751547 (vídeo de ~59s, 1280×720
> @60fps, analisado quadro a quadro; não foi commitado). Mesmo processo dos
> outros jogos do repositório: análise do vídeo → regras próprias →
> implementação do zero. Código, arte e nome são originais.

## 1. O que o vídeo mostra

Uma viajante de sprite pixelado numa paisagem 3D de platôs gramados, falésias
de terra e um rio claro — o visual “HD-2D” / diorama (câmera alta, profundidade
de campo, brilho de meio-dia). O HUD no canto inferior esquerdo é mínimo:
**Lv.1**, barra amarela de **HP 10/10**, barra azul de **MP 10/10**.

O combate é em tempo real. A heroína gasta MP num círculo mágico amarelo sob
os pés, com um clarão branco; slimes verdes translúcidos tomam o golpe. O MP
cai de 10 → 6 → 4 → 0 ao longo dos primeiros ataques. Há cristais azuis
flutuando sobre um selo branco no chão, e flores que emitem luz.

Por volta de 21s aparece **Level Up !** no centro, em azul-claro. O HUD passa a
**Lv.2**, **HP 10/16**, **MP 6/12**. Em seguida um **+10** verde sobe da
personagem e as barras enchem (16/16 e 12/12) — descanso num cristal ou o
próprio level-up restaurando os pontos. Depois ela desce o rio, leva um ou
dois pontos de dano dos slimes, esgota o MP de novo e recupera tudo outra vez
junto a um cristal. No fim há uma ilhota com um menir e uma queda d'água.

O tweet confirma a intenção: *“nível subindo deixa o combate mais divertido”*;
dinheiro e drops ainda não existiam.

## 2. As regras que adotei

Como o jogo é original, as regras foram fixadas de forma explícita e testável:

- **Magia (espaço / clique)**: custa 2 MP, raio 1,55 ao redor da heroína,
  dano `4 + 2×(nível−1)`. No nível 1 um slime (8 HP) cai em dois golpes; no
  nível 3 o mesmo slime cai num golpe — é o “combate fica mais gostoso”.
- **Sem MP**: um cutelo curto (dano 2, alcance 1,05), grátis. Assim dá para
  continuar lutando até achar um cristal, como no vídeo com a barra zerada.
- **Contato**: slime causa 1 de dano, golém 2, com intervalo de 0,7 s.
- **XP**: slime 8, golém 22. O nível 2 pede 20 XP (três slimes). Cada nível
  seguinte pede +12. Sobe de nível: HP máximo +6, MP máximo +2, **cura total**.
- **Cristal**: ficar no raio restaura +10 HP (limitado ao máximo) e enche o MP,
  com recarga para não spammar o +10.
- **Terreno em blocos**: o rio é raso e caminhável; um degrau de altura 1 sobe,
  dois ou mais bloqueiam. É o que cria os platôs do vídeo sem pulo.
- **Inimigos**: slimes vagueiam e perseguem; o golém guarda o menir. Slimes
  reaparecem no ninho; o golém também, mais devagar.

## 3. Arquitetura

Vite + TypeScript + Three.js. A lógica de RPG continua pura (sem DOM):

- `src/sim/` — stats, combate, mapa em altura, herói e inimigos. É o que os
  testes cobrem.
- `src/render/` — cena, terreno instanciado (topo verde / lado de terra), água
  com shader, sprites pixel, VFX do círculo mágico.
- `src/game/` — loop, câmera que segue, colisão, HUD.
- `src/ui/` — barras no estilo do vídeo + overlay de level-up.
- `src/audio/` — Web Audio sintetizado (ambience de rio, magia, level-up),
  destrava no primeiro gesto.

## 4. Estado

Jogo completo e jogável: vale explorável, magia e cutelo, slimes e um golém,
cristais de descanso, level-up com fanfarra, morte e reinício. A lógica em
`src/sim/` permanece pura.
