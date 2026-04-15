"use client";

import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { cn } from "@/lib/utils";
import type { SortableMeta } from "@/types/workspace";

interface SortableNodeProps {
  id: string;
  data: SortableMeta;
  className?: string;
  children: (props: {
    dragHandleProps: HTMLAttributes<HTMLButtonElement>;
    isDragging: boolean;
  }) => ReactNode;
}

export function SortableNode({
  id,
  data,
  className,
  children,
}: SortableNodeProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id, data });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "min-w-0 transition-opacity",
        isDragging && "relative z-20 opacity-50",
        className,
      )}
    >
      {children({
        dragHandleProps: {
          ...attributes,
          ...listeners,
        } as HTMLAttributes<HTMLButtonElement>,
        isDragging,
      })}
    </div>
  );
}
