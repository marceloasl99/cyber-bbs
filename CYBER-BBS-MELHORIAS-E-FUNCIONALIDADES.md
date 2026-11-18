# CYBER BBS — Relatório de Análise, Melhorias e Novas Funcionalidades

**Projeto:** [marceloasl99/cyber-bbs](https://github.com/marceloasl99/cyber-bbs)  
**Versão analisada:** Mega Edition v3.0  
**Data do relatório:** 18 de novembro de 2026  
**Autor da análise:** Grok (xAI)  
**Objetivo:** Propor melhorias concretas, novas funcionalidades, modos de terminal/resolução (incluindo CGA, VGA e opções modernas) e dados atuais/úteis, mantendo a navegação realista de BBS dos anos 90.

---

## 1. Resumo Executivo

O **CYBER BBS** é um simulador de BBS de 1995 extremamente bem executado: single-file (ou modular), offline-first, com terminal ANSI/CP437 autêntico, handshake de modem sintetizado, fontes Px437 IBM VGA, CRT effects, Netmail local, File Areas, Door Games, GitHub Vault, feeds RSS reais, weather e Photo Grabber com conversão ANSI.

Pontos fortes claros:
- Autenticidade visual e sonora (80×25, CP437, baud pacing, ZMODEM theater).
- Dados vivos (RSS, wttr.in / Open-Meteo, GitHub API, Wikimedia).
- Arquitetura resiliente (cache, fallbacks, labels LIVE/CACHED/OFFLINE).
- Progressão de usuário (ranks, credits, streaks, ratio).
- Zero backend, zero build obrigatório.

Oportunidades principais:
1. **Modos de vídeo históricos e modernos** (CGA, EGA, VGA clássico, 132-col, HiColor, “Modern Clean”).
2. **Mais fontes de dados atuais e úteis** (crypto, cotação, status de serviços, feeds brasileiros, ephemeris/astronomia).
3. **Navegação e UX** mais rica sem perder o feeling de BBS.
4. **Extensibilidade** (modos de terminal configuráveis, temas, doors plugáveis).
5. **Qualidade de código e manutenção** (modularidade, testes, documentação de modos).

---

## 2. Análise Técnica Rápida do Estado Atual

### Terminal Engine (`term.js`)
- Grid lógico fixo: **80×25**.
- Canvas interno de alta resolução: 1440×800 (cell 18×32).
- Fontes: `Px437_IBM_VGA_8x16` e `9x16`.
- Suporte a hit-regions, pacing, cursor blink, prompt in-terminal.
- Já existe noção de “PURE mode” e “NIGHT mode”.

### Render / CRT
- CSS + canvas com scanlines, phosphor, 4:3 letterbox.
- Controles de UI já expostos: FULL, 4:3, CRT ON/OFF, VGA COLOR, CLASSIC PC, PURE, SOUND.

### Dados vivos
| Porta | Fonte principal | Fallback |
|-------|-----------------|----------|
| News  | RSS (HN, BBC, Slashdot, NASA, Ars) | Cache |
| Weather | wttr.in | Open-Meteo → offline sensor |
| GitHub | REST API pública | Seeds |
| Images | Wikimedia Commons | Link + cache |

### Limitações observadas
- Resolução de texto fixa em 80×25 (sem CGA 40×25, sem 80×50, sem 132 colunas).
- Sem paletas CGA (4 cores / composite artifact) ou EGA.
- Pouca exploração de fontes de dados “úteis no dia a dia” além de notícias e clima.
- Settings ainda relativamente simples para modos de vídeo.
- Sem modo “moderno limpo” (sem scanlines, fonte limpa, resolução maior) como opção ao lado do retro.

---

## 3. Propostas de Modos de Terminal / Tela / Resolução

A ideia central é transformar o terminal em um **engine multi-mode**, onde o usuário (ou o SysOp) escolhe o “hardware” simulado. Isso aumenta o valor de replay e a fidelidade histórica sem quebrar a experiência atual.

### 3.1 Tabela de Modos Sugeridos

| ID | Nome | Colunas × Linhas | Célula (px) | Resolução lógica | Cores | Uso recomendado | Notas de implementação |
|----|------|------------------|-------------|------------------|-------|-----------------|------------------------|
| `vga80x25` | VGA Classic (atual) | 80×25 | 8×16 ou 9×16 | 640×400 / 720×400 | 16 | Padrão | Já existe |
| `cga40x25` | CGA Text 40 | 40×25 | 8×8 | 320×200 | 16 (RGBI) | Nostalgia extrema, mobile | Fonte 8×8, zoom maior |
| `cga80x25` | CGA Text 80 | 80×25 | 8×8 | 640×200 | 16 | CGA real | Aspecto mais “achatado” |
| `ega80x25` | EGA | 80×25 | 8×14 | 640×350 | 16 | Transição 80s→90s | Fonte intermediária |
| `vga80x50` | VGA 50 linhas | 80×50 | 8×8 | 640×400 | 16 | Listagens longas, ANSI gallery | Já previsto no plano original |
| `vga132x25` | Wide / 132-col | 132×25 | 8×16 | 1056×400 | 16 | File listings, logs | Útil para FILES.BBS |
| `hicolor` | VGA HiColor | 80×25 | 8×16 | 640×400 | 256 / 24-bit | Photo Grabber, ANSI truecolor | Já parcialmente no plano |
| `modern` | Modern Clean | 100×30 ou 120×36 | variável | escalável | 16 ou 256 | Produtividade | Sem CRT, fonte limpa, high-DPI |
| `composite` | CGA Composite | 80×25 / 40×25 | 8×8 | 640×200 | 16 artifact | Estética NTSC | Lookup table de cores compostas |

### 3.2 Implementação recomendada

1. **Config object** no `Settings` e no `localStorage`:
   ```js
   terminalMode: {
     id: 'vga80x25',
     cols: 80,
     rows: 25,
     cellW: 9,
     cellH: 16,
     palette: 'vga16',
     font: 'Px437_IBM_VGA_9x16',
     crt: true,
     aspect: '4:3'
   }
   ```

2. **Palette system**:
   - `vga16` (atual)
   - `cga16` (RGBI clássico)
   - `cga4` (paletas 0/1 cyan-magenta etc.)
   - `composite16` (artefatos NTSC)
   - `ega64` (subset)
   - `xterm256` / truecolor (já parcialmente previsto)

3. **Fonte e atlas**:
   - Manter as duas fontes atuais.
   - Adicionar `Px437_IBM_CGA_8x8` e, se possível, uma 8×14 EGA.
   - Regenerar o glyph atlas ao trocar de modo (com cache).

4. **UI de seleção** (em Settings ou comando `MODE`):
   ```
   [1] VGA 80×25 Classic
   [2] CGA 40×25
   [3] CGA 80×25
   [4] VGA 80×50
   [5] 132-column Wide
   [6] Modern Clean (no CRT)
   [7] Composite Artifact
   ```

5. **Comportamento de resize**:
   - Letterbox / pillarbox inteligente.
   - Em mobile: forçar `cga40x25` ou `modern` por padrão.
   - Fullscreen + integer scaling (já existe base).

### 3.3 Benefícios

- Fidelidade histórica real (CGA era o que muita gente tinha em 1988-92).
- Utilidade: 80×50 e 132-col melhoram listagens e o File Area.
- Modern Clean permite usar o BBS como “dashboard diário” sem cansaço visual.
- Diferencial forte em relação a outros simuladores de BBS web.

---

## 4. Novas Funcionalidades e Melhorias por Área

### 4.1 Dados Atuais e Úteis (Prioridade Alta)

| Feature | Descrição | Fonte sugerida | Valor |
|---------|-----------|----------------|-------|
| **Crypto Ticker** | BTC, ETH, SOL + variação 24h em estilo BBS | CoinGecko / Binance public | Útil + cyberpunk |
| **FX / Câmbio** | USD/BRL, EUR/BRL, etc. | AwesomeAPI ou ExchangeRate-API | Brasileiro útil |
| **Status de Serviços** | GitHub, Cloudflare, OpenAI, etc. status | Statuspage APIs + RSS | Prático |
| **Astronomia / Ephemeris** | Fases da Lua, planetas, nascer/pôr do Sol | Open-Meteo + Swiss Ephemeris lite ou API | Alinha com outros projetos do autor |
| **Feeds BR** | G1 Tecnologia, TecMundo, Manual do Usuário, Hacker News PT | RSS | Localização |
| **Daily Briefing expandido** | Clima + notícias + crypto + câmbio + 1 frase do SysOp | Combinação | “Today Hub” vira ferramenta real |
| **IP / Geo / Latency** | Seu IP, cidade aproximada, ping a servidores | ipapi.co + fetch timing | Útil em troubleshooting |
| **Stock / Índices** | IBOV, S&P, etc. (opcional) | Yahoo Finance unofficial ou similar | — |

Todas com fallback offline e label `LIVE | CACHED | OFFLINE`.

### 4.2 Navegação e UX Realista

- **Hotkey + mouse + comando** já existe; melhorar o pager (`[K]ontinue / [N]onstop / [Q]uit`) e adicionar busca dentro de listas (`/` ou `F`).
- **Bookmarks / Speed Dial** de doors e URLs internas.
- **Histórico de navegação** (stack de telas) com `Alt+←` / `Alt+→`.
- **Comando `GOTO <door>`** e aliases.
- **Multi-node mais vivo**: mostrar “callers” fictícios com atividade recente gerada por templates + dados reais (ex.: “Node 3 downloading from GitHub…”).
- **SysOp Chat** com respostas mais inteligentes (templates + LLM local opcional via WebLLM no futuro).
- **Export / Import de perfil** já existe; adicionar “session recording” (log de teclas + telas) para replay.

### 4.3 File Areas & Transfer

- Mais seed files úteis (PDFs técnicos, cheatsheets, ANSI packs, scripts).
- Preview de texto/Markdown dentro do terminal.
- ZMODEM theater mais elaborado (CRC, batch, recovery).
- Upload de arquivos locais com `FILE_ID.DIZ` gerado automaticamente.

### 4.4 ANSI & Arte

- Editor ANSI mais completo (seleção, copy/paste, SAUCE editor).
- Conversão de imagem → ANSI com mais opções (dither, half-block, quarter-block, truecolor).
- Galeria com tags e busca.
- Suporte a RIP (mesmo que limitado) ou Sixel experimentais.

### 4.5 Door Games

- Adicionar 1–2 doors mais profundos (ex.: Trade Wars light, ou um door de “network defense” temático).
- Persistência de high-scores locais.
- Modo multiplayer local (dois perfis no mesmo browser via multi-node).

### 4.6 Settings & Atmosphere

- Seção dedicada **Video Hardware**:
  - Mode (tabela acima)
  - CRT intensity / scanline strength
  - Phosphor color (green, amber, white, blue)
  - Aspect ratio lock
  - Font choice
- **Audio profiles**: Authentic 14.4k, Fast 28.8k, Silent, Modern soft beeps.
- **Theme packs**: Classic, Cyberpunk Neon, Amber Terminal, Matrix Green, Pure Text.

### 4.7 Acessibilidade e Modernidade

- Melhorar screen-reader (já tem base).
- Reduced motion mais agressivo.
- High-contrast mode.
- Mobile-first layout quando detectar tela estreita (força CGA 40 ou Modern).
- PWA manifesto + service worker para instalação offline completa.

### 4.8 Extensibilidade (Médio prazo)

- Sistema de “doors” como módulos registráveis.
- Plugin de feeds (usuário adiciona RSS próprio).
- Modo “SysOp Console” mais poderoso (editar seeds, limpar cache, self-test).

---

## 5. Roadmap Sugerido (Priorizado)

### Fase A — Quick Wins (1–2 semanas)
1. Adicionar 2–3 feeds brasileiros + Crypto Ticker + Câmbio no Today Hub.
2. Comando `MODE` + 2 novos modos: `cga40x25` e `vga80x50`.
3. Melhorar o pager e adicionar busca em listas.
4. Seção Video Hardware nos Settings.

### Fase B — Terminal Multi-Mode (2–4 semanas)
1. Refatorar `term.js` para aceitar `cols/rows/cell/font/palette` dinamicamente.
2. Implementar CGA 80×25, Composite e 132-col.
3. Regeneração de atlas + integer scaling correto.
4. UI de seleção de modo com preview.

### Fase C — Dados & Utilidade (paralelo)
1. Crypto + FX + Status services.
2. Expandir Today Hub / Weekly Newspaper.
3. Astronomia básica (fases da Lua + nascer do Sol).

### Fase D — Polish & Extensão
1. Modern Clean mode.
2. PWA + offline completo.
3. Melhorias no ANSI editor e Photo Grabber.
4. Documentação de modos e contribution guide.

---

## 6. Pontos de Atenção Técnica

- **Performance**: trocar de 80×25 para 132×50 exige dirty-region mais agressivo e atlas cacheado.
- **Fontes**: respeitar licença CC BY-SA 4.0 das Px437; documentar qualquer nova fonte.
- **CORS / file://**: manter a cadeia de fallbacks; preferir APIs com `Access-Control-Allow-Origin: *`.
- **Tamanho do single-file**: novos assets de fonte e seeds devem ser cuidadosos (limite mental ~3–4 MB).
- **Compatibilidade**: testar em Chrome, Firefox e Edge; mobile Safari é o ponto fraco atual.

---

## 7. Conclusão e Recomendação

O projeto já é excelente como simulador nostálgico + útil. A maior alavanca de evolução está em:

1. **Tornar o terminal multi-hardware** (CGA → VGA → Modern).
2. **Aumentar a densidade de dados realmente úteis** no dia a dia (crypto, câmbio, status, feeds locais, astronomia).
3. **Manter a navegação 100% “BBS-like”** (hotkeys, prompts, pacing, nodes), apenas enriquecendo o conteúdo por trás das portas.

Com essas mudanças o CYBER BBS deixa de ser “só um simulador legal” e vira uma ferramenta retro-futurista que a pessoa de fato abre todo dia.

---

## 8. Anexos Rápidos

### Comandos sugeridos novos
```
MODE [cga|vga|wide|modern|composite]
PALETTE [vga|cga|composite|amber]
CRT [on|off|soft]
TODAY          (já existe – expandir)
CRYPTO
FX
STATUS
ASTRO
```

### Estrutura de dados sugerida para modo
```js
{
  "terminal": {
    "mode": "vga80x25",
    "palette": "vga16",
    "crt": true,
    "phosphor": "green",
    "font": "Px437_IBM_VGA_9x16",
    "aspect": "4:3"
  }
}
```

---

**Arquivo gerado para download.**  
Pode ser usado diretamente como backlog, issue tracker ou spec para próximas iterações.

*Fim do relatório.*


Com base na análise do repositório **Cyber BBS** e em pesquisas sobre tecnologias atuais de terminal, protocolos BBS e APIs de dados, preparei um relatório completo com sugestões de melhorias e novas funcionalidades. O foco é modernizar a experiência visual, ampliar as opções de resolução e paletas, e integrar dados realmente úteis para o usuário contemporâneo.

---

# Relatório de Evolução: Cyber BBS — Rumo a uma Experiência Retro Moderna e Funcional

## 1. Visão Geral do Projeto Atual

O **Cyber BBS** é um simulador de BBS (Bulletin Board System) dos anos 1990, executado inteiramente no navegador a partir de um único arquivo HTML. Ele já oferece uma base sólida e nostálgica: terminal ANSI/CP437 em 80×25, notícias via RSS, clima com fallback, navegação no GitHub, netmail local, fóruns, áreas de arquivos, jogos e um editor ANSI. A arquitetura é *offline-first*, com dados armazenados em `localStorage` e `IndexedDB`, e o boot funciona sem backend.

O grande mérito do projeto é aliar a estética de 1995 a dados atuais. No entanto, a interface ainda é limitada a um único modo de exibição e a um conjunto restrito de fontes de dados. As sugestões abaixo buscam expandir essas fronteiras sem sacrificar a identidade retro.

---

## 2. Modernização da Interface e do Terminal

### 2.1. Novas Opções de Resolução e Modos de Vídeo

Atualmente, a interface é fixa em 80×25. Uma evolução natural é oferecer **múltiplos modos de vídeo**, inspirados nos padrões da época, mas com suporte moderno:

| Modo Proposto | Colunas × Linhas | Contexto Histórico | Uso Sugerido |
|---|---|---|---|
| **CGA 80×25** | 80×25 | Padrão original do projeto | Modo "Clássico" (mantido como padrão) |
| **VGA 80×50** | 80×50 | VGA texto (720×400) | Mais informações por tela, menus mais densos |
| **SVGA 132×43** | 132×43 | Modo texto estendido (VESA) | Visualização de logs, tabelas financeiras, arte ANSI larga |
| **Modo "Wide"** | 160×50 | Adaptação moderna | Layout expandido para monitores widescreen |

A implementação pode ser feita com um sistema de *grid* dinâmico no front-end, permitindo que o usuário alterne entre modos via `SETTINGS` ou um atalho (ex.: `Alt+V`). Isso exigiria ajustes no CSS e na lógica de renderização, mas preservaria a compatibilidade com o modo 80×25.

### 2.2. Paletas de Cores Autênticas (CGA, EGA, VGA) com Correção de Intensidade

As cores ANSI padrão (códigos 30–37 e 40–47) são frequentemente renderizadas com valores RGB de 255, o que distorce as tonalidades originais de hardware como CGA/EGA/VGA. Emuladores de terminal modernos já corrigem isso usando a intensidade máxima de 252 (em vez de 255), o que torna o amarelo escuro mais "marrom" e o vermelho brilhante mais "pêssego".

**Sugestão:** implementar **três paletas selecionáveis**:
- **CGA** (16 cores, com correção de intensidade)
- **EGA** (64 cores, com dithering)
- **VGA** (256 cores, com tabela de cores clássica)

Isso pode ser feito definindo variáveis CSS ou um mapa de cores no JavaScript, e permitindo que o usuário escolha em `SETTINGS` → "Atmosphere". A paleta VGA de 256 cores também abriria caminho para arte mais rica em ANSI.

### 2.3. Renderização Acelerada por GPU (WebGL) e Protocolos Gráficos Modernos

O projeto atualmente depende de renderização DOM para o terminal, o que limita a fluidez e o suporte a gráficos. A adoção de um renderizador baseado em **WebGL** traria ganhos expressivos de performance e permitiria explorar recursos gráficos modernos.

- **Opção A: xterm.js + addon WebGL.** O `xterm.js` é o emulador de terminal mais usado na web (VS Code, GitHub Codespaces) e possui um addon WebGL que acelera a renderização e lida bem com ANSI.
- **Opção B: Terme ou Beamterm.** São renderizadores WebGL especializados em altíssima performance (120+ FPS, milhões de linhas). Embora sejam voltados para terminais de sistema, poderiam ser adaptados para o BBS.

Com WebGL, seria viável implementar **suporte a Sixel e ao Protocolo de Gráficos do Kitty**, que permitem exibir imagens reais (não apenas half-blocks ANSI) dentro do terminal. Isso revolucionaria a "Photo Grabber" e a galeria ANSI, permitindo visualização de fotos em alta fidelidade.

### 2.4. Efeitos CRT Autênticos com Shaders (WebGL)

A estética de terminal retrô é um dos pilares do projeto. Atualmente, os efeitos CRT são provavelmente simulados com CSS. Uma evolução seria usar **shaders WebGL** para reproduzir curvatura de tela, *phosphor glow*, *scanlines* e *flicker* de forma muito mais realista.

Existem bibliotecas prontas, como o **`cool-retro-term-renderer`**, que é um renderizador CRT baseado em WebGL para xterm.js, com suporte a curvatura, brilho de fósforo e scanlines. Alternativamente, o projeto **cool-retro-term-webgl** é um front-end WebGL *open-source* que recria o visual do clássico Cool Retro Term no navegador.

**Sugestão:** oferecer um seletor de "intensidade do efeito CRT" (Off / Leve / Médio / Pesado) e, no modo Pesado, aplicar shaders de curvatura e *bloom*. Isso manteria a acessibilidade (respeitando `prefers-reduced-motion`) e agradaria tanto nostálgicos quanto usuários que preferem uma leitura mais limpa.

---

## 3. Novas Funcionalidades com Dados Atuais e Úteis

O projeto já integra notícias, clima e GitHub. O próximo passo é diversificar as fontes de dados, priorizando APIs **gratuitas, sem chave ou com tier generoso**, para manter a filosofia *offline-first* e de baixo atrito.

### 3.1. Clima e Tempo em Tempo Real

O `wttr.in` e o `Open-Meteo` já são usados. O Open-Meteo é particularmente interessante por não exigir chave de API e oferecer dados horários e históricos. **Sugestão:** adicionar um "Weather Dashboard" mais rico, com:
- Previsão para 7 dias (Open-Meteo)
- Qualidade do ar (Open-Meteo Air Quality API)
- Alertas meteorológicos (via APIs públicas de serviços nacionais, quando disponíveis)

### 3.2. Criptomoedas e Finanças Pessoais

Para um BBS moderno, dados financeiros são altamente relevantes. Há diversas APIs gratuitas e sem chave:

- **CoinGecko** (preços, *market cap*, tendências) — tier gratuito generoso.
- **Binance** e **Kraken** — APIs públicas para cotações de cripto, sem necessidade de chave.
- **CoinCap** — *WebSocket* público para atualizações de preços em tempo real.

**Sugestão:** criar um "Finance Ticker" no menu principal ou dentro do "Today Hub", exibindo cotações de BTC, ETH e outras moedas selecionadas. Para o mercado brasileiro, a **Brapi.dev** oferece dados de ações, dividendos e indicadores fundamentalistas com tier gratuito. Isso agregaria enorme valor prático ao BBS.

### 3.3. Notícias Curadas e Agregação Inteligente

O projeto já usa feeds RSS (Hacker News, BBC, Slashdot, NASA, Ars Technica). **Sugestão:** expandir para um agregador com curadoria por categoria:
- **Tech & IA:** Hacker News (Firebase API), ArXiv (RSS), Hugging Face Blog.
- **Mundo:** Reuters, AP News, Al Jazeera (RSS).
- **Brasil:** G1, Folha, Nexo (RSS).
- **Ciência:** NASA, Nature, ScienceDaily.

Além disso, seria interessante um recurso de **"resumo diário"** que use uma API de LLM (opcional, com chave do usuário) para gerar um parágrafo sintetizando as principais notícias do dia — algo como um "editorial do SysOp" automatizado.

### 3.4. Integração com GitHub e além

O "GitHub Vault" já permite busca e leitura de READMEs. **Sugestão:** adicionar:
- Visualização de *issues* e *pull requests* abertos de um repositório.
- "Trending repositories" (via API pública do GitHub ou scraping leve).
- Integração com **GitLab** e **Codeberg** como alternativas.

### 3.5. Ferramentas de Produtividade e Utilidades

Um BBS moderno pode ser útil no dia a dia. Ideias:
- **Conversor de unidades e moedas** (usando APIs de câmbio gratuitas como ExchangeRate-API).
- **Encurtador de URL** (via serviços como is.gd ou TinyURL, com API pública).
- **Gerador de senhas** e **verificador de vazamentos** (usando a API do Have I Been Pwned, que tem tier gratuito).
- **Bloco de notas rápido** com Markdown, armazenado localmente.

---

## 4. Navegação Realista e Protocolos de Acesso

O projeto simula a experiência de discagem, mas ainda é puramente web. Para uma navegação verdadeiramente realista, é possível oferecer **múltiplos canais de acesso**, como fazem BBSs modernos.

### 4.1. Suporte a Telnet e SSH via WebSocket

BBSs contemporâneos como o **ANetBBS** e o **ENiGMA½** oferecem acesso via Telnet, SSH e WebSocket, compartilhando o mesmo banco de usuários. O **GBBS** (escrito em Go) também suporta Telnet, SSH e acesso web.

**Como implementar no Cyber BBS:**
- Usar um *gateway* WebSocket-to-Telnet/SSH no backend (ex.: uma pequena função serverless ou um servidor Node.js) que permita ao navegador conectar-se a um servidor Telnet/SSH real. O usuário poderia escolher entre "Modo Simulado" (offline) e "Modo Realista" (conexão real).
- Alternativamente, integrar um cliente Telnet/SSH em JavaScript (como o **telix**, que suporta Telnet, WebSocket e SSH para BBSs/MUDs).

Isso transformaria o Cyber BBS de um simulador em uma **porta de entrada real** para BBSs da rede FidoNet ou para servidores próprios.

### 4.2. Sequência de Discagem Mais Imersiva

A experiência de login já inclui um handshake sintetizado. **Sugestão:** tornar a discagem mais realista:
- **Variação no tempo de conexão** (simulando diferentes modems: 2400 bps, 14.4k, 56k).
- **Ruídos de modem autênticos** (já há áudio, mas pode ser expandido com amostras reais de handshake).
- **Mensagens de erro ocasionais** (ex.: "NO CARRIER", "BUSY") para aumentar a imersão, mas com opção de desativar.

### 4.3. Chat em Tempo Real (Multi-Node Real)

O "Multi-Node Hopper" já simula múltiplos nós. **Sugestão:** implementar um **chat em tempo real via WebSocket** (usando um backend leve ou um serviço como Firebase Realtime Database) para que usuários reais possam conversar entre si, mantendo o anonimato e a estética de terminal. Isso resgataria a essência social dos BBSs originais.

---

## 5. Melhorias de Usabilidade e Acessibilidade

### 5.1. Modo "PURE" Aprimorado

O comando `PURE` já existe para modo texto limpo. **Sugestão:** expandi-lo para um **modo de alto contraste** e **modo para leitores de tela**, com `aria-live` regions e navegação por landmarks. O projeto já tem suporte a screen-reader metadata, mas pode ser aprofundado.

### 5.2. Atalhos de Teclado Globais

Além dos atalhos existentes, adicionar:
- `Ctrl+K` → paleta de comandos (busca rápida por funcionalidades).
- `Alt+1…9` → acesso direto aos menus principais.
- `Ctrl+Shift+P` → alternar paleta de cores.

### 5.3. Persistência e Exportação de Dados

O projeto usa `localStorage` e `IndexedDB`. **Sugestão:** adicionar exportação/importação de perfis, mensagens e arquivos em formatos abertos (JSON, Markdown), para que o usuário não perca dados ao limpar o navegador.

---

## 6. Arquitetura e Performance

### 6.1. Modularização do Código

O projeto atual é um único arquivo HTML com tudo embutido. Embora isso seja ótimo para distribuição, dificulta a manutenção. **Sugestão:** migrar para uma estrutura modular (ex.: Vite + ES Modules), mantendo um *build* que gere um único arquivo para distribuição. Isso permitiria usar bibliotecas como `xterm.js` e shaders WebGL sem sacrificar a portabilidade.

### 6.2. Service Worker para Offline-First Real

O projeto já é offline-first para dados, mas o carregamento inicial ainda depende do HTML. Um **Service Worker** poderia armazenar em cache todos os assets (CSS, JS, fontes, ícones) e permitir que o BBS funcione completamente offline após a primeira visita, incluindo a interface.

### 6.3. Fallbacks Inteligentes e Rótulos de Status

O projeto já rotula dados como `LIVE`, `CACHED` ou `OFFLINE`. **Sugestão:** adicionar um **ícone de "saúde da fonte"** no rodapé, mostrando quais APIs estão respondendo e quais estão em fallback, com opção de forçar atualização.

---

## 7. Roadmap Sugerido (Priorizado por Impacto e Esforço)

| Prioridade | Funcionalidade | Impacto | Esforço |
|---|---|---|---|
| **Alta** | Paletas CGA/EGA/VGA com correção de intensidade | Alto (autenticidade) | Baixo |
| **Alta** | Modos de resolução 80×50 e 132×43 | Alto (usabilidade) | Médio |
| **Alta** | Integração de cotações de cripto (CoinGecko) | Alto (utilidade) | Baixo |
| **Média** | Renderizador WebGL (xterm.js + addon) | Alto (performance) | Médio |
| **Média** | Suporte a Sixel/Kitty para Photo Grabber | Alto (visual) | Alto |
| **Média** | Shaders CRT via WebGL | Médio (estética) | Médio |
| **Média** | Finanças Brasil (Brapi.dev) | Alto (utilidade local) | Baixo |
| **Baixa** | Gateway Telnet/SSH real | Alto (realismo) | Alto |
| **Baixa** | Chat multi-usuário via WebSocket | Alto (social) | Alto |

---

## 8. Conclusão

O **Cyber BBS** já é um projeto notável por unir nostalgia e dados atuais em um único arquivo. As sugestões apresentadas buscam levá-lo ao próximo nível: **visualmente mais autêntico e flexível** (com paletas corretas, múltiplas resoluções e aceleração gráfica), **funcionalmente mais útil** (com dados financeiros, climáticos e noticiosos diversificados) e **socialmente mais realista** (com protocolos de acesso reais e chat em tempo real).

A implementação pode ser incremental, começando pelas melhorias de baixo esforço e alto impacto (paletas e APIs de cripto), e evoluindo para recursos mais ambiciosos (WebGL, Sixel, gateway SSH). O importante é manter a filosofia central: **um BBS que funciona offline, é leve, acessível e divertido**, mas que também oferece informações genuinamente relevantes para o usuário de hoje.

---

### Referências

- Características atuais do projeto (menus, fontes de dados, persistência)
- Correção de cores CGA/EGA/VGA
- APIs de clima sem chave (Open-Meteo)
- APIs de criptomoedas gratuitas (CoinGecko, Binance, Kraken)
- APIs financeiras brasileiras (Brapi.dev)
- BBSs modernos com suporte a Telnet/SSH/WebSocket
- Renderizadores WebGL para terminal (xterm.js addon, Terme, Beamterm)
- Protocolos gráficos Sixel e Kitty
- Efeitos CRT via WebGL (cool-retro-term-renderer)





# CYBER BBS — Relatório de auditoria e propostas de evolução

**Data da análise:** 18 de novembro de 2026  
**Repositório analisado:** <https://github.com/marceloasl99/cyber-bbs>  
**Branch consultada:** `main`  
**Objetivo:** propor melhorias práticas para transformar a CYBER BBS em uma central de informação e ferramentas realmente útil, preservando a experiência de uma BBS dos anos 1990.

---

## 1. Resumo executivo

A CYBER BBS já tem uma base interessante e relativamente completa para um projeto browser-only: terminal ANSI/CP437, 80×25, fontes IBM VGA, som de modem sintetizado, notícias RSS, clima, pesquisa de repositórios GitHub, imagens do Wikimedia Commons, netmail/fórum locais, catálogo de arquivos, editor ANSI, jogos e armazenamento no navegador.

A melhor evolução não é simplesmente adicionar dezenas de portas (*doors*) ou mais efeitos CRT. O salto de qualidade virá de três frentes:

1. **Confiabilidade dos dados:** o usuário precisa saber sem ambiguidade o que é atual, armazenado, antigo, indisponível ou apenas simulado.
2. **Utilidade diária:** transformar notícias, clima, repositórios, alertas e arquivos em ferramentas consultáveis, filtráveis e persistentes — não apenas em demonstrações de integração.
3. **Emulação de vídeo de verdade:** oferecer perfis MDA/CGA/EGA/VGA/SVGA com resoluções, grades, paletas, fontes e comportamentos diferentes, em vez de apenas alternar filtros de cor e proporções de tela.

**Recomendação principal:** preservar a inicialização simples e a distribuição standalone, mas evoluir o código para uma arquitetura com módulos de renderização e provedores de dados independentes. O modo clássico continua sendo 80×25; modos mais largos e gráficos ficam disponíveis como opções, sem quebrar o comportamento tradicional.

## 2. Escopo e método

A análise foi baseada no README, no `plan.txt`, no `index.html` distribuído e nos trechos de implementação acessíveis no branch `main`. Foram examinados especialmente o motor de terminal, CSS do monitor, persistência, camada de rede, RSS, clima, GitHub e conversão de imagens.

**Limitação importante:** esta foi uma revisão estática do repositório. Não executei o HTML em um navegador, não validei ao vivo cada feed/API e não fiz testes de compatibilidade ou performance no Windows. As observações de implementação abaixo descrevem o código consultado; as propostas são recomendações, não afirmações de que já estejam implementadas.

O próprio `plan.txt` já contém uma especificação anterior bastante extensa, com arquitetura modular, ANSI/SAUCE, proxy opcional, fontes reais, cache, segurança e uma ideia de `SELFTEST`. Este relatório procura avançar a partir do estado atual e evitar apenas repetir aquela especificação.

---

## 3. O que existe hoje

| Área | Estado identificado | Observação |
|---|---|---|
| Aplicação | HTML standalone, sem backend obrigatório | `index.html` é descrito como entrada canônica; `cyber-bbs.html` é uma cópia de distribuição sincronizada. |
| Terminal | 80 colunas × 25 linhas | O motor usa células de 18×32 e cria um canvas lógico de 1440×800. |
| Visual | Paleta IBM VGA de 16 cores, CP437, fonte Px437 | Existem temas VGA, verde, âmbar, papel e flat; também controles para CRT, chassis, tela pura e proporção 4:3/16:9. |
| Notícias | Hacker News, Slashdot, BBC World, NASA e Ars Technica | RSS/Atom, cache local e digest de arquivo como fallback. |
| Clima | `wttr.in` e Open-Meteo | O caminho Open-Meteo consultado busca condições atuais; não encontrei previsão horária/detalhada no trecho verificado. |
| GitHub | Busca de repositórios, README e navegação de diretórios | Usa a API pública e tem repositórios locais de fallback. |
| Imagens | Busca no Wikimedia Commons e conversão para ANSI | O resultado inclui metadados de licença, mas existe um fallback perigoso quando a licença não é encontrada (ver seção 5). |
| Persistência | `localStorage` e IndexedDB | Perfis, preferências, mensagens e progresso ficam no navegador; uploads binários são locais. |
| Comunidade | Netmail, fórum, chat e nós | São simulações locais. Não há sincronização real entre visitantes. |
| Transferências | Catálogo de arquivos e teatro de ZMODEM | A transferência ZMODEM é explicitamente uma simulação; uploads locais não são compartilhados. |
| Testes | Ferramenta de bundle e captura de screenshots no README | O `plan.txt` descreve `SELFTEST`, mas não encontrei esse comando implementado no `index.html` consultado. |

### 3.1 Constatações específicas do terminal

- O terminal lógico está fixado em `cols = 80` e `rows = 25`.
- Cada célula mede 18×32 pixels no buffer atual; por isso o canvas fica em 1440×800.
- O código já desativa o suavizado do canvas (`imageSmoothingEnabled = false`) e o CSS já usa `image-rendering: pixelated`/`crisp-edges`. Não é necessário reimplementar isso do zero.
- O controle atual de proporção alterna 4:3 e 16:9; isso é uma decisão de apresentação do monitor, não uma troca real de adaptador de vídeo ou modo gráfico.
- A paleta VGA está definida com 16 cores. Não encontrei um perfil CGA ou EGA dedicado no `index.html` analisado.

### 3.2 Constatações específicas da camada de dados

- A camada de rede usa timeout de 9 segundos e cache local com TTL de 10 minutos.
- Para RSS, o código tenta `rss2json.com`, depois tenta buscar o feed diretamente e usa uma cadeia com `allorigins.win` e `corsproxy.io`.
- O cache RSS retorna `isLive: true` junto com `fromCache: true`. O resumo diário também interpreta `isLive !== false` como fonte ao vivo. Isso pode fazer um resultado armazenado ser apresentado como LIVE.
- O fallback de clima contém valores fixos (por exemplo, temperatura, umidade e vento de demonstração). É útil como ilustração, mas não deve parecer uma leitura meteorológica real.
- O método de clima usa Nova York como cidade padrão se nenhuma cidade for informada. Recomendo trocar isso por uma cidade configurada pelo usuário, sem geolocalização automática.
- A consulta ao Wikimedia Commons atribui `Public Domain` quando a informação de licença está ausente. Ausência de metadado não comprova domínio público.

---

## 4. Direção de produto recomendada

A CYBER BBS deve ter duas identidades que convivem:

**A camada BBS:** um computador fictício de 1995, com menu numerado, ANSI, CP437, modem, chamadas, mensagens, arquivos e atmosfera de CRT.

**A camada de utilidade:** uma central de consulta atual, com notícias, previsão do tempo, alertas, dados públicos, repositórios e downloads verificáveis.

A camada de utilidade não deve abandonar a linguagem visual antiga. Ela pode apresentar dados modernos em tabelas de texto, gráficos ASCII, barras de progresso e telas ANSI. O objetivo é que as funcionalidades sejam genuínas mesmo quando a interface parece antiga.

### Menu principal proposto

| Tecla | Área sugerida | Uso real |
|---|---|---|
| 1 | TODAY / SYSTEM BRIEFING | Resumo do dia com clima, manchetes, alertas, feeds e estado dos serviços. |
| 2 | NEWSWIRE | Notícias por tema e região, filtros, busca, favoritos e leitura posterior. |
| 3 | WEATHER STATION | Condições atuais, previsão horária e de vários dias, chuva em mm e probabilidade. |
| 4 | OPEN SOURCE VAULT | Busca de projetos, lista pessoal, versões, releases e histórico de atualização. |
| 5 | SECURITY BULLETINS | Avisos oficiais e vulnerabilidades conhecidas, com foco em correção e prevenção. |
| 6 | PUBLIC DATA EXCHANGE | Dados públicos úteis, como espaço, terremotos e câmbio de referência. |
| 7 | FILE LIBRARY | Catálogo de software e arquivos com origem, versão, licença e checksum. |
| 8 | MESSAGE AREAS | Fórum e mensagens locais, com indicação clara de que são locais. |
| 9 | ANSI / GRAPHICS LAB | Galeria, editor, visualizador de imagens e testes de paleta/resolução. |
| 10 | DOOR GAMES | Jogos locais sem apostas ou prêmios de valor real. |
| 11 | PERSONAL DESK | Notas, bookmarks, lista de leitura, pequenas tarefas e histórico. |
| 12 | NODE STATUS | Estado dos conectores, cache, última atualização e modo offline. |
| 13 | SETTINGS | Preferências, perfil de vídeo, áudio, privacidade, backup e acessibilidade. |

As teclas e nomes são sugestões. O importante é agrupar a navegação por utilidade e evitar que o menu cresça indefinidamente.

---

## 5. Correções prioritárias de confiabilidade

Estas correções devem vir antes de adicionar novas APIs. Sem elas, mais fontes apenas aumentariam a quantidade de dados potencialmente enganosos.

### 5.1 Criar estados de dados explícitos

Substituir o booleano `isLive` por um estado normalizado:

| Estado | Significado | Apresentação recomendada |
|---|---|---|
| `LIVE` | Consulta bem-sucedida nesta atualização | Verde/ciano, com hora da consulta. |
| `CACHED` | Resposta válida ainda dentro do TTL | Amarelo, com idade do cache. |
| `STALE` | Último valor disponível, mas TTL expirado ou fonte sem resposta | Âmbar, com data/hora da última coleta. |
| `OFFLINE` | Não existe dado recente disponível | Cinza, sem inventar valores. |
| `DEMO` | Conteúdo fictício de demonstração | Roxo/magenta, claramente identificado como simulação. |
| `ERROR` | Falha de consulta ou resposta inválida | Vermelho, com ação de tentar novamente. |

Cada resposta de provedor deve ter pelo menos:

```text
status
sourceId
sourceName
requestedAt
fetchedAt
publishedAt (quando existir)
expiresAt
isFallback
errorCode (quando houver)
```

**Critério de aceite:** nenhum conteúdo lido do cache pode ser exibido como LIVE; todo conteúdo fictício deve ter rótulo DEMO; toda tela de dados deve mostrar origem e horário da última atualização.

### 5.2 Corrigir o cache e o tratamento de datas do RSS

- Não preencher data de publicação ausente com `new Date()`; isso faz uma notícia sem data parecer recém-publicada.
- Guardar separadamente `publishedAt` e `fetchedAt`.
- Validar datas inválidas e manter a notícia sem data como `DATE UNKNOWN`.
- Deduplicar prioritariamente por GUID, depois link normalizado e, por último, título + fonte.
- Implementar `stale-while-revalidate`: mostrar imediatamente o cache, consultar a fonte em paralelo e atualizar quando houver resposta nova.
- Exibir a idade do cache e permitir `R` para atualizar a fonte atual e `A` para atualizar todas.
- Separar o TTL por categoria: cotações, notícias, clima e dados de arquivo não têm a mesma frequência de atualização.

### 5.3 Reduzir a dependência de proxies públicos

O navegador não pode ler livremente qualquer RSS/API de outro domínio: o servidor de origem precisa autorizar a leitura por CORS. Isso é uma regra do navegador, não um bug do terminal.

A cadeia atual com conversor externo e proxies públicos pode funcionar como contingência, mas não deve ser a base de produção. Proxies de terceiros podem ficar indisponíveis, limitar consultas, observar URLs e respostas e dificultar o diagnóstico de erros.

Estratégia recomendada:

1. Chamar diretamente as APIs que oferecem CORS e endpoints públicos documentados.
2. Para feeds sem CORS, oferecer um **relay próprio e opcional**, com allowlist fixa de domínios e somente `GET`.
3. Alternativamente, executar uma rotina GitHub Actions que atualize um `feeds-cache.json` estático no próprio repositório; o cliente continua sem backend permanente.
4. Não enviar token pessoal, cookie ou segredo por proxy público.
5. Nunca criar um proxy aberto que aceite qualquer URL enviada pelo visitante.
6. Mostrar, por feed, se houve bloqueio CORS, timeout, rate limit ou resposta inválida.

**Critério de aceite:** a BBS deve inicializar mesmo sem rede; cada conector deve falhar isoladamente; nenhuma falha de uma fonte pode travar todo o terminal.

### 5.4 Corrigir o tratamento das licenças de imagens

No código atual, a ausência de `LicenseShortName` é convertida em `Public Domain`. Alterar para `UNKNOWN / VERIFY LICENSE`.

Guardar e exibir, quando disponíveis:

- título do arquivo;
- autor/criador e crédito;
- nome da licença;
- link da licença;
- página original do arquivo no Commons;
- indicação de atribuição exigida;
- origem da miniatura e dimensões.

Não permitir exportar uma imagem como “Public Domain” só porque a API não retornou licença. A Wikimedia explica que licenças podem exigir crédito, link para os termos e compartilhamento de derivados sob condições específicas.

### 5.5 Identificar corretamente os elementos simulados

Os seguintes elementos devem continuar divertidos, mas estar descritos com honestidade:

- modem/handshake: áudio e sequência visual simulados;
- ZMODEM: animação de transferência, não protocolo ZMODEM real;
- nós e callers: personagens e atividade fictícios;
- SysOp/chat/netmail: respostas locais, sem entrega para outra pessoa;
- sensor de clima fixo: DEMO, nunca uma estação meteorológica real.

A BBS ganha credibilidade quando separa com clareza a ficção de interface dos dados externos verdadeiros.

---

## 6. Novo sistema de vídeo: MDA, CGA, EGA, VGA e modo moderno

Esta é a evolução visual que mais vale a pena fazer. Em vez de adicionar apenas “mais uma cor”, criar um **Video Mode Manager** que escolha um perfil completo.

### 6.1 Separar quatro conceitos

As configurações atuais misturam aparência de monitor, proporção e paleta. O novo painel deve separar:

1. **Adaptador de vídeo:** MDA, CGA, EGA, VGA ou SVGA/Extended.
2. **Modo de exibição:** resolução lógica e número de colunas/linhas.
3. **Monitor/sinal:** monocromático, CGA RGB, CGA composite, EGA/VGA RGB ou LCD.
4. **Efeitos:** scanlines, curvatura, fósforo, bloom, ruído, flicker e vinheta.

Assim, o usuário pode escolher VGA com monitor flat, CGA composite com aparência de TV ou MDA âmbar sem misturar essas escolhas.

### 6.2 Perfis de vídeo propostos

As resoluções abaixo são modos clássicos de PC. Há variações entre adaptadores, BIOS e monitores; os nomes devem indicar claramente se a tela é um modo histórico ou uma interpretação visual.

| Perfil | Modo textual / gráfico | Cores | Aparência e uso recomendado |
|---|---|---|---|
| **MDA MONO** | Texto 80×25; aproximadamente 720×350, fonte 9×14 | Monocromático | Texto nítido, fósforo verde ou âmbar, sem gráficos coloridos. Bom para uma BBS de terminal puro. |
| **CGA TEXT** | Texto 80×25 em 640×200; fonte 8×8 | Texto com 16 cores (com limitações de atributo) | Visual PC XT autêntico, baixa altura e letras quadradas. |
| **CGA GRAPHICS** | 320×200 com 4 cores ou 640×200 com 2 cores | 4 ou 2 cores | Modo para telas de abertura, desenhos, banners e conversão de imagens. Disponibilizar as duas paletas de 4 cores. |
| **CGA COMPOSITE** | Base CGA 320×200 | Paleta aparente com cores de artefato | Simular o sinal composto NTSC, com bleed e cores de artefato selecionáveis. É um modo de monitor/sinal, não outra placa. |
| **EGA** | Texto 80×25; gráficos 640×350 | 16 cores simultâneas de uma paleta de 64 | Mais definição vertical e arte ANSI/bitmap com 16 cores. |
| **VGA TEXT** | Texto 80×25, modo de texto de alta definição | 16 cores ANSI | Perfil padrão recomendado para a experiência atual da BBS. Fonte Px437 VGA e paleta IBM VGA. |
| **VGA MODE 12h** | Gráfico 640×480 | 16 cores | Visualizador gráfico mais definido, ideal para telas ilustradas. |
| **VGA MODE 13h** | Gráfico 320×200 | 256 cores | Porta gráfica para fotos e imagens, lembrando jogos VGA de 1990. Não confundir com o modo ANSI de 16 cores. |
| **SVGA / EXTENDED** | 800×600 ou 1024×768; grade expandida, por exemplo 100×35 ou 132×43 | 256 cores ou true color | Opção moderna para navegar em notícias, README e listagens extensas. Identificar como extensão moderna, não como CGA/VGA original. |

**Observação histórica:** CGA não é simplesmente uma paleta de quatro cores para todo o sistema. O adaptador também tinha modos de texto 80×25; os modos gráficos clássicos eram 320×200/4 cores e 640×200/2 cores. O VGA inclui modos gráficos como 320×200/256 cores e 640×480/16 cores. Por isso, a aplicação deve tratar o modo textual e o modo gráfico separadamente.

### 6.3 Grades de terminal recomendadas

Manter o **80×25 como padrão oficial** para todas as telas BBS clássicas e para compatibilidade ANSI/SAUCE.

Adicionar opções:

- `40×25`: modo compacto inspirado em CGA; útil para telas simples e demonstrações.
- `80×25`: modo clássico; manter todos os menus e arte ANSI atuais funcionando aqui.
- `80×43` ou `80×50`: modo de densidade expandida, quando a fonte e o layout permitirem.
- `100×35` ou `132×43`: modo Extended/SVGA para conteúdos longos e telas modernas; não usar como padrão de ANSI clássico.

A mudança de grade deve recalcular largura de linha, quebra de texto, paginação, hit-regions, cursor, áreas clicáveis, posição do prompt e exportação de arte. Não basta alterar o tamanho visual do canvas.

### 6.4 Tela de configurações sugerida

Criar `SETTINGS > DISPLAY > VIDEO MODE` com:

- seletor de adaptador;
- seletor de modo/resolução;
- seletor de monitor/sinal;
- seletor de fonte;
- seletor de paleta;
- preview animado ou estático do mesmo ANSI art em cada perfil;
- botão `RESTORE DEFAULTS`;
- botão `SAVE AS PRESET`;
- opção `AUTO` para escolher o perfil mais apropriado ao conteúdo.

Exemplos de presets:

- `IBM PC 5153 CGA RGB`
- `CGA COMPOSITE TV`
- `IBM 5151 MDA GREEN`
- `AMBER PHOSPHOR`
- `IBM EGA 16-COLOR`
- `IBM VGA 80-COLUMN`
- `VGA 320x200 256-COLOR`
- `SVGA EXTENDED TERMINAL`
- `MODERN FLAT / ACCESSIBLE`

### 6.5 Recomendações de implementação do renderizador

- Criar `VideoProfiles`, com as dimensões lógicas, grade, fonte, paleta, pixel aspect ratio e características do monitor em uma única definição declarativa.
- Separar `TerminalBuffer` de `CanvasRenderer`. O mesmo buffer deve poder ser desenhado pelo renderer CGA, EGA, VGA ou moderno.
- Continuar usando `imageSmoothingEnabled = false` para pixel art e oferecer uma opção de suavização apenas para fotografia.
- Preservar a proporção dos caracteres e da tela. Evitar esticar o canvas indiscriminadamente com `object-fit: fill`; usar escala controlada, letterboxing ou compensação explícita de pixel aspect ratio.
- Fazer `redrawAll()` completo ao mudar de perfil e recalcular hit-regions.
- Usar renderização incremental/dirty cells se o suporte a grades maiores aumentar o custo.
- Manter os efeitos CRT desligáveis individualmente e respeitar `prefers-reduced-motion`.
- Usar o mesmo mecanismo de paletas na conversão de imagem para ANSI, permitindo comparar CGA 4-color, EGA 16-color e VGA 256-color.

**Critério de aceite:** o mesmo menu deve funcionar sem quebra em 80×25, 40×25 e Extended; nenhuma tela pode ter texto cortado, hit-region deslocada ou navegação por teclado perdida depois da troca de perfil.

---

## 7. Funcionalidades novas com utilidade real

### 7.1 NEWSWIRE 2.0 — central de notícias personalizável

Hoje há cinco feeds definidos no código. Evoluir para um catálogo configurável por categoria:

| Categoria | Fontes candidatas | O que entregar |
|---|---|---|
| Brasil | Agência Brasil e fontes públicas nacionais | Manchetes nacionais, economia, ciência, tecnologia e serviços públicos. |
| Mundo | BBC World e outras fontes internacionais configuráveis | Manchetes internacionais, com data, origem e link. |
| Tecnologia | Hacker News, Slashdot, Ars Technica | Desenvolvimento, IA, hardware, software e open source. |
| Segurança | CISA e BleepingComputer | Avisos, correções, incidentes e vulnerabilidades em nível informativo/defensivo. |
| Ciência e espaço | NASA RSS | Descobertas, missões e notícias científicas. |

Funcionalidades:

- habilitar/desabilitar feeds;
- adicionar feed RSS/Atom manualmente;
- testar o feed antes de salvar;
- filtrar por categoria, idioma, fonte e período;
- ordenar por data de publicação;
- marcar como lido/não lido;
- salvar para ler depois;
- buscar nos títulos e resumos armazenados;
- mostrar `published`, `fetched`, fonte e link original;
- remover duplicados entre feeds;
- permitir limite de manchetes por categoria.

Não copiar artigos inteiros para dentro da BBS. Mostrar título, resumo curto e metadados, depois abrir a página original.

### 7.2 TODAY HUB 2.0 — briefing útil, sem conteúdo inventado

Tela inicial com blocos atualizados de forma independente:

```text
CYBER BBS // DAILY TELETYPE
DATE/TIME       Local time + timezone
WEATHER         Current / next rain / today's range
NEWS            5-8 latest headlines across selected feeds
SECURITY        New official advisories since last visit
GITHUB WATCH    New releases from saved repositories
PUBLIC DATA     Latest selected public-data updates
SOURCE STATUS   LIVE / CACHED / STALE / OFFLINE
```

O briefing deve ser determinístico: combinar dados reais e regras simples, sem exigir IA ou uma chave de API. Cada bloco deve abrir a tela detalhada correspondente.

### 7.3 WEATHER STATION 2.0 — previsão, não só temperatura atual

Usar Open-Meteo para acrescentar:

- previsão horária para as próximas 24–48 horas;
- probabilidade de chuva por hora;
- precipitação estimada em milímetros;
- temperaturas mínima/máxima do dia;
- sensação térmica, umidade, vento e rajadas;
- previsão de 7 dias;
- comparação de duas ou três cidades salvas;
- localização configurável e fuso horário correspondente.

Apresentação em caracteres/ANSI:

```text
HOUR     TEMP     RAIN%     PRECIP
12:00    24 C       20%      0.0 mm
13:00    25 C       40%      0.4 mm
14:00    23 C       75%      2.1 mm
15:00    22 C       85%      4.8 mm
```

Os números acima são apenas exemplo de layout, não uma previsão real.

Incluir `FORECAST MODEL` e `UPDATED` no rodapé. Nunca apresentar previsão como observação medida. Manter o modo DEMO apenas quando não houver rede e identificá-lo como simulação.

### 7.4 OPEN SOURCE VAULT 2.0 — acompanhar projetos, não apenas pesquisar

A busca atual já abre repositórios e README. Acrescentar:

- watchlist local de repositórios;
- último release estável;
- data do release e changelog;
- última atualização/push;
- linguagem, licença, estrelas e forks;
- indicação de repositório arquivado;
- filtro por tópico e linguagem;
- comparação lado a lado de projetos;
- link para releases e página oficial de download;
- histórico de consultas e favoritos;
- aviso de limite restante da API GitHub e momento de reset, quando disponível.

A API REST do GitHub permite consultar o último release público sem autenticação; o limite primário informado para requisições não autenticadas é 60 por hora. A BBS deve agrupar consultas, armazenar resultados e evitar atualizar todos os itens da watchlist continuamente.

### 7.5 SECURITY BULLETINS — quadro de avisos defensivos

Criar uma área simples para acompanhar comunicados de segurança de fontes oficiais, por exemplo avisos CISA e alertas de fornecedores.

Exibir:

- título e órgão emissor;
- produto/família afetada, quando informado;
- data de publicação e atualização;
- nível/severidade quando fornecido pela fonte;
- status do aviso;
- ação defensiva recomendada, como consultar o boletim oficial e aplicar correções do fabricante;
- link para a fonte original.

Manter o conteúdo informativo e focado em mitigação. Não transformar a tela em catálogo de instruções de exploração.

### 7.6 PUBLIC DATA EXCHANGE — dados públicos em formato de terminal

Adicionar poucas integrações bem escolhidas, cada uma com procedência e data:

- **NASA:** últimas publicações e imagem do dia, com origem e crédito.
- **USGS:** atividade sísmica recente em um painel simples, com magnitude, local, horário e link para a ficha oficial.
- **Câmbio de referência:** taxas de referência via Frankfurter para conversões simples e históricas. Deixar explícito que são taxas de referência publicadas por provedores oficiais, não cotações de trading em tempo real.
- **Status de serviços:** status público do GitHub e de provedores usados pela própria BBS, caso ofereçam endpoint público documentado.

Não adicionar toda API encontrada na internet. Cada nova integração deve responder a uma pergunta útil e ter um provedor documentado, política de atualização e fallback.

### 7.7 FILE LIBRARY — área de downloads realmente verificável

Evoluir o catálogo `FILES.BBS` para um índice de recursos reais:

- nome e descrição;
- versão e data;
- tamanho;
- sistema operacional/arquitetura;
- licença;
- página oficial do projeto;
- endereço oficial do download;
- SHA-256, quando o fornecedor publicar checksum;
- status do link e última validação.

Priorizar ferramentas open source, documentação, fontes, arte ANSI e pequenos utilitários. O download deve abrir a origem oficial ou baixar o arquivo permitido pelo navegador. A BBS nunca deve executar arquivos baixados.

O efeito de transferência pode continuar simulando um modem antigo, mas deve dizer `TRANSFER THEATER — DOWNLOAD IS VIA HTTPS` quando não houver protocolo de transferência real.

### 7.8 PERSONAL DESK — recursos que justificam voltar à BBS

Criar um espaço privado no próprio navegador:

- bookmarks de notícias, repositórios e arquivos;
- lista `READ LATER`;
- notas rápidas associadas a um item;
- pequena lista de tarefas;
- histórico de itens consultados;
- pesquisa local;
- exportação/importação de backup JSON.

Tudo deve funcionar sem conta remota. Mostrar que os dados estão guardados somente naquele navegador e oferecer backup manual.

---

## 8. Arquitetura técnica recomendada

### 8.1 Manter a versão standalone, mas ter fontes modulares

Manter o HTML único como distribuição é uma vantagem. Evitar transformar o runtime em uma aplicação pesada com framework ou dependências obrigatórias.

Estrutura recomendada para desenvolvimento:

```text
src/
  core/
    app.js
    router.js
    input.js
    state.js
  terminal/
    buffer.js
    ansi-parser.js
    renderers/
      renderer-base.js
      renderer-mda.js
      renderer-cga.js
      renderer-ega.js
      renderer-vga.js
      renderer-extended.js
    profiles.js
  data/
    provider-registry.js
    cache.js
    normalizers.js
    feeds/
    weather/
    github/
    public-data/
  doors/
    today.js
    news.js
    weather.js
    github.js
    security.js
    files.js
    personal-desk.js
  storage/
    local-store.js
    indexed-store.js
    migrations.js
  tests/
    fixtures/
    selftest.js
  styles/
    crt.css
    profiles.css

tools/
  bundle.mjs
```

O `bundle.mjs` gera o HTML standalone e a cópia de distribuição a partir da mesma fonte. O HTML gerado não deve ser editado manualmente. Isso reduz o risco de `index.html` e `cyber-bbs.html` divergirem.

### 8.2 Contrato único para provedores

Cada conector deve implementar uma interface semelhante a:

```text
provider.fetch(params, options)
provider.normalize(rawResponse)
provider.getCacheKey(params)
provider.getTtl()
provider.getSourceInfo()
```

O retorno deve sempre usar o formato comum descrito na seção 5.1. As telas não devem conhecer detalhes internos do RSS, Open-Meteo ou GitHub.

### 8.3 Persistência e backup

- `localStorage`: preferências pequenas, perfil de vídeo, estado de navegação e flags.
- `IndexedDB`: cache de artigos, anexos, uploads, imagens e conteúdo binário.
- Acrescentar `schemaVersion` e migrações progressivas.
- Mostrar uso/limite aproximado e erros de quota.
- Oferecer backup e restauração com validação antes de sobrescrever dados.
- Na importação, validar o formato, limitar tamanho e não interpretar conteúdo como HTML executável.

### 8.4 PWA opcional

Se a BBS for publicada no GitHub Pages/HTTPS, acrescentar manifest e Service Worker para instalar e manter a interface shell e arquivos estáticos disponíveis offline. O Service Worker requer contexto seguro, normalmente HTTPS (ou localhost para desenvolvimento). O modo de abrir diretamente o arquivo HTML deve continuar disponível como fallback independente da PWA.

### 8.5 Modo standalone e modo networked

Manter dois níveis explícitos:

**Standalone:** sem backend, mensagens e perfis locais, nós fictícios e dados públicos externos quando houver conexão.

**Networked (opcional):** backend separado para contas, presença, fórum compartilhado e mensagens reais. O navegador não deve fingir que `localStorage` equivale a uma BBS multiusuário. Para integração com serviços legados que exigem TCP/Telnet/NNTP, será necessário um gateway/servidor intermediário; não é uma funcionalidade que se resolva apenas com CSS ou Service Worker.

Não iniciar o modo networked até existir uma necessidade concreta e uma política clara de autenticação, moderação, retenção e segurança.

---

## 9. Segurança, privacidade e acessibilidade

1. **Sanitização:** nunca inserir diretamente HTML remoto na interface. Converter conteúdo de feeds/README em texto seguro; limitar tamanho e caracteres de controle.
2. **Links:** aceitar apenas `https:` e, quando aplicável, `http:` para abrir páginas conhecidas; bloquear `javascript:` e esquemas inesperados.
3. **Proxies:** allowlist estrita de hosts, somente GET, limites de tamanho, timeout e rate limit.
4. **Tokens:** não colocar token pessoal no HTML público, não enviar segredo a proxy e não guardar uma credencial como se fosse autenticação segura de um produto local.
5. **Downloads:** nunca executar arquivos. Mostrar origem, licença e checksum disponível.
6. **Imagens:** nunca inferir domínio público a partir de metadado ausente; manter autor, crédito e link da licença.
7. **Privacidade:** sem analytics ou telemetria por padrão; explicar que dados locais não são sincronizados.
8. **Acessibilidade:** navegação por teclado, foco visível, opção de alto contraste, sem áudio obrigatório e suporte a `prefers-reduced-motion`.
9. **Compatibilidade:** não fazer uma falha de Web Audio, fullscreen, IndexedDB ou Service Worker impedir o boot do terminal.

---

## 10. Roadmap sugerido

### P0 — Corrigir confiança e consistência

- Corrigir o estado LIVE/CACHED/STALE/OFFLINE/DEMO.
- Corrigir a data ausente nos feeds RSS.
- Identificar corretamente o sensor meteorológico de demonstração.
- Remover o fallback automático `Public Domain` para imagens sem licença identificada.
- Criar painel de saúde das fontes e capturar erros individuais.
- Reduzir dependência de proxies públicos e não encaminhar credenciais por eles.
- Fazer backup/restauração e versionamento de dados locais.

**Definição de pronto:** toda tela de dados indica origem, atualização e estado verdadeiro; o boot funciona offline; nenhuma informação simulada é mostrada como dado real.

### P1 — Video Mode Manager

- Criar perfis MDA/CGA/EGA/VGA/Extended.
- Implementar resoluções e grades independentes da moldura do monitor.
- Fazer preview de paletas e fontes.
- Testar 4:3, 16:9 e fullscreen com letterboxing/compensação correta.
- Recalcular hit-regions e paginação ao trocar de modo.

**Definição de pronto:** os mesmos fluxos essenciais funcionam em 80×25, CGA e modo Extended sem texto cortado nem navegação quebrada.

### P2 — Utilidade diária

- Newswire configurável e leitura posterior.
- Weather Station com previsão horária e de 7 dias.
- GitHub Watchlist e releases.
- Security Bulletins.
- Personal Desk.
- File Library com links oficiais e checksums.

**Definição de pronto:** os dados exibidos vêm de fontes públicas identificadas, possuem data/hora e têm fallback honesto.

### P3 — PWA e rede compartilhada opcional

- PWA instalável e cache offline do shell.
- Relay controlado ou feed-cache estático para RSS sem CORS.
- Só então avaliar backend real para fórum, netmail e presença compartilhados.

**Definição de pronto:** a versão standalone permanece funcional sem instalação; recursos de rede compartilhada são claramente separados e documentados.

---

## 11. Testes e critérios de aceite

Criar um comando `SELFTEST` no terminal e uma página de teste local. A especificação anterior já descrevia essa ideia; ela deve passar a existir de fato.

### Terminal e visual

- Renderizar CP437 e os 16 índices da paleta.
- Validar ANSI SGR, cursor, limpeza de linha/tela, scroll e parâmetros inválidos.
- Validar troca de perfil, grade, fonte e resolução.
- Validar hit-regions com mouse e teclado em todos os modos.
- Validar proporção de pixel, fullscreen e redraw.

### Dados

- Fixtures RSS 2.0 e Atom, feed vazio, XML inválido e artigo sem data.
- Teste de deduplicação.
- Teste de cache fresh, expired, stale e offline.
- Teste de timeout, 403/429 e retorno inválido.
- Teste de data em fuso horário diferente.
- Teste de que CACHE nunca recebe etiqueta LIVE.
- Teste de que `UNKNOWN` nunca vira `Public Domain`.

### Persistência e segurança

- Exportar e importar backup com round-trip.
- Migrar dados de versões antigas.
- Tratar `localStorage` ou IndexedDB indisponível.
- Testar entradas HTML/ANSI malformadas e URLs inseguras.
- Testar limites de tamanho e quota.

### Compatibilidade

- Chrome e Edge no Windows 11.
- Abrir diretamente o HTML e pela hospedagem HTTPS.
- Tela pequena e desktop ultrawide.
- Som desligado e Web Audio indisponível.
- `prefers-reduced-motion` ativo.

**Regra de qualidade:** uma funcionalidade só deve ser marcada como concluída quando passar seu teste e tiver uma mensagem de fallback coerente.

---

## 12. O que eu não priorizaria agora

- Mais jogos antes de corrigir a qualidade dos dados.
- Mais efeitos de CRT ou shader antes de existir o Video Mode Manager.
- Múltiplas APIs de notícias sem painel de fontes e estado de atualização.
- Um sistema de login remoto antes de decidir como funcionará o backend.
- Um proxy público genérico para contornar CORS.
- Download de executáveis sem origem oficial, licença e checksum disponível.
- Uma migração para framework pesado que retire a vantagem de abrir um único HTML.

---

## 13. Lista inicial de tarefas para um agente CLI

A ordem abaixo é uma proposta executável para iniciar a próxima versão:

1. Fazer inventário das funções atuais e criar testes de regressão antes de alterar o terminal.
2. Implementar `DataStatus` e `SourceHealth`; atualizar RSS e clima para usar o contrato comum.
3. Corrigir cache RSS, datas ausentes e indicação de conteúdo DEMO.
4. Corrigir metadados/licenças do Photo Grabber.
5. Criar um adaptador de vídeo declarativo, começando com VGA atual como perfil de referência.
6. Adicionar CGA Text e CGA Graphics, depois EGA e MDA.
7. Adicionar VGA 320×200/256 cores para o visualizador gráfico, mantendo o ANSI de 16 cores separado.
8. Adicionar o perfil Extended/SVGA para a área de notícias e GitHub.
9. Criar Newswire configurável, Weather Station 2.0 e GitHub Watchlist.
10. Criar Security Bulletins, File Library e Personal Desk.
11. Adicionar PWA/Service Worker apenas na distribuição HTTPS.
12. Atualizar README, screenshots, changelog, fontes e documentação de privacidade.

**Orientação para o agente:** fazer uma etapa por vez, preservar o HTML standalone e não remover funcionalidades atuais sem teste de regressão. A versão gerada deve sempre poder ser reconstruída a partir das fontes modulares.

---

## 14. Referências consultadas

### Repositório e código

- [CYBER BBS — GitHub](https://github.com/marceloasl99/cyber-bbs)
- [README.md](https://github.com/marceloasl99/cyber-bbs/blob/main/README.md)
- [index.html (código distribuído)](https://raw.githubusercontent.com/marceloasl99/cyber-bbs/main/index.html)
- [plan.txt (especificação anterior)](https://raw.githubusercontent.com/marceloasl99/cyber-bbs/main/plan.txt)

### Modos gráficos históricos

- [IBM PC Technical Reference — CGA](https://bitsavers.org/pdf/ibm/pc/pc/6025008_PC_Technical_Reference_Aug81.pdf)
- [IBM VGA/XGA Technical Reference — tabelas de modos de vídeo](https://bitsavers.trailing-edge.com/pdf/ibm/pc/cards/IBM_VGA_XGA_Technical_Reference_Manual_May92.pdf)
- [IBM Personal Systems, abril de 1992 — dimensões de MDA, CGA e EGA](https://ardent-tool.com/docs/psmag/PersonalSystems_1992_April_G325-5015-00.pdf)
- [Peter Norton Programmer's Guide — modos de vídeo IBM PC](https://www.pcjs.org/documents/books/mspl13/msdos/norton/)

### Navegador, rede e cache

- [MDN — Canvas `imageSmoothingEnabled`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled)
- [MDN — CSS `image-rendering`](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/image-rendering)
- [MDN — CORS](https://developer.mozilla.org/pt-BR/docs/Web/HTTP/Guides/CORS)
- [W3C — Service Workers, contexto seguro](https://www.w3.org/TR/2026/CRD-service-workers-20261117/)

### Fontes de dados

- [Open-Meteo — previsão e variáveis horárias](https://open-meteo.com/en/docs)
- [GitHub REST API — rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [GitHub REST API — releases](https://docs.github.com/en/rest/releases/releases)
- [Agência Brasil — página oficial de feeds RSS](https://agenciabrasil.ebc.com.br/feed/)
- [NASA — feeds RSS oficiais](https://www.nasa.gov/rss-feeds/)
- [BleepingComputer — página de feeds RSS](https://www.bleepingcomputer.com/rss-feeds/)
- [Frankfurter — API de câmbio de referência](https://frankfurter.dev/)
- [Wikimedia Commons — reutilização e atribuição](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/pt)
- [Wikimedia Commons — metadados legíveis por máquina](https://commons.wikimedia.org/wiki/Commons:Machine-readable_data/pt)

---

## Conclusão

A CYBER BBS já tem a personalidade e os elementos visuais necessários para ser reconhecida como uma BBS retrô. O próximo salto deve torná-la **mais confiável e mais útil**: fontes configuráveis, dados com procedência e atualização verificável, previsão do tempo completa, acompanhamento de projetos, downloads responsáveis e um sistema de vídeo realmente inspirado nos adaptadores históricos.

Minha recomendação é começar por **P0 (confiabilidade)** e **P1 (Video Mode Manager)**. Esses dois blocos criam a fundação para que as próximas funcionalidades sejam úteis sem perder a autenticidade da CYBER BBS.



Analisei o README e o plano original. Agora vou mergulhar no código do motor de terminal, CSS do CRT e nas fontes de dados para fazer sugestões concretas e alinhadas com a arquitetura real.
Analisei o repositório a fundo (README, `plan.txt`, `term.js`, `app.js`, `net.js`, `ansi.js`, `crt.css` e o bundle canônico `index.html`), testei **23 APIs candidatas ao vivo hoje** e gerei o relatório completo em Markdown, no estilo do seu `plan.txt` (IDs, critérios de aceitação, fases para entregar ao seu agente CLI).

**⬇ Download:** [CYBER-BBS_RELATORIO_MELHORIAS.md](sandbox:/mnt/data/CYBER-BBS_RELATORIO_MELHORIAS.md) (33 KB · 323 linhas)

---

### Diagnóstico em 1 minuto
O projeto já é forte: single-file offline-first, 17 doors, dados reais rotulados `LIVE/CACHED/OFFLINE`, modem sintetizado, SAUCE writer. As lacunas que explorei no relatório:

**🖥 Carro-chefe — VIDEO ADAPTERS (sua ideia de "outra CGA, outra VGA… moderna")**
Hoje o "16:9" só **estica** o grid 80×25, e os temas são filtros CSS. Propus 7 perfis reais de adaptador, com fonte/grid/paleta/efeitos corretos:

| Perfil | Grid | Fonte | Destaque |
|---|---|---|---|
| MDA '81 | 80×25 | IBM MDA 9×14 | Mono verde/âmbar/branco com mapeamento de atributos (não hue-rotate) |
| CGA '81 | 80×25 / **40×25** | IBM CGA 8×8 | "CGA snow", composite sim, 40×25 = modo BIG TYPE |
| EGA '84 | 80×25 / 80×43 | IBM EGA 8×14 | 43 linhas |
| VGA '87 | 80×25 / 80×50 | atual | default |
| **WIDE '91** | **132×37** | VGA 8×16 | **16:9 nativo sem deformar** (1056×592) |
| Mode 13h | 320×200 | bitmap | 256 cores, dithering, demos plasma/fire |
| **OLED 2026** | auto-fit | truecolor | SGR `38;2`, alto DPI, sem CRT |

Fontes do pack int10h (CC BY-SA, ~26 KB cada — cabem no orçamento de 3 MB) [[20]]. Troca em runtime com degauss + linha no POST (`VIDEO: IBM CGA 16K · MODE 03`).

**📡 Novos doors com dados úteis (CORS verificado hoje ✅)**
- **MARKET WIRE** — câmbio USD/BRL (Frankfurter ✅, ECB) + crypto + sparkline ASCII
- **EARTH & SKY** — terremotos USGS ✅ + **ISS ao vivo** ✅ + lançamentos (15 req/h anônimo → cache 6 h) [[10]]
- **CYBER RADIO** — streaming real de rádios synthwave/lofi via Radio Browser ✅ (52.923 estações)
- **CALLER ID** — IP/ISP/linha via ipwho.is ✅ · **WIKI TERMINAL** + On This Day · **TIME MACHINE** (Archive.org/Wayback) · **BOOK NOOK** (Gutenberg .txt real p/ File Areas) · **WORD WIRE** ✅

**🕹 Navegação realista:** phone book multi-BBS (cada board com banner/adapter próprio), modo AT manual (`ATDT`, `+++`), histórico + Tab-complete, scrollback + pager `[K/N/Q]`, attract mode, "ARE YOU THERE?", `GRAB` (export .ANS com SAUCE/PNG), deep links.

**🔧 P0 (bugs reais que encontrei):** renderer sem atlas de glifos (`redrawAll` a cada hover); parser ANSI sem `K`/iCE/SAUCE-reader; thumbnails Wikimedia carregando full-res (falta `iiurlwidth`); `escape()` deprecated no README decoder; proxies públicos como dependência; clima fixo em New York ignorando a cidade do perfil; drift modular×canônico (13 vs 17 menus); GitHub 60 req/h sem ETag/debounce [[3]].

**Se só fizer 3 coisas:** Adapters I (MDA/CGA/EGA/VGA) + CYBER RADIO + PHONE BOOK — máximo de percepção premium por linha de código. O roadmap completo tem 7 fases com critérios de aceitação prontos para o seu agente CLI.


Analisei o README e o plano original. Agora vou mergulhar no código do motor de terminal, CSS do CRT e nas fontes de dados para fazer sugestões concretas e alinhadas com a arquitetura real.
Analisei o repositório a fundo (README, `plan.txt`, `term.js`, `app.js`, `net.js`, `ansi.js`, `crt.css` e o bundle canônico `index.html`), testei **23 APIs candidatas ao vivo hoje** e gerei o relatório completo em Markdown, no estilo do seu `plan.txt` (IDs, critérios de aceitação, fases para entregar ao seu agente CLI).

**⬇ Download:** [CYBER-BBS_RELATORIO_MELHORIAS.md](sandbox:/mnt/data/CYBER-BBS_RELATORIO_MELHORIAS.md) (33 KB · 323 linhas)

---

### Diagnóstico em 1 minuto
O projeto já é forte: single-file offline-first, 17 doors, dados reais rotulados `LIVE/CACHED/OFFLINE`, modem sintetizado, SAUCE writer. As lacunas que explorei no relatório:

**🖥 Carro-chefe — VIDEO ADAPTERS (sua ideia de "outra CGA, outra VGA… moderna")**
Hoje o "16:9" só **estica** o grid 80×25, e os temas são filtros CSS. Propus 7 perfis reais de adaptador, com fonte/grid/paleta/efeitos corretos:

| Perfil | Grid | Fonte | Destaque |
|---|---|---|---|
| MDA '81 | 80×25 | IBM MDA 9×14 | Mono verde/âmbar/branco com mapeamento de atributos (não hue-rotate) |
| CGA '81 | 80×25 / **40×25** | IBM CGA 8×8 | "CGA snow", composite sim, 40×25 = modo BIG TYPE |
| EGA '84 | 80×25 / 80×43 | IBM EGA 8×14 | 43 linhas |
| VGA '87 | 80×25 / 80×50 | atual | default |
| **WIDE '91** | **132×37** | VGA 8×16 | **16:9 nativo sem deformar** (1056×592) |
| Mode 13h | 320×200 | bitmap | 256 cores, dithering, demos plasma/fire |
| **OLED 2026** | auto-fit | truecolor | SGR `38;2`, alto DPI, sem CRT |

Fontes do pack int10h (CC BY-SA, ~26 KB cada — cabem no orçamento de 3 MB) [[20]]. Troca em runtime com degauss + linha no POST (`VIDEO: IBM CGA 16K · MODE 03`).

**📡 Novos doors com dados úteis (CORS verificado hoje ✅)**
- **MARKET WIRE** — câmbio USD/BRL (Frankfurter ✅, ECB) + crypto + sparkline ASCII
- **EARTH & SKY** — terremotos USGS ✅ + **ISS ao vivo** ✅ + lançamentos (15 req/h anônimo → cache 6 h) [[10]]
- **CYBER RADIO** — streaming real de rádios synthwave/lofi via Radio Browser ✅ (52.923 estações)
- **CALLER ID** — IP/ISP/linha via ipwho.is ✅ · **WIKI TERMINAL** + On This Day · **TIME MACHINE** (Archive.org/Wayback) · **BOOK NOOK** (Gutenberg .txt real p/ File Areas) · **WORD WIRE** ✅

**🕹 Navegação realista:** phone book multi-BBS (cada board com banner/adapter próprio), modo AT manual (`ATDT`, `+++`), histórico + Tab-complete, scrollback + pager `[K/N/Q]`, attract mode, "ARE YOU THERE?", `GRAB` (export .ANS com SAUCE/PNG), deep links.

**🔧 P0 (bugs reais que encontrei):** renderer sem atlas de glifos (`redrawAll` a cada hover); parser ANSI sem `K`/iCE/SAUCE-reader; thumbnails Wikimedia carregando full-res (falta `iiurlwidth`); `escape()` deprecated no README decoder; proxies públicos como dependência; clima fixo em New York ignorando a cidade do perfil; drift modular×canônico (13 vs 17 menus); GitHub 60 req/h sem ETag/debounce [[3]].

**Se só fizer 3 coisas:** Adapters I (MDA/CGA/EGA/VGA) + CYBER RADIO + PHONE BOOK — máximo de percepção premium por linha de código. O roadmap completo tem 7 fases com critérios de aceitação prontos para o seu agente CLI.





-----------

# CYBER BBS — Relatório Técnico de Evolução, Modos de Vídeo e Dados Reais

**Repositório analisado:** `https://github.com/marceloasl99/cyber-bbs`  
**Arquitetura alvo:** Single-file (`index.html` / `cyber-bbs.html`) + módulos fonte (`term.js`, `app.js`, `net.js`, `ansi.js`, `crt.css`)  
**Foco:** Fidelidade histórica de hardware (MDA/CGA/EGA/VGA/SVGA), opção de terminal moderno de alta densidade, navegação autêntica de BBS dos anos 90 e integração de dados atuais, confiáveis e úteis no uso diário.

---

## 1. Diagnóstico Executivo da Base Atual

O **CYBER BBS** já se destaca por entregar uma experiência *offline-first* sem necessidade de backend, combinando síntese de modem via Web Audio, renderização em canvas com fonte bitmap `Px437_IBM_VGA`, parser ANSI/CP437, exportação com metadados SAUCE e 17 áreas/portas funcionais.

A revisão técnica do código-fonte revelou oportunidades claras para elevar o projeto de um simulador nostálgico para um **dashboard retro-futurista de uso diário**:

1. **Vídeo e Resolução Atuais:** O motor de terminal (`term.js`) opera em uma grade rígida de `80×25` com células de `18×32` pixels (canvas interno de `1440×800`). O modo `16:9` atual apenas estica o canvas `80×25` horizontalmente, e os temas visuais atuam como filtros de cor sobre a mesma paleta e geometria.
2. **Confiabilidade da Camada de Dados (`net.js`):** Há pequenos desvios de estado onde respostas vindas do cache local ainda recebem `isLive: true`, a busca de clima cai para uma cidade fixa (*New York*) ou para um sensor fictício sem distinção visual clara entre dado real e simulação, e imagens sem licença explícita no Wikimedia Commons recebem fallback automático para `Public Domain`.
3. **Potencial de Utilidade Diária:** A estrutura de *doors* permite incorporar ferramentas reais (cotações e câmbio do Banco Central Europeu/B3, previsão meteorológica horária, telemetria espacial e sísmica, rádio streaming em background, Wikipédia/Gutenberg em modo texto e watchlist de releases do GitHub) usando exclusivamente APIs públicas com CORS liberado e sem necessidade de chaves.

---

## 2. Correções Prioritárias de Engenharia (Fase P0 — Fundação)

Antes de expandir os modos de tela e adicionar novas portas, vale resolver sete pontos estruturais encontrados no código:

| ID | Componente | Diagnóstico no Código Atual | Solução Recomendada |
|---|---|---|---|
| **P0.1** | `net.js` (Status de Dados) | Respostas do cache RSS retornam `fromCache: true` junto com `isLive: true`. O resumo diário trata `isLive !== false` como dado ao vivo. | Substituir o booleano por um enum de estado explícito: `LIVE` (verde), `CACHED` (amarelo + idade do cache), `STALE` (âmbar, cache expirado mantido por falha de rede), `OFFLINE` (cinza) e `DEMO` (magenta, exclusivo para dados fictícios). |
| **P0.2** | `net.js` (Clima) | O método de clima usa `New York` como fallback fixo caso nenhuma cidade seja passada por parâmetro, ignorando a cidade salva no perfil do usuário. | Ler sempre `state.profile.city` (com fallback inicial configurável no primeiro login, ex.: `São Paulo`) e rotular o sensor estático de emergência como `[DEMO SENSOR]`. |
| **P0.3** | `net.js` (RSS Datas & Proxies) | Itens sem `pubDate` válido recebem `new Date()`, fazendo notícias antigas parecerem recém-publicadas. Forte dependência de proxies públicos de terceiros. | Separar `publishedAt` de `fetchedAt` (exibindo `DATE UNKNOWN` quando ausente). Priorizar APIs com CORS nativo e adicionar `stale-while-revalidate` no cache local. |
| **P0.4** | `app.js` (Wikimedia Commons) | Imagens cujo metadado `LicenseShortName` vem vazio recebem `'Public Domain'`, e a miniatura carrega a URL original completa. | Usar `iiurlwidth=640` na query da API do Commons para baixar miniaturas leves e alterar o fallback de licença desconhecida para `'VERIFY LICENSE'`. |
| **P0.5** | `term.js` (Performance Canvas) | Eventos de hover e cursor disparam `redrawAll()`, redesenhando todas as 2.000 células com `fillText` a cada quadro. | Pré-renderizar um **Glyph Atlas** em um `OffscreenCanvas` (16 cores × 256 glifos CP437) e implementar rastreamento de **dirty cells** (`dirty[row][col]`), usando `drawImage` apenas nas células alteradas. |
| **P0.6** | `ansi.js` (Parser ANSI/SAUCE) | Faltam sequências comuns em artes de BBS como `CSI K` (Erase in Line), suporte a **iCE Colors** (blink bit usado como background de alta intensidade, `CSI ?33h`) e leitor de registros SAUCE na importação. | Completar o parser com `CSI 0K/1K/2K`, toggle de iCE Colors e parser dos últimos 128 bytes para ler título, autor e dimensões de arquivos `.ANS`. |
| **P0.7** | Build / Sincronia | Diferença entre os módulos da pasta `js/` (13 itens de menu) e o bundle canônico `index.html` / `cyber-bbs.html` (17 itens). | Tornar o script `tools/bundle.mjs` a única fonte geradora do bundle ou extrair os 4 doors extras do `index.html` de volta para os módulos. |

---

## 3. Novo Motor de Vídeo: "Video Mode Manager" (MDA, CGA, EGA, VGA, SVGA e Moderno)

Em vez de tratar modos de tela apenas como filtros CSS ou alongamento de proporção, a proposta é criar um **seletor de hardware de vídeo** (`SETTINGS > VIDEO HARDWARE` ou comando global `MODE`). Trocar de placa altera **a grade lógica (colunas × linhas), a fonte bitmap CP437, a paleta de hardware, o aspect ratio do pixel e o comportamento do monitor**.

### 3.1. Matriz de Adaptadores e Modos Propostos

| ID do Modo | Hardware / Época | Grade (Cols×Rows) | Célula (px) | Resolução Lógica | Fonte Bitmap (int10h) | Paleta & Comportamento Visual | Uso Ideal na BBS |
|---|---|---|---|---|---|---|---|
| **`mda80x25`** | **IBM MDA (1981)** | `80×25` | `9×14` | `720×350` | `Px437_IBM_MDA_9x14` | Monocromático puro (Fósforo Verde P1 ou Âmbar P3). Atributos ANSI mapeados para intensidade normal, brilhante, sublinhado real e vídeo reverso. *Long phosphor persistence* (rastro suave ao rolar). | Leitura focada de textos, Netmail, artigos da Wikipédia e programação. |
| **`cga40x25`** | **IBM CGA 40-Col (1981)** | `40×25` | `8×8` | `320×200` | `Px437_IBM_CGA_8x8` | 16 cores RGBI (com o marrom autêntico `#AA5500` no índice 6). Letras grandes e quadradas (*Big Type*). | **Modo Mobile/Compacto** perfeito para celulares, jogos door clássicos e nostalgia extrema dos anos 80. |
| **`cga80x25`** | **IBM CGA 80-Col (1981)** | `80×25` | `8×8` | `640×200` | `Px437_IBM_CGA_8x8` | 16 cores RGBI, pixels esticados verticalmente (aspecto 4:3 em 640×200). Opção de efeito sutil **"CGA Snow"** (interferência de VRAM durante scroll rápido). | Experiência autêntica de PC XT de 1983. |
| **`cga_comp`** | **CGA Composite NTSC** | `80×25` / `320×200` | `8×8` | `640×200` | `Px437_IBM_CGA_8x8` | Simulação de saída RCA ligada em TV NTSC: *color bleed* horizontal e cores de artefato. No Photo Grabber, habilita as paletas clássicas de 4 cores (`Cyan/Magenta/White` e `Green/Red/Yellow`). | Galeria ANSI, Photo Grabber e estética de monitor composto. |
| **`ega80x43`** | **IBM EGA 43-Line (1984)** | `80×43` | `8×8` | `640×350` | `Px437_IBM_EGA_8x8` | 16 cores simultâneas escolhidas de uma paleta EGA de 64 cores (`6-bit RGB`). Alta densidade vertical para a época. | Listagens longas de `FILES.BBS`, diretórios do GitHub e feeds RSS sem precisar rolar a página. |
| **`vga80x25`** | **IBM VGA Classic (1987)** | `80×25` | `9×16` | `720×400` | `Px437_IBM_VGA_9x16` | 16 cores DAC 18-bit (padrão atual). Correção da coluna 9 (repetição do 8º bit apenas nos caracteres de box-drawing `0xC0–0xDF`). | **Padrão oficial da BBS** para máxima compatibilidade com artes ANSI 80×25. |
| **`vga80x50`** | **IBM VGA 50-Line (1987)** | `80×50` | `9×8` | `720×400` | `Px437_IBM_VGA_9x8` | Dobra a capacidade vertical mantendo a largura de 80 colunas. | Visualização de artes ANSI altas, logs de sistema e Today Hub expandido. |
| **`vga_13h`** | **VGA Mode 13h (Gráfico)** | `40×25` texto + canvas `320×200` | `8×8` / pixel | `320×200` | `Px437_IBM_VGA_8x8` | Paleta de **256 cores** (VGA 256). Permite renderizar imagens bitmap reais com dithering Atkinson/Floyd-Steinberg em vez de apenas blocos de texto. | **Photo Grabber 256-Color**, capas de projetos e demos gráficos (efeito fogo/plasma). |
| **`svga132x37`**| **SVGA VESA Wide (1991)** | `132×37` (ou `132×43`) | `8×16` | `1056×592` | `Px437_IBM_VGA_8x16` | **Widescreen 16:9 Nativo em Células!** Em vez de esticar 80 colunas para os lados, entrega 132 colunas reais sem distorcer a fonte. | **Uso em monitores 16:9 atuais**: tabelas financeiras, leitura de código/READMEs no GitHub Vault e painéis lado a lado. |
| **`modern_hd`**| **Modern OLED Terminal** | `120×36` (ou auto-fit) | Vetorial / HiDPI | Nativa (`devicePixelRatio`) | `JetBrains Mono` / `IBM Plex Mono` (com fallback CP437) | **Truecolor 24-bit** (`SGR 38;2;R;G;B`), zero scanlines, zero curvatura, contraste nítido, seleção de texto nativa e clique direto em links. | **Modo Produtividade Diária**: para quando o usuário quiser usar a BBS como dashboard de trabalho sem fadiga visual. |

### 3.2. Detalhes de Imersão na Troca de Vídeo

- **Efeito Degauss (Desmagnetização):** Ao alternar entre modos CRT ou pressionar um botão dedicado `[DEGAUSS]`, tocar o estalo grave característico de bobina desmagnetizadora (via Web Audio) acompanhado de uma breve ondulação cromática de 350ms no canvas.
- **POST de Vídeo no Boot:** A tela de BIOS/boot passa a exibir o hardware ativo, por exemplo:
  `VIDEO ADAPTER: IBM EGA 256K (640x350 · 80x43 TEXT MODE · 64-COLOR PALETTE)`
- **Layout Responsivo de Terminal (`ui.pad` / `ui.box`):** Criar helpers de desenho no código (`drawBox(width, height)`, `drawTable(cols)`) que consultam `term.cols` e `term.rows` dinamicamente. Em modos de 132 colunas, os menus e leitores de notícias podem exibir uma **barra lateral ao vivo** (ex.: lista de feeds nos primeiros 80 caracteres e painel de cotações/relógio nas 52 colunas restantes).

---

## 4. Navegação Realista de BBS (Imersão + Velocidade)

Para que a navegação pareça um terminal de telecomunicações real dos anos 90 — mas sem travar quem quer consultar uma informação rápida — propomos os seguintes mecanismos:

### 4.1. Phone Book (Agenda de Discagem) & Modo Comando Hayes (`AT`)
No início da sessão (ou ao desconectar com `[G]oodbye`), apresentar uma tela estilo **Telix / Telemate / Procomm Plus**:
- **Agenda Telefônica (`Alt+D`):** Lista de "nós" ou perfis temáticos da própria BBS que já abrem em configurações e portas específicas:
  1. `CYBER BBS MAIN NODE (28.8k v.34 · VGA 80×25 · Full Menu)`
  2. `WALL STREET WIRE (14.4k · SVGA 132×37 · Abre direto no Market & Crypto Hub)`
  3. `RETRO UNDERGROUND (2400 bps · CGA 40×25 · Abre em ANSI Gallery & Door Games)`
  4. `RESEARCH & ARCHIVE (ISDN 64k · MDA Green 80×25 · Abre em Wiki/Gutenberg/GitHub)`
  5. `CLEAN WORKSTATION (Local Direct · Modern OLED 120×36 · Sem modem, vai direto ao Today Hub)`
- **Console Hayes Manual:** Permitir que o usuário digite comandos de modem reais se desejar:
  - `ATDT 555-0199` (disca com tons DTMF reais correspondentes a cada dígito).
  - `ATM0` (desliga o som do alto-falante do modem) / `ATM1` (liga).
  - `ATS0=1` (auto-login).
  - Sequência de escape `+++` durante a sessão: suspende a tela atual para o modo de comando local do terminal (`OK`), onde o usuário pode digitar `ATO` para voltar à sessão online, `ATH` para desligar a linha ou `AT+MODE=EGA` para trocar a placa de vídeo sem sair da tela atual.

### 4.2. Command Chaining (Encadeamento de Comandos), Histórico e Autocomplete
Sistemas clássicos como *RemoteAccess*, *PCBoard* e *WWIV* permitiam que usuários experientes navegassem sem esperar o desenho dos menus intermediários:
- **Command Stacking com `;`:** Digitar `N;1;R` no prompt principal pula diretamente para **N**ews → Feed **1** → **R**efresh, suprimindo a animação ANSI do menu intermediário.
- **Histórico e Tab-Complete:** Setas `↑` / `↓` no prompt recuperam os últimos 20 comandos digitados; a tecla `Tab` completa nomes de portas, comandos ou cidades.
- **Deep Linking via Hash URL:** Sincronizar o estado com a URL do navegador (ex.: `#door=weather&city=Sao+Paulo&mode=ega80x43`) para que o usuário possa salvar favoritos no navegador que abrem a BBS direto na ferramenta desejada.

### 4.3. Buffer de Scrollback (`PgUp` / `PgDn`) e Pager Inteligente
- **Scrollback Buffer de 500 Linhas:** Tudo o que rola para fora do topo da tela é salvo em um anel de memória. Pressionar `PageUp` ou rolar a roda do mouse congela a linha de status com o aviso `=== SCROLLBACK (-42 LINES) · PRESS ESC TO RETURN ===`, permitindo reler relatórios longos.
- **Pager Clássico Aprimorado:** Ao exibir textos que ultrapassam `term.rows - 2` linhas, exibir o prompt clássico:
  `More (45%)? [Y]es, [N]o, [C]ontinuous, [/]Search, [S]ave to Disk:`
  A opção `[/]Search` destaca ocorrências do termo buscado em vídeo reverso diretamente no terminal.

### 4.4. Screen Grabber (`Alt+G`), Timeout "ARE YOU THERE?" e Attract Mode
- **Captura Instantânea (`Alt+G` ou comando `GRAB`):** Salva o conteúdo exato da tela atual em dois formatos à escolha:
  1. Arquivo `.ANS` autêntico com cabeçalho **SAUCE** preenchido automaticamente (data, dimensões do modo ativo, fonte CP437 correspondente).
  2. Imagem `.PNG` renderizada na resolução do canvas (com ou sem o efeito de curvatura CRT).
- **Monitor de Inatividade Realista:** Após 5 minutos sem teclas pressionadas, a última linha pisca `*** ARE YOU THERE? (60s remaining) ***` acompanhada de um *beep* curto (`0x07` BEL) a cada 15 segundos. Em vez de desconectar de forma frustrante, ao zerar o cronômetro a BBS entra em um **Attract Mode (Protetor de Tela CRT)** exibindo relógio em caracteres gigantes, manchetes em ticker e animação de fósforo até que qualquer tecla seja tocada.

---

## 5. Novas Portas (*Doors*) com Dados Reais, Atuais e Úteis

Todas as integrações abaixo foram selecionadas por possuírem **APIs públicas gratuitas, suporte nativo a CORS (`Access-Control-Allow-Origin: *`), zero necessidade de chaves de API** e excelente aderência ao formato textual/ANSI.

### 5.1. `MARKET WIRE` — Câmbio Oficial, Criptomoedas e Sparklines ASCII
Uma central financeira rápida, limpa e funcional para consulta diária.
- **Fontes de Dados (CORS nativo, sem chave):**
  - **Câmbio Fiduciário (BCE):** `https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL,EUR,GBP,JPY,ARS` e endpoint de série histórica (`/v1/2026-10-18..2026-11-18`) para gráfico dos últimos 30 dias.
  - **Câmbio Comercial Brasil (Tempo Real):** `https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL,BTC-BRL`
  - **Criptoativos:** CoinGecko Public API / Binance Public Ticker (`BTC`, `ETH`, `SOL`).
- **Funcionalidades na Porta:**
  - Tabela de cotações com variação percentual colorida (verde alta `▲`, vermelho queda `▼`).
  - **Gráficos Sparkline em CP437 / Unicode Block** (`▁▂▃▄▅▆▇█`) ou gráfico de barras ANSI mostrando a tendência de 7 e 30 dias do Dólar (`USD/BRL`) e do Bitcoin.
  - **Calculadora Rápida no Prompt:** Digitar `CONV 150 USD BRL` ou `CONV 5000 BRL EUR` converte valores instantaneamente usando a taxa oficial em cache.

### 5.2. `WEATHER STATION 2.0` — Meteorologia Completa e Qualidade do Ar
Evolução da porta de clima atual para uma estação meteorológica de linha de comando completa.
- **Fontes de Dados:**
  - **Open-Meteo Forecast API:** `https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max&timezone=auto`
  - **Open-Meteo Geocoding API:** Busca qualquer cidade do mundo por nome sem chave.
  - **Open-Meteo Air Quality API:** Índice de qualidade do ar (`PM2.5`, `PM10`, `AQI`).
- **Funcionalidades na Porta:**
  - Usa automaticamente a cidade do perfil do usuário e permite salvar até **5 cidades favoritas** (alternáveis com as teclas `1–5`).
  - **Gráfico Horário de 24h:** Mostra de 3 em 3 horas a curva de temperatura, a probabilidade de chuva (`%`) e o volume previsto em milímetros (`mm`).
  - **Previsão de 7 Dias:** Tabela compacta com ícone ANSI do tempo, mínima/máxima, índice UV máximo e acumulado de chuva.
  - **Painel Astronômico Local:** Horário exato do nascer/pôr do sol e fase atual da Lua calculada matematicamente offline (com desenho ANSI das 8 fases lunares).

### 5.3. `EARTH & SKY TELEMETRY` — Sismógrafo Global, Rastreamento da ISS e Clima Espacial
Uma porta com estética de centro de comando governamental dos anos 90, abastecida por telemetria científica em tempo real.
- **Fontes de Dados (CORS nativo):**
  - **Terremotos (USGS GeoJSON):** `https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson` (todos os sismos M4.5+ nas últimas 24h).
  - **Estação Espacial Internacional (ISS):** `https://api.wheretheiss.at/v1/satellites/25544` (latitude, longitude, altitude em km, velocidade em km/h e visibilidade solar).
  - **Clima Espacial (NOAA SWPC):** `https://services.swpc.noaa.gov/products/noaa-scales.json` (tempestades geomagnéticas, índice Kp e rádio blackout).
- **Funcionalidades na Porta:**
  - **Mapa-Múndi ASCII (`78×20` caracteres):** Renderiza os continentes em CP437 e plota em tempo real a posição atual da **ISS** (`[ISS]`), sua órbita recente (`···`) e o epicentro dos últimos terremotos (`*` piscando em vermelho/amarelo conforme a magnitude na escala Richter).
  - Lista detalhada com local, profundidade, magnitude e horário local de cada evento sísmico.

### 5.4. `CYBER RADIO (CHIPTUNE & SHORTWAVE TUNER)` — Áudio Real em Background
Transforma a BBS em uma companhia sonora enquanto o usuário trabalha ou lê notícias.
- **Fonte de Dados:**
  - **Radio Browser API** (`https://de1.api.radio-browser.info/json/stations/bytag/...`): Diretório comunitário aberto e sem chave com dezenas de milhares de rádios online via HTTPS stream.
- **Funcionalidades na Porta:**
  - Presets curados de estações: **Synthwave / Darksynth**, **Demoscene & Chiptune (Keygen/Amiga/C64)**, **Lo-Fi Coding Beats**, **Ambient Space (SomaFM)** e **Old Time Radio / Cyberpunk**.
  - **Continua tocando em segundo plano** (`<audio crossorigin="anonymous">`) mesmo quando o usuário sai da porta e navega pelo GitHub, lê notícias ou escreve no editor ANSI.
  - **Mini-Player & VU Meter na Barra de Status:** Conectado a um `AnalyserNode` da Web Audio API, exibe no topo do terminal o nome da estação e um medidor de espectro em tempo real usando blocos CP437 (`▐██▓▒░`). Comandos globais `RADIO OFF`, `RADIO +`, `RADIO -` funcionam de qualquer tela.

### 5.5. `WIKI TERMINAL & GUTENBERG LIBRARY` — Enciclopédia e Livros Reais em Modo Texto
Uma porta de pesquisa e leitura que formata o conhecimento da web para o conforto do monitor de fósforo.
- **Fontes de Dados (CORS nativo):**
  - **Wikipédia REST & Action API (PT e EN):**
    - Artigos e busca: `https://pt.wikipedia.org/api/rest_v1/page/summary/{termo}` e extração de seções em texto puro.
    - Efemérides ("Neste Dia na História"): `https://pt.wikipedia.org/api/rest_v1/feed/onthisday/events/{MM}/{DD}` (excelente também para alimentar o *Today Hub*!).
  - **Gutendex (Catálogo Project Gutenberg):** `https://gutendex.com/books/?search=...`
- **Funcionalidades na Porta:**
  - Busca instantânea em Português ou Inglês na Wikipédia, formatando o artigo com cabeçalhos ANSI, índice de seções navegável por números e paginação na largura ativa do terminal (`80` ou `132` colunas).
  - Integração com a **File Area (`FILES.BBS`)**: Permite buscar livros clássicos em domínio público e baixá-los como pacotes `.TXT` ou `.ZIP` acompanhados de um arquivo `FILE_ID.DIZ` gerado automaticamente (formatado em 45 colunas conforme a especificação histórica de BBS).

### 5.6. `NEWSWIRE 2.0 & SECURITY BULLETINS` — Notícias Locais, Tech BR e Alertas CVE
Expansão do leitor de notícias atual para suportar curadoria personalizada e fontes brasileiras.
- **Novos Feeds e APIs Nativas Recomendadas:**
  - **Hacker News (Firebase API oficial com CORS):** Usar `https://hacker-news.firebaseio.com/v0/topstories.json` diretamente em vez de depender de proxies RSS, garantindo 100% de disponibilidade e contagem real de pontos e comentários (com leitura da árvore de comentários dentro da própria BBS!).
  - **TabNews (Comunidade Tech Brasil):** API pública JSON/RSS (`https://www.tabnews.com.br/api/v1/contents`).
  - **Feeds Brasil & Mundo:** Agência Brasil, Manual do Usuário, Ars Technica, BBC Brasil.
  - **Boletins de Segurança Defensiva:** Feed do CISA Advisories / BleepingComputer, exibindo alertas de vulnerabilidades recentes e patches recomendados.
- **Funcionalidades na Porta:**
  - Gerenciador de feeds (`[A]dd Custom RSS`, `[T]oggle Feed`).
  - Marcação automática de itens lidos/não lidos e tecla `[B]ookmark` para enviar qualquer notícia para a pasta pessoal *Read Later*.

### 5.7. `OPEN SOURCE VAULT 2.0` — Watchlist do GitHub e Proteção de Rate-Limit
- **Melhorias sobre o GitHub Vault atual:**
  - **Watchlist Persistente:** Permitir favoritar repositórios (`[W]atch Repo`). Ao entrar no *Today Hub* ou no *Vault*, a BBS verifica se saiu uma **nova Release/Tag** desde a última visita e destaca `*** NEW RELEASE v2.4.0 ***`.
  - **Cache Condicional com `ETag`:** Armazenar o cabeçalho `ETag` retornado pela API do GitHub no `localStorage` / `IndexedDB` e enviar `If-None-Match` nas consultas seguintes. Respostas `304 Not Modified` **não consomem** a franquia de 60 requisições/hora da API pública sem autenticação.
  - Exibir no canto do terminal o medidor real: `GITHUB API QUOTA: 54/60 (RESETS IN 22m)`.

### 5.8. `CALLER ID & NET DIAGNOSTICS` — Telemetria da Própria Conexão
Uma ferramenta utilitária para desenvolvedores e entusiastas de rede, apresentada como diagnóstico da linha telefônica do nó.
- **Fontes de Dados:**
  - **IP, ASN e Geolocalização:** `https://ipwho.is/` (gratuito, HTTPS, CORS liberado, sem chave).
  - **Sonda de Latência HTTP:** Medição via `performance.now()` de requisições `HEAD` para endpoints globais (Cloudflare `1.1.1.1/cdn-cgi/trace`, GitHub API, Wikipedia, Open-Meteo).
- **Funcionalidades na Porta:**
  - Mostra o IP público do visitante, provedor/ASN, cidade/país estimados, fuso horário e status de conectividade de todas as APIs usadas pela BBS (**Painel de Saúde das Fontes**).
  - Gráfico de barras de latência em milissegundos simulando um teste de qualidade de linha telefônica.

---

## 6. Especificação Arquitetural para Implementação

Para manter o código limpo e fácil de evoluir sem quebrar a distribuição *single-file*:

### 6.1. Estrutura do `VideoModeManager` (`term.js`)

```javascript
const VIDEO_PROFILES = {
  mda80x25: {
    name: 'IBM MDA (1981) · 80x25 Monochrome',
    cols: 80, rows: 25, cellW: 9, cellH: 14,
    fontFamily: 'Px437_IBM_MDA_9x14',
    aspectRatio: '4 / 3',
    paletteType: 'mono_green', // ou 'mono_amber'
    crtDefault: true,
    phosphorPersistence: 0.25,
    scanlines: 'fine'
  },
  cga40x25: {
    name: 'IBM CGA (1981) · 40x25 Big Type',
    cols: 40, rows: 25, cellW: 16, cellH: 16, // 8x8 dobrado com integer scaling
    fontFamily: 'Px437_IBM_CGA_8x8',
    aspectRatio: '4 / 3',
    paletteType: 'cga16_rgbi',
    crtDefault: true,
    cgaSnow: true,
    scanlines: 'coarse'
  },
  cga80x25: {
    name: 'IBM CGA (1981) · 80x25 Text',
    cols: 80, rows: 25, cellW: 8, cellH: 16, // pixel aspect 1:2 p/ 4:3
    fontFamily: 'Px437_IBM_CGA_8x8',
    aspectRatio: '4 / 3',
    paletteType: 'cga16_rgbi',
    crtDefault: true,
    cgaSnow: true,
    scanlines: 'coarse'
  },
  ega80x43: {
    name: 'IBM EGA (1984) · 80x43 High Density',
    cols: 80, rows: 43, cellW: 8, cellH: 8,
    fontFamily: 'Px437_IBM_EGA_8x8',
    aspectRatio: '4 / 3',
    paletteType: 'ega16',
    crtDefault: true,
    scanlines: 'medium'
  },
  vga80x25: {
    name: 'IBM VGA (1987) · 80x25 Standard',
    cols: 80, rows: 25, cellW: 9, cellH: 16,
    fontFamily: 'Px437_IBM_VGA_9x16',
    aspectRatio: '4 / 3',
    paletteType: 'vga16',
    crtDefault: true,
    scanlines: 'medium'
  },
  vga80x50: {
    name: 'IBM VGA (1987) · 80x50 Compact',
    cols: 80, rows: 50, cellW: 9, cellH: 8,
    fontFamily: 'Px437_IBM_VGA_9x8',
    aspectRatio: '4 / 3',
    paletteType: 'vga16',
    crtDefault: true,
    scanlines: 'fine'
  },
  svga132x37: {
    name: 'VESA SVGA (1991) · 132x37 Widescreen',
    cols: 132, rows: 37, cellW: 8, cellH: 16,
    fontFamily: 'Px437_IBM_VGA_8x16',
    aspectRatio: '16 / 9',
    paletteType: 'vga16',
    crtDefault: true,
    scanlines: 'fine'
  },
  modern_hd: {
    name: 'Modern OLED (2026) · 120x36 Clean HiDPI',
    cols: 120, rows: 36, cellW: 10, cellH: 20,
    fontFamily: 'Px437_IBM_VGA_8x16, monospace',
    aspectRatio: '16 / 9',
    paletteType: 'truecolor_oled',
    crtDefault: false,
    scanlines: 'none'
  }
};
```

### 6.2. Contrato Padronizado de Dados (`net.js`)

Todo provedor de dados (`fetchRss`, `fetchWeather`, `fetchMarkets`, `fetchEarthSky`, `fetchGitHub`) deve retornar um envelope uniforme para que a interface nunca exiba informação ambígua:

```javascript
{
  status: 'LIVE' | 'CACHED' | 'STALE' | 'OFFLINE' | 'DEMO',
  sourceName: 'Open-Meteo API',
  sourceUrl: 'https://open-meteo.com',
  fetchedAt: 1763481600000,   // timestamp da coleta
  publishedAt: 1763478000000, // timestamp real do dado na origem (ou null)
  ttlMs: 600000,
  quotaRemaining: null,       // preenchido no GitHub API
  data: { ... }
}
```

Um componente visual único `renderSourceBadge(envelope)` desenha no topo direito de cada porta:
- `[● LIVE · Open-Meteo · 14:05]` (verde)
- `[◐ CACHED 6m · Frankfurter ECB]` (amarelo)
- `[○ STALE 2h · Hacker News]` (âmbar)
- `[× OFFLINE · Demo Data]` (magenta)

---

## 7. Roadmap de Implementação Faseado

### Fase 1 — Fundação, Confiabilidade e Performance (P0)
- [ ] Implementar o envelope padronizado de status (`LIVE`, `CACHED`, `STALE`, `OFFLINE`, `DEMO`) e o componente visual de badge de origem em todas as portas.
- [ ] Corrigir o bug da cidade fixa no clima (usar `profile.city`), as datas ausentes no RSS e o fallback de licença + `iiurlwidth` no Wikimedia Commons.
- [ ] Otimizar o `term.js` com **Glyph Atlas** e **Dirty Cells** + completar `CSI K`, iCE Colors e leitor SAUCE no `ansi.js`.
- [ ] Unificar os 17 doors entre os arquivos modulares (`js/`) e o script `tools/bundle.mjs`.

### Fase 2 — Video Mode Manager (MDA, CGA, EGA, VGA, SVGA & Modern OLED)
- [ ] Refatorar `term.js` para suportar redimensionamento dinâmico de `cols`, `rows`, `cellW`, `cellH` e troca de paleta em tempo real (`setVideoProfile(profileId)`).
- [ ] Embutir as fontes adicionais leves do pacote int10h (`Px437_IBM_CGA_8x8` e `Px437_IBM_MDA_9x14`, ~25 KB cada em WOFF2/Base64).
- [ ] Adaptar os helpers de layout (`box`, `divider`, `columns`) para respeitar `term.cols` (`40`, `80`, `120`, `132`) e `term.rows` (`25`, `36`, `37`, `43`, `50`).
- [ ] Adicionar o menu interativo de hardware de vídeo, atalho de teclado `Alt+V`, comando global `MODE` e efeito audiovisual de *Degauss*.

### Fase 3 — Navegação Realista de BBS
- [ ] Criar a tela de **Phone Book / Discador** com presets de nós e suporte opcional a comandos Hayes (`ATDT`, `+++`, `ATH`).
- [ ] Implementar **Command Chaining** com `;` (ex.: `M;USD;30D`), histórico de comandos (`↑`/`↓`), `Tab` autocomplete e deep-links via `location.hash`.
- [ ] Adicionar **Scrollback Buffer** (`PgUp`/`PgDn`), busca `/` dentro do Pager e captura de tela `GRAB` (`.ANS` com SAUCE + `.PNG`).

### Fase 4 — Novos Doors de Dados Atuais e Úteis
- [ ] **`MARKET WIRE`**: Câmbio `USD/BRL`, `EUR/BRL` (Frankfurter + AwesomeAPI) e Crypto com sparklines em blocos CP437 e conversor rápido.
- [ ] **`WEATHER STATION 2.0`**: Previsão horária de 24h, chuva em mm/%, 7 dias, qualidade do ar e fases da Lua.
- [ ] **`NEWSWIRE 2.0`**: Integração direta com a API Firebase do Hacker News (com leitor de comentários), feeds brasileiros (TabNews, Agência Brasil, Manual do Usuário) e boletins de segurança.
- [ ] **`EARTH & SKY TELEMETRY`**: Mapa-múndi ASCII com rastreamento ao vivo da ISS (`wheretheiss.at`) e terremotos recentes (USGS).
- [ ] **`CYBER RADIO`**: Sintonizador de rádios Synthwave/Chiptune/Lo-Fi via Radio Browser API com player em background e VU meter ANSI na barra de status.
- [ ] **`WIKI TERMINAL & GUTENBERG`**: Pesquisa e leitura de artigos da Wikipédia + download de clássicos `.TXT` do Project Gutenberg para a File Area com `FILE_ID.DIZ`.

---

## 8. Critérios de Aceitação e Comando `SELFTEST`

Para validar todas as melhorias de maneira automatizada dentro do próprio navegador, recomenda-se implementar o comando oculto `SELFTEST` no prompt principal, que executa:
1. **Teste de Modos de Vídeo:** Alterna programaticamente por `mda80x25`, `cga40x25`, `cga80x25`, `ega80x43`, `vga80x25`, `vga80x50`, `svga132x37` e `modern_hd`, verificando o alinhamento do canvas, o recálculo de hit-regions de mouse e a ausência de overflow de texto.
2. **Teste de Parser ANSI & CP437:** Renderiza uma matriz de validação contendo as 16 cores de frente, 16 cores de fundo (iCE Colors), caracteres de caixa simples/dupla e sequências `CSI K` / `CSI H`.
3. **Auditoria de Conectores de Rede:** Executa um *ping* assíncrono em cada API configurada, validando o contrato do envelope (`LIVE`/`CACHED`/`STALE`/`OFFLINE`) e exibindo a tabela de latência e saúde das fontes.