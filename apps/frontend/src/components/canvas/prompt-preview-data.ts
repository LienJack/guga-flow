import type {
  PromptCompositionChannel,
  PromptDebugPart,
  PromptDebugPartKind,
  PromptMissingContext,
  ShotPromptCompositionResult,
} from "@guga-flow/shared-types";

export interface PromptPreviewPartView {
  id: string;
  label: string;
  kindLabel: string;
  text: string;
  sourceNodeLabel: string;
  referenceAssetLabel: string;
}

export interface PromptPreviewChannelView {
  channel: PromptCompositionChannel;
  title: string;
  prompt: string;
  negativePrompt: string;
  hasPrompt: boolean;
  parts: PromptPreviewPartView[];
  missingContextLabel: string;
  referenceAssetLabel: string;
}

const PART_KIND_LABELS: Record<PromptDebugPartKind, string> = {
  global_style: "Global style",
  scene: "Scene",
  location: "Location",
  character: "Character",
  shot: "Shot",
  model_suffix: "Model suffix",
  negative_prompt: "Negative prompt",
};

export function getPromptPreviewChannels(
  result: ShotPromptCompositionResult | undefined,
): PromptPreviewChannelView[] {
  if (!result) {
    return [];
  }

  return [result.image, result.video].map((composition) => ({
    channel: composition.channel,
    title: composition.channel === "image" ? "Image prompt" : "Video prompt",
    prompt: composition.prompt,
    negativePrompt: composition.negativePrompt,
    hasPrompt: composition.prompt.trim().length > 0,
    parts: composition.parts.map(formatPromptDebugPart),
    missingContextLabel: summarizePromptMissingContext(composition.missingContext),
    referenceAssetLabel: summarizeReferenceAssetIds(result.referenceAssetIds),
  }));
}

export function formatPromptDebugPart(part: PromptDebugPart): PromptPreviewPartView {
  return {
    id: part.id,
    label: part.label,
    kindLabel: PART_KIND_LABELS[part.kind],
    text: part.text,
    sourceNodeLabel: summarizeSourceNodeIds(part.sourceNodeIds ?? []),
    referenceAssetLabel: summarizeReferenceAssetIds(part.referenceAssetIds ?? []),
  };
}

export function summarizePromptMissingContext(items: readonly PromptMissingContext[]): string {
  const uniqueLabels = uniqueStrings(items.map((item) => item.label));
  if (uniqueLabels.length === 0) {
    return "No missing context";
  }
  return `Missing: ${uniqueLabels.join(", ")}`;
}

export function summarizeReferenceAssetIds(assetIds: readonly string[]): string {
  const uniqueIds = uniqueStrings(assetIds);
  if (uniqueIds.length === 0) {
    return "No reference images";
  }
  const noun = uniqueIds.length === 1 ? "reference image" : "reference images";
  return `${uniqueIds.length} ${noun}: ${uniqueIds.join(", ")}`;
}

function summarizeSourceNodeIds(nodeIds: readonly string[]): string {
  const uniqueIds = uniqueStrings(nodeIds);
  if (uniqueIds.length === 0) {
    return "";
  }
  const noun = uniqueIds.length === 1 ? "source node" : "source nodes";
  return `${uniqueIds.length} ${noun}: ${uniqueIds.join(", ")}`;
}

function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  return values
    .map((value) => value.trim())
    .filter((value) => {
      if (!value || seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
}
