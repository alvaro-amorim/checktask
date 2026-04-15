import type {
  SectionNode,
  SectionOption,
  SortableGroup,
  TaskNode,
  TreeNode,
  WorkspaceChildrenMap,
  WorkspaceNode,
  WorkspaceNodeMap,
  WorkspaceSectionNode,
  WorkspaceTaskNode,
  WorkspaceStats,
} from "@/types/workspace";

export const ROOT_PARENT_KEY = "root";

export function createNodeId(
  prefix: "section" | "task" | "node" | "photo" = "node",
) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function nowIso() {
  return new Date().toISOString();
}

export function isSection(node: TreeNode): node is SectionNode {
  return node.type === "section";
}

export function isTask(node: TreeNode): node is TaskNode {
  return node.type === "task";
}

export function isWorkspaceSection(
  node: WorkspaceNode | undefined,
): node is WorkspaceSectionNode {
  return node?.type === "section";
}

export function isWorkspaceTask(
  node: WorkspaceNode | undefined,
): node is WorkspaceTaskNode {
  return node?.type === "task";
}

export function parentKey(parentId: string | null) {
  return parentId ?? ROOT_PARENT_KEY;
}

export function createSectionNode(name: string): SectionNode {
  const timestamp = nowIso();

  return {
    id: createNodeId("section"),
    type: "section",
    name,
    expanded: true,
    children: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createWorkspaceSectionNode(
  name: string,
  parentId: string | null,
  order: number,
): WorkspaceSectionNode {
  const timestamp = nowIso();

  return {
    id: createNodeId("section"),
    type: "section",
    parentId,
    order,
    name,
    expanded: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createTaskNode(title: string, description: string): TaskNode {
  const timestamp = nowIso();

  return {
    id: createNodeId("task"),
    type: "task",
    title,
    description,
    done: false,
    descriptionExpanded: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createWorkspaceTaskNode(
  title: string,
  description: string,
  parentId: string,
  order: number,
): WorkspaceTaskNode {
  const timestamp = nowIso();

  return {
    id: createNodeId("task"),
    type: "task",
    parentId,
    order,
    title,
    description,
    done: false,
    descriptionExpanded: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function sortWorkspaceNodes(nodes: WorkspaceNode[]) {
  return [...nodes].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function buildWorkspaceIndex(nodes: WorkspaceNode[]) {
  const nodesById: WorkspaceNodeMap = {};
  const childrenByParent: WorkspaceChildrenMap = {};

  for (const node of nodes) {
    nodesById[node.id] = node;
    const key = parentKey(node.parentId);
    childrenByParent[key] = [...(childrenByParent[key] ?? []), node.id];
  }

  for (const key of Object.keys(childrenByParent)) {
    childrenByParent[key] = childrenByParent[key].sort((a, b) => {
      const nodeA = nodesById[a];
      const nodeB = nodesById[b];

      if (!nodeA || !nodeB) {
        return 0;
      }

      if (nodeA.order !== nodeB.order) {
        return nodeA.order - nodeB.order;
      }

      return nodeA.createdAt.localeCompare(nodeB.createdAt);
    });
  }

  return { nodesById, childrenByParent };
}

export function getWorkspaceChildren(
  nodesById: WorkspaceNodeMap,
  childrenByParent: WorkspaceChildrenMap,
  parentId: string | null,
) {
  return (childrenByParent[parentKey(parentId)] ?? [])
    .map((id) => nodesById[id])
    .filter((node): node is WorkspaceNode => Boolean(node));
}

export function getWorkspaceSectionCounts(children: WorkspaceNode[]) {
  return children.reduce(
    (counts, node) => {
      if (isWorkspaceSection(node)) {
        counts.sections += 1;
        return counts;
      }

      if (node.done) {
        counts.completed += 1;
      } else {
        counts.pending += 1;
      }

      return counts;
    },
    { sections: 0, pending: 0, completed: 0 },
  );
}

export function getWorkspaceSectionDeepCounts(
  nodesById: WorkspaceNodeMap,
  childrenByParent: WorkspaceChildrenMap,
  sectionId: string,
) {
  const counts = { sections: 0, tasks: 0, pending: 0, completed: 0 };

  function visitChildren(parentId: string) {
    const children = childrenByParent[parentKey(parentId)] ?? [];

    for (const childId of children) {
      const node = nodesById[childId];

      if (!node) {
        continue;
      }

      if (isWorkspaceSection(node)) {
        counts.sections += 1;
        visitChildren(node.id);
        continue;
      }

      counts.tasks += 1;

      if (node.done) {
        counts.completed += 1;
      } else {
        counts.pending += 1;
      }
    }
  }

  visitChildren(sectionId);

  return counts;
}

export function countWorkspaceNodes(nodes: WorkspaceNode[]): WorkspaceStats {
  return nodes.reduce<WorkspaceStats>(
    (stats, node) => {
      if (isWorkspaceSection(node)) {
        return {
          ...stats,
          sections: stats.sections + 1,
        };
      }

      return {
        sections: stats.sections,
        tasks: stats.tasks + 1,
        pending: stats.pending + (node.done ? 0 : 1),
        completed: stats.completed + (node.done ? 1 : 0),
      };
    },
    { sections: 0, tasks: 0, pending: 0, completed: 0 },
  );
}

export function getNodeLabel(node: TreeNode) {
  return isSection(node) ? node.name : node.title;
}

export function countSection(section: SectionNode): WorkspaceStats {
  return section.children.reduce<WorkspaceStats>(
    (stats, child) => {
      if (isSection(child)) {
        const childStats = countSection(child);

        return {
          sections: stats.sections + childStats.sections,
          tasks: stats.tasks + childStats.tasks,
          pending: stats.pending + childStats.pending,
          completed: stats.completed + childStats.completed,
        };
      }

      return {
        sections: stats.sections,
        tasks: stats.tasks + 1,
        pending: stats.pending + (child.done ? 0 : 1),
        completed: stats.completed + (child.done ? 1 : 0),
      };
    },
    { sections: 1, tasks: 0, pending: 0, completed: 0 },
  );
}

export function countWorkspace(sections: SectionNode[]): WorkspaceStats {
  return sections.reduce<WorkspaceStats>(
    (stats, section) => {
      const sectionStats = countSection(section);

      return {
        sections: stats.sections + sectionStats.sections,
        tasks: stats.tasks + sectionStats.tasks,
        pending: stats.pending + sectionStats.pending,
        completed: stats.completed + sectionStats.completed,
      };
    },
    { sections: 0, tasks: 0, pending: 0, completed: 0 },
  );
}

export function getSectionCounts(section: SectionNode) {
  return section.children.reduce(
    (counts, node) => {
      if (isSection(node)) {
        counts.sections += 1;
        return counts;
      }

      if (node.done) {
        counts.completed += 1;
      } else {
        counts.pending += 1;
      }

      return counts;
    },
    { sections: 0, pending: 0, completed: 0 },
  );
}

export function flattenSections(
  sections: SectionNode[],
  depth = 0,
): SectionOption[] {
  return sections.flatMap((section) => [
    { id: section.id, name: section.name, depth },
    ...flattenSections(
      section.children.filter(isSection),
      depth + 1,
    ),
  ]);
}

export function findNode(
  nodes: TreeNode[],
  nodeId: string,
): TreeNode | undefined {
  for (const node of nodes) {
    if (node.id === nodeId) {
      return node;
    }

    if (isSection(node)) {
      const found = findNode(node.children, nodeId);
      if (found) {
        return found;
      }
    }
  }

  return undefined;
}

export function findSection(
  sections: SectionNode[],
  sectionId: string,
): SectionNode | undefined {
  const node = findNode(sections, sectionId);
  return node && isSection(node) ? node : undefined;
}

export function containsSection(
  section: SectionNode,
  sectionId: string,
): boolean {
  return section.children.some((child) => {
    if (!isSection(child)) {
      return false;
    }

    return child.id === sectionId || containsSection(child, sectionId);
  });
}

export function canMoveNode(
  sections: SectionNode[],
  nodeId: string,
  targetSectionId: string | null,
) {
  const node = findNode(sections, nodeId);

  if (!node) {
    return false;
  }

  if (isTask(node)) {
    return targetSectionId !== null && Boolean(findSection(sections, targetSectionId));
  }

  if (targetSectionId === null) {
    return true;
  }

  if (node.id === targetSectionId) {
    return false;
  }

  return !containsSection(node, targetSectionId);
}

export function updateNode(
  nodes: TreeNode[],
  nodeId: string,
  updater: (node: TreeNode) => TreeNode,
): TreeNode[] {
  let changed = false;

  const nextNodes = nodes.map((node) => {
    if (node.id === nodeId) {
      changed = true;
      return updater(node);
    }

    if (isSection(node)) {
      const nextChildren = updateNode(node.children, nodeId, updater);

      if (nextChildren !== node.children) {
        changed = true;
        return {
          ...node,
          children: nextChildren,
          updatedAt: nowIso(),
        };
      }
    }

    return node;
  });

  return changed ? nextNodes : nodes;
}

export function addRootSection(
  sections: SectionNode[],
  section: SectionNode,
): SectionNode[] {
  return [...sections, section];
}

export function addChildToSection(
  sections: SectionNode[],
  sectionId: string,
  child: TreeNode,
): SectionNode[] {
  return updateNode(sections, sectionId, (node) => {
    if (!isSection(node)) {
      return node;
    }

    return {
      ...node,
      children: [...node.children, child],
      expanded: true,
      updatedAt: nowIso(),
    };
  }) as SectionNode[];
}

function removeNodeFromList(
  nodes: TreeNode[],
  nodeId: string,
): { nodes: TreeNode[]; removed?: TreeNode } {
  let removed: TreeNode | undefined;
  const nextNodes: TreeNode[] = [];

  for (const node of nodes) {
    if (node.id === nodeId) {
      removed = node;
      continue;
    }

    if (isSection(node)) {
      const childResult = removeNodeFromList(node.children, nodeId);

      if (childResult.removed) {
        removed = childResult.removed;
        nextNodes.push({
          ...node,
          children: childResult.nodes,
          updatedAt: nowIso(),
        });
        continue;
      }
    }

    nextNodes.push(node);
  }

  return { nodes: removed ? nextNodes : nodes, removed };
}

export function deleteNodeById(
  sections: SectionNode[],
  nodeId: string,
): SectionNode[] {
  return removeNodeFromList(sections, nodeId).nodes as SectionNode[];
}

function insertIntoTarget(
  sections: SectionNode[],
  targetSectionId: string | null,
  node: TreeNode,
): SectionNode[] {
  if (targetSectionId === null) {
    if (!isSection(node)) {
      return sections;
    }

    return [...sections, { ...node, updatedAt: nowIso() }];
  }

  return updateNode(sections, targetSectionId, (target) => {
    if (!isSection(target)) {
      return target;
    }

    return {
      ...target,
      expanded: true,
      children: [...target.children, { ...node, updatedAt: nowIso() }],
      updatedAt: nowIso(),
    };
  }) as SectionNode[];
}

export function moveNodeToSection(
  sections: SectionNode[],
  nodeId: string,
  targetSectionId: string | null,
): SectionNode[] {
  if (!canMoveNode(sections, nodeId, targetSectionId)) {
    return sections;
  }

  const { nodes, removed } = removeNodeFromList(sections, nodeId);

  if (!removed) {
    return sections;
  }

  return insertIntoTarget(nodes as SectionNode[], targetSectionId, removed);
}

function arrayMove<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function reorderSubset(
  nodes: TreeNode[],
  predicate: (node: TreeNode) => boolean,
  activeId: string,
  overId: string,
) {
  const subset = nodes.filter(predicate);
  const oldIndex = subset.findIndex((node) => node.id === activeId);
  const newIndex = subset.findIndex((node) => node.id === overId);

  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return nodes;
  }

  const reordered = arrayMove(subset, oldIndex, newIndex);
  let cursor = 0;

  return nodes.map((node) => (predicate(node) ? reordered[cursor++] : node));
}

function groupPredicate(group: SortableGroup) {
  if (group === "sections") {
    return isSection;
  }

  if (group === "pendingTasks") {
    return (node: TreeNode) => isTask(node) && !node.done;
  }

  return (node: TreeNode) => isTask(node) && node.done;
}

export function reorderNodesInContainer(
  sections: SectionNode[],
  containerId: string | null,
  group: SortableGroup,
  activeId: string,
  overId: string,
): SectionNode[] {
  if (activeId === overId) {
    return sections;
  }

  if (containerId === null) {
    if (group !== "sections") {
      return sections;
    }

    return reorderSubset(sections, isSection, activeId, overId) as SectionNode[];
  }

  return updateNode(sections, containerId, (node) => {
    if (!isSection(node)) {
      return node;
    }

    const nextChildren = reorderSubset(
      node.children,
      groupPredicate(group),
      activeId,
      overId,
    );

    if (nextChildren === node.children) {
      return node;
    }

    return {
      ...node,
      children: nextChildren,
      updatedAt: nowIso(),
    };
  }) as SectionNode[];
}
