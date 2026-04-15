"use client";

import { useMemo, useState, type HTMLAttributes } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  ChevronDown,
  ChevronRight,
  Edit3,
  FilePlus2,
  Folder,
  FolderInput,
  FolderOpen,
  FolderPlus,
  GripVertical,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteNodeDialog } from "@/features/workspace/components/delete-node-dialog";
import { MoveNodeDialog } from "@/features/workspace/components/move-node-dialog";
import { SectionFormDialog } from "@/features/workspace/components/section-form-dialog";
import { SortableNode } from "@/features/workspace/components/sortable-node";
import { TaskFormDialog } from "@/features/workspace/components/task-form-dialog";
import { TaskItemCard } from "@/features/workspace/components/task-item-card";
import { useWorkspaceStore } from "@/features/workspace/workspace-store";
import { cn } from "@/lib/utils";
import type { WorkspaceSectionNode, WorkspaceTaskNode } from "@/types/workspace";
import {
  getWorkspaceChildren,
  getWorkspaceSectionDeepCounts,
  isWorkspaceSection,
  isWorkspaceTask,
} from "@/utils/tree-utils";

interface SectionNodeCardProps {
  section: WorkspaceSectionNode;
  depth: number;
  dragHandleProps: HTMLAttributes<HTMLButtonElement>;
}

const depthAccent = [
  "border-l-cyan-600",
  "border-l-emerald-600",
  "border-l-amber-500",
  "border-l-rose-500",
  "border-l-zinc-500",
];

function TaskGroupList({
  title,
  tasks,
  group,
  sectionId,
  collapsed,
  onToggle,
}: {
  title: string;
  tasks: WorkspaceTaskNode[];
  group: "pendingTasks" | "completedTasks";
  sectionId: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (tasks.length === 0) {
    return null;
  }

  const contentId = `${sectionId}-${group}-list`;
  const showTasks = !collapsed;

  return (
    <div
      className={cn(
        "grid gap-2 rounded-md border p-3",
        group === "completedTasks"
          ? "border-emerald-200 bg-emerald-50/50"
          : "border-zinc-200 bg-zinc-50/70",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onToggle}
            aria-expanded={!collapsed}
            aria-controls={contentId}
            className="h-auto min-w-0 justify-start gap-1 px-1 py-1 text-left"
          >
            {collapsed ? <ChevronRight /> : <ChevronDown />}
            <span className="truncate text-xs font-semibold uppercase tracking-normal text-zinc-600">
              {collapsed ? "Expandir" : "Minimizar"}
            </span>
          </Button>
          <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
            {title}
          </p>
        </div>
        <Badge variant="outline" className="h-5 rounded-sm px-1.5 text-[11px]">
          {tasks.length}
        </Badge>
      </div>

      {showTasks ? (
        <div id={contentId} className="grid gap-2">
          {tasks.map((task) => (
            <TaskItemCard key={task.id} task={task} dragHandleProps={{}} />
          ))}
        </div>
      ) : (
        <p id={contentId} className="text-xs leading-5 text-zinc-600">
          Seção minimizada. Clique em Expandir para ver as tarefas.
        </p>
      )}
    </div>
  );
}

export function SectionNodeCard({
  section,
  depth,
  dragHandleProps,
}: SectionNodeCardProps) {
  const nodesById = useWorkspaceStore((state) => state.nodesById);
  const childrenByParent = useWorkspaceStore((state) => state.childrenByParent);
  const addSection = useWorkspaceStore((state) => state.addSection);
  const addTask = useWorkspaceStore((state) => state.addTask);
  const renameSection = useWorkspaceStore((state) => state.renameSection);
  const toggleSectionExpanded = useWorkspaceStore(
    (state) => state.toggleSectionExpanded,
  );
  const deleteNode = useWorkspaceStore((state) => state.deleteNode);

  const children = useMemo(
    () => getWorkspaceChildren(nodesById, childrenByParent, section.id),
    [childrenByParent, nodesById, section.id],
  );
  const subsections = children.filter(isWorkspaceSection);
  const pendingTasks = children.filter(
    (node): node is WorkspaceTaskNode => isWorkspaceTask(node) && !node.done,
  );
  const completedTasks = children.filter(
    (node): node is WorkspaceTaskNode => isWorkspaceTask(node) && node.done,
  );
  const counts = useMemo(
    () => getWorkspaceSectionDeepCounts(nodesById, childrenByParent, section.id),
    [childrenByParent, nodesById, section.id],
  );
  const [pendingCollapsed, setPendingCollapsed] = useState(true);
  const [completedCollapsed, setCompletedCollapsed] = useState(true);
  const FolderIcon = section.expanded ? FolderOpen : Folder;

  return (
    <Card
      className={cn(
        "rounded-md border border-l-4 bg-white shadow-xs",
        depthAccent[depth % depthAccent.length],
      )}
    >
      <CardContent className="grid gap-4 px-3 sm:px-4">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-0.5 cursor-grab text-zinc-400 active:cursor-grabbing"
              aria-label="Arrastar seÃ§Ã£o"
              {...dragHandleProps}
            >
              <GripVertical />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="mt-0.5"
              onClick={() => void toggleSectionExpanded(section.id)}
              aria-label={section.expanded ? "Recolher seÃ§Ã£o" : "Expandir seÃ§Ã£o"}
            >
              {section.expanded ? <ChevronDown /> : <ChevronRight />}
            </Button>

            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <FolderIcon className="size-5 shrink-0 text-amber-600" />
                <h2 className="min-w-0 max-h-[16vh] overflow-y-auto break-words pr-1 text-base font-semibold leading-6 text-zinc-950">
                  {section.name}
                </h2>
                <Badge
                  variant="secondary"
                  className="h-5 rounded-sm bg-zinc-100 px-1.5 text-[11px] text-zinc-700"
                >
                  nivel {depth}
                </Badge>
              </div>
              <p className="mt-1 max-h-[18vh] overflow-y-auto pr-1 text-sm text-zinc-500">
                {counts.sections} subpastas · {counts.tasks} tarefas ·{" "}
                {counts.pending} pendentes · {counts.completed} concluídas
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1 lg:justify-end">
            <SectionFormDialog
              title="Criar subseÃ§Ã£o"
              description="Adicione uma nova pasta dentro desta Ã¡rea."
              submitLabel="Criar subseÃ§Ã£o"
              onSubmit={(name) => {
                void addSection(section.id, name);
                toast.success("SubseÃ§Ã£o criada.");
              }}
              trigger={
                <Button type="button" variant="outline" size="sm">
                  <FolderPlus />
                  Subpasta
                </Button>
              }
            />

            <TaskFormDialog
              title="Criar tarefa"
              description="Adicione um arquivo de tarefa dentro desta pasta."
              submitLabel="Criar tarefa"
              onSubmit={(payload) => {
                void addTask(section.id, payload.title, payload.description);
                toast.success("Tarefa criada.");
              }}
              trigger={
                <Button type="button" variant="outline" size="sm">
                  <FilePlus2 />
                  Tarefa
                </Button>
              }
            />

            <MoveNodeDialog
              nodeId={section.id}
              nodeType="section"
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Mover seÃ§Ã£o"
                >
                  <FolderInput />
                </Button>
              }
            />

            <SectionFormDialog
              title="Editar seÃ§Ã£o"
              description="Renomeie esta pasta sem alterar o conteÃºdo interno."
              submitLabel="Salvar nome"
              initialName={section.name}
              onSubmit={(name) => {
                void renameSection(section.id, name);
                toast.success("SeÃ§Ã£o renomeada.");
              }}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Editar seÃ§Ã£o"
                >
                  <Edit3 />
                </Button>
              }
            />

            <DeleteNodeDialog
              label="seÃ§Ã£o"
              detail="Esta aÃ§Ã£o remove a pasta, suas subpastas e todas as tarefas dentro dela."
              onConfirm={() => {
                void deleteNode(section.id);
                toast.success("SeÃ§Ã£o excluÃ­da.");
              }}
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Excluir seÃ§Ã£o"
                  className="text-red-700 hover:text-red-800"
                >
                  <Trash2 />
                </Button>
              }
            />
          </div>
        </div>

        {section.expanded ? (
          <div className="grid gap-4 border-t border-zinc-100 pt-4">
            {subsections.length > 0 ? (
              <div className="grid gap-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
                    Subpastas
                  </p>
                  <Badge
                    variant="outline"
                    className="h-5 rounded-sm px-1.5 text-[11px]"
                  >
                    {subsections.length}
                  </Badge>
                </div>
                <SortableContext
                  items={subsections.map((child) => child.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="grid gap-3">
                    {subsections.map((child) => (
                      <SortableNode
                        key={child.id}
                        id={child.id}
                        data={{ containerId: section.id, group: "sections" }}
                      >
                        {({ dragHandleProps }) => (
                          <SectionNodeCard
                            section={child}
                            depth={depth + 1}
                            dragHandleProps={dragHandleProps}
                          />
                        )}
                      </SortableNode>
                    ))}
                  </div>
                </SortableContext>
              </div>
            ) : null}

            <TaskGroupList
              title="Tarefas pendentes"
              tasks={pendingTasks}
              group="pendingTasks"
              sectionId={section.id}
              collapsed={pendingCollapsed}
              onToggle={() => setPendingCollapsed((current) => !current)}
            />

            <TaskGroupList
              title="Tarefas concluídas"
              tasks={completedTasks}
              group="completedTasks"
              sectionId={section.id}
              collapsed={completedCollapsed}
              onToggle={() => setCompletedCollapsed((current) => !current)}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}



