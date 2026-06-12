import type { CanvasSaveStatus } from "@guga-flow/shared-types";
import React from "react";

const saveStatusLabels: Record<CanvasSaveStatus, string> = {
  idle: "Ready",
  saving: "Saving",
  saved: "Saved",
  failed: "Save failed",
};

interface CanvasSaveStatusBadgeProps {
  status: CanvasSaveStatus;
  error?: string | null;
}

export function CanvasSaveStatusBadge({ status, error }: CanvasSaveStatusBadgeProps) {
  return (
    <div className={`save-state ${status === "failed" ? "failed" : ""}`} title={error ?? undefined}>
      {saveStatusLabels[status]}
    </div>
  );
}
