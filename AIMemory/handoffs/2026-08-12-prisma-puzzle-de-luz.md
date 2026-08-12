# Handoff — 2026-08-12 — Prisma: terceiro jogo do repositório

O usuário pediu para criar um jogo novo a partir do post
https://x.com/CoffeeGamesDev/status/2087349753046573373, numa pasta própria.
Vídeo baixado com **yt-dlp** (5s, 720×720) e analisado quadro a quadro — ficou só
no scratchpad, não foi commitado.

## O que o vídeo mostra e o que virou regra minha

Puzzle diário numa grade escura: emissores coloridos nas bordas, paredes, alvos
que pedem uma cor, e espelhos colocados pelo jogador. O detalhe que define o
jogo: **feixes que se cruzam seguem misturados** — daí saem laranja, roxo e verde.

As regras foram fixadas de forma explícita (`prisma/GAME_PLAN.md` §2), já que o
jogo é original: mistura por OR das três primárias, espelho desvia 90°, parede/
emissor/alvo absorvem, alvo acende só na cor exata. Como as máscaras de cor só
crescem durante a propagação, o ponto fixo converge sozinho — sem limite
artificial de passos.

## Estrutura

`prisma/` é uma app Vite própria, **sem dependências de runtime** (canvas 2D, sem
Three.js). Lógica pura em `src/puzzle/` (cores, grade, simulação, gerador,
semente do dia), render em `src/render/board.ts`, HUD em `src/ui/`, interação e
progresso em `src/game/`.

## O gerador (a parte que deu mais trabalho)

Constrói a solução primeiro e depois a esconde, então todo puzzle é resolvível.
Três ajustes vieram de medição, não de palpite — usei um teste descartável que
imprimia taxa de sucesso e as cores dos alvos por dificuldade:

1. **Difícil falhava em ~50% das sementes.** Cada feixe rende no máximo uma
   "ponta" boa para alvo (absorver ali não corta o caminho de ninguém), e com 3
   emissores não dá para ter 4 alvos assim. Solução: o difícil ganhou um quarto
   emissor (a cor repete uma primária). Passou a 40/40.
2. **Todos os alvos saíam brancos.** A cascata de misturas deixa muita célula com
   as três primárias, e o bônus de "ponta de feixe" dominava a pontuação. Passei
   a pontuar cor secundária bem acima de branco e baixei o bônus de ponta.
3. **Ainda dava tabuleiro monocromático.** Adicionei duas passadas na escolha de
   alvos (primeiro exigindo cores distintas) e rejeito o tabuleiro se, com 3+
   alvos, todos tiverem a mesma cor. No fácil só há dois feixes, então repetir a
   cor ali é aceitável — exigir variedade lá zerava a geração.

Também poda os espelhos que não fazem falta: o que sobra vira o orçamento do
jogador, e há teste garantindo que cada espelho da referência é necessário.

## Verificação

23 testes (mistura, reflexão, propagação, estabilidade com tabuleiro cheio de
espelhos, gerador varrendo dezenas de sementes por dificuldade, semente do dia) e
build com gate `tsc`. **Resolvi o puzzle do dia no navegador** sobre o build de
produção, aplicando a solução de referência via eventos sintéticos: terminou
3/3 alvos, 7/7 espelhos e mensagem de vitória, sem erro de console.

## Lição sobre teste

Escrevi um teste afirmando que "um laço fechado de espelhos converge" — mas com
espelhos de 90° **não dá para entrar num laço fechado vindo de fora** (a luz que
chega num canto do laço é desviada para fora). O teste estava errado, não o
código. Troquei por dois testes que valem: um caminho longo em ziguezague e a
estabilidade do ponto fixo com o tabuleiro coberto de espelhos aleatórios.

## Integração

Terceiro gabinete na `landing/` (arte SVG própria: grade escura, feixe vermelho
cruzando com azul e virando roxo, espelhos e alvo aceso), rota `/prisma/` no
workflow do Pages, README e CLAUDE.md atualizados. Site montado localmente com as
quatro rotas respondendo 200.

Ideias para depois: sequência de dias, resultado em emojis para compartilhar,
animação do avanço da luz e divisores de feixe.
