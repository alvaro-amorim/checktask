import Dexie, { type Table } from "dexie";

import type {
  SectionNode,
  TaskNode,
  TreeNode,
  WorkspaceNode,
  WorkspaceSectionNode,
  WorkspaceTaskPhotoBlob,
  WorkspaceTaskPhotoMeta,
  WorkspaceTaskNode,
} from "@/types/workspace";
import {
  buildWorkspaceIndex,
  isSection,
  isWorkspaceSection,
  parentKey,
} from "@/utils/tree-utils";

export class ChecktaskDatabase extends Dexie {
  nodes!: Table<WorkspaceNode, string>;
  photos!: Table<WorkspaceTaskPhotoMeta, string>;
  photoBlobs!: Table<WorkspaceTaskPhotoBlob, string>;

  constructor() {
    super("checktask-local-workspace");

    this.version(1).stores({
      nodes: "&id,parentId,type,order,done,updatedAt",
    });

    this.version(2).stores({
      nodes: "&id,parentId,type,order,done,updatedAt",
      photos: "&id,taskId,updatedAt",
    });

    this.version(3)
      .stores({
        nodes: "&id,parentId,type,order,done,updatedAt",
        photos: "&id,taskId,updatedAt",
        photoBlobs: "&id",
      })
      .upgrade(async (tx) => {
        const legacyPhotos = await tx.table("photos").toArray() as Array<
          WorkspaceTaskPhotoMeta & { blob?: Blob }
        >;

        if (legacyPhotos.length === 0) {
          return;
        }

        const nextPhotos: WorkspaceTaskPhotoMeta[] = legacyPhotos.map((photo) => ({
          id: photo.id,
          taskId: photo.taskId,
          name: photo.name,
          mimeType: photo.mimeType,
          createdAt: photo.createdAt,
          updatedAt: photo.updatedAt,
        }));

        const nextBlobs: WorkspaceTaskPhotoBlob[] = legacyPhotos
          .filter((photo) => photo.blob instanceof Blob)
          .map((photo) => ({
            id: photo.id,
            blob: photo.blob as Blob,
          }));

        await tx.table("photos").clear();
        if (nextPhotos.length > 0) {
          await tx.table("photos").bulkPut(nextPhotos);
        }

        await tx.table("photoBlobs").clear();
        if (nextBlobs.length > 0) {
          await tx.table("photoBlobs").bulkPut(nextBlobs);
        }
      });
  }
}

export const workspaceDb = new ChecktaskDatabase();

export async function getAllWorkspaceNodes() {
  return workspaceDb.nodes.toArray();
}

export async function replaceWorkspaceNodes(nodes: WorkspaceNode[]) {
  await workspaceDb.transaction("rw", workspaceDb.nodes, async () => {
    await workspaceDb.nodes.clear();
    await workspaceDb.nodes.bulkPut(nodes);
  });
}

export async function getAllWorkspaceTaskPhotos() {
  return workspaceDb.photos.toArray();
}

export async function getWorkspaceTaskPhotosByTaskId(taskId: string) {
  return workspaceDb.photos.where("taskId").equals(taskId).toArray();
}

export async function putWorkspaceTaskPhotos(photos: WorkspaceTaskPhotoMeta[]) {
  if (photos.length === 0) {
    return;
  }

  await workspaceDb.photos.bulkPut(photos);
}

export async function putWorkspaceTaskPhotoBlobs(blobs: WorkspaceTaskPhotoBlob[]) {
  if (blobs.length === 0) {
    return;
  }

  await workspaceDb.photoBlobs.bulkPut(blobs);
}

export async function deleteWorkspaceTaskPhotos(ids: string[]) {
  if (ids.length === 0) {
    return;
  }

  await workspaceDb.transaction("rw", workspaceDb.photos, workspaceDb.photoBlobs, async () => {
    await workspaceDb.photos.bulkDelete(ids);
    await workspaceDb.photoBlobs.bulkDelete(ids);
  });
}

export async function deleteWorkspaceTaskPhotosByTaskIds(taskIds: string[]) {
  if (taskIds.length === 0) {
    return;
  }

  await workspaceDb.transaction("rw", workspaceDb.photos, workspaceDb.photoBlobs, async () => {
    for (const taskId of taskIds) {
      const photos = await workspaceDb.photos.where("taskId").equals(taskId).toArray();
      const ids = photos.map((photo) => photo.id);
      if (ids.length > 0) {
        await workspaceDb.photos.bulkDelete(ids);
        await workspaceDb.photoBlobs.bulkDelete(ids);
      }
    }
  });
}

export async function replaceWorkspaceTaskPhotos(photos: WorkspaceTaskPhotoMeta[]) {
  await workspaceDb.transaction("rw", workspaceDb.photos, workspaceDb.photoBlobs, async () => {
    await workspaceDb.photos.clear();
    await workspaceDb.photoBlobs.clear();
    if (photos.length > 0) {
      await workspaceDb.photos.bulkPut(photos);
    }
  });
}

export async function getWorkspaceTaskPhotoBlobById(photoId: string) {
  return workspaceDb.photoBlobs.get(photoId);
}

export async function putWorkspaceNodes(nodes: WorkspaceNode[]) {
  if (nodes.length === 0) {
    return;
  }

  await workspaceDb.nodes.bulkPut(nodes);
}

export async function deleteWorkspaceNodes(ids: string[]) {
  if (ids.length === 0) {
    return;
  }

  await workspaceDb.nodes.bulkDelete(ids);
}

export function flattenTreeToWorkspaceNodes(
  sections: SectionNode[],
  parentId: string | null = null,
): WorkspaceNode[] {
  return sections.flatMap((section, sectionIndex) =>
    flattenSection(section, parentId, sectionIndex),
  );
}

function flattenSection(
  section: SectionNode,
  parentId: string | null,
  order: number,
): WorkspaceNode[] {
  const sectionNode: WorkspaceSectionNode = {
    id: section.id,
    type: "section",
    parentId,
    order,
    name: section.name,
    expanded: section.expanded,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };

  return [
    sectionNode,
    ...section.children.flatMap((child, childIndex) => {
      if (isSection(child)) {
        return flattenSection(child, section.id, childIndex);
      }

      return [treeTaskToWorkspaceTask(child, section.id, childIndex)];
    }),
  ];
}

function treeTaskToWorkspaceTask(
  task: TaskNode,
  parentId: string,
  order: number,
): WorkspaceTaskNode {
  return {
    id: task.id,
    type: "task",
    parentId,
    order,
    title: task.title,
    description: task.description,
    done: task.done,
    descriptionExpanded: task.descriptionExpanded,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}

export function workspaceNodesToTree(nodes: WorkspaceNode[]): SectionNode[] {
  const { nodesById, childrenByParent } = buildWorkspaceIndex(nodes);

  function buildChildren(parentId: string): TreeNode[] {
    return (childrenByParent[parentKey(parentId)] ?? [])
      .map((id) => nodesById[id])
      .filter((node): node is WorkspaceNode => Boolean(node))
      .flatMap<TreeNode>((node) => {
        if (isWorkspaceSection(node)) {
          return [workspaceSectionToTreeSection(node, buildChildren(node.id))];
        }

        return [workspaceTaskToTreeTask(node)];
      });
  }

  const rootSections = (childrenByParent[parentKey(null)] ?? [])
    .map((id) => nodesById[id])
    .filter(isWorkspaceSection)
    .sort((a, b) => a.order - b.order);

  return rootSections.map((section) =>
    workspaceSectionToTreeSection(section, buildChildren(section.id)),
  );
}

function workspaceSectionToTreeSection(
  section: WorkspaceSectionNode,
  children: TreeNode[],
): SectionNode {
  return {
    id: section.id,
    type: "section",
    name: section.name,
    expanded: section.expanded,
    children,
    createdAt: section.createdAt,
    updatedAt: section.updatedAt,
  };
}

function workspaceTaskToTreeTask(task: WorkspaceTaskNode): TaskNode {
  return {
    id: task.id,
    type: "task",
    title: task.title,
    description: task.description,
    done: task.done,
    descriptionExpanded: task.descriptionExpanded,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
