# Handoff — 2026-08-11 — Canyon Rails: jogo jogável (S02–S05)

Continuação do handoff `2026-08-11-canyon-rails-s01.md` (contexto: o vídeo do post
do X é um builder de ferrovias, não o jogo de ilhas; vídeo baixado com yt-dlp
porque a API do cobalt.tools exige JWT de captcha). O usuário pediu "implemente o
jogo" — as sprints S02 a S05 foram implementadas nesta sessão.

## O laço de jogo agora fecha

Escolher peça → ghost na ponta brilhante → clique/Espaço assenta e cobra → linha a
26 m de uma cidade a conecta (vira parada e libera contratos) → trem circula
sozinho, para, reabastece, carrega e entrega → contratos pagam moedas/pontos/XP →
nível sobe → moedas viram trilhos, construções e vagões. Sem estado de derrota.

## Arquitetura acrescentada

- `src/rail/geometry.ts` — poses puras das 5 peças (reta + 2 curvas suaves + 2
  fechadas), sem THREE, 100% testável.
- `src/rail/network.ts` — `RailNetwork`: railhead, `canPlace`/`place`/`undo`/
  `restore`, e o caminho amostrado por arc-length. A altura do tabuleiro é o
  terreno com folga mínima sobre a água, suavizada em 24 passes com reimposição
  do piso — é isso que gera **vão de ponte plano sobre o rio** e rampas suaves,
  sem nenhum caso especial de "aqui é ponte".
- `src/rail/trackview.ts` — dormentes/trilhos instanciados + cavaletes gerados
  onde o tabuleiro se afasta do solo, ghost da peça, anel do railhead.
- `src/world/buildings.ts` + `towns.ts` — 9 construções procedurais e 3 cidades
  (Pine Hollow, Canyon Town, Copper Creek — esta do outro lado do rio, exige
  ponte). `heightfield.ts` ganhou platôs (`TOWN_PADS`) para as cidades.
- `src/world/raycast.ts` — cursor→terreno por marcha na heightfield + bisseção,
  em vez de raycast contra ~96 mil triângulos.
- `src/game/` — `economy.ts` (moedas/pontos/XP/níveis), `contracts.ts` (ofertas,
  aceite com limite 3, timers, entregas parciais), `objectives.ts` (6 objetivos
  encadeados), `save.ts` (localStorage validado na leitura), `game.ts` (orquestra).
- `src/ui/hud.ts` — HUD reativa por `HudState` + painéis Trens/Rede/Contratos/Loja.

## Verificação

- **27 testes** Vitest (geometria, rede, heightfield, economia, contratos,
  objetivos) e `npm run build` (gate `tsc`) verdes.
- **Jogado de verdade no navegador** (agent-browser em `localhost`, build de
  produção): assentei 12+ peças, conectei Canyon Town (rota do painel virou
  "Pine Hollow — Canyon Town"), aceitei um contrato, o trem entregou sozinho e
  pagou (moedas 7.002 → 9.695), subi para o nível 2, construí uma casa (capacidade
  de carga 56 → 58) e validei save + reload restaurando a linha e as moedas.
  A validação de rampa barrou trechos íngremes com o toast correto.

## O que falta (S06)

Áudio; desvios/ramais (hoje a linha é única, sem bifurcação); ferramenta de
dinamite para remover pedras; bolsões de floresta de pinheiros como no vídeo;
deploy. Detalhe conhecido: as ofertas de contrato só são repostas quando há vaga,
então logo após conectar uma cidade nova as ofertas antigas ainda dominam a lista.
