"use client";

import {
  useState,
  type ClipboardEvent,
  type HTMLAttributes,
  type KeyboardEvent,
} from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Edit3,
  FileText,
  FolderInput,
  GripVertical,
  Images,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DeleteNodeDialog } from "@/features/workspace/components/delete-node-dialog";
import { MoveNodeDialog } from "@/features/workspace/components/move-node-dialog";
import { TaskFormDialog } from "@/features/workspace/components/task-form-dialog";
import { useWorkspaceStore } from "@/features/workspace/workspace-store";
import { cn } from "@/lib/utils";
import type {
  WorkspaceTaskNode,
  WorkspaceTaskPhoto,
  WorkspaceTaskPhotoMeta,
} from "@/types/workspace";

const MAX_TASK_PHOTOS = 10;
const EMPTY_PHOTOS: WorkspaceTaskPhotoMeta[] = [];

function extensionFromMime(mimeType: string) {
  if (mimeType.includes("png")) {
    return "png";
  }
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return "jpg";
  }
  if (mimeType.includes("webp")) {
    return "webp";
  }
  if (mimeType.includes("gif")) {
    return "gif";
  }

  return "bin";
}

function ensureFileNameWithExtension(name: string, mimeType: string) {
  const normalized = name.trim();
  const extension = extensionFromMime(mimeType);

  if (normalized.toLowerCase().endsWith(`.${extension}`)) {
    return normalized;
  }

  return `${normalized}.${extension}`;
}

function PhotoNameRow({ photo }: { photo: WorkspaceTaskPhotoMeta }) {
  const renameTaskPhoto = useWorkspaceStore((state) => state.renameTaskPhoto);
  const removeTaskPhoto = useWorkspaceStore((state) => state.removeTaskPhoto);
  const [nameDraft, setNameDraft] = useState(photo.name);

  async function commitRename() {
    const normalized = nameDraft.trim();

    if (!normalized || normalized === photo.name) {
      setNameDraft(photo.name);
      return;
    }

    await renameTaskPhoto(photo.id, normalized);
    toast.success("Foto renomeada.");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={nameDraft}
        onChange={(event) => setNameDraft(event.target.value)}
        onBlur={() => void commitRename()}
        onKeyDown={handleKeyDown}
        className="h-7 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-2 text-xs text-zinc-700 outline-none focus-visible:border-cyan-400"
        aria-label="Renomear foto"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={() => {
          void removeTaskPhoto(photo.id);
          toast.success("Foto removida.");
        }}
        aria-label="Remover foto"
        className="text-red-700 hover:text-red-800"
      >
        <X />
      </Button>
    </div>
  );
}

interface TaskItemCardProps {
  task: WorkspaceTaskNode;
  dragHandleProps: HTMLAttributes<HTMLButtonElement>;
}

export function TaskItemCard({ task, dragHandleProps }: TaskItemCardProps) {
  const photos = useWorkspaceStore(
    (state) => state.taskPhotosByTaskId[task.id] ?? EMPTY_PHOTOS,
  );
  const updateTask = useWorkspaceStore((state) => state.updateTask);
  const toggleTaskDone = useWorkspaceStore((state) => state.toggleTaskDone);
  const toggleTaskDescription = useWorkspaceStore(
    (state) => state.toggleTaskDescription,
  );
  const addTaskPhotos = useWorkspaceStore((state) => state.addTaskPhotos);
  const getTaskPhotosWithBlobs = useWorkspaceStore(
    (state) => state.getTaskPhotosWithBlobs,
  );
  const deleteNode = useWorkspaceStore((state) => state.deleteNode);
  const [photosExpanded, setPhotosExpanded] = useState(false);

  async function copyTaskText() {
    const text = task.description
      ? `${task.title}\n\n${task.description}`
      : task.title;

    try {
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado.");
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  }

  async function fallbackDownloadPhotos(taskPhotos: WorkspaceTaskPhoto[]) {
    for (const photo of taskPhotos) {
      const filename = ensureFileNameWithExtension(photo.name, photo.mimeType);
      const objectUrl = URL.createObjectURL(photo.blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function copyTaskPhotos() {
    const fullPhotos = await getTaskPhotosWithBlobs(task.id);

    if (fullPhotos.length === 0) {
      toast.info("Essa tarefa não possui fotos.");
      return;
    }

    const canUseClipboardImages =
      typeof window !== "undefined" &&
      typeof ClipboardItem !== "undefined" &&
      Boolean(navigator.clipboard?.write);

    if (!canUseClipboardImages) {
      await fallbackDownloadPhotos(fullPhotos);
      toast.warning("Clipboard bloqueado. Fotos exportadas por download.");
      return;
    }

    try {
      const clipboardItems = fullPhotos.map(
        (photo) => new ClipboardItem({ [photo.mimeType]: photo.blob }),
      );
      await navigator.clipboard.write(clipboardItems);
      toast.success("Fotos copiadas.");
    } catch {
      await fallbackDownloadPhotos(fullPhotos);
      toast.warning("Clipboard bloqueado. Fotos exportadas por download.");
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLElement>) {
    const clipboardItems = Array.from(event.clipboardData.items);
    const imageFiles = clipboardItems
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (imageFiles.length === 0) {
      return;
    }

    event.preventDefault();

    const available = MAX_TASK_PHOTOS - photos.length;

    if (available <= 0) {
      toast.error("Limite de 10 fotos por tarefa atingido.");
      return;
    }

    void addTaskPhotos(task.id, imageFiles);

    if (imageFiles.length > available) {
      toast.warning(
        `Limite de 10 fotos: ${available} foto(s) adicionada(s), excedentes ignoradas.`,
      );
      return;
    }

    toast.success(`${Math.min(imageFiles.length, available)} foto(s) adicionada(s).`);
  }

  return (
    <article
      tabIndex={0}
      onPaste={handlePaste}
      className={cn(
        "group/task rounded-md border bg-white p-3 shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50",
        task.done
          ? "border-emerald-200 bg-emerald-50/60"
          : "border-zinc-200 hover:border-cyan-300",
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="mt-0.5 cursor-grab text-zinc-400 active:cursor-grabbing"
          aria-label="Arrastar tarefa"
          {...dragHandleProps}
        >
          <GripVertical />
        </Button>

        <Checkbox
          checked={task.done}
          onCheckedChange={() => void toggleTaskDone(task.id)}
          aria-label={task.done ? "Marcar como pendente" : "Marcar como concluída"}
          className="mt-1"
        />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <FileText className="size-4 shrink-0 text-cyan-700" />
              <h4
                className={cn(
                  "min-w-0 flex-1 truncate text-sm font-medium leading-5 text-zinc-950",
                  task.done && "text-zinc-500 line-through decoration-emerald-500",
                )}
              >
                {task.title}
              </h4>
              {task.description ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => void toggleTaskDescription(task.id)}
                  aria-label={
                    task.descriptionExpanded ? "Recolher texto" : "Expandir texto"
                  }
                  className="text-zinc-500"
                >
                  {task.descriptionExpanded ? <ChevronDown /> : <ChevronRight />}
                </Button>
              ) : null}
              <Badge
                variant="secondary"
                className={cn(
                  "h-5 shrink-0 rounded-sm px-1.5 text-[11px]",
                  task.done
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-cyan-50 text-cyan-800",
                )}
              >
                {task.done ? "concluída" : "pendente"}
              </Badge>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Copiar texto da tarefa"
                onClick={() => void copyTaskText()}
              >
                <Copy />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Copiar fotos da tarefa"
                onClick={() => void copyTaskPhotos()}
              >
                <Images />
              </Button>

              <MoveNodeDialog
                nodeId={task.id}
                nodeType="task"
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Mover tarefa"
                  >
                    <FolderInput />
                  </Button>
                }
              />

              <TaskFormDialog
                title="Editar tarefa"
                description="Atualize o título e o texto deste arquivo de planejamento."
                submitLabel="Salvar tarefa"
                initialTitle={task.title}
                initialDescription={task.description}
                onSubmit={(payload) => {
                  void updateTask(task.id, payload);
                  toast.success("Tarefa atualizada.");
                }}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Editar tarefa"
                  >
                    <Edit3 />
                  </Button>
                }
              />

              <DeleteNodeDialog
                label="tarefa"
                detail="Esta ação remove apenas este arquivo de tarefa."
                onConfirm={() => {
                  void deleteNode(task.id);
                  toast.success("Tarefa excluída.");
                }}
                trigger={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Excluir tarefa"
                    className="text-red-700 hover:text-red-800"
                  >
                    <Trash2 />
                  </Button>
                }
              />
            </div>
          </div>

          <div className="mt-2 grid gap-2 rounded-md border border-zinc-200 bg-zinc-50 p-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-normal text-zinc-500">
                Fotos ({photos.length}/{MAX_TASK_PHOTOS})
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-zinc-500">Ctrl+V para colar imagem</p>
                {photos.length > 0 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setPhotosExpanded((current) => !current)}
                    className="h-6 px-2 text-xs"
                  >
                    {photosExpanded ? "Ocultar nomes" : "Ver nomes"}
                  </Button>
                ) : null}
              </div>
            </div>
            {photos.length > 0 && photosExpanded ? (
              <div className="grid max-h-[18vh] gap-1 overflow-y-auto">
                {photos.map((photo) => (
                  <PhotoNameRow key={photo.id} photo={photo} />
                ))}
              </div>
            ) : photos.length === 0 ? (
              <p className="text-xs text-zinc-500">Nenhuma foto nesta tarefa.</p>
            ) : (
              <p className="text-xs text-zinc-500">
                Lista de nomes oculta para melhorar desempenho.
              </p>
            )}
          </div>

          {task.description && task.descriptionExpanded ? (
            <p className="mt-2 max-h-[28vh] overflow-y-auto whitespace-pre-wrap break-words pr-1 text-sm leading-6 text-zinc-700">
              {task.description}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  );
}
