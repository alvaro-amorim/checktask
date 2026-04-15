"use client";

import { type FormEvent, type ReactNode, useState } from "react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface TaskFormDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  submitLabel: string;
  initialTitle?: string;
  initialDescription?: string;
  onSubmit: (payload: { title: string; description: string }) => void;
}

export function TaskFormDialog({
  trigger,
  title,
  description,
  submitLabel,
  initialTitle = "",
  initialDescription = "",
  onSubmit,
}: TaskFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState(initialTitle);
  const [taskDescription, setTaskDescription] = useState(initialDescription);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setTaskTitle(initialTitle);
      setTaskDescription(initialDescription);
    }

    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = taskTitle.trim();

    if (!nextTitle) {
      return;
    }

    onSubmit({
      title: nextTitle,
      description: taskDescription.trim(),
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="task-title">Titulo</Label>
            <Input
              id="task-title"
              value={taskTitle}
              onChange={(event) => setTaskTitle(event.target.value)}
              placeholder="Ex.: Revisar fluxo de pagamento"
              autoFocus
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="task-description">Texto da tarefa</Label>
            <Textarea
              id="task-description"
              value={taskDescription}
              onChange={(event) => setTaskDescription(event.target.value)}
              placeholder="Escreva o checkpoint, contexto ou instrução que precisa ficar junto da tarefa."
              rows={6}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!taskTitle.trim()}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
