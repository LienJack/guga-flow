import type {
  AssetListItem,
  CreateCanvasNodeInput,
  Phase3CanvasNodeType,
  SourceMediaNodeData,
} from "@guga-flow/shared-types";

import { createSourceMediaNodeData } from "./business-node-data";

export type SourceMediaNodeType = Extract<
  Phase3CanvasNodeType,
  "source_text" | "source_image" | "source_video" | "source_audio"
>;

export interface SourceMediaDropCandidate {
  file: File;
  nodeType: SourceMediaNodeType;
}

export interface SourceMediaDropValidation {
  accepted: SourceMediaDropCandidate[];
  errors: string[];
}

export const MAX_SOURCE_MEDIA_DROP_BYTES = 50 * 1024 * 1024;

const SOURCE_MEDIA_NODE_LABELS = {
  source_text: "text",
  source_image: "image",
  source_video: "video",
  source_audio: "audio",
} as const satisfies Record<SourceMediaNodeType, string>;

export function validateSourceMediaDropFiles(files: readonly File[]): SourceMediaDropValidation {
  const accepted: SourceMediaDropCandidate[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const label = file.name || "Dropped file";
    const duplicateKey = sourceMediaDuplicateKey(file);
    if (seen.has(duplicateKey)) {
      errors.push(`${label} was skipped because it is already in this drop batch.`);
      continue;
    }
    seen.add(duplicateKey);

    if (file.size > MAX_SOURCE_MEDIA_DROP_BYTES) {
      errors.push(`${label} is larger than the 50 MB upload limit.`);
      continue;
    }

    const nodeType = sourceMediaNodeTypeForFile(file);
    if (!nodeType) {
      errors.push(`${label} is not a supported text, image, video, or audio file.`);
      continue;
    }

    accepted.push({ file, nodeType });
  }

  return { accepted, errors };
}

export function sourceMediaNodeTypeForFile(
  file: Pick<File, "name" | "type">,
): SourceMediaNodeType | undefined {
  const mimeType = file.type.toLowerCase();
  if (mimeType.startsWith("image/")) {
    return "source_image";
  }
  if (mimeType.startsWith("video/")) {
    return "source_video";
  }
  if (mimeType.startsWith("audio/")) {
    return "source_audio";
  }
  if (mimeType === "text/plain" || mimeType === "text/markdown" || textFileName(file.name)) {
    return "source_text";
  }
  return undefined;
}

export function sourceMediaTitleFromAsset(asset: Pick<AssetListItem, "id" | "originalFilename">): string {
  return asset.originalFilename?.trim() || asset.id;
}

export function sourceMediaCreateInput(input: {
  asset: AssetListItem;
  nodeType: SourceMediaNodeType;
  tldrawShapeId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
}): CreateCanvasNodeInput<SourceMediaNodeData> {
  return {
    tldrawShapeId: input.tldrawShapeId,
    type: input.nodeType,
    title: sourceMediaTitleFromAsset(input.asset),
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    zIndex: input.zIndex,
    status: "draft",
    dataJson: createSourceMediaNodeData(input.asset, "drag_drop"),
  };
}

export function sourceMediaImportSuccessLabel(nodeType: SourceMediaNodeType): string {
  return SOURCE_MEDIA_NODE_LABELS[nodeType];
}

function sourceMediaDuplicateKey(file: File): string {
  return [file.name, file.type, file.size, file.lastModified].join(":");
}

function textFileName(name: string): boolean {
  const normalized = name.toLowerCase();
  return normalized.endsWith(".txt") || normalized.endsWith(".md") || normalized.endsWith(".markdown");
}
