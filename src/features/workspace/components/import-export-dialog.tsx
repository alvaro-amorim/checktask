"use client";

import { type ChangeEvent, type ReactNode, useRef, useState } from "react";
import { Copy, Download, FileJson, Upload } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useWorkspaceStore } from "@/features/workspace/workspace-store";
import { workspaceNodesToTree } from "@/services/workspace-db";
import { parseWorkspaceJson, serializeWorkspace } from "@/services/workspace-json";

interface ImportExportDialogProps {
  trigger: ReactNode;
}

export function ImportExportDialog({ trigger }: ImportExportDialogProps) {
  const nodesById = useWorkspaceStore((state) => state.nodesById);
  const importSections = useWorkspaceStore((state) => state.importSections);
  const [open, setOpen] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setJsonText(serializeWorkspace(workspaceNodesToTree(Object.values(nodesById))));
    }

    setOpen(nextOpen);
  }

  async function copyJson() {
    try {
      await navigator.clipboard.writeText(jsonText);
      toast.success("JSON copiado.");
    } catch {
      toast.error("Não foi possível copiar automaticamente.");
    }
  }

  function downloadJson() {
    const blob = new Blob([jsonText], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `checktask-workspace-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Arquivo JSON gerado.");
  }

  function importJson() {
    try {
      const nextSections = parseWorkspaceJson(jsonText);
      void importSections(nextSections);
      toast.success("Workspace importado.");
      setOpen(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "JSON inválido ou incompleto.";
      toast.error(message);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const text = await file.text();
    setJsonText(text);
    event.target.value = "";
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar e exportar JSON</DialogTitle>
          <DialogDescription>
            O JSON abaixo representa a árvore completa de seções, subseções e
            tarefas.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={copyJson}>
              <Copy />
              Copiar
            </Button>
            <Button type="button" variant="outline" onClick={downloadJson}>
              <Download />
              Baixar JSON
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              <Upload />
              Carregar arquivo
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="workspace-json" className="flex items-center gap-2">
              <FileJson className="size-4" />
              Estrutura JSON
            </Label>
            <Textarea
              id="workspace-json"
              value={jsonText}
              onChange={(event) => setJsonText(event.target.value)}
              className="min-h-[420px] font-mono text-xs leading-5"
              spellCheck={false}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={importJson}>
            <Upload />
            Importar este JSON
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
