# Sala de Jogos

Dois jogos de navegador feitos do zero em TypeScript + Three.js, cada um numa
aplicação Vite independente, mais uma página inicial para escolher entre eles.

```
landing/       página de seleção (HTML + CSS estáticos, sem build)
islebuilder/   Isle Builder — sandbox de pintura de ilhas em pixel art (2D)
railcanyon/    Canyon Rails — construtor de ferrovias num desfiladeiro (3D low-poly)
AIMemory/      memória compartilhada entre sessões de agentes
```

## Rodando

Cada jogo tem suas próprias dependências e scripts:

```bash
cd islebuilder && npm install && npm run dev    # Isle Builder
cd railcanyon && npm install && npm run dev     # Canyon Rails
```

Em ambos: `npm run test` roda os testes (52 no Isle Builder, 34 no Canyon Rails)
e `npm run build` roda o gate de tipos (`tsc`) antes do build de produção.

A página inicial é estática — abra `landing/index.html` no navegador ou sirva a
pasta (`npx serve landing`). Os links dela apontam para `isle-builder/` e
`canyon-rails/`, que só existem no site montado (veja abaixo).

## Publicação

`.github/workflows/deploy.yml` monta e publica o site no GitHub Pages a cada push
na `main`:

| Caminho | Conteúdo |
|---------|----------|
| `/` | página de seleção |
| `/isle-builder/` | Isle Builder |
| `/canyon-rails/` | Canyon Rails |

Para montar o mesmo site localmente:

```bash
(cd islebuilder && npx vite build --base=/isle-builder/)
(cd railcanyon && npx vite build --base=/canyon-rails/)
mkdir -p site/isle-builder site/canyon-rails
cp -r landing/. site/
cp -r islebuilder/dist/. site/isle-builder/
cp -r railcanyon/dist/. site/canyon-rails/
npx serve site
```

O deploy só funciona depois de habilitar Pages em
**Settings → Pages → Source: GitHub Actions**.

## Documentação

- `CLAUDE.md` — guia para agentes trabalhando neste repositório
- `islebuilder/GAME_PLAN.md` e `islebuilder/sprints/` — plano e sprints do Isle Builder
- `railcanyon/GAME_PLAN.md` — plano e fases do Canyon Rails
- `AIMemory/handoffs/` — histórico de sessões
