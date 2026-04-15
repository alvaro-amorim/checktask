export type NodeType = "section" | "task";

export type TaskGroup = "pendingTasks" | "completedTasks";
export type SortableGroup = "sections" | TaskGroup;

export interface BaseNode {
  id: string;
  type: NodeType;
  createdAt: string;
  updatedAt: string;
}

export interface TaskNode extends BaseNode {
  type: "task";
  title: string;
  description: string;
  done: boolean;
  descriptionExpanded: boolean;
}

export interface SectionNode extends BaseNode {
  type: "section";
  name: string;
  expanded: boolean;
  children: TreeNode[];
}

export type TreeNode = SectionNode | TaskNode;

export interface WorkspaceSnapshot {
  version: 1;
  exportedAt: string;
  sections: SectionNode[];
}

export interface SectionOption {
  id: string;
  name: string;
  depth: number;
}

export interface WorkspaceStats {
  sections: number;
  tasks: number;
  pending: number;
  completed: number;
}

export interface SortableMeta {
  containerId: string | null;
  group: SortableGroup;
}

export interface WorkspaceNodeBase extends BaseNode {
  parentId: string | null;
  order: number;
}

export interface WorkspaceSectionNode extends WorkspaceNodeBase {
  type: "section";
  name: string;
  expanded: boolean;
}

export interface WorkspaceTaskNode extends WorkspaceNodeBase {
  type: "task";
  title: string;
  description: string;
  done: boolean;
  descriptionExpanded: boolean;
}

export interface WorkspaceTaskPhoto {
  id: string;
  taskId: string;
  name: string;
  mimeType: string;
  blob: Blob;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceTaskPhotoMeta {
  id: string;
  taskId: string;
  name: string;
  mimeType: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceTaskPhotoBlob {
  id: string;
  blob: Blob;
}

export type WorkspaceNode = WorkspaceSectionNode | WorkspaceTaskNode;

export type WorkspaceNodeMap = Record<string, WorkspaceNode>;
export type WorkspaceChildrenMap = Record<string, string[]>;
export type WorkspaceTaskPhotosMap = Record<string, WorkspaceTaskPhotoMeta[]>;
