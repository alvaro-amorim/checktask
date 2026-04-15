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

interface SectionFormDialogProps {
  trigger: ReactNode;
  title: string;
  description: string;
  submitLabel: string;
  initialName?: string;
  onSubmit: (name: string) => void;
}

export function SectionFormDialog({
  trigger,
  title,
  description,
  submitLabel,
  initialName = "",
  onSubmit,
}: SectionFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setName(initialName);
    }

    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextName = name.trim();

    if (!nextName) {
      return;
    }

    onSubmit(nextName);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-2">
            <Label htmlFor="section-name">Nome da seção</Label>
            <Input
              id="section-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: CHECKOUT"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={!name.trim()}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
