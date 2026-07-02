# Sprint 09 — Persistência, áudio, performance e release

- **Status:** Não iniciado
- **Duração sugerida:** 1–2 semanas
- **Dependências:** todas as anteriores (incluindo Sprint 08 — refit visual)
- **Referências:** `GAME_PLAN.md` §5 Fase 7; skills `threejs-audio-generator`, `threejs-debug-profiler`, `threejs-qa-release`

## Objetivo

Transformar o jogo completo em produto: o mundo do jogador sobrevive entre
sessões, o jogo tem paisagem sonora, roda a 60fps no pior caso, e sai um build
de produção verificado.

## Entregável

Build estático de produção publicável (hosting estático), com autosave,
export/import de mundos, áudio completo e relatório de QA sem erros.

## Escopo

**Dentro:**
- Save/load, áudio, otimização final, QA, build e documentação.

**Fora:**
- Novas features de gameplay; publicação em domínio (decisão do usuário).

## Tarefas

### Persistência
- [ ] Serialização do mundo: chunks (RLE por camada), props, censo de agentes (agentes re-derivam do censo, não são salvos um a um).
- [ ] Autosave em localStorage (debounced após edição) + restauração no load.
- [ ] Export/import de mundo como arquivo `.json` (download/upload).
- [ ] Versionamento do formato de save (campo `version` + migração).

### Áudio (skill `threejs-audio-generator`)
- [ ] Ambiente: oceano em loop, gaivotas ocasionais; volume varia com o zoom (perto da água → mais ondas).
- [ ] SFX: pintura de terreno (por material), colocar/remover prop, UI (clique, aba, slider), undo.
- [ ] Fauna: jato da baleia, respingos.
- [ ] Música: 1–2 faixas lo-fi relaxantes em loop com crossfade.
- [ ] Mixagem com buses (master/música/SFX/ambiente) ligados aos sliders do settings; iniciar áudio só após primeiro gesto do usuário (autoplay policy).

### Performance e QA
- [ ] Passe completo do `threejs-debug-profiler`: draw calls, memória de texturas, GC no loop; corrigir os top ofensores.
- [ ] Cenário de estresse: mapa 500×500 tiles, 500 agentes, zoom-out total → 60fps em desktop médio; definir e testar fallback (reduzir DPR) se ficar abaixo.
- [ ] `threejs-qa-release`: build de produção (`npm run build`), preview, base path para hosting estático, console limpo, debug/overlays desativados, screenshots de release.
- [ ] Teste manual do checklist: todas as ferramentas, undo/redo/clear, save/load, export/import, pausa, hide UI.

### Entrega
- [ ] README do projeto (como rodar, controles, arquitetura em 10 linhas).
- [ ] Atualizar `CLAUDE.md` com os comandos reais definitivos.
- [ ] Inicializar git (config local pessoal, `.gitignore` com `game_video.mp4`) — **push só com confirmação explícita do usuário**.

## Critérios de aceite

1. Fechar e reabrir o navegador restaura o mundo exatamente (hash do estado igual).
2. Import de um mundo exportado em outra máquina/navegador funciona.
3. Build de produção servido estaticamente roda sem nenhum erro/warning no console.
4. Cenário de estresse mantém 60fps (ou ativa fallback documentado).
5. Áudio respeita os sliders e não toca antes do primeiro clique.

## Riscos

- Tamanho do save com mundos grandes: RLE deve manter mundos típicos < 1MB
  (limite prático do localStorage é ~5MB) — medir e, se preciso, migrar para IndexedDB.
