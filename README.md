# Checktask Explorer

## Status e avaliação

Ferramenta local-first de portfólio, executável no navegador e empacotável para Windows. Não depende de conta ou sincronização com nuvem para o fluxo principal.

**Decisões:** nós normalizados por `parentId`/`order` em IndexedDB; JSON como formato portátil de exportação e importação.

Os scripts atuais oferecem lint e build; não há script de suíte automatizada de testes. Para uma avaliação manual, use um workspace descartável:

1. Crie seções aninhadas e tarefas; edite e reordene os itens.
2. Recarregue a aplicação e confira a persistência.
3. Exporte JSON e reimporte em um perfil de navegador de teste.
4. Confira a preservação da hierarquia e a normalização de IDs duplicados.
5. Verifique o tratamento de JSON inválido, sem usar dados pessoais.

Esses são cenários de avaliação, não uma declaração de que foram todos reexecutados nesta revisão de documentação.

Mini app local-first de organizacao visual de tarefas inspirado em pastas e arquivos. A interface trabalha com uma arvore hierarquica de secoes e tarefas, com persistencia real no navegador, importacao/exportacao JSON, drag and drop dentro do mesmo grupo e empacotamento como app desktop Windows.

## Como rodar

Desenvolvimento:

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Uso local no navegador:

```bash
npm run lint
npm run build
npm run start
```

Depois abra `http://localhost:3000` no Chrome ou Chromium e use o botao `Instalar app` quando ele aparecer.

## App desktop Windows

Para gerar o instalador desktop:

```bash
npm run desktop:build
```

O instalador e salvo em:

```text
src-tauri/target/release/bundle/nsis/Checktask Explorer_0.1.0_x64-setup.exe
```

Depois de executar esse instalador, o app passa a poder ser aberto como aplicativo normal do Windows, sem terminal.

## Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS
- shadcn/ui como base de componentes locais
- Zustand para estado da UI
- Dexie + IndexedDB para persistencia local-first
- dnd-kit para drag and drop
- Sonner para feedbacks de acao
- Tauri 2 para empacotamento desktop
- PWA leve com manifest e service worker proprio

## Estrutura principal

```text
src/
  app/                         layout, manifest, icones e rotas do app
  components/                  registro PWA e botao de instalacao
  components/ui/               componentes shadcn locais
  data/seed-workspace.ts       estrutura inicial de demonstracao
  features/workspace/          store e componentes do produto
  services/workspace-db.ts     persistencia local via IndexedDB
  services/workspace-json.ts   importacao/exportacao e normalizacao JSON
  types/workspace.ts           tipos da arvore e dos nos normalizados
  utils/tree-utils.ts          operacoes puras sobre secoes e tarefas
public/
  icons/                       icones do PWA
  sw.js                        service worker do modo instalavel
scripts/                       automacao do build desktop
src-tauri/                     casca nativa do app desktop
```

## Persistencia e JSON

O workspace agora e salvo em `IndexedDB`, no banco `checktask-local-workspace`, com nos normalizados por `parentId` e `order`. Isso reduz o peso de regravar a arvore inteira a cada alteracao e deixa a base pronta para crescer depois.

Na primeira abertura da nova versao, o app tenta migrar automaticamente dados legados do `localStorage`.

O JSON exportado segue o formato:

```json
{
  "version": 1,
  "exportedAt": "2026-04-12T00:00:00.000Z",
  "sections": []
}
```

Cada secao pode conter `children` com outras secoes ou tarefas. IDs ausentes ou duplicados no JSON importado sao normalizados automaticamente.
