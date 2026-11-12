> **Nota para a próxima sessão:** leia a seção [Como retomar](#como-retomar). O estado atual está em [Status](#status-atual).

# Varredura Mogi

Verificador **sob demanda** de concursos públicos e processos seletivos abertos em **Mogi Mirim / SP**.

Aperta um botão, o app consulta as fontes oficiais e responde em linguagem simples:

- **SIM** — existe inscrição aberta agora.
- **NÃO** — todas as fontes responderam e nenhuma inscrição está aberta.
- **INDETERMINADO** — nada foi encontrado, mas alguma fonte falhou; o app **nunca** chuta "NÃO" nesse caso.

Não é um vigia 24/7 nem um sistema de alertas. É entrada e saída: você abre, varre, fecha.

---

## Instalar e usar

Baixe em **[Releases](https://github.com/Hyawa/varredura-mogi/releases/latest)**:

| Plataforma | Arquivo | Como usar |
|---|---|---|
| Windows (instalador) | `Varredura-Mogi-<versão>-x64-setup.exe` | instala com atalho no menu Iniciar e na área de trabalho |
| Windows (portátil) | `Varredura-Mogi-<versão>-portable.exe` | executa direto, sem instalar |
| Android | `Varredura-Mogi-<versão>-android.apk` | copie para o aparelho e instale (permita “instalar de fontes desconhecidas”) |

Os `.exe` e o APK **não são assinados**: o Windows/SmartScreen e o Android vão avisar
“aplicativo não reconhecido”/“fonte desconhecida”. É esperado — o código é aberto e você
pode compilar do zero com as instruções abaixo.

### Nenhum segredo, nenhum `.env`

O app não tem backend, login nem chaves de API: toda a rede são requisições públicas às
páginas das fontes, feitas do seu próprio aparelho. O histórico fica no `localStorage` e
nada é enviado a servidor. Por isso o repositório não usa `.env` — e o `.gitignore` bloqueia
`.env`, `.env.*`, certificados e keystores para que nada disso suba por engano.

---

## Status atual

- Núcleo, 6 fontes automáticas, CLI, testes e dashboard prontos.
- `npx tsc --noEmit` limpo.
- **38 testes passando** (`npm test`).
- Varredura real de 11/11/2026: **NÃO**, com **6/6 fontes ok**, 8 processos recentes encerrados, 0 abertos, ~1,8 s.
- Build web (`npm run build`) concluído.
- **Smoke test do Electron aprovado** (`npm run smoke:electron`, exit 0):
  `{"bridge":true,"ipc":{"status":200,"bytes":69228},"veredito":"NÃO","duracaoMs":3386,"errosConsole":[]}`
  — ponte IPC viva, busca real pela Prefeitura (TLS ok) e varredura das 6 fontes terminando no painel.
- **Android pronto:** projeto gerado (`npx cap add android`), `BUILD SUCCESSFUL` e
  `android/app/build/outputs/apk/debug/app-debug.apk` com **5,48 MB**
  (`package br.com.varreduramogi.app`, `minSdk 24`, `targetSdk 36`).
- **Windows empacotado:** `npm run dist:win` gera em `release/` o instalador NSIS
  (123 MB), o portátil (111 MB) e `win-unpacked/`; o `.exe` empacotado abre e roda a
  varredura.
- **Identidade visual:** `public/logo.svg` (radar do painel de veredito) no cabeçalho do app,
  como favicon e como ícone do executável/instalador (`npm run icone`).

Todas as pendências de v1 foram fechadas. O que resta é só o backlog opcional de [v2](#como-retomar).

---

## Stack

| Camada | Tecnologia |
|---|---|
| UI | React 19 + TypeScript |
| Estilo | Tailwind CSS 4 + CSS próprio (`src/ui/estilos.css`) |
| Build | Vite 8 |
| Testes | Vitest 5 |
| Desktop | Electron 45 |
| Empacotamento | electron-builder 26 (NSIS + portátil) |
| Android | Capacitor 8 + `CapacitorHttp` |
| Parsing | `node-html-parser` |
| Ícones | `lucide-react` |
| Fontes | Fira Sans / Fira Code (`@fontsource`) |

---

## Arquitetura

O núcleo é **TypeScript puro** e não sabe onde está rodando. Toda rede passa por um `Fetcher` injetado:

```ts
type Fetcher = (url: string, opcoes?: OpcoesRequisicao) => Promise<RespostaBruta>;
```

```
src/
├── core/                 # núcleo puro, sem DOM/rede própria
│   ├── types.ts          # Item, Varredura, FonteAutomatica, Veredito…
│   ├── fetcher.ts        # charset, decodificação, ErroHttp, baixarTexto
│   ├── datas.ts          # datas pt-BR, intervalo de inscrição, situação
│   ├── texto.ts          # normalização, hash, número/ano, vagas
│   ├── dedupe.ts         # agrupamento entre fontes
│   ├── veredito.ts       # regra SIM / NÃO / INDETERMINADO
│   ├── scan.ts           # orquestração, timeout, relevância, totais
│   └── sources/          # um parser por fonte + comum.ts + index.ts
├── fetchers/
│   ├── node-fetch.ts     # Node/Electron + CAs do sistema
│   ├── capacitor-http.ts # Android (nativo, sem CORS)
│   ├── dev-proxy.ts      # navegador via /__fetch
│   └── index.ts          # escolhe o transporte por plataforma
├── ui/                   # React: App, componentes, histórico, estilos
├── cli.ts                # terminal
electron/
├── main.ts               # janela + IPC varredura:fetch
└── preload.ts            # contextBridge → window.varredura.fetch
scripts/
├── build-node.mjs        # esbuild do CLI/Electron
├── dev-desktop.mjs       # Vite + Electron juntos (HMR no desktop)
├── smoke-electron.mjs    # smoke test E2E do Electron (ponte + varredura)
├── gerar-icone.mjs       # public/logo.svg → recursos/icon.png (rasteriza no Electron)
└── fetch-fixtures.mjs    # baixa HTML real para tests/fixtures
public/
└── logo.svg              # logo (fonte da verdade), usada no app e no instalador
recursos/
└── icon.png              # 1024×1024 gerado de logo.svg; vira .ico no build
electron-builder.yml      # empacotamento Windows (release/)
android/                  # projeto nativo gerado pelo Capacitor (não editar à mão)
tests/
├── fixtures/             # snapshots reais das fontes
├── helpers.ts            # fetcher de fixtures + rotas CEMMIL
└── *.test.ts
```

Fluxo de uma varredura:

```
UI/CLI → criarFetcher() → executarVarredura()
       → fontes em paralelo (timeout individual)
       → baixarTexto() → parser → Item[]
       → filtro de relevância → deduplicar() → decidirVeredito()
       → UI + histórico local
```

### Transporte por plataforma

`src/fetchers/index.ts` escolhe nesta ordem:

1. `window.varredura.fetch` — ponte IPC do Electron (sem CORS, com CAs do sistema).
2. `Capacitor.isNativePlatform()` — `CapacitorHttp` no Android.
3. `/__fetch` — proxy do Vite, para `npm run dev` no navegador.

---

## Fontes

| ID | Fonte | Como lê | Limitação |
|---|---|---|---|
| `prefeitura` | Prefeitura de Mogi Mirim | Categorias 1 (concurso), 2 (processo seletivo) e 3 (simplificado) de `/contratacao`; datas e resumo (“inscrições até…”) no próprio card | Não lê PDFs do `/jornal` (OCR fica para v2). Categoria 4 (estagiários) é ignorada de propósito |
| `ibam` | IBAM-SP (banca) | `li.item` com janela “Inscrições de X a Y”; é a fonte mais confiável para datas | Página em ISO-8859-1; depende da banca manter o HTML |
| `saae` | SAAE Mogi Mirim | Lista + página de detalhe (até 4 recentes); detecta “Inscrições Abertas/Encerradas” e documentos de fases posteriores (gabarito, convocação, resultado final) | A lista não informa o fim das inscrições; sem detalhe, a situação pode ficar `desconhecido` |
| `sigmarh` | SigmaRH / CEMMIL | Busca “Mogi Mirim” e lê o botão de status no detalhe (anos ≥ atual−1) | Processos antigos são marcados como encerrados sem abrir o detalhe |
| `cemmil` | CEMMIL (consórcio) | WordPress REST `processos-seletivos` filtrado pela taxonomia `ps_municipios` (Mogi Mirim = 20); status lido no permalink | Paginação visual é JS; o status só existe na página de cada processo |
| `pci` | PCI Concursos | Agregador nacional; `#concursos div.ea`, data final em `.ce span` | Itens apontam para notícias/resumos do PCI; é fonte de apoio, não oficial |
| `con8` | Con8 / CIS 8 de Abril | **Manual** — apenas link | O POST de consulta cai em desafio Cloudflare; não entra no veredito |

### Regra do veredito

```ts
abertos.length > 0  → SIM
senão falhas > 0    → INDETERMINADO
senão               → NÃO
```

Situações possíveis de um item:

| Situação | Significado | Conta como aberto? |
|---|---|---|
| `aberto` | Inscrições comprovadamente abertas hoje | Sim |
| `futuro` | Janela divulgada, mas começa depois de hoje | Não |
| `andamento` | Processo em curso, inscrições não confirmadas | Não |
| `encerrado` | Inscrições encerradas / homologado / fase de resultados | Não |
| `desconhecido` | Fonte sem datas suficientes | Não |

### Filtro de relevância

Para não arrastar histórico eterno:

- `aberto`, `futuro` e `andamento` sempre entram.
- `encerrado` só entra se `inscricaoFim` ≤ 150 dias atrás ou `publicacao` ≤ 400 dias.
- `desconhecido` sem data só entra se a fonte informou um `statusTexto`.

### Deduplicação

Chave forte: `tipo | número | ano | edital` (ex.: `concurso publico|2|2026|2`).
Sem número/ano, cai para `tipo | título normalizado`.
A versão vencedora é a que tem mais dados úteis (datas > vagas > link > resumo), e as demais fontes viram `tambemEm`.

---

## Comandos

```bash
npm install

# Desenvolvimento no navegador (proxy /__fetch, porta 5199)
npm run dev

# Desenvolvimento no app desktop: Vite (HMR) + Electron, ponte IPC ativa
npm run dev:desktop

# Testes (usam apenas fixtures locais, sem rede)
npm test
npm run test:watch

# Varredura no terminal
npm run scan
npm run scan -- --json
npm run scan -- --fontes
npm run scan -- --resumo

# Typecheck + build web (dist/)
npm run build

# Instaladores Windows em release/ (NSIS + portátil + win-unpacked)
npm run dist:win
npm run dist:win:dir      # só release/win-unpacked (rápido, sem instalador)

# Regenera recursos/icon.png a partir de public/logo.svg
npm run icone

# Compila CLI e Electron (build/)
npm run build:node

# Electron (usa dist/; rode npm run build antes)
npm run electron
npm run electron:dev      # build + build:node + electron

# Smoke test E2E do Electron (exit 0 = ponte IPC + varredura ok)
npm run smoke:electron

# Atualiza os HTMLs reais de tests/fixtures
npm run fixtures

# Android (depois de npx cap add android)
npm run cap:sync
npm run cap:open
npm run cap:run

# APK de debug (Windows; requer JAVA_HOME e ANDROID_HOME)
npm run cap:sync
cd android
.\gradlew.bat assembleDebug
```

---

## Testes

Os testes não tocam a rede: `tests/helpers.ts` serve os HTMLs reais de `tests/fixtures/` por um `Fetcher` falso.

- `datas.test.ts` — parsing de datas, intervalos, aritmética.
- `parsers.test.ts` — cada fonte contra seu snapshot real.
- `veredito.test.ts` — a regra e a garantia de nunca dizer “NÃO” com falha.
- `scan.test.ts` — orquestração, timeout, dedupe e progresso.

Fora do Vitest, `npm run smoke:electron` é o teste de integração do app real: sobe o Electron
com janela oculta, confirma `window.varredura.fetch`, busca uma página de verdade pela ponte IPC
e espera o veredito aparecer no painel. Ele termina sozinho e imprime uma única linha JSON.

Quando um site muda de layout, o teste quebra antes do app. Para atualizar os snapshots:

```bash
npm run fixtures
npm test
```

---

## Notas de operação

### TLS da Prefeitura

`https://www.mogimirim.sp.gov.br` serve cadeia TLS incompleta. O Node falha com `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. `src/fetchers/node-fetch.ts` resolve isso copiando as CAs do sistema com `tls.getCACertificates("system")` + `setDefaultCACertificates` (Node 24+). Os scripts `scan` e `fixtures` também rodam com `--use-system-ca`, por segurança.

### Encoding

IBAM e SigmaRH são ISO-8859-1/windows-1252. Nunca leia como UTF-8 direto: use `baixarTexto`, que descobre o charset pelo header/meta e decodifica.

### Base do Vite e o Electron em branco

`vite.config.ts` usa `base: "./"` no build e `"/"` no dev. Motivo: o Electron carrega
`dist/index.html` por `file://`, e com base absoluta o Chromium procurava
`file:///assets/...` na raiz do disco — a janela abria em branco, sem erro visível.
No dev e no Capacitor (`https://localhost`) o caminho absoluto continua valendo.
Se algum dia a janela do Electron abrir vazia, comece olhando o `base` e os caminhos
em `dist/index.html`.

### Electron 45 e `app.whenReady()`

Um `await app.whenReady()` no nível do módulo de entrada trava: o evento `ready` só
dispara depois que o módulo termina de avaliar. `scripts/smoke-electron.mjs` roda o
fluxo dentro de uma IIFE por isso (e tem watchdog de 180 s).

### Histórico

Fica só no `localStorage` do aparelho (`varredura-mogi:historico:v1`). Serve para “novos desde a última varredura” e o sparkline. Nada é enviado a servidor.

### Aviso ao editar arquivos no Windows

Não use `Get-Content -Raw` + `Set-Content -Encoding utf8` para reescrever fontes: isso já corrompeu acentos em `src/core/sources/*.ts` (U+FFFD, `À` virou `ì`, BOM). Use as ferramentas `edit`/`write` do OpenCode. Se voltar a ver `�` ou `ǜ` no código, o culpado é esse tipo de reescrita.

---

## Empacotamento (Windows)

`npm run build` **não** gera instalador: ele só roda `tsc --noEmit && vite build` e para em
`dist/` (o bundle web). O app de desktop vira executável por outro caminho, com
`electron-builder` (`electron-builder.yml`):

```bash
npm run dist:win       # instalador + portátil + pasta descompactada
npm run dist:win:dir   # só a pasta descompactada (bem mais rápido)
```

Saída em `release/`:

| Arquivo | O que é | Tamanho |
|---|---|---|
| `Varredura-Mogi-0.1.0-x64-setup.exe` | instalador NSIS (cria atalhos, permite escolher pasta) | ~123 MB |
| `Varredura-Mogi-0.1.0-portable.exe` | executável único, sem instalar | ~111 MB |
| `win-unpacked/Varredura Mogi.exe` | versão “portátil em pasta”; rode direto daqui | ~238 MB (com o runtime do Electron) |

O `package.json` precisa de `"main": "build/main.mjs"` — é o que o empacotador usa como
entrada. Como `build/*.mjs` já sai empacotado do esbuild, o app **não** leva `node_modules`
para dentro do `app.asar` (só `build/` e `dist/`), o que mantém o payload pequeno.

**Ícone.** `public/logo.svg` é a fonte da verdade da identidade. `npm run icone` rasteriza
o SVG num `recursos/icon.png` 1024×1024 usando o próprio Electron (janela oculta +
`capturePage`), e o `electron-builder.yml` aponta `win.icon` para esse PNG — ele gera o
`.ico` do executável e do instalador. Sem isso o build cai no ícone genérico do Electron.

**Sem assinatura.** Não há certificado configurado, então os `.exe` saem sem assinatura e o
Windows/SmartScreen vai avisar “aplicativo não reconhecido”. Para distribuir de verdade é
preciso um certificado de assinatura de código (`win.certificateFile` + senha).

---

## Android

Projeto já gerado em `android/` (Capacitor 8, `minSdk 24`, `targetSdk 36`, `compileSdk 36`).
Não edite `android/` à mão: ele é regenerado por `npx cap sync android`.

```bash
npm run cap:sync      # build web + copia dist/ para android/app/src/main/assets/public
npm run cap:open      # abre no Android Studio
npm run cap:run       # build + instala em aparelho/emulador conectado
```

APK de debug (sideload; não precisa de Mac nem de Play Store):

```powershell
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"   # JDK 21, não o java 8 do PATH
npm run cap:sync
cd android
.\gradlew.bat assembleDebug --no-daemon
```

Resultado em `android/app/build/outputs/apk/debug/app-debug.apk` (~5,5 MB).
Para instalar: `adb install -r android\app\build\outputs\apk\debug\app-debug.apk`.

O WebView não pode buscar os sites por CORS, por isso o app usa `CapacitorHttp`
(`responseType: "arraybuffer"`), preservando os bytes para a decodificação de charset
do núcleo. **Ele é plugin embutido do core do Capacitor 8**, habilitado por
`capacitor.config.ts`; portanto não aparece em `npx cap ls` nem em
`capacitor.plugins.json` — a prova de que está ativo é o
`android/app/src/main/assets/capacitor.config.json` gerado pelo sync.

---

## Configuração de orquestração

`opencode.jsonc` na raiz define o líder `orchestrator-free` (DeepSeek V4.1 Flash Free) e os workers free `free-scout`, `free-coder`, `free-reviewer` e `free-longctx`, além de bloquear provedores pagos. Config é lida na inicialização: só vale em sessões novas.

| Agente | Modelo |
|---|---|
| `orchestrator-free` | `opencode/deepseek-v4.1-flash-free` |
| `free-scout` | `opencode/minimax-m3.1-flash-free` |
| `free-coder` | `opencode/mimo-v2.6-flash-free` |
| `free-reviewer` | `opencode/nemotron-3.5-super-vl-free` |
| `free-longctx` | `opencode/longcat-2.5-free` |

O catálogo free muda sem aviso: `step-5-preview-free` e `glm-5.3-flash-free` saíram e foram
substituídos aqui. Se um worker falhar com `Model unavailable`, rode
`--catalog` no script abaixo e troque o modelo por outro sem preço.

Validado com:

```bash
python "C:\Users\Desktop\.agents\skills\free-orchestrate\scripts\check-free-models.py" opencode.jsonc
```

---

## Como retomar

1. `npm test` — confirme os 38 testes.
2. `npm run scan` — confirme 6/6 fontes e o veredito do dia.
3. `npm run smoke:electron` — confirme `bridge: true`, `ipc.status: 200` e um veredito válido.
4. Android: `npm run cap:sync` e depois `cd android; .\gradlew.bat assembleDebug`.
   Confirme o APK em `android/app/build/outputs/apk/debug/`.
5. Windows: `npm run dist:win` e confirme os três artefatos em `release/`.
6. Pendências opcionais de v2:
   - Ler PDFs do `/jornal` com OCR.
   - Automatizar o Con8 (hoje manual por causa do Cloudflare).
   - Mostrar `publicacao` nos cards do SAAE em vez de “sem data divulgada”.
   - Assinatura de release do APK (`keystore` + `assembleRelease`) e dos `.exe`
     (`win.certificateFile`) para distribuir sem “fonte desconhecida”.

Arquivos de apoio em `.scratch/` (ignorado pelo Git) contêm sondagens antigas dos sites; não são necessários para rodar o app.
