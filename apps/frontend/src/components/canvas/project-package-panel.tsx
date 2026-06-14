"use client";

import type { ProjectPackageManifest } from "@guga-flow/shared-types";
import { Download, RotateCcw, Upload } from "lucide-react";
import React, { useRef, useState } from "react";

import {
  exportProjectPackage,
  getProjectRecoverySnapshot,
  importProjectPackage,
  validateProjectPackageImport,
} from "../../lib/api";

interface ProjectPackagePanelProps {
  projectId: string;
}

type PackagePanelStatus = {
  message: string;
  projectId?: string;
};

export function ProjectPackagePanel({ projectId }: ProjectPackagePanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState<"export" | "recovery" | "import" | null>(null);
  const [status, setStatus] = useState<PackagePanelStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setBusy("export");
    setError(null);
    try {
      const result = await exportProjectPackage(projectId);
      downloadJson(`guga-flow-${projectId}-package.json`, result.package);
      setStatus({ message: `${result.package.canvasPages.length} page package exported` });
    } catch (caught) {
      setError(errorMessage(caught, "Project package export failed"));
    } finally {
      setBusy(null);
    }
  }

  async function handleRecoverySnapshot() {
    setBusy("recovery");
    setError(null);
    try {
      const result = await getProjectRecoverySnapshot(projectId);
      downloadJson(`guga-flow-${projectId}-recovery.json`, result.snapshot);
      setStatus({ message: `${result.snapshot.canvasPages.length} page recovery snapshot saved` });
    } catch (caught) {
      setError(errorMessage(caught, "Recovery snapshot failed"));
    } finally {
      setBusy(null);
    }
  }

  async function handleImportFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }
    setBusy("import");
    setError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const projectPackage = extractProjectPackage(parsed);
      const validation = await validateProjectPackageImport({ package: projectPackage });
      if (!validation.valid) {
        const firstIssue = validation.issues[0];
        setError(firstIssue ? `${firstIssue.path}: ${firstIssue.message}` : "Project package is invalid");
        return;
      }
      const result = await importProjectPackage({ package: projectPackage });
      setStatus({
        message: `${validation.summary?.pages ?? 0} pages imported`,
        projectId: result.project.id,
      });
    } catch (caught) {
      setError(errorMessage(caught, "Project package import failed"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="generation-panel" aria-label="Project package">
      <div className="section-heading-row">
        <h2 className="panel-title small">
          <Download size={15} aria-hidden="true" />
          Package
        </h2>
      </div>
      <div className="agent-context-grid">
        <button
          className="tool-button"
          type="button"
          disabled={busy !== null}
          onClick={() => void handleExport()}
        >
          <Download size={14} aria-hidden="true" />
          Export
        </button>
        <button
          className="tool-button"
          type="button"
          disabled={busy !== null}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={14} aria-hidden="true" />
          Import
        </button>
        <button
          className="tool-button"
          type="button"
          disabled={busy !== null}
          onClick={() => void handleRecoverySnapshot()}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Snapshot
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => void handleImportFile(event)}
      />
      {status ? (
        <div className="agent-result" role="status">
          <span>{status.message}</span>
          {status.projectId ? <a href={`/projects/${status.projectId}/canvas`}>Open imported project</a> : null}
        </div>
      ) : null}
      {error ? <p className="canvas-outline-empty">{error}</p> : null}
    </section>
  );
}

function extractProjectPackage(value: unknown): ProjectPackageManifest {
  if (typeof value === "object" && value !== null && "package" in value) {
    return (value as { package: ProjectPackageManifest }).package;
  }
  return value as ProjectPackageManifest;
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
