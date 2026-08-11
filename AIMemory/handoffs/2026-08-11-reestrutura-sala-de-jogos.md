# Handoff — 2026-08-11 — Reestrutura: dois jogos lado a lado + página de seleção

Continuação da mesma sessão (PR #1 já mergeado na `main`). O usuário pediu para
mover o Isle Builder para um diretório próprio, como o Canyon Rails, e criar uma
página inicial de seleção em estilo maximalista.

## Nova estrutura

```
landing/       página de seleção (HTML + CSS estáticos, sem build)
islebuilder/   Isle Builder  (tudo que estava na raiz: src, public, assets,
               scripts, mockups, sprints, index.html, package.json, tsconfig)
railcanyon/    Canyon Rails
AIMemory/, CLAUDE.md, README.md, .github/  — nível do repositório
```

A raiz **não é mais uma aplicação**: cada jogo tem `package.json`, `node_modules`
e testes próprios, então todo `npm ...` roda de dentro do diretório do jogo. Os
arquivos foram movidos com `git mv`, então o histórico segue rastreável.

## Página de seleção (`landing/`)

HTML + CSS puros, sem build e sem nenhum recurso externo (nem fontes): fundo em
camadas (raios em conic-gradient, listras, bolinhas, grão via `feTurbulence` em
data URI), título com contorno grosso e sombras empilhadas, faixa rolante,
emojis subindo e dois "gabinetes de fliperama". A arte de cada jogo é um **SVG
inline desenhado à mão**: a ilha em pixel art com mar, praia, casario e barco; e
o desfiladeiro com rio turquesa, ponte de cavalete e o trem azul soltando fumaça.
Tudo respeita `prefers-reduced-motion` e tem foco visível nos botões.

## Deploy

`.github/workflows/deploy.yml` agora monta um diretório `site/`:
`/` (landing), `/isle-builder/` e `/canyon-rails/`, cada jogo buildado com
`--base` apontando para o seu subcaminho.

## Bug real encontrado na verificação ponta a ponta

Montei o site localmente e naveguei nele: o Isle Builder **carregava com todos os
ícones e o logo quebrados** sob `/isle-builder/`, porque `src/ui/uiIcons.ts` usava
caminhos absolutos (`/assets/ui/icons/` e `/assets/logo.png`). Sob um subcaminho
eles apontam para a raiz do domínio. Corrigido com `import.meta.env.BASE_URL`
(sempre terminado em barra), que o Vite substitui pelo `--base` do build. Depois
da correção: 41 imagens, 0 quebradas. Vale como regra para qualquer asset novo
nos dois jogos — está anotado no `CLAUDE.md`.

Detalhe do `index.html`: caminhos absolutos ali (favicon, script) **não** precisam
de ajuste — o Vite reescreve com a base no build. O problema é só em strings de
caminho dentro do TypeScript/CSS.

## Verificação

52 testes do Isle Builder e 34 do Canyon Rails passando dos novos diretórios, com
o gate `tsc` nos dois builds. Site montado como o workflow monta e servido
localmente: `/`, `/isle-builder/` e `/canyon-rails/` respondem 200; naveguei da
landing até o Isle Builder pelo botão e conferi o Canyon Rails rodando
(trem a 32 mph, nenhuma imagem quebrada).

## Observação sobre a landing

O texto inicial dizia "nenhuma imagem, nenhum som de arquivo" — o Canyon Rails é
assim, mas o Isle Builder **tem** PNGs de ícones/logo em `public/assets` e importa
uma fonte do Google no CSS. O texto foi ajustado para "mundos gerados em código",
que é verdade nos dois. Se algum dia o Isle Builder trocar os PNGs por arte
procedural, dá para voltar à afirmação mais forte.
