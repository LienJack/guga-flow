import type { CanvasSaveStatus } from "@guga-flow/shared-types";
import React from "react";

import { useI18n } from "../../lib/i18n";

const saveStatusLabelKeys: Record<CanvasSaveStatus, string> = {
  idle: "save.ready",
  saving: "save.saving",
  saved: "save.saved",
  failed: "save.failed",
};

interface CanvasSaveStatusBadgeProps {
  status: CanvasSaveStatus;
  error?: string | null;
}

export function CanvasSaveStatusBadge({ status, error }: CanvasSaveStatusBadgeProps) {
  const { t } = useI18n();

  return (
    <div className={`save-state ${status === "failed" ? "failed" : ""}`} title={error ?? undefined}>
      {t(saveStatusLabelKeys[status])}
    </div>
  );
}
