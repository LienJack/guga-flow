import type { Phase3CanvasNodeType } from "@guga-flow/shared-types";

export interface BusinessNodeFieldDefinition {
  key: string;
  label: string;
  multiline?: boolean;
  inputType?: "text" | "number";
}

export const BUSINESS_NODE_FIELDS = {
  novel: [
    { key: "synopsis", label: "Synopsis", multiline: true },
    { key: "sourceText", label: "Source Text", multiline: true },
    { key: "language", label: "Language" },
  ],
  scene_frame: [
    { key: "label", label: "Label" },
    { key: "order", label: "Order", inputType: "number" },
    { key: "description", label: "Description", multiline: true },
  ],
  scene: [
    { key: "sceneNumber", label: "Scene Number" },
    { key: "synopsis", label: "Synopsis", multiline: true },
    { key: "location", label: "Location" },
    { key: "timeOfDay", label: "Time of Day" },
    { key: "mood", label: "Mood" },
  ],
  shot: [
    { key: "shotNumber", label: "Shot Number" },
    { key: "visualDescription", label: "Visual Description", multiline: true },
    { key: "action", label: "Action", multiline: true },
    { key: "cameraMovement", label: "Camera Movement" },
    { key: "durationSeconds", label: "Duration", inputType: "number" },
    { key: "promptNotes", label: "Prompt Notes", multiline: true },
    { key: "negativePromptNotes", label: "Negative Prompt", multiline: true },
  ],
  character_asset: [
    { key: "name", label: "Name" },
    { key: "role", label: "Role" },
    { key: "appearance", label: "Appearance", multiline: true },
    { key: "personality", label: "Personality", multiline: true },
    { key: "wardrobe", label: "Wardrobe", multiline: true },
    { key: "consistencyPrompt", label: "Consistency Prompt", multiline: true },
    { key: "identityPrompt", label: "Identity Prompt", multiline: true },
  ],
  location_asset: [
    { key: "name", label: "Name" },
    { key: "environment", label: "Environment", multiline: true },
    { key: "mood", label: "Mood" },
    { key: "visualStyle", label: "Visual Style", multiline: true },
    { key: "consistencyPrompt", label: "Consistency Prompt", multiline: true },
    { key: "locationPrompt", label: "Location Prompt", multiline: true },
  ],
  image: [
    { key: "description", label: "Description", multiline: true },
    { key: "prompt", label: "Prompt", multiline: true },
    { key: "assetId", label: "Asset ID" },
  ],
  video: [
    { key: "description", label: "Description", multiline: true },
    { key: "prompt", label: "Prompt", multiline: true },
    { key: "durationSeconds", label: "Duration", inputType: "number" },
    { key: "assetId", label: "Asset ID" },
  ],
  editor_package: [
    { key: "packageName", label: "Package Name" },
    { key: "format", label: "Format" },
    { key: "assetId", label: "Asset ID" },
    { key: "notes", label: "Notes", multiline: true },
  ],
} as const satisfies Record<Phase3CanvasNodeType, readonly BusinessNodeFieldDefinition[]>;

export function getBusinessNodeFields(type: Phase3CanvasNodeType): BusinessNodeFieldDefinition[] {
  return [...BUSINESS_NODE_FIELDS[type]];
}
