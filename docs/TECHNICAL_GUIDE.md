# Guia técnico — Checktask Explorer

[Voltar à apresentação](../README.md)

Os caminhos de código e comandos abaixo partem da raiz do repositório. Esta referência descreve desenvolvimento e manutenção; não confirma por si só a configuração do ambiente publicado.

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
