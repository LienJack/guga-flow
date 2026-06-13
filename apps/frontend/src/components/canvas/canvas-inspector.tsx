import type {
  CanvasEdgeRecord,
  CanvasNodeRecord,
  CharacterAssetNodeData,
  CharacterLifecycleStageData,
  CharacterStageReferenceData,
  GenerationJobRecord,
  GenerationQueueSummary,
  ImageNodeData,
  ShotNodeData,
  StoryBlueprintNodeData,
  StoryEventTraceData,
  UpdateCanvasNodeInput,
  VideoNodeData,
} from "@guga-flow/shared-types";
import React from "react";

import { updateCanvasNode } from "../../lib/api";
import { AssetLibrary } from "../projects/asset-library";
import { type CanvasGraphState } from "./canvas-edge-data";
import { CanvasEdgeInspector } from "./canvas-edge-inspector";
import type { CanvasSelectionState } from "./canvas-selection";
import { BusinessNodeForm } from "./business-node-form";
import { CanvasProductivityActions } from "./canvas-productivity-actions";
import { EditorExportActions, isExportableVideoNode } from "./editor-export-actions";
import { GenerationActions, GenerationBatchActions } from "./generation-actions";
import { NodeReferenceAssets } from "./node-reference-assets";
import { buildPromptPreviewRefreshKey, ShotPromptPreview } from "./shot-prompt-preview";

interface CanvasInspectorProps {
  edges: CanvasEdgeRecord[];
  projectId: string;
  nodes: CanvasNodeRecord[];
  generationJobs?: GenerationJobRecord[];
  selection: CanvasSelectionState;
  onGraphUpdated(graph: CanvasGraphState): void;
  onGenerationChanged?(queueSummary?: GenerationQueueSummary): void;
  onNodeUpdated(node: CanvasNodeRecord): void;
  onSelectionChange(selection: CanvasSelectionState): void;
}

export function CanvasInspector({
  edges,
  generationJobs = [],
  nodes,
  onGenerationChanged,
  onGraphUpdated,
  onNodeUpdated,
  onSelectionChange,
  projectId,
  selection,
}: CanvasInspectorProps) {
  const selectedNode =
    selection.kind === "business-node"
      ? nodes.find((node) => node.id === selection.nodeId)
      : undefined;
  const selectedEdge =
    selection.kind === "business-edge"
      ? edges.find((edge) => edge.id === selection.edgeId)
      : undefined;
  const promptRefreshKey = selectedNode ? buildPromptPreviewRefreshKey(nodes, edges) : "";
  const selectedBatchImageNodes =
    selection.kind === "multi"
      ? selection.nodeIds
          .map((nodeId) => nodes.find((node) => node.id === nodeId))
          .filter((node): node is CanvasNodeRecord<ImageNodeData> => {
            if (!node || node.type !== "image") {
              return false;
            }
            return typeof (node.dataJson as ImageNodeData | undefined)?.assetId === "string";
          })
      : [];
  const selectedBatchShotNodes =
    selection.kind === "multi"
      ? selection.nodeIds
          .map((nodeId) => nodes.find((node) => node.id === nodeId))
          .filter(
            (node): node is CanvasNodeRecord<ShotNodeData> =>
              Boolean(node && node.type === "shot"),
          )
      : [];
  const selectedExportVideoNodes =
    selection.kind === "multi"
      ? selection.nodeIds
          .map((nodeId) => nodes.find((node) => node.id === nodeId))
          .filter((node): node is CanvasNodeRecord<VideoNodeData> => isExportableVideoNode(node))
      : [];

  return (
    <div className="canvas-inspector">
      <section className="inspector-section" aria-label="Selection details">
        {selection.kind === "empty" ? (
          <InspectorState title="No selection" value="Canvas ready" />
        ) : null}
        {selection.kind === "multi" ? (
          <InspectorState title="Multiple selection" value={`${selection.count} objects`} />
        ) : null}
        {selection.kind === "unsupported" ? (
          <InspectorState title="Canvas object" value={selection.shapeType} />
        ) : null}
        {selection.kind === "business-edge" && !selectedEdge ? (
          <InspectorState title="Edge unavailable" value={selection.edgeId} />
        ) : null}
        {selection.kind === "business-node" && !selectedNode ? (
          <InspectorState title="Node unavailable" value={selection.nodeId} />
        ) : null}
        {selectedEdge ? (
          <CanvasEdgeInspector
            edge={selectedEdge}
            edges={edges}
            nodes={nodes}
            projectId={projectId}
            onGraphUpdated={onGraphUpdated}
            onSelectionChange={onSelectionChange}
          />
        ) : null}
        {selectedNode ? (
          <BusinessNodeForm
            node={selectedNode}
            onSave={async (input) => {
              const result = await saveNode(projectId, selectedNode.id, input);
              onNodeUpdated(result);
            }}
          />
        ) : null}
        {selectedNode ? <NodeTracePanel node={selectedNode} nodes={nodes} /> : null}
        {selectedNode ? (
          <CanvasProductivityActions
            edges={edges}
            node={selectedNode}
            nodes={nodes}
            projectId={projectId}
            onGraphUpdated={onGraphUpdated}
            onNodeUpdated={onNodeUpdated}
            onSelectionChange={onSelectionChange}
          />
        ) : null}
        {selectedNode ? (
          <NodeReferenceAssets
            projectId={projectId}
            node={selectedNode}
            onNodeUpdated={onNodeUpdated}
          />
        ) : null}
        {selectedNode ? (
          <GenerationActions
            generationJobs={generationJobs}
            projectId={projectId}
            node={selectedNode}
            onGenerationChanged={onGenerationChanged}
          />
        ) : null}
        {selection.kind === "multi" ? (
          <GenerationBatchActions
            generationJobs={generationJobs}
            imageNodes={selectedBatchImageNodes}
            projectId={projectId}
            shotNodes={selectedBatchShotNodes}
            onGenerationChanged={onGenerationChanged}
          />
        ) : null}
        {selection.kind === "multi" ? (
          <EditorExportActions
            generationJobs={generationJobs}
            projectId={projectId}
            videoNodes={selectedExportVideoNodes}
            onGenerationChanged={onGenerationChanged}
          />
        ) : null}
        {selectedNode ? (
          <ShotPromptPreview projectId={projectId} node={selectedNode} refreshKey={promptRefreshKey} />
        ) : null}
      </section>

      <AssetLibrary projectId={projectId} />
    </div>
  );
}

function InspectorState({ title, value }: { title: string; value: string }) {
  return (
    <div className="empty-state small inspector-state">
      <strong>{title}</strong>
      <span>{value}</span>
    </div>
  );
}

function NodeTracePanel({
  node,
  nodes,
}: {
  node: CanvasNodeRecord;
  nodes: readonly CanvasNodeRecord[];
}) {
  const data = objectData(node.dataJson);
  const blueprint = node.type === "novel" ? storyBlueprint(data) : undefined;
  const storyEvents =
    node.type === "scene_frame" || node.type === "scene" || node.type === "shot"
      ? storyEventArray(data.storyEvents)
      : [];
  const stageRefs = node.type === "shot" ? characterStageReferenceArray(data.characterStageRefs) : [];
  const lifecycleStages = node.type === "character_asset" ? lifecycleStageArray(data.lifecycleStages) : [];
  const lockedFields = node.type === "character_asset" ? stringArray(data.lockedFields) : [];
  const locked = node.type === "character_asset" && data.locked === true;

  if (!blueprint && storyEvents.length === 0 && stageRefs.length === 0 && lifecycleStages.length === 0 && !locked) {
    return null;
  }

  return (
    <section className="node-trace-panel" aria-label="Story trace">
      <div className="panel-heading compact">
        <h2>Story trace</h2>
        <span>{traceSummary(blueprint, storyEvents, stageRefs, lifecycleStages, locked, lockedFields)}</span>
      </div>

      {blueprint ? (
        <div className="node-trace-group">
          <strong>Blueprint</strong>
          {blueprint.worldSummary ? <p>{blueprint.worldSummary}</p> : null}
          <small>
            {compactText([
              countLabel(blueprint.timelineEvents?.length ?? 0, "event"),
              countLabel(blueprint.characterRelationships?.length ?? 0, "relation"),
            ])}
          </small>
        </div>
      ) : null}

      {storyEvents.length > 0 ? (
        <TraceList title="Events">
          {storyEvents.map((event) => (
            <li key={event.eventId}>
              <strong>{event.title ?? event.eventId}</strong>
              <span>{event.summary ?? event.sourceExcerpt ?? event.result ?? event.eventId}</span>
              <small>
                {compactText([
                  event.emotion ? `Emotion: ${event.emotion}` : "",
                  event.conflict ? `Conflict: ${event.conflict}` : "",
                  event.result ? `Result: ${event.result}` : "",
                ])}
              </small>
            </li>
          ))}
        </TraceList>
      ) : null}

      {stageRefs.length > 0 ? (
        <TraceList title="Stage refs">
          {stageRefs.map((reference) => {
            const character = characterForReference(reference.characterTempId, nodes);
            const stage = character ? stageForReference(reference.stageId, character) : undefined;
            return (
              <li key={`${reference.characterTempId}:${reference.stageId}`}>
                <strong>{characterLabel(character, reference.characterTempId)}</strong>
                <span>{stage?.label ?? reference.stageId}</span>
                {stage?.identityPrompt ? <small>{stage.identityPrompt}</small> : null}
              </li>
            );
          })}
        </TraceList>
      ) : null}

      {lifecycleStages.length > 0 ? (
        <TraceList title="Lifecycle">
          {lifecycleStages.map((stage) => (
            <li key={stage.stageId}>
              <strong>{stage.label || stage.stageId}</strong>
              <span>
                {compactText([stage.ageRange, stage.costume, stage.emotionalState]) || stage.stageId}
              </span>
              {stage.identityPrompt ? <small>{stage.identityPrompt}</small> : null}
            </li>
          ))}
        </TraceList>
      ) : null}

      {locked ? (
        <div className="node-trace-lock">
          <strong>Locked identity</strong>
          <span>{lockedFields.length > 0 ? lockedFields.join(", ") : "Core identity fields"}</span>
        </div>
      ) : null}
    </section>
  );
}

function TraceList({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="node-trace-group">
      <strong>{title}</strong>
      <ul className="node-trace-list">{children}</ul>
    </div>
  );
}

function traceSummary(
  blueprint: StoryBlueprintNodeData | undefined,
  storyEvents: readonly StoryEventTraceData[],
  stageRefs: readonly CharacterStageReferenceData[],
  lifecycleStages: readonly CharacterLifecycleStageData[],
  locked: boolean,
  lockedFields: readonly string[],
): string {
  return (
    compactText([
      blueprint ? "Blueprint" : "",
      countLabel(storyEvents.length, "event"),
      countLabel(stageRefs.length, "stage ref"),
      countLabel(lifecycleStages.length, "stage"),
      locked ? countLabel(Math.max(lockedFields.length, 1), "lock") : "",
    ]) || "Trace"
  );
}

function storyBlueprint(data: Record<string, unknown>): StoryBlueprintNodeData | undefined {
  const blueprint = objectData(data.storyBlueprint);
  if (Object.keys(blueprint).length === 0) {
    return undefined;
  }

  return {
    worldSummary: textValue(blueprint.worldSummary),
    timelineEvents: storyEventArray(blueprint.timelineEvents),
    characterRelationships: objectArray(blueprint.characterRelationships)
      .map((item) => ({
        relationshipId: textValue(item.relationshipId) ?? "",
        characterTempIds: stringArray(item.characterTempIds),
        type: textValue(item.type),
        summary: textValue(item.summary),
        status: textValue(item.status),
      }))
      .filter((relationship) => relationship.relationshipId),
    themes: stringArray(blueprint.themes),
    adaptationNotes: textValue(blueprint.adaptationNotes),
  };
}

function storyEventArray(value: unknown): StoryEventTraceData[] {
  return objectArray(value)
    .map((item) => ({
      eventId: textValue(item.eventId) ?? "",
      title: textValue(item.title),
      orderIndex: typeof item.orderIndex === "number" ? item.orderIndex : undefined,
      chapterIndex: typeof item.chapterIndex === "number" ? item.chapterIndex : undefined,
      sourceExcerpt: textValue(item.sourceExcerpt),
      summary: textValue(item.summary),
      characters: stringArray(item.characters),
      locationName: textValue(item.locationName),
      emotion: textValue(item.emotion),
      conflict: textValue(item.conflict),
      result: textValue(item.result),
      estimatedDurationSec:
        typeof item.estimatedDurationSec === "number" ? item.estimatedDurationSec : undefined,
    }))
    .filter((event) => event.eventId);
}

function characterStageReferenceArray(value: unknown): CharacterStageReferenceData[] {
  return objectArray(value)
    .map((item) => ({
      characterTempId: textValue(item.characterTempId) ?? "",
      stageId: textValue(item.stageId) ?? "",
    }))
    .filter((reference) => reference.characterTempId && reference.stageId);
}

function lifecycleStageArray(value: unknown): CharacterLifecycleStageData[] {
  return objectArray(value)
    .map((item) => ({
      stageId: textValue(item.stageId) ?? "",
      label: textValue(item.label) ?? "",
      ageRange: textValue(item.ageRange),
      appearance: textValue(item.appearance),
      costume: textValue(item.costume),
      hairstyle: textValue(item.hairstyle),
      emotionalState: textValue(item.emotionalState),
      identityPrompt: textValue(item.identityPrompt),
    }))
    .filter((stage) => stage.stageId);
}

function characterForReference(
  referenceId: string,
  nodes: readonly CanvasNodeRecord[],
): CanvasNodeRecord<CharacterAssetNodeData> | undefined {
  return nodes.find((candidate): candidate is CanvasNodeRecord<CharacterAssetNodeData> => {
    if (candidate.type !== "character_asset") {
      return false;
    }
    const data = objectData(candidate.dataJson);
    return candidate.id === referenceId || textValue(objectData(data.storyboardImport).sourceTempId) === referenceId;
  });
}

function stageForReference(
  stageId: string,
  character: CanvasNodeRecord<CharacterAssetNodeData>,
): CharacterLifecycleStageData | undefined {
  return lifecycleStageArray(objectData(character.dataJson).lifecycleStages).find((stage) => stage.stageId === stageId);
}

function characterLabel(
  character: CanvasNodeRecord<CharacterAssetNodeData> | undefined,
  fallback: string,
): string {
  if (!character) {
    return fallback;
  }
  const data = objectData(character.dataJson);
  return character.title ?? textValue(data.name) ?? fallback;
}

function countLabel(count: number, label: string): string {
  return count > 0 ? `${count} ${label}${count === 1 ? "" : "s"}` : "";
}

function compactText(values: ReadonlyArray<string | undefined>): string {
  return values.filter((value): value is string => Boolean(value?.trim())).join(" / ");
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(textValue).filter((item): item is string => Boolean(item)) : [];
}

function objectArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          typeof item === "object" && item !== null && !Array.isArray(item),
      )
    : [];
}

function objectData(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function textValue(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const text = value.trim();
  return text ? text : undefined;
}

async function saveNode(
  projectId: string,
  nodeId: string,
  input: UpdateCanvasNodeInput,
): Promise<CanvasNodeRecord> {
  const result = await updateCanvasNode(projectId, nodeId, input);
  return result.node;
}
