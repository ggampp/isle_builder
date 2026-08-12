# Prisma — plano do jogo

> Recriação original, para browser, do puzzle diário de luz mostrado no post
> https://x.com/CoffeeGamesDev/status/2087349753046573373 (vídeo de ~5s, 720×720,
> analisado quadro a quadro; não foi commitado). Mesmo processo dos outros jogos
> do repositório: análise do vídeo → regras próprias → implementação do zero.
> Código, arte e nome são originais.

## 1. O que o vídeo mostra

Uma página clara com um tabuleiro escuro de 7×7 células arredondadas. Nas bordas
há **emissores** coloridos com uma seta indicando a direção do feixe (azul e
vermelho apontando para baixo, amarelo para a direita). Espalhados pelo
tabuleiro: **paredes** cinzas e **alvos** com contorno tracejado colorido e um
anel no centro. O jogador coloca **espelhos** (células azul-claras com uma
diagonal) que desviam a luz em 90°.

O detalhe que define o jogo: quando dois feixes se encontram, aparece um losango
no cruzamento e a luz **segue misturada** a partir dali — vermelho + amarelo vira
laranja, vermelho + azul vira roxo. Os alvos pedem justamente essas cores
secundárias, então a graça é fazer os feixes se cruzarem no lugar certo.

O cabeçalho traz título, data e dificuldade, um link "how to play" e dois
contadores; o rodapé tem "Clear board" e "Check solution", que viram "See
results" / "Play again" quando os três alvos acendem.

## 2. As regras que adotei

Como o jogo é original, as regras foram fixadas de forma explícita e testável:

- **Luz reta**: em célula vazia o feixe segue na mesma direção.
- **Espelho**: `/` e `\` desviam 90°. Refletir duas vezes devolve a direção
  original (propriedade coberta por teste).
- **Parede, emissor e alvo absorvem** o feixe que chega.
- **Mistura**: tudo que chega a uma célula é somado (OR das primárias) e **sai
  misturado em todas as direções de saída**. Daí vêm laranja, roxo, verde e
  branco. Como as máscaras só crescem, a propagação converge sozinha — não há
  limite artificial de passos nem risco de laço infinito.
- **Alvo aceso** quando a cor presente nele é *exatamente* a pedida; se chegar
  cor errada, o alvo mostra um pontinho com o que recebeu.
- **Orçamento de espelhos** igual ao da solução de referência.

## 3. Geração dos puzzles

O gerador **constrói a solução primeiro** e só depois a esconde, então todo
tabuleiro entregue é resolvível (há teste varrendo dezenas de sementes por
dificuldade):

1. espalha emissores nas bordas, afastados entre si;
2. traça o caminho de cada feixe com curvas, deixando espelhos nos cantos;
3. simula e escolhe alvos entre as células iluminadas, preferindo **pontas de
   feixe** (absorver ali não corta o caminho de ninguém) e **cores secundárias**;
   exige variedade de cores entre os alvos;
4. **poda** os espelhos que não fazem falta — o que sobra é o orçamento do jogador;
5. põe paredes só onde a luz da solução nunca passa;
6. confere que a referência acende tudo; se algo falhar, tenta outra semente.

O puzzle do dia sai de uma semente derivada da data + dificuldade, então é o
mesmo para todo mundo. Há também tabuleiros avulsos com semente aleatória.

## 4. Arquitetura

Vite + TypeScript, sem dependências de runtime; render em **canvas 2D** (sem
Three.js — o jogo é plano).

- `src/puzzle/` — lógica pura, sem DOM: `colors.ts` (máscaras e mistura),
  `grid.ts` (direções, espelhos, células), `simulate.ts` (propagação por ponto
  fixo), `generate.ts` (gerador + dificuldades), `daily.ts` (semente do dia).
- `src/render/board.ts` — desenha tabuleiro, feixes (meia-hasta de entrada com a
  cor de quem chega, de saída com a mistura), espelhos, emissores e alvos.
- `src/ui/hud.ts` + `styles.css` — cabeçalho, contadores, legenda dos alvos,
  botões e a folha "como jogar".
- `src/game/` — `game.ts` (interação e estado) e `progress.ts` (localStorage do
  desafio do dia, validado na leitura).

## 5. Estado

Jogo completo e jogável: puzzle diário nas três dificuldades, tabuleiros extras,
progresso salvo, dicas contextuais e tela de vitória. 23 testes cobrindo mistura
de cores, reflexão, propagação (incluindo estabilidade com o tabuleiro cheio de
espelhos), gerador e semente do dia.

Ideias para depois: contador de sequência de dias, compartilhar o resultado em
emojis, animar o avanço da luz e um modo com divisores de feixe.
