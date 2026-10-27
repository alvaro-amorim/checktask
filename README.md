# Checktask Explorer

Organizador de tarefas em árvore, com persistência local e versão desktop para Windows.

[Guia técnico e empacotamento](docs/TECHNICAL_GUIDE.md)

## Visão geral

O Checktask organiza seções e tarefas como pastas e arquivos. A hierarquia permite dividir um trabalho em partes menores, mantendo edição, ordenação e navegação no mesmo workspace.

O fluxo principal funciona sem conta ou serviço de nuvem.

## Funcionalidades

- Seções aninhadas e tarefas em uma árvore hierárquica.
- Edição e reordenação por arrastar e soltar dentro do mesmo grupo.
- Persistência no navegador com IndexedDB.
- Importação e exportação de workspace em JSON.
- Normalização de IDs ausentes ou duplicados na importação.
- Instalação como PWA e empacotamento desktop com Tauri.

## Decisões técnicas

| Decisão | Objetivo |
|---|---|
| Nós normalizados por `parentId` e `order` | Atualizar a estrutura sem regravar toda a árvore a cada operação. |
| Dexie e IndexedDB | Persistir o workspace no dispositivo. |
| JSON versionado | Permitir cópias portáteis e restauração manual. |
| Casca desktop com Tauri | Reutilizar a interface web em um aplicativo Windows. |

**Stack:** Next.js, React, TypeScript, Zustand, Dexie, dnd-kit, Tailwind CSS e Tauri.

## Executar localmente

Com Node.js e npm instalados:

~~~bash
npm ci
npm run dev
~~~

Acesse `http://localhost:3000`.

Para usar o build web:

~~~bash
npm run lint
npm run build
npm run start
~~~

Para gerar o instalador Windows, com a toolchain desktop configurada:

~~~bash
npm run desktop:build
~~~

Os detalhes do empacotamento e o caminho do instalador estão no [guia técnico](docs/TECHNICAL_GUIDE.md).

## Como avaliar

Use um workspace descartável:

1. Crie seções aninhadas, tarefas e alterações de ordem.
2. Recarregue a página e confira a persistência.
3. Exporte JSON e reimporte em um perfil de teste.
4. Confira a hierarquia, os IDs duplicados e a rejeição de JSON inválido.

## Estado e limites

Aplicação local-first com scripts de lint e build. O pacote atual não possui suíte automatizada de testes. Os passos acima descrevem uma avaliação manual e não equivalem a cobertura automatizada.

A recuperação entre dispositivos depende de exportação/importação; não há sincronização com nuvem no fluxo principal.

## Documentação

[Persistência, formato JSON, estrutura do código e desktop Windows](docs/TECHNICAL_GUIDE.md).
