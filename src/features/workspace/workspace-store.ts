"use client";

import { create } from "zustand";

import { seedWorkspace } from "@/data/seed-workspace";
import {
  deleteWorkspaceNodes,
  deleteWorkspaceTaskPhotos,
  deleteWorkspaceTaskPhotosByTaskIds,
  flattenTreeToWorkspaceNodes,
  getAllWorkspaceNodes,
  getAllWorkspaceTaskPhotos,
  getWorkspaceTaskPhotoBlobById,
  putWorkspaceNodes,
  putWorkspaceTaskPhotoBlobs,
  putWorkspaceTaskPhotos,
  replaceWorkspaceNodes,
  replaceWorkspaceTaskPhotos,
} from "@/services/workspace-db";
import { parseWorkspaceJson } from "@/services/workspace-json";
import type {
  SectionNode,
  SortableGroup,
  WorkspaceChildrenMap,
  WorkspaceNode,
  WorkspaceNodeMap,
  WorkspaceSectionNode,
  WorkspaceTaskPhoto,
  WorkspaceTaskPhotoBlob,
  WorkspaceTaskPhotoMeta,
  WorkspaceTaskPhotosMap,
  WorkspaceTaskNode,
} from "@/types/workspace";
import {
  buildWorkspaceIndex,
  createNodeId,
  createWorkspaceSectionNode,
  createWorkspaceTaskNode,
  getWorkspaceChildren,
  isWorkspaceSection,
  isWorkspaceTask,
  nowIso,
  parentKey,
} from "@/utils/tree-utils";

const legacyStorageKey = "checktask-workspace-v1";
const MAX_TASK_PHOTOS = 10;

function readLegacySections(): SectionNode[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(legacyStorageKey);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    const sections =
      parsed &&
      typeof parsed === "object" &&
      "state" in parsed &&
      parsed.state &&
      typeof parsed.state === "object" &&
      "sections" in parsed.state
        ? (parsed.state as { sections: unknown }).sections
        : null;

    if (!Array.isArray(sections)) {
      return null;
    }

    return parseWorkspaceJson(JSON.stringify({ sections }));
  } catch {
    return null;
  }
}

function clearLegacySections() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(legacyStorageKey);
}

function indexNodes(nodes: WorkspaceNode[]) {
  return buildWorkspaceIndex(nodes);
}

function indexTaskPhotos(photos: WorkspaceTaskPhotoMeta[]) {
  const photosById: Record<string, WorkspaceTaskPhotoMeta> = {};
  const taskPhotosByTaskId: WorkspaceTaskPhotosMap = {};

  for (const photo of photos) {
    photosById[photo.id] = photo;
    taskPhotosByTaskId[photo.taskId] = [
      ...(taskPhotosByTaskId[photo.taskId] ?? []),
      photo,
    ];
  }

  for (const taskId of Object.keys(taskPhotosByTaskId)) {
    taskPhotosByTaskId[taskId] = taskPhotosByTaskId[taskId].sort((a, b) =>
      a.createdAt.localeCompare(b.createdAt),
    );
  }

  return { photosById, taskPhotosByTaskId };
}

async function refreshTaskPhotosState(
  set: (
    partial:
      | Partial<WorkspaceState>
      | ((state: WorkspaceState) => Partial<WorkspaceState>),
  ) => void,
) {
  const photos = await getAllWorkspaceTaskPhotos();
  set(indexTaskPhotos(photos));
}

function nodesFromState(state: Pick<WorkspaceState, "nodesById">) {
  return Object.values(state.nodesById);
}

function nextOrderForParent(
  state: Pick<WorkspaceState, "childrenByParent" | "nodesById">,
  parentId: string | null,
) {
  const children = getWorkspaceChildren(
    state.nodesById,
    state.childrenByParent,
    parentId,
  );

  if (children.length === 0) {
    return 0;
  }

  return Math.max(...children.map((node) => node.order)) + 1;
}

function arrayMove<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function groupMatches(node: WorkspaceNode, group: SortableGroup) {
  if (group === "sections") {
    return isWorkspaceSection(node);
  }

  if (group === "pendingTasks") {
    return isWorkspaceTask(node) && !node.done;
  }

  return isWorkspaceTask(node) && node.done;
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

function canMoveNode(
  state: Pick<WorkspaceState, "childrenByParent" | "nodesById">,
  nodeId: string,
  targetParentId: string | null,
) {
  const node = state.nodesById[nodeId];

  if (!node) {
    return false;
  }

  if (isWorkspaceTask(node)) {
    return targetParentId !== null && isWorkspaceSection(state.nodesById[targetParentId]);
  }

  if (targetParentId === null) {
    return true;
  }

  const target = state.nodesById[targetParentId];

  if (!isWorkspaceSection(target) || target.id === node.id) {
    return false;
  }

  return !collectDescendantIds(state.childrenByParent, node.id).includes(target.id);
}

async function patchNodes(
  set: (
    partial:
      | Partial<WorkspaceState>
      | ((state: WorkspaceState) => Partial<WorkspaceState>),
  ) => void,
  updates: WorkspaceNode[],
) {
  await putWorkspaceNodes(updates);

  set((state) => {
    const updatedIds = new Set(updates.map((node) => node.id));
    const nextNodes = [
      ...nodesFromState(state).filter((node) => !updatedIds.has(node.id)),
      ...updates,
    ];

    return indexNodes(nextNodes);
  });
}

interface WorkspaceState {
  initialized: boolean;
  isLoading: boolean;
  nodesById: WorkspaceNodeMap;
  childrenByParent: WorkspaceChildrenMap;
  photosById: Record<string, WorkspaceTaskPhotoMeta>;
  taskPhotosByTaskId: WorkspaceTaskPhotosMap;
  initializeWorkspace: () => Promise<void>;
  addRootSection: (name: string) => Promise<void>;
  addSection: (parentSectionId: string, name: string) => Promise<void>;
  addTask: (
    sectionId: string,
    title: string,
    description: string,
  ) => Promise<void>;
  renameSection: (sectionId: string, name: string) => Promise<void>;
  updateTask: (
    taskId: string,
    payload: Pick<WorkspaceTaskNode, "title" | "description">,
  ) => Promise<void>;
  toggleSectionExpanded: (sectionId: string) => Promise<void>;
  toggleTaskDone: (taskId: string) => Promise<void>;
  toggleTaskDescription: (taskId: string) => Promise<void>;
  addTaskPhotos: (taskId: string, files: File[]) => Promise<void>;
  renameTaskPhoto: (photoId: string, name: string) => Promise<void>;
  removeTaskPhoto: (photoId: string) => Promise<void>;
  getTaskPhotosWithBlobs: (taskId: string) => Promise<WorkspaceTaskPhoto[]>;
  deleteNode: (nodeId: string) => Promise<void>;
  moveNode: (nodeId: string, targetSectionId: string | null) => Promise<void>;
  reorderNodes: (
    containerId: string | null,
    group: SortableGroup,
    activeId: string,
    overId: string,
  ) => Promise<void>;
  importSections: (sections: SectionNode[]) => Promise<void>;
  resetSeed: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>()((set, get) => ({
  initialized: false,
  isLoading: false,
  nodesById: {},
  childrenByParent: {},
  photosById: {},
  taskPhotosByTaskId: {},
  initializeWorkspace: async () => {
    const state = get();

    if (state.initialized || state.isLoading) {
      return;
    }

    set({ isLoading: true });

    const storedNodes = await getAllWorkspaceNodes();
    const storedPhotos = await getAllWorkspaceTaskPhotos();
    let nextNodes = storedNodes;

    if (nextNodes.length === 0) {
      const legacySections = readLegacySections();
      nextNodes = flattenTreeToWorkspaceNodes(legacySections ?? seedWorkspace);
      await replaceWorkspaceNodes(nextNodes);
      clearLegacySections();
    }

    const taskIds = new Set(
      nextNodes.filter(isWorkspaceTask).map((node) => node.id),
    );
    const validPhotos = storedPhotos.filter((photo) => taskIds.has(photo.taskId));

    if (validPhotos.length !== storedPhotos.length) {
      const invalidPhotoIds = storedPhotos
        .filter((photo) => !taskIds.has(photo.taskId))
        .map((photo) => photo.id);
      await deleteWorkspaceTaskPhotos(invalidPhotoIds);
    }

    set({
      ...indexNodes(nextNodes),
      ...indexTaskPhotos(validPhotos),
      initialized: true,
      isLoading: false,
    });
  },
  addRootSection: async (name) => {
    const state = get();
    const section = createWorkspaceSectionNode(
      name,
      null,
      nextOrderForParent(state, null),
    );

    await patchNodes(set, [section]);
  },
  addSection: async (parentSectionId, name) => {
    const state = get();
    const parent = state.nodesById[parentSectionId];

    if (!isWorkspaceSection(parent)) {
      return;
    }

    const timestamp = nowIso();
    const section = createWorkspaceSectionNode(
      name,
      parentSectionId,
      nextOrderForParent(state, parentSectionId),
    );
    const expandedParent: WorkspaceSectionNode = {
      ...parent,
      expanded: true,
      updatedAt: timestamp,
    };

    await patchNodes(set, [expandedParent, section]);
  },
  addTask: async (sectionId, title, description) => {
    const state = get();
    const parent = state.nodesById[sectionId];

    if (!isWorkspaceSection(parent)) {
      return;
    }

    const timestamp = nowIso();
    const task = createWorkspaceTaskNode(
      title,
      description,
      sectionId,
      nextOrderForParent(state, sectionId),
    );
    const expandedParent: WorkspaceSectionNode = {
      ...parent,
      expanded: true,
      updatedAt: timestamp,
    };

    await patchNodes(set, [expandedParent, task]);
  },
  renameSection: async (sectionId, name) => {
    const section = get().nodesById[sectionId];

    if (!isWorkspaceSection(section)) {
      return;
    }

    await patchNodes(set, [{ ...section, name, updatedAt: nowIso() }]);
  },
  updateTask: async (taskId, payload) => {
    const task = get().nodesById[taskId];

    if (!isWorkspaceTask(task)) {
      return;
    }

    await patchNodes(set, [{ ...task, ...payload, updatedAt: nowIso() }]);
  },
  toggleSectionExpanded: async (sectionId) => {
    const section = get().nodesById[sectionId];

    if (!isWorkspaceSection(section)) {
      return;
    }

    await patchNodes(set, [
      { ...section, expanded: !section.expanded, updatedAt: nowIso() },
    ]);
  },
  toggleTaskDone: async (taskId) => {
    const state = get();
    const task = state.nodesById[taskId];

    if (!isWorkspaceTask(task) || task.parentId === null) {
      return;
    }

    await patchNodes(set, [
      {
        ...task,
        done: !task.done,
        order: nextOrderForParent(state, task.parentId),
        updatedAt: nowIso(),
      },
    ]);
  },
  toggleTaskDescription: async (taskId) => {
    const task = get().nodesById[taskId];

    if (!isWorkspaceTask(task)) {
      return;
    }

    await patchNodes(set, [
      {
        ...task,
        descriptionExpanded: !task.descriptionExpanded,
        updatedAt: nowIso(),
      },
    ]);
  },
  addTaskPhotos: async (taskId, files) => {
    const state = get();
    const task = state.nodesById[taskId];

    if (!isWorkspaceTask(task)) {
      return;
    }

    const currentPhotos = state.taskPhotosByTaskId[taskId] ?? [];
    const availableSlots = MAX_TASK_PHOTOS - currentPhotos.length;

    if (availableSlots <= 0) {
      return;
    }

    const acceptedFiles = files
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, availableSlots);

    if (acceptedFiles.length === 0) {
      return;
    }

    const timestamp = nowIso();
    const baseIndex = currentPhotos.length;
    const createdPhotos: WorkspaceTaskPhotoMeta[] = acceptedFiles.map((file, index) => ({
      id: createNodeId("photo"),
      taskId,
      name: `foto-${baseIndex + index + 1}`,
      mimeType: file.type || "image/png",
      createdAt: timestamp,
      updatedAt: timestamp,
    }));
    const createdBlobs: WorkspaceTaskPhotoBlob[] = createdPhotos.map(
      (photo, index) => ({
        id: photo.id,
        blob: acceptedFiles[index],
      }),
    );

    await putWorkspaceTaskPhotos(createdPhotos);
    await putWorkspaceTaskPhotoBlobs(createdBlobs);
    await refreshTaskPhotosState(set);
  },
  renameTaskPhoto: async (photoId, name) => {
    const normalizedName = name.trim();

    if (!normalizedName) {
      return;
    }

    const photo = get().photosById[photoId];

    if (!photo) {
      return;
    }

    const fullPhoto = (await getAllWorkspaceTaskPhotos()).find(
      (item) => item.id === photoId,
    );

    if (!fullPhoto) {
      return;
    }

    await putWorkspaceTaskPhotos([
      { ...fullPhoto, name: normalizedName, updatedAt: nowIso() },
    ]);
    await refreshTaskPhotosState(set);
  },
  removeTaskPhoto: async (photoId) => {
    if (!get().photosById[photoId]) {
      return;
    }

    await deleteWorkspaceTaskPhotos([photoId]);
    await refreshTaskPhotosState(set);
  },
  getTaskPhotosWithBlobs: async (taskId) => {
    const photos = get().taskPhotosByTaskId[taskId] ?? [];

    if (photos.length === 0) {
      return [];
    }

    const withBlobs = await Promise.all(
      photos.map(async (photo) => {
        const blobRecord = await getWorkspaceTaskPhotoBlobById(photo.id);
        if (!blobRecord?.blob) {
          return null;
        }

        return {
          id: photo.id,
          taskId: photo.taskId,
          name: photo.name,
          mimeType: photo.mimeType,
          createdAt: photo.createdAt,
          updatedAt: photo.updatedAt,
          blob: blobRecord.blob,
        } satisfies WorkspaceTaskPhoto;
      }),
    );

    return withBlobs.filter((photo): photo is WorkspaceTaskPhoto => Boolean(photo));
  },
  deleteNode: async (nodeId) => {
    const state = get();
    const target = state.nodesById[nodeId];

    if (!target) {
      return;
    }

    const idsToDelete = [nodeId, ...collectDescendantIds(state.childrenByParent, nodeId)];
    const taskIdsToDelete = idsToDelete.filter((id) =>
      isWorkspaceTask(state.nodesById[id]),
    );
    await deleteWorkspaceNodes(idsToDelete);
    await deleteWorkspaceTaskPhotosByTaskIds(taskIdsToDelete);

    set((currentState) => {
      const deleteSet = new Set(idsToDelete);
      const nextNodes = nodesFromState(currentState).filter(
        (node) => !deleteSet.has(node.id),
      );
      const nextPhotos = Object.values(currentState.photosById).filter(
        (photo) => !taskIdsToDelete.includes(photo.taskId),
      );

      return {
        ...indexNodes(nextNodes),
        photosById: Object.fromEntries(
          nextPhotos.map((photo) => [photo.id, photo]),
        ),
        taskPhotosByTaskId: nextPhotos.reduce<WorkspaceTaskPhotosMap>(
          (acc, photo) => {
            acc[photo.taskId] = [...(acc[photo.taskId] ?? []), photo];
            return acc;
          },
          {},
        ),
      };
    });
  },
  moveNode: async (nodeId, targetSectionId) => {
    const state = get();

    if (!canMoveNode(state, nodeId, targetSectionId)) {
      return;
    }

    const node = state.nodesById[nodeId];

    if (!node) {
      return;
    }

    const updatedNode: WorkspaceNode = {
      ...node,
      parentId: targetSectionId,
      order: nextOrderForParent(state, targetSectionId),
      updatedAt: nowIso(),
    };

    const targetParent = targetSectionId ? state.nodesById[targetSectionId] : undefined;
    const updates = [updatedNode];

    if (isWorkspaceSection(targetParent)) {
      updates.push({ ...targetParent, expanded: true, updatedAt: nowIso() });
    }

    await patchNodes(set, updates);
  },
  reorderNodes: async (containerId, group, activeId, overId) => {
    if (activeId === overId) {
      return;
    }

    const state = get();
    const siblings = getWorkspaceChildren(
      state.nodesById,
      state.childrenByParent,
      containerId,
    ).filter((node) => groupMatches(node, group));
    const oldIndex = siblings.findIndex((node) => node.id === activeId);
    const newIndex = siblings.findIndex((node) => node.id === overId);

    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
      return;
    }

    const orderSlots = siblings.map((node) => node.order).sort((a, b) => a - b);
    const moved = arrayMove(siblings, oldIndex, newIndex);
    const timestamp = nowIso();
    const updates = moved.map((node, index) => ({
      ...node,
      order: orderSlots[index],
      updatedAt: timestamp,
    }));

    await patchNodes(set, updates);
  },
  importSections: async (sections) => {
    const nodes = flattenTreeToWorkspaceNodes(sections);
    await replaceWorkspaceTaskPhotos([]);
    await replaceWorkspaceNodes(nodes);
    set({
      ...indexNodes(nodes),
      ...indexTaskPhotos([]),
    });
  },
  resetSeed: async () => {
    const nodes = flattenTreeToWorkspaceNodes(seedWorkspace);
    await replaceWorkspaceTaskPhotos([]);
    await replaceWorkspaceNodes(nodes);
    set({
      ...indexNodes(nodes),
      ...indexTaskPhotos([]),
    });
  },
}));

export const workspaceActions = () => useWorkspaceStore.getState();
