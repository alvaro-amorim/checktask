"use client";

import { useEffect, useMemo } from "react";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Database, FileJson, FolderPlus, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { InstallAppButton } from "@/components/install-app-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ImportExportDialog } from "@/features/workspace/components/import-export-dialog";
import { SectionFormDialog } from "@/features/workspace/components/section-form-dialog";
import { SectionNodeCard } from "@/features/workspace/components/section-node-card";
import { SortableNode } from "@/features/workspace/components/sortable-node";
import { useWorkspaceStore } from "@/features/workspace/workspace-store";
import type { SortableMeta } from "@/types/workspace";
import {
  getWorkspaceChildren,
  getWorkspaceSectionDeepCounts,
  isWorkspaceSection,
} from "@/utils/tree-utils";

function readSortableMeta(eventData: unknown): SortableMeta | null {
  if (
    eventData &&
    typeof eventData === "object" &&
    "containerId" in eventData &&
    "group" in eventData
  ) {
    return eventData as SortableMeta;
  }

  return null;
}

export function WorkspaceApp() {
  const desktopBuildLabel = "build 2026-04-14-04";
  const initialized = useWorkspaceStore((state) => state.initialized);
  const isLoading = useWorkspaceStore((state) => state.isLoading);
  const nodesById = useWorkspaceStore((state) => state.nodesById);
  const childrenByParent = useWorkspaceStore((state) => state.childrenByParent);
  const initializeWorkspace = useWorkspaceStore(
    (state) => state.initializeWorkspace,
  );
  const addRootSection = useWorkspaceStore((state) => state.addRootSection);
  const resetSeed = useWorkspaceStore((state) => state.resetSeed);
  const reorderNodes = useWorkspaceStore((state) => state.reorderNodes);

  const sections = useMemo(
    () =>
      getWorkspaceChildren(nodesById, childrenByParent, null).filter(
        isWorkspaceSection,
      ),
    [childrenByParent, nodesById],
  );
  const stats = useMemo(() => {
    return sections.reduce(
      (acc, section) => {
        const counts = getWorkspaceSectionDeepCounts(
          nodesById,
          childrenByParent,
          section.id,
        );

        return {
          sections: acc.sections + 1 + counts.sections,
          tasks: acc.tasks + counts.tasks,
          pending: acc.pending + counts.pending,
          completed: acc.completed + counts.completed,
        };
      },
      { sections: 0, tasks: 0, pending: 0, completed: 0 },
    );
  }, [childrenByParent, nodesById, sections]);
  const rootSectionsCount = sections.length;
  const secondarySectionsCount = Math.max(stats.sections - rootSectionsCount, 0);

  useEffect(() => {
    void initializeWorkspace();
  }, [initializeWorkspace]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      return;
    }

    const activeMeta = readSortableMeta(active.data.current);
    const overMeta = readSortableMeta(over.data.current);

    if (!activeMeta || !overMeta) {
      return;
    }

    const sameContainer = activeMeta.containerId === overMeta.containerId;
    const sameGroup = activeMeta.group === overMeta.group;

    if (sameContainer && sameGroup) {
      void reorderNodes(
        activeMeta.containerId,
        activeMeta.group,
        String(active.id),
        String(over.id),
      );
      return;
    }

    toast.info("Para mover entre pastas, use o botão Mover do item.");
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <header className="grid gap-4 rounded-md border border-zinc-200 bg-white p-4 shadow-xs lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-sm bg-cyan-700 text-white">
                MVP visual
              </Badge>
              <Badge
                variant="secondary"
                className="rounded-sm bg-emerald-100 text-emerald-800"
              >
                IndexedDB local
              </Badge>
            </div>
            <h1 className="mt-3 break-words text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
              Checktask Explorer
            </h1>
            <p className="mt-1 text-xs font-medium tracking-normal text-zinc-500">
              {desktopBuildLabel}
            </p>
            <p className="mt-2 max-h-[20vh] max-w-3xl overflow-y-auto break-words pr-1 text-sm leading-6 text-zinc-600">
              Organize produtos em pastas, subpastas e arquivos de tarefa com
              checkpoints claros para cada área.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <InstallAppButton />

            <SectionFormDialog
              title="Criar seção raiz"
              description="Adicione uma nova pasta principal ao workspace."
              submitLabel="Criar seção"
              onSubmit={(name) => {
                void addRootSection(name);
                toast.success("Seção raiz criada.");
              }}
              trigger={
                <Button type="button">
                  <FolderPlus />
                  Nova seção raiz
                </Button>
              }
            />

            <ImportExportDialog
              trigger={
                <Button type="button" variant="outline">
                  <FileJson />
                  JSON
                </Button>
              }
            />

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline">
                  <RotateCcw />
                  Restaurar demo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Restaurar seed inicial?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Isso substitui o workspace atual pela estrutura de
                    demonstração salva no projeto.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      void resetSeed();
                      toast.success("Demo restaurada.");
                    }}
                  >
                    Restaurar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>

        <section className="grid gap-3 rounded-md border border-zinc-200 bg-white p-4 shadow-xs sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-md border border-cyan-100 bg-cyan-50 p-3">
            <p className="text-xs font-medium uppercase tracking-normal text-cyan-800">
              Pastas raiz
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">
              {rootSectionsCount}
            </p>
          </div>
          <div className="rounded-md border border-cyan-100 bg-cyan-50 p-3">
            <p className="text-xs font-medium uppercase tracking-normal text-cyan-800">
              Subpastas
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">
              {secondarySectionsCount}
            </p>
          </div>
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <p className="text-xs font-medium uppercase tracking-normal text-zinc-500">
              Tarefas
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">
              {stats.tasks}
            </p>
          </div>
          <div className="rounded-md border border-amber-100 bg-amber-50 p-3">
            <p className="text-xs font-medium uppercase tracking-normal text-amber-800">
              Pendentes
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">
              {stats.pending}
            </p>
          </div>
          <div className="rounded-md border border-emerald-100 bg-emerald-50 p-3">
            <p className="text-xs font-medium uppercase tracking-normal text-emerald-800">
              Concluídas
            </p>
            <p className="mt-1 text-2xl font-semibold text-zinc-950">
              {stats.completed}
            </p>
          </div>
        </section>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          {sections.length ? (
            <SortableContext
              items={sections.map((section) => section.id)}
              strategy={verticalListSortingStrategy}
            >
              <section className="grid gap-4">
                {sections.map((section) => (
                  <SortableNode
                    key={section.id}
                    id={section.id}
                    data={{ containerId: null, group: "sections" }}
                  >
                    {({ dragHandleProps }) => (
                      <SectionNodeCard
                        section={section}
                        depth={0}
                        dragHandleProps={dragHandleProps}
                      />
                    )}
                  </SortableNode>
                ))}
              </section>
            </SortableContext>
          ) : (
            <section className="grid min-h-[360px] place-items-center rounded-md border border-dashed border-zinc-300 bg-white p-6 text-center">
              <div className="max-w-md">
                {initialized || !isLoading ? (
                  <Sparkles className="mx-auto size-8 text-cyan-700" />
                ) : (
                  <Database className="mx-auto size-8 animate-pulse text-cyan-700" />
                )}
                <h2 className="mt-3 text-lg font-semibold">
                  {initialized || !isLoading
                    ? "Comece com uma seção raiz"
                    : "Carregando workspace"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  {initialized || !isLoading
                    ? "Crie a primeira pasta principal e organize subseções e tarefas a partir dela."
                    : "Abrindo o banco local do app no IndexedDB."}
                </p>
              </div>
            </section>
          )}
        </DndContext>
      </div>
    </main>
  );
}
