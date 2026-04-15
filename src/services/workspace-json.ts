import type { SectionNode, TaskNode, TreeNode, WorkspaceSnapshot } from "@/types/workspace";
import { createNodeId, nowIso } from "@/utils/tree-utils";

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
}

function readBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function uniqueId(rawId: unknown, fallbackPrefix: "section" | "task", seen: Set<string>) {
  const baseId = readString(rawId, createNodeId(fallbackPrefix));

  if (!seen.has(baseId)) {
    seen.add(baseId);
    return baseId;
  }

  const nextId = createNodeId(fallbackPrefix);
  seen.add(nextId);
  return nextId;
}

function normalizeTask(raw: Record<string, unknown>, seen: Set<string>): TaskNode {
  const timestamp = nowIso();

  return {
    id: uniqueId(raw.id, "task", seen),
    type: "task",
    title: readString(raw.title, "Tarefa sem título"),
    description: typeof raw.description === "string" ? raw.description : "",
    done: readBoolean(raw.done, false),
    descriptionExpanded: readBoolean(raw.descriptionExpanded, true),
    createdAt: readString(raw.createdAt, timestamp),
    updatedAt: readString(raw.updatedAt, timestamp),
  };
}

function normalizeSection(raw: Record<string, unknown>, seen: Set<string>): SectionNode {
  const timestamp = nowIso();
  const children = Array.isArray(raw.children)
    ? raw.children
        .map((child) => normalizeNode(child, seen))
        .filter((child): child is TreeNode => Boolean(child))
    : [];

  return {
    id: uniqueId(raw.id, "section", seen),
    type: "section",
    name: readString(raw.name, "Seção sem nome"),
    expanded: readBoolean(raw.expanded, true),
    children,
    createdAt: readString(raw.createdAt, timestamp),
    updatedAt: readString(raw.updatedAt, timestamp),
  };
}

function normalizeNode(raw: unknown, seen: Set<string>): TreeNode | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const node = raw as Record<string, unknown>;

  if (node.type === "task" || "title" in node) {
    return normalizeTask(node, seen);
  }

  if (node.type === "section" || "children" in node || "name" in node) {
    return normalizeSection(node, seen);
  }

  return null;
}

export function createWorkspaceSnapshot(sections: SectionNode[]): WorkspaceSnapshot {
  return {
    version: 1,
    exportedAt: nowIso(),
    sections,
  };
}

export function serializeWorkspace(sections: SectionNode[]) {
  return JSON.stringify(createWorkspaceSnapshot(sections), null, 2);
}

export function parseWorkspaceJson(input: string): SectionNode[] {
  const parsed = JSON.parse(input) as unknown;
  const root = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && "sections" in parsed
      ? (parsed as { sections: unknown }).sections
      : null;

  if (!Array.isArray(root)) {
    throw new Error("O JSON precisa conter um array de seções em sections.");
  }

  const seen = new Set<string>();
  const sections = root
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      return normalizeSection(item as Record<string, unknown>, seen);
    })
    .filter((section): section is SectionNode => Boolean(section));

  if (sections.length === 0) {
    throw new Error("Nenhuma seção válida foi encontrada no JSON.");
  }

  return sections;
}
