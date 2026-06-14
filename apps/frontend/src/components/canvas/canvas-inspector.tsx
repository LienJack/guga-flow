import type {
  CanvasEdgeRecord,
  CanvasNodeRecord,
  CanvasSnapshotJson,
  CharacterAssetNodeData,
  CharacterLifecycleStageData,
  CharacterStageReferenceData,
  Director3DNodeData,
  Director3DSceneData,
  GenerationJobRecord,
  GenerationQueueSummary,
  ImageNodeData,
  PanoramaAnnotationData,
  PanoramaNodeData,
  ProjectDetail,
  ShotNodeData,
  StoryBlueprintNodeData,
  StoryEventTraceData,
  UpdateCanvasNodeInput,
  VideoNodeData,
} from "@guga-flow/shared-types";
import { DIRECTOR_3D_SCENE_VERSION } from "@guga-flow/shared-types";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { assetPreviewUrl, updateCanvasNode, uploadAsset } from "../../lib/api";
import { useI18n } from "../../lib/i18n";
import { AssetLibrary } from "../projects/asset-library";
import { type CanvasGraphState } from "./canvas-edge-data";
import { CanvasEdgeInspector } from "./canvas-edge-inspector";
import type { CanvasSelectionState } from "./canvas-selection";
import { BusinessNodeForm } from "./business-node-form";
import { CanvasProductivityActions } from "./canvas-productivity-actions";
import { EditorExportActions, isExportableVideoNode } from "./editor-export-actions";
import {
  ProjectGenerationSettingsPanel,
  ShotGenerationSettingsPanel,
} from "./generation-creative-settings-panel";
import { GenerationActions, GenerationBatchActions } from "./generation-actions";
import { NodeAudioAssets } from "./node-audio-assets";
import { NodeReferenceAssets } from "./node-reference-assets";
import { buildPromptPreviewRefreshKey, ShotPromptPreview } from "./shot-prompt-preview";

interface CanvasInspectorProps {
  edges: CanvasEdgeRecord[];
  projectId: string;
  project?: ProjectDetail | null;
  nodes: CanvasNodeRecord[];
  generationJobs?: GenerationJobRecord[];
  selection: CanvasSelectionState;
  onGraphUpdated(graph: CanvasGraphState): void;
  onGenerationChanged?(queueSummary?: GenerationQueueSummary): void;
  onNodeUpdated(node: CanvasNodeRecord): void;
  onProjectUpdated?(project: ProjectDetail): void;
  onSelectionChange(selection: CanvasSelectionState): void;
}

export function CanvasInspector({
  edges,
  generationJobs = [],
  nodes,
  onGenerationChanged,
  onGraphUpdated,
  onNodeUpdated,
  onProjectUpdated,
  onSelectionChange,
  project,
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
  const selectedShotNode =
    selectedNode && selectedNode.type === "shot"
      ? (selectedNode as CanvasNodeRecord<ShotNodeData>)
      : undefined;
  const hasActiveSelection = selection.kind !== "empty";
  const selectionDetails = (
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
      {selectedNode?.type === "panorama" ? (
        <PanoramaPreviewPanel
          node={selectedNode as CanvasNodeRecord<PanoramaNodeData>}
          projectId={projectId}
        />
      ) : null}
      {selectedNode?.type === "director_3d" ? (
        <Director3DPanel
          node={selectedNode as CanvasNodeRecord<Director3DNodeData>}
          projectId={projectId}
          onNodeUpdated={onNodeUpdated}
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
      {selectedShotNode ? (
        <ShotGenerationSettingsPanel
          node={selectedShotNode}
          projectGenerationSettings={project?.generationSettings}
          projectId={projectId}
          onNodeUpdated={onNodeUpdated}
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
        <NodeAudioAssets projectId={projectId} node={selectedNode} onNodeUpdated={onNodeUpdated} />
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
  );

  return (
    <div className="canvas-inspector">
      {hasActiveSelection ? selectionDetails : null}
      <ProjectGenerationSettingsPanel project={project} onProjectUpdated={onProjectUpdated} />
      <GenerationQueueInspectorPanel generationJobs={generationJobs} />
      {hasActiveSelection ? null : selectionDetails}
      <AssetLibrary projectId={projectId} />
    </div>
  );
}

function GenerationQueueInspectorPanel({
  generationJobs,
}: {
  generationJobs: readonly GenerationJobRecord[];
}) {
  const { t } = useI18n();
  const counts = summarizeGenerationJobs(generationJobs);
  const failedJobs = generationJobs.filter((job) => job.status === "failed").slice(0, 3);

  return (
    <section className="generation-panel queue-inspector-panel" aria-label={t("queue.summary")}>
      <div className="section-heading-row">
        <h3>{t("queue.summary")}</h3>
        <span className="status-chip">{generationJobs.length}</span>
      </div>
      <div className="queue-inspector-grid">
        <QueueMetric label={t("queue.queued", { count: "" }).trim()} value={counts.queued} />
        <QueueMetric label={t("queue.running", { count: "" }).trim()} value={counts.running} />
        <QueueMetric label={t("queue.waiting", { count: "" }).trim()} value={counts.provider_waiting} />
        <QueueMetric label={t("queue.failed", { count: "" }).trim()} value={counts.failed} warning />
        <QueueMetric label={t("queue.cancelled", { count: "" }).trim()} value={counts.cancelled} />
      </div>
      <div className="queue-failure-list">
        <strong>{t("queue.recentFailures")}</strong>
        {failedJobs.length ? (
          <ul>
            {failedJobs.map((job) => (
              <li key={job.id}>
                <span>{job.operation}</span>
                <small>{job.errorMessage || job.id}</small>
              </li>
            ))}
          </ul>
        ) : (
          <span>{t("queue.noRecentFailures")}</span>
        )}
      </div>
    </section>
  );
}

function QueueMetric({
  label,
  value,
  warning = false,
}: {
  label: string;
  value: number;
  warning?: boolean;
}) {
  return (
    <div className={`queue-metric ${warning ? "warning" : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PanoramaPreviewPanel({
  node,
  projectId,
}: {
  node: CanvasNodeRecord<PanoramaNodeData>;
  projectId: string;
}) {
  const data = objectData(node.dataJson) as PanoramaNodeData;
  const annotations = panoramaAnnotations(data.annotations);

  return (
    <section className="generation-panel" aria-label="Panorama preview">
      <div className="section-heading-row">
        <h3>Panorama preview</h3>
        <span className="status-chip">{annotations.length}</span>
      </div>
      {data.assetId ? (
        <div
          style={{
            aspectRatio: "16 / 9",
            background: "#0f172a",
            borderRadius: 8,
            overflow: "hidden",
          }}
        >
          <img
            alt={node.title ?? "Panorama"}
            src={assetPreviewUrl(projectId, data.assetId)}
            style={{ display: "block", height: "100%", objectFit: "cover", width: "100%" }}
          />
        </div>
      ) : (
        <InspectorState title="No panorama asset" value="Attach an image asset id to preview." />
      )}
      <dl className="settings-fact-grid">
        <Fact label="Yaw" value={numberLabel(data.yaw, "deg")} />
        <Fact label="Pitch" value={numberLabel(data.pitch, "deg")} />
        <Fact label="FOV" value={numberLabel(data.fov, "deg")} />
        <Fact label="Asset" value={data.assetId} />
      </dl>
      {data.promptContext ? <p>{data.promptContext}</p> : null}
      {annotations.length ? (
        <TraceList title="Annotations">
          {annotations.map((annotation) => (
            <li key={annotation.annotationId}>
              <strong>{annotation.label}</strong>
              <span>{compactText([annotation.prompt, annotation.note]) || "View marker"}</span>
              <small>
                {compactText([
                  numberLabel(annotation.yaw, "deg yaw"),
                  numberLabel(annotation.pitch, "deg pitch"),
                ])}
              </small>
            </li>
          ))}
        </TraceList>
      ) : null}
    </section>
  );
}

function Director3DPanel({
  node,
  onNodeUpdated,
  projectId,
}: {
  node: CanvasNodeRecord<Director3DNodeData>;
  onNodeUpdated(node: CanvasNodeRecord): void;
  projectId: string;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const [captureBusy, setCaptureBusy] = useState(false);
  const [captureError, setCaptureError] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const data = objectData(node.dataJson) as Director3DNodeData;
  const sceneData = directorSceneData(data.scene);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    } catch (error) {
      setRenderError(error instanceof Error ? error.message : "3D preview unavailable");
      return;
    }

    setRenderError(null);
    renderer.domElement.setAttribute("data-testid", "director-3d-canvas");
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.replaceChildren(renderer.domElement);
    rendererRef.current = renderer;

    const { animatedObjects, camera, scene } = createDirectorThreeScene(sceneData);
    let animationFrame = 0;

    const resize = () => {
      const width = Math.max(Math.floor(mount.clientWidth || 300), 240);
      const height = 220;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const render = () => {
      for (const object of animatedObjects) {
        object.rotation.y += 0.006;
      }
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(render);
    };

    resize();
    render();
    window.addEventListener("resize", resize);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      disposeThreeScene(scene);
      renderer.dispose();
      if (rendererRef.current === renderer) {
        rendererRef.current = null;
      }
      mount.replaceChildren();
    };
  }, [node.id, node.dataJson]);

  async function handleCapture() {
    const renderer = rendererRef.current;
    if (!renderer) {
      setCaptureError("3D preview is not ready");
      return;
    }
    setCaptureBusy(true);
    setCaptureError(null);
    try {
      const blob = await canvasBlob(renderer.domElement);
      const file = new File([blob], `director-3d-${node.id}.png`, { type: "image/png" });
      const asset = await uploadAsset(projectId, { file, purpose: "canvas_fragment" });
      const result = await updateCanvasNode(projectId, node.id, {
        dataJson: {
          ...(objectData(node.dataJson) as Record<string, CanvasSnapshotJson>),
          snapshotAssetId: asset.id,
          snapshotCapturedAt: new Date().toISOString(),
        },
      });
      onNodeUpdated(result.node);
    } catch (error) {
      setCaptureError(error instanceof Error ? error.message : "Unable to capture 3D snapshot");
    } finally {
      setCaptureBusy(false);
    }
  }

  return (
    <section className="generation-panel" aria-label="3D director preview">
      <div className="section-heading-row">
        <h3>3D director</h3>
        <span className="status-chip">{sceneData.objects.length}</span>
      </div>
      <div
        ref={mountRef}
        data-testid="director-3d-preview"
        style={{
          background: sceneData.background ?? "#101820",
          borderRadius: 8,
          minHeight: 220,
          overflow: "hidden",
        }}
      />
      {renderError ? <p className="form-error">{renderError}</p> : null}
      <dl className="settings-fact-grid">
        <Fact label="Objects" value={String(sceneData.objects.length)} />
        <Fact label="Snapshot" value={data.snapshotAssetId} />
      </dl>
      {data.promptContext ? <p>{data.promptContext}</p> : null}
      <button className="primary-action compact" type="button" disabled={captureBusy} onClick={handleCapture}>
        Capture Snapshot
      </button>
      {captureError ? <p className="form-error">{captureError}</p> : null}
    </section>
  );
}

function Fact({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value?.trim() || "None"}</dd>
    </div>
  );
}

function summarizeGenerationJobs(
  generationJobs: readonly GenerationJobRecord[],
): Record<GenerationJobRecord["status"], number> {
  const counts: Record<GenerationJobRecord["status"], number> = {
    cancelled: 0,
    failed: 0,
    provider_waiting: 0,
    queued: 0,
    running: 0,
    succeeded: 0,
  };
  for (const job of generationJobs) {
    counts[job.status] += 1;
  }
  return counts;
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

function panoramaAnnotations(value: unknown): PanoramaAnnotationData[] {
  return objectArray(value)
    .map((item) => {
      const note = textValue(item.note);
      const prompt = textValue(item.prompt);
      const color = textValue(item.color);
      return {
        annotationId: textValue(item.annotationId) ?? "",
        label: textValue(item.label) ?? "",
        yaw: finiteNumber(item.yaw) ?? 0,
        pitch: finiteNumber(item.pitch) ?? 0,
        ...(note ? { note } : {}),
        ...(prompt ? { prompt } : {}),
        ...(color ? { color } : {}),
      };
    })
    .filter((annotation) => annotation.annotationId && annotation.label);
}

function numberLabel(value: unknown, suffix: string): string | undefined {
  const numberValue = finiteNumber(value);
  if (numberValue === undefined) {
    return undefined;
  }
  return `${numberValue}${suffix ? ` ${suffix}` : ""}`;
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

const DEFAULT_DIRECTOR_SCENE: Director3DSceneData = {
  version: DIRECTOR_3D_SCENE_VERSION,
  background: "#101820",
  camera: {
    position: { x: 4, y: 3, z: 6 },
    target: { x: 0, y: 0.75, z: 0 },
    fov: 45,
  },
  light: {
    color: "#ffffff",
    intensity: 1.4,
    position: { x: 3, y: 5, z: 4 },
  },
  objects: [
    {
      objectId: "subject",
      kind: "box",
      label: "Subject block",
      color: "#4f8cff",
      position: { x: 0, y: 0.65, z: 0 },
      scale: { x: 1.1, y: 1.3, z: 1 },
    },
    {
      objectId: "camera-mark",
      kind: "sphere",
      label: "Camera mark",
      color: "#f4c542",
      position: { x: -1.8, y: 0.35, z: 1.2 },
      scale: { x: 0.45, y: 0.45, z: 0.45 },
    },
    {
      objectId: "floor",
      kind: "plane",
      label: "Stage floor",
      color: "#2c3340",
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: -1.5708, y: 0, z: 0 },
      scale: { x: 5, y: 5, z: 1 },
    },
  ],
};

function directorSceneData(value: unknown): Director3DSceneData {
  const raw = objectData(value);
  const objects = objectArray(raw.objects)
    .map((item) => {
      let kind: "box" | "sphere" | "plane" = "box";
      if (item.kind === "sphere" || item.kind === "plane") {
        kind = item.kind;
      }
      const label = textValue(item.label);
      const color = textValue(item.color);
      return {
        objectId: textValue(item.objectId) ?? "",
        kind,
        ...(label ? { label } : {}),
        ...(color ? { color } : {}),
        position: vectorData(item.position, { x: 0, y: 0.5, z: 0 }),
        rotation: vectorData(item.rotation, { x: 0, y: 0, z: 0 }),
        scale: vectorData(item.scale, { x: 1, y: 1, z: 1 }),
      };
    })
    .filter((item) => item.objectId);

  if (!objects.length) {
    return DEFAULT_DIRECTOR_SCENE;
  }

  const camera = objectData(raw.camera);
  const light = objectData(raw.light);
  return {
    version: DIRECTOR_3D_SCENE_VERSION,
    background: textValue(raw.background) ?? DEFAULT_DIRECTOR_SCENE.background ?? "#101820",
    camera: {
      position: vectorData(camera.position, DEFAULT_DIRECTOR_SCENE.camera?.position ?? { x: 4, y: 3, z: 6 }),
      target: vectorData(camera.target, DEFAULT_DIRECTOR_SCENE.camera?.target ?? { x: 0, y: 0.75, z: 0 }),
      fov: finiteNumber(camera.fov) ?? DEFAULT_DIRECTOR_SCENE.camera?.fov ?? 45,
    },
    light: {
      color: textValue(light.color) ?? DEFAULT_DIRECTOR_SCENE.light?.color ?? "#ffffff",
      intensity: finiteNumber(light.intensity) ?? DEFAULT_DIRECTOR_SCENE.light?.intensity ?? 1.4,
      position: vectorData(light.position, DEFAULT_DIRECTOR_SCENE.light?.position ?? { x: 3, y: 5, z: 4 }),
    },
    objects,
  };
}

function vectorData(value: unknown, fallback: { x: number; y: number; z: number }) {
  const raw = objectData(value);
  return {
    x: finiteNumber(raw.x) ?? fallback.x,
    y: finiteNumber(raw.y) ?? fallback.y,
    z: finiteNumber(raw.z) ?? fallback.z,
  };
}

function createDirectorThreeScene(sceneData: Director3DSceneData): {
  animatedObjects: THREE.Object3D[];
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
} {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(sceneData.background ?? "#101820");

  const camera = new THREE.PerspectiveCamera(sceneData.camera?.fov ?? 45, 1, 0.1, 100);
  const cameraPosition = sceneData.camera?.position ?? { x: 4, y: 3, z: 6 };
  const cameraTarget = sceneData.camera?.target ?? { x: 0, y: 0.75, z: 0 };
  camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);
  camera.lookAt(cameraTarget.x, cameraTarget.y, cameraTarget.z);

  scene.add(new THREE.AmbientLight(0xffffff, 0.45));
  const light = new THREE.DirectionalLight(
    new THREE.Color(sceneData.light?.color ?? "#ffffff"),
    sceneData.light?.intensity ?? 1.4,
  );
  const lightPosition = sceneData.light?.position ?? { x: 3, y: 5, z: 4 };
  light.position.set(lightPosition.x, lightPosition.y, lightPosition.z);
  scene.add(light);

  const animatedObjects: THREE.Object3D[] = [];
  for (const object of sceneData.objects) {
    const mesh = new THREE.Mesh(
      geometryForDirectorObject(object.kind),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(object.color ?? "#4f8cff"),
        roughness: 0.55,
        metalness: 0.08,
      }),
    );
    mesh.name = object.label ?? object.objectId;
    mesh.position.set(object.position.x, object.position.y, object.position.z);
    if (object.rotation) {
      mesh.rotation.set(object.rotation.x, object.rotation.y, object.rotation.z);
    }
    if (object.scale) {
      mesh.scale.set(object.scale.x, object.scale.y, object.scale.z);
    }
    scene.add(mesh);
    if (object.kind !== "plane") {
      animatedObjects.push(mesh);
    }
  }

  return { animatedObjects, camera, scene };
}

function geometryForDirectorObject(kind: "box" | "sphere" | "plane"): THREE.BufferGeometry {
  if (kind === "sphere") {
    return new THREE.SphereGeometry(0.7, 32, 16);
  }
  if (kind === "plane") {
    return new THREE.PlaneGeometry(1, 1);
  }
  return new THREE.BoxGeometry(1, 1, 1);
}

function disposeThreeScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    mesh.geometry?.dispose();
    const material = mesh.material;
    if (Array.isArray(material)) {
      for (const item of material) {
        item.dispose();
      }
    } else {
      material?.dispose();
    }
  });
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Canvas did not produce an image"));
        return;
      }
      resolve(blob);
    }, "image/png");
  });
}

async function saveNode(
  projectId: string,
  nodeId: string,
  input: UpdateCanvasNodeInput,
): Promise<CanvasNodeRecord> {
  const result = await updateCanvasNode(projectId, nodeId, input);
  return result.node;
}
