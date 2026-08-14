# Sala de Jogos

Cinco jogos de navegador feitos do zero em TypeScript, cada um numa aplicação
Vite independente, mais uma página inicial para escolher entre eles.

```
landing/       página de seleção (HTML + CSS estáticos, sem build)
islebuilder/   Isle Builder — sandbox de pintura de ilhas em pixel art (2D)
railcanyon/    Canyon Rails — construtor de ferrovias num desfiladeiro (3D low-poly)
prisma/        Prisma — puzzle diário de luz, espelhos e mistura de cores (3D)
splinter/      Splinter — playground FPS de destruição voxel (Three.js + Rapier)
glint/         Glint — action RPG num vale HD-2D, magia, slimes e level-up
AIMemory/      memória compartilhada entre sessões de agentes
```

Os diretÃ³rios de suporte `AIMemory/`, `mcps/`, `terminals/`, `.agents/` e
`.claude/` nÃ£o fazem parte dos bundles dos jogos. O arquivo
`.understandignore` os isola de inventÃ¡rios e anÃ¡lises de produto sem apagar o
histÃ³rico utilizado pelos agentes.

## Rodando

Cada jogo tem suas próprias dependências e scripts:

```bash
cd islebuilder && npm install && npm run dev    # Isle Builder
cd railcanyon && npm install && npm run dev     # Canyon Rails
cd prisma     && npm install && npm run dev     # Prisma
cd splinter   && npm install && npm run dev     # Splinter
cd glint      && npm install && npm run dev     # Glint
```

Em todos: `npm run test` roda os testes e `npm run build` roda o gate de tipos
(`tsc`) antes do build de produção.

A página inicial é estática — abra `landing/index.html` no navegador ou sirva a
pasta (`npx serve landing`). Os links dela apontam para as pastas do site
montado (veja abaixo).

## Publicação

`.github/workflows/deploy.yml` monta e publica o site no GitHub Pages a cada push
na `main`:

| Caminho | Conteúdo |
|---------|----------|
| `/` | página de seleção |
| `/isle-builder/` | Isle Builder |
| `/canyon-rails/` | Canyon Rails |
| `/prisma/` | Prisma |
| `/splinter/` | Splinter |
| `/glint/` | Glint |

Para montar o mesmo site localmente:

```bash
(cd islebuilder && npx vite build --base=/isle-builder/)
(cd railcanyon && npx vite build --base=/canyon-rails/)
(cd prisma     && npx vite build --base=/prisma/)
(cd splinter   && npx vite build --base=/splinter/)
(cd glint      && npx vite build --base=/glint/)
mkdir -p site/isle-builder site/canyon-rails site/prisma site/splinter site/glint
cp -r landing/. site/
cp -r islebuilder/dist/. site/isle-builder/
cp -r railcanyon/dist/. site/canyon-rails/
cp -r prisma/dist/. site/prisma/
cp -r splinter/dist/. site/splinter/
cp -r glint/dist/. site/glint/
npx serve site
```

O deploy só funciona depois de habilitar Pages em
**Settings → Pages → Source: GitHub Actions**.

## Documentação

- `CLAUDE.md` — guia para agentes trabalhando neste repositório
- `islebuilder/GAME_PLAN.md` e `islebuilder/sprints/` — plano e sprints do Isle Builder
- `railcanyon/GAME_PLAN.md` — plano e fases do Canyon Rails
- `prisma/GAME_PLAN.md` — regras, gerador e arquitetura do Prisma
- `splinter/GAME_PLAN.md` — regras, física e armas do Splinter
- `glint/GAME_PLAN.md` — regras de magia, XP e o vale do Glint
- `AIMemory/handoffs/` — histórico de sessões
