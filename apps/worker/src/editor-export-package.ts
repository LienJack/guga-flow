import type {
  EditorExportClipOutput,
  EditorExportClipSource,
  EditorExportJobInput,
  EditorExportPackageOutput,
  EditorExportStoryboardRow,
  TimelineAsset,
  TimelineItem,
  TimelineManifest,
} from "@guga-flow/shared-types";

export interface EditorExportClipBytes {
  body: Buffer;
  mimeType?: string;
}

export interface BuildEditorExportPackageOptions {
  readClip(clip: EditorExportClipSource): Promise<EditorExportClipBytes>;
}

const DEFAULT_CLIP_DURATION_MS = 4000;

export async function buildEditorExportPackage(
  input: EditorExportJobInput,
  options: BuildEditorExportPackageOptions,
): Promise<EditorExportPackageOutput> {
  if (input.forceFailure) {
    throw new Error("Mock editor export failure requested");
  }
  if (!input.clips.length) {
    throw new Error("Editor export requires at least one clip");
  }

  const clipOutputs: EditorExportClipOutput[] = [];
  const zipEntries: Array<{ name: string; data: Buffer }> = [];
  const timelineItems: TimelineItem[] = [];
  const timelineAssets: TimelineAsset[] = [];
  const storyboardRows: EditorExportStoryboardRow[] = [];
  let startMs = 0;

  for (let index = 0; index < input.clips.length; index += 1) {
    const clip = input.clips[index] as EditorExportClipSource;
    const clipBytes = await options.readClip(clip);
    const durationMs = clip.durationMs ?? durationMsFromSeconds(clip.durationSeconds) ?? DEFAULT_CLIP_DURATION_MS;
    const filename = normalizeZipPath(clip.filename || `clips/shot_${String(index + 1).padStart(3, "0")}.mp4`);

    zipEntries.push({ name: filename, data: clipBytes.body });
    clipOutputs.push({
      index: index + 1,
      filename,
      videoNodeId: clip.videoNodeId,
      videoAssetId: clip.videoAssetId,
      durationMs,
    });
    timelineAssets.push({
      id: clip.videoAssetId,
      type: "video",
      url: filename,
      localPath: filename,
      mimeType: clip.mimeType ?? clipBytes.mimeType ?? "video/mp4",
      durationMs,
    });
    timelineItems.push({
      id: `item_${String(index + 1).padStart(3, "0")}`,
      assetId: clip.videoAssetId,
      sourceNodeId: clip.videoNodeId,
      startMs,
      durationMs,
      metadata: {
        shotNodeId: clip.shotNodeId ?? null,
        shotNumber: clip.shotNumber ?? null,
        sortMode: input.sortMode,
      },
    });
    storyboardRows.push({
      index: index + 1,
      filename,
      videoNodeId: clip.videoNodeId,
      videoNodeTitle: clip.videoNodeTitle,
      assetId: clip.videoAssetId,
      shotNodeId: clip.shotNodeId,
      shotTitle: clip.shotTitle,
      shotNumber: clip.shotNumber,
      durationMs,
    });
    startMs += durationMs;
  }

  const timeline: TimelineManifest = {
    version: "1.0",
    projectId: input.projectId,
    editorExportId: input.editorExportId,
    title: `Editor export ${input.editorExportId}`,
    aspectRatio: input.aspectRatio,
    fps: input.fps,
    sortMode: input.sortMode,
    tracks: [
      {
        id: "track_video_1",
        type: "video",
        items: timelineItems,
      },
    ],
    assets: timelineAssets,
    metadata: {
      selectedVideoNodeIds: input.videoNodeIds,
      includeStoryboardCsv: input.includeStoryboardCsv,
      includeSubtitles: input.includeSubtitles,
      totalDurationMs: startMs,
    },
  };
  const storyboardCsv = input.includeStoryboardCsv ? storyboardRowsToCsv(storyboardRows) : "";

  zipEntries.unshift({
    name: "storyboard.csv",
    data: Buffer.from(storyboardCsv, "utf8"),
  });
  zipEntries.unshift({
    name: "timeline.json",
    data: Buffer.from(`${JSON.stringify(timeline, null, 2)}\n`, "utf8"),
  });

  const zip = createStoredZip(zipEntries);

  return {
    storageKey: `${input.projectId}/editor-exports/${input.editorExportId}.zip`,
    mimeType: "application/zip",
    bytesBase64: zip.toString("base64"),
    sizeBytes: zip.byteLength,
    timeline,
    storyboardCsv,
    clips: clipOutputs,
  };
}

export function storyboardRowsToCsv(rows: EditorExportStoryboardRow[]): string {
  const header = [
    "index",
    "filename",
    "videoNodeId",
    "videoNodeTitle",
    "assetId",
    "shotNodeId",
    "shotTitle",
    "shotNumber",
    "durationMs",
  ];
  const lines = rows.map((row) =>
    [
      row.index,
      row.filename,
      row.videoNodeId,
      row.videoNodeTitle ?? "",
      row.assetId,
      row.shotNodeId ?? "",
      row.shotTitle ?? "",
      row.shotNumber ?? "",
      row.durationMs ?? "",
    ]
      .map(csvCell)
      .join(","),
  );

  return `${header.join(",")}\n${lines.join("\n")}${lines.length ? "\n" : ""}`;
}

export function listStoredZipEntryNames(zip: Buffer): string[] {
  const names: string[] = [];
  let offset = 0;
  while (offset + 30 <= zip.byteLength && zip.readUInt32LE(offset) === 0x04034b50) {
    const compressedSize = zip.readUInt32LE(offset + 18);
    const nameLength = zip.readUInt16LE(offset + 26);
    const extraLength = zip.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    names.push(zip.subarray(nameStart, nameStart + nameLength).toString("utf8"));
    offset = nameStart + nameLength + extraLength + compressedSize;
  }
  return names;
}

function createStoredZip(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(normalizeZipPath(entry.name), "utf8");
    const crc = crc32(entry.data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(0, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(entry.data.byteLength, 18);
    localHeader.writeUInt32LE(entry.data.byteLength, 22);
    localHeader.writeUInt16LE(name.byteLength, 26);
    localHeader.writeUInt16LE(0, 28);

    localParts.push(localHeader, name, entry.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(entry.data.byteLength, 20);
    centralHeader.writeUInt32LE(entry.data.byteLength, 24);
    centralHeader.writeUInt16LE(name.byteLength, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);

    offset += localHeader.byteLength + name.byteLength + entry.data.byteLength;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.byteLength, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function csvCell(value: string | number): string {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function durationMsFromSeconds(value: number | undefined): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? Math.round(value * 1000) : undefined;
}

function normalizeZipPath(value: string): string {
  const normalized = value
    .replace(/^\/+/g, "")
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== "." && part !== "..")
    .join("/");
  return normalized || "clip.bin";
}
