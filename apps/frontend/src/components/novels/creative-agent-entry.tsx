"use client";

import type {
  CreateCreativeStoryboardResult,
  CreativeAgentMode,
  ImportStoryboardToCanvasResult,
} from "@guga-flow/shared-types";
import { Clapperboard, SlidersHorizontal, Sparkles } from "lucide-react";
import React, { FormEvent, useState } from "react";

import {
  createCreativeStoryboard,
  importStoryboardToCanvas,
} from "../../lib/api";
import { summarizeStoryboardActionError, summarizeStoryboardImport } from "./storyboard-data";

interface CreativeAgentEntryProps {
  projectId: string;
  hasPriorStoryboardImport?: boolean;
  initialMode?: CreativeAgentMode;
  initialSendToCanvas?: boolean;
  onCreativeStoryboardCreated(result: CreateCreativeStoryboardResult): void;
  onStoryboardImported?: (result: ImportStoryboardToCanvasResult) => void;
}

const MODE_OPTIONS: Array<{ value: CreativeAgentMode; label: string }> = [
  { value: "novice", label: "Novice" },
  { value: "advanced", label: "Advanced" },
  { value: "professional", label: "Pro" },
];

export function CreativeAgentEntry({
  projectId,
  hasPriorStoryboardImport = false,
  initialMode = "novice",
  initialSendToCanvas = true,
  onCreativeStoryboardCreated,
  onStoryboardImported,
}: CreativeAgentEntryProps) {
  const [idea, setIdea] = useState("");
  const [mode, setMode] = useState<CreativeAgentMode>(initialMode);
  const [audience, setAudience] = useState("");
  const [stylePrompt, setStylePrompt] = useState("");
  const [targetDurationSeconds, setTargetDurationSeconds] = useState("45");
  const [sendToCanvas, setSendToCanvas] = useState(initialSendToCanvas);
  const [confirmNewVersion, setConfirmNewVersion] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const showDirectionFields = mode !== "novice";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (requiresCreativeCanvasImportConfirmation(hasPriorStoryboardImport, sendToCanvas) && !confirmNewVersion) {
      setConfirmNewVersion(true);
      setError(null);
      setNotice("Confirm new canvas version");
      return;
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await createCreativeStoryboard(projectId, {
        idea,
        mode,
        audience: showDirectionFields ? audience : undefined,
        stylePrompt: showDirectionFields ? stylePrompt : undefined,
        targetDurationSeconds:
          showDirectionFields && targetDurationSeconds.trim()
            ? Number(targetDurationSeconds)
            : undefined,
      });
      onCreativeStoryboardCreated(result);
      setConfirmNewVersion(false);

      if (sendToCanvas) {
        const importResult = await importStoryboardToCanvas(projectId, {
          novelDocumentId: result.novel.id,
          storyboardDraftId: result.draft.id,
          duplicatePolicy: "new_version",
        });
        onStoryboardImported?.(importResult);
        setNotice(summarizeStoryboardImport(importResult.summary));
      } else {
        setNotice("Storyboard draft created");
      }
    } catch (actionError) {
      setError(summarizeStoryboardActionError(actionError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="creative-agent-entry" aria-label="Creative agent entry">
      <div className="section-heading-row">
        <h2 className="panel-title small">Creative brief</h2>
        <Sparkles size={15} aria-hidden="true" />
      </div>

      <form className="creative-agent-form" onSubmit={handleSubmit}>
        <div className="creative-mode-control" aria-label="Creative mode">
          {MODE_OPTIONS.map((option) => (
            <button
              className={`creative-mode-button${mode === option.value ? " active" : ""}`}
              key={option.value}
              type="button"
              aria-pressed={mode === option.value}
              onClick={() => {
                setMode(option.value);
                setConfirmNewVersion(false);
              }}
            >
              {option.value === "novice" ? (
                <Sparkles size={13} aria-hidden="true" />
              ) : option.value === "advanced" ? (
                <SlidersHorizontal size={13} aria-hidden="true" />
              ) : (
                <Clapperboard size={13} aria-hidden="true" />
              )}
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        <label className="field-label">
          <span>Idea</span>
          <textarea
            name="creative-idea"
            required
            rows={3}
            value={idea}
            placeholder="A rainy neon chase begins at the last subway train"
            onChange={(event) => {
              setIdea(event.target.value);
              setConfirmNewVersion(false);
            }}
          />
        </label>

        {showDirectionFields ? (
          <div className="creative-direction-grid">
            <label className="field-label">
              <span>Audience</span>
              <input
                name="creative-audience"
                value={audience}
                onChange={(event) => setAudience(event.target.value)}
              />
            </label>
            <label className="field-label">
              <span>Style</span>
              <input
                name="creative-style"
                value={stylePrompt}
                onChange={(event) => setStylePrompt(event.target.value)}
              />
            </label>
            <label className="field-label">
              <span>Seconds</span>
              <input
                name="creative-duration"
                inputMode="numeric"
                type="number"
                min={15}
                max={180}
                value={targetDurationSeconds}
                onChange={(event) => setTargetDurationSeconds(event.target.value)}
              />
            </label>
          </div>
        ) : null}

        <label className="generation-checkbox">
          <input
            type="checkbox"
            checked={sendToCanvas}
            onChange={(event) => {
              setSendToCanvas(event.target.checked);
              setConfirmNewVersion(false);
            }}
          />
          <span>Canvas draft</span>
        </label>

        <button className="primary-action compact" type="submit" disabled={busy}>
          <Sparkles size={15} aria-hidden="true" />
          {confirmNewVersion ? "Confirm version" : "Create draft"}
        </button>
      </form>

      {error ? <p className="form-error">{error}</p> : null}
      {notice ? <p className="form-success">{notice}</p> : null}
    </section>
  );
}

export function requiresCreativeCanvasImportConfirmation(
  hasPriorStoryboardImport: boolean,
  sendToCanvas: boolean,
): boolean {
  return hasPriorStoryboardImport && sendToCanvas;
}
