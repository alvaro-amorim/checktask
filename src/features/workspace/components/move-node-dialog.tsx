"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import { FolderInput } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useWorkspaceStore } from "@/features/workspace/workspace-store";
import type { WorkspaceChildrenMap, WorkspaceNodeMap } from "@/types/workspace";
import { isWorkspaceSection, isWorkspaceTask, parentKey } from "@/utils/tree-utils";

const rootValue = "__workspace-root__";

interface MoveNodeDialogProps {
  trigger: ReactNode;
  nodeId: string;
  nodeType: "section" | "task";
}

function collectDescendantIds(
  childrenByParent: WorkspaceChildrenMap,
  nodeId: string,
): string[] {
  const childIds = childrenByParent[parentKey(nodeId)] ?? [];

  return childIds.flatMap((childId) => [
    childId,
    ...collectDescendantIds(childrenByParent, childId),
  ]);
}

function canMoveTo(
  nodesById: WorkspaceNodeMap,
  childrenByParent: WorkspaceChildrenMap,
  nodeId: string,
  targetParentId: string | null,
) {
  const node = nodesById[nodeId];

  if (!node) {
    return false;
  }

  if (isWorkspaceTask(node)) {
    return targetParentId !== null && isWorkspaceSection(nodesById[targetParentId]);
  }

  if (targetParentId === null) {
    return true;
  }

  const target = nodesById[targetParentId];

  if (!isWorkspaceSection(target) || target.id === node.id) {
    return false;
  }

  return !collectDescendantIds(childrenByParent, node.id).includes(target.id);
}

function flattenSectionOptions(
  nodesById: WorkspaceNodeMap,
  childrenByParent: WorkspaceChildrenMap,
  parentId: string | null = null,
  depth = 0,
): Array<{ id: string; name: string; depth: number }> {
  return (childrenByParent[parentKey(parentId)] ?? [])
    .map((id) => nodesById[id])
    .filter(isWorkspaceSection)
    .flatMap((section) => [
      { id: section.id, name: section.name, depth },
      ...flattenSectionOptions(nodesById, childrenByParent, section.id, depth + 1),
    ]);
}

export function MoveNodeDialog({
  trigger,
  nodeId,
  nodeType,
}: MoveNodeDialogProps) {
  const nodesById = useWorkspaceStore((state) => state.nodesById);
  const childrenByParent = useWorkspaceStore((state) => state.childrenByParent);
  const moveNode = useWorkspaceStore((state) => state.moveNode);
  const [open, setOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(rootValue);

  const options = useMemo(() => {
    const sectionOptions = flattenSectionOptions(nodesById, childrenByParent)
      .filter((section) =>
        canMoveTo(nodesById, childrenByParent, nodeId, section.id),
      )
      .map((section) => ({
        value: section.id,
        label: `${"  ".repeat(section.depth)}${section.name}`,
      }));

    if (nodeType === "section" && canMoveTo(nodesById, childrenByParent, nodeId, null)) {
      return [{ value: rootValue, label: "Raiz do workspace" }, ...sectionOptions];
    }

    return sectionOptions;
  }, [childrenByParent, nodeId, nodeType, nodesById]);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen && options[0]) {
      setSelectedValue(options[0].value);
    }

    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!options.length) {
      return;
    }

    void moveNode(nodeId, selectedValue === rootValue ? null : selectedValue);
    toast.success("Item movido.");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Mover item</DialogTitle>
            <DialogDescription>
              Escolha a pasta de destino para reposicionar este item.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor={`move-${nodeId}`}>Destino</Label>
            <select
              id={`move-${nodeId}`}
              value={selectedValue}
              onChange={(event) => setSelectedValue(event.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              disabled={!options.length}
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!options.length}>
              <FolderInput />
              Mover
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
