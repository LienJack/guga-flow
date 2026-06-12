"use client";

import type {
  CharacterDraft,
  LocationDraft,
  SceneDraft,
  ShotDraft,
  StoryboardDraftRecord,
  StoryboardLocationType,
  StoryboardResult,
} from "@guga-flow/shared-types";
import { STORYBOARD_LOCATION_TYPES, validateStoryboardResult } from "@guga-flow/shared-types";
import { CheckCircle2, Save } from "lucide-react";
import React from "react";

import {
  buildStoryboardDraftUiState,
  formatStoryboardValidationIssues,
  summarizeStoryboard,
  updateStoryboardCharacter,
  updateStoryboardLocation,
  updateStoryboardOverview,
  updateStoryboardScene,
  updateStoryboardShot,
} from "./storyboard-data";

interface StoryboardEditorProps {
  draft?: StoryboardDraftRecord;
  storyboard?: StoryboardResult;
  dirty?: boolean;
  busy?: boolean;
  onStoryboardChange(storyboard: StoryboardResult): void;
  onSave(): void;
  onMarkReady(): void;
}

export function StoryboardEditor({
  draft,
  storyboard,
  dirty = false,
  busy = false,
  onStoryboardChange,
  onSave,
  onMarkReady,
}: StoryboardEditorProps) {
  if (!storyboard) {
    return (
      <section className="storyboard-editor" aria-label="Storyboard draft">
        <div className="empty-state small">
          <strong>No storyboard draft</strong>
          <span>Generate from a saved novel source.</span>
        </div>
      </section>
    );
  }

  const localDraft = draft
    ? {
        ...draft,
        storyboard,
        readyForImport: dirty ? false : draft.readyForImport,
        status: dirty && draft.status === "ready" ? "valid" : draft.status,
      }
    : undefined;
  const summary = summarizeStoryboard(storyboard);
  const uiState = buildStoryboardDraftUiState(localDraft);
  const validation = validateStoryboardResult(storyboard);
  const issueSummary = validation.success
    ? uiState.issueSummary
    : formatStoryboardValidationIssues(validation.issues);

  return (
    <section className="storyboard-editor" aria-label="Storyboard draft">
      <div className="panel-heading compact">
        <h2>Storyboard</h2>
        <span>{dirty ? "Unsaved" : uiState.label}</span>
      </div>

      <div className="storyboard-summary-grid" aria-label="Storyboard summary">
        <div>
          <strong>{summary.sceneCount}</strong>
          <span>Scenes</span>
        </div>
        <div>
          <strong>{summary.shotCount}</strong>
          <span>Shots</span>
        </div>
        <div>
          <strong>{summary.characterCount}</strong>
          <span>Characters</span>
        </div>
        <div>
          <strong>{summary.durationSec}s</strong>
          <span>Duration</span>
        </div>
      </div>

      {issueSummary ? <p className="form-error">{issueSummary}</p> : null}

      <div className="storyboard-action-row">
        <button className="primary-action compact" type="button" onClick={onSave} disabled={busy}>
          <Save size={15} aria-hidden="true" />
          Save draft
        </button>
        <button
          className="ghost-action compact"
          type="button"
          onClick={onMarkReady}
          disabled={busy || dirty || !uiState.canMarkReady}
        >
          <CheckCircle2 size={15} aria-hidden="true" />
          Mark ready
        </button>
      </div>

      <section className="storyboard-editor-section" aria-label="Storyboard overview">
        <label className="field-label">
          <span>Title</span>
          <input
            name="storyboard-title"
            value={storyboard.title}
            onChange={(event) =>
              onStoryboardChange(updateStoryboardOverview(storyboard, { title: event.target.value }))
            }
          />
        </label>
        <label className="field-label">
          <span>Logline</span>
          <textarea
            name="storyboard-logline"
            rows={3}
            value={storyboard.logline}
            onChange={(event) =>
              onStoryboardChange(updateStoryboardOverview(storyboard, { logline: event.target.value }))
            }
          />
        </label>
      </section>

      <section className="storyboard-editor-section" aria-label="Characters">
        <h3>Characters</h3>
        {storyboard.characters.map((character) => (
          <CharacterEditor
            character={character}
            key={character.tempId}
            onChange={(patch) =>
              onStoryboardChange(updateStoryboardCharacter(storyboard, character.tempId, patch))
            }
          />
        ))}
      </section>

      <section className="storyboard-editor-section" aria-label="Locations">
        <h3>Locations</h3>
        {storyboard.locations.map((location) => (
          <LocationEditor
            key={location.tempId}
            location={location}
            onChange={(patch) =>
              onStoryboardChange(updateStoryboardLocation(storyboard, location.tempId, patch))
            }
          />
        ))}
      </section>

      <section className="storyboard-editor-section" aria-label="Scenes and shots">
        <h3>Scenes</h3>
        {storyboard.scenes.map((scene) => (
          <SceneEditor
            key={scene.tempId}
            scene={scene}
            onSceneChange={(patch) =>
              onStoryboardChange(updateStoryboardScene(storyboard, scene.tempId, patch))
            }
            onShotChange={(shot, patch) =>
              onStoryboardChange(
                updateStoryboardShot(storyboard, scene.tempId, shot.tempId, patch),
              )
            }
          />
        ))}
      </section>
    </section>
  );
}

function CharacterEditor({
  character,
  onChange,
}: {
  character: CharacterDraft;
  onChange(patch: Partial<Omit<CharacterDraft, "tempId">>): void;
}) {
  return (
    <div className="storyboard-editor-group">
      <div className="storyboard-group-heading">
        <strong>{character.name}</strong>
        <span>{character.tempId}</span>
      </div>
      <label className="field-label">
        <span>Name</span>
        <input
          name={`character-${character.tempId}-name`}
          value={character.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Role</span>
        <input
          name={`character-${character.tempId}-role`}
          value={character.role}
          onChange={(event) => onChange({ role: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Appearance</span>
        <textarea
          name={`character-${character.tempId}-appearance`}
          rows={3}
          value={character.appearance}
          onChange={(event) => onChange({ appearance: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Identity prompt</span>
        <textarea
          name={`character-${character.tempId}-identity-prompt`}
          rows={3}
          value={character.identityPrompt}
          onChange={(event) => onChange({ identityPrompt: event.target.value })}
        />
      </label>
    </div>
  );
}

function LocationEditor({
  location,
  onChange,
}: {
  location: LocationDraft;
  onChange(patch: Partial<Omit<LocationDraft, "tempId">>): void;
}) {
  return (
    <div className="storyboard-editor-group">
      <div className="storyboard-group-heading">
        <strong>{location.name}</strong>
        <span>{location.tempId}</span>
      </div>
      <label className="field-label">
        <span>Name</span>
        <input
          name={`location-${location.tempId}-name`}
          value={location.name}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Type</span>
        <select
          name={`location-${location.tempId}-type`}
          value={location.type}
          onChange={(event) =>
            onChange({ type: event.target.value as StoryboardLocationType })
          }
        >
          {STORYBOARD_LOCATION_TYPES.map((locationType) => (
            <option value={locationType} key={locationType}>
              {locationType}
            </option>
          ))}
        </select>
      </label>
      <label className="field-label">
        <span>Description</span>
        <textarea
          name={`location-${location.tempId}-description`}
          rows={3}
          value={location.description}
          onChange={(event) => onChange({ description: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Lighting</span>
        <input
          name={`location-${location.tempId}-lighting`}
          value={location.lighting}
          onChange={(event) => onChange({ lighting: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Location prompt</span>
        <textarea
          name={`location-${location.tempId}-prompt`}
          rows={3}
          value={location.locationPrompt}
          onChange={(event) => onChange({ locationPrompt: event.target.value })}
        />
      </label>
    </div>
  );
}

function SceneEditor({
  scene,
  onSceneChange,
  onShotChange,
}: {
  scene: SceneDraft;
  onSceneChange(patch: Partial<Omit<SceneDraft, "tempId" | "shots">>): void;
  onShotChange(shot: ShotDraft, patch: Partial<Omit<ShotDraft, "tempId">>): void;
}) {
  return (
    <div className="storyboard-editor-group scene">
      <div className="storyboard-group-heading">
        <strong>{scene.title}</strong>
        <span>{scene.tempId}</span>
      </div>
      <label className="field-label">
        <span>Scene title</span>
        <input
          name={`scene-${scene.tempId}-title`}
          value={scene.title}
          onChange={(event) => onSceneChange({ title: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Summary</span>
        <textarea
          name={`scene-${scene.tempId}-summary`}
          rows={3}
          value={scene.summary}
          onChange={(event) => onSceneChange({ summary: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Mood</span>
        <input
          name={`scene-${scene.tempId}-mood`}
          value={scene.mood}
          onChange={(event) => onSceneChange({ mood: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Character temp ids</span>
        <input
          name={`scene-${scene.tempId}-character-temp-ids`}
          value={tempIdsToText(scene.characterTempIds)}
          onChange={(event) => onSceneChange({ characterTempIds: textToTempIds(event.target.value) })}
        />
      </label>
      <label className="field-label">
        <span>Location temp id</span>
        <input
          name={`scene-${scene.tempId}-location-temp-id`}
          value={scene.locationTempId ?? ""}
          onChange={(event) => onSceneChange({ locationTempId: textToOptional(event.target.value) })}
        />
      </label>
      <div className="storyboard-shot-stack">
        {scene.shots.map((shot) => (
          <ShotEditor
            key={shot.tempId}
            shot={shot}
            onChange={(patch) => onShotChange(shot, patch)}
          />
        ))}
      </div>
    </div>
  );
}

function ShotEditor({
  shot,
  onChange,
}: {
  shot: ShotDraft;
  onChange(patch: Partial<Omit<ShotDraft, "tempId">>): void;
}) {
  return (
    <div className="storyboard-editor-group shot">
      <div className="storyboard-group-heading">
        <strong>{shot.title}</strong>
        <span>{shot.tempId}</span>
      </div>
      <label className="field-label">
        <span>Shot title</span>
        <input
          name={`shot-${shot.tempId}-title`}
          value={shot.title}
          onChange={(event) => onChange({ title: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Duration</span>
        <input
          min={0}
          name={`shot-${shot.tempId}-duration`}
          step={0.5}
          type="number"
          value={shot.durationSec}
          onChange={(event) => onChange({ durationSec: Number(event.target.value) })}
        />
      </label>
      <label className="field-label">
        <span>Visual description</span>
        <textarea
          name={`shot-${shot.tempId}-visual-description`}
          rows={3}
          value={shot.visualDescription}
          onChange={(event) => onChange({ visualDescription: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Action</span>
        <input
          name={`shot-${shot.tempId}-action`}
          value={shot.action}
          onChange={(event) => onChange({ action: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Camera movement</span>
        <input
          name={`shot-${shot.tempId}-camera-movement`}
          value={shot.cameraMovement}
          onChange={(event) => onChange({ cameraMovement: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Character temp ids</span>
        <input
          name={`shot-${shot.tempId}-character-temp-ids`}
          value={tempIdsToText(shot.characterTempIds)}
          onChange={(event) => onChange({ characterTempIds: textToTempIds(event.target.value) })}
        />
      </label>
      <label className="field-label">
        <span>Location temp id</span>
        <input
          name={`shot-${shot.tempId}-location-temp-id`}
          value={shot.locationTempId ?? ""}
          onChange={(event) => onChange({ locationTempId: textToOptional(event.target.value) })}
        />
      </label>
      <label className="field-label">
        <span>Image prompt</span>
        <textarea
          name={`shot-${shot.tempId}-image-prompt`}
          rows={3}
          value={shot.imagePrompt}
          onChange={(event) => onChange({ imagePrompt: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Video prompt</span>
        <textarea
          name={`shot-${shot.tempId}-video-prompt`}
          rows={3}
          value={shot.videoPrompt}
          onChange={(event) => onChange({ videoPrompt: event.target.value })}
        />
      </label>
      <label className="field-label">
        <span>Negative prompt</span>
        <textarea
          name={`shot-${shot.tempId}-negative-prompt`}
          rows={2}
          value={shot.negativePrompt ?? ""}
          onChange={(event) => onChange({ negativePrompt: textToOptional(event.target.value) })}
        />
      </label>
    </div>
  );
}

function tempIdsToText(values: readonly string[]): string {
  return values.join(", ");
}

function textToTempIds(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function textToOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed || undefined;
}
