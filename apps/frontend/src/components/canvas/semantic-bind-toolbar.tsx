import { Link2, X } from "lucide-react";
import React from "react";

import type { SemanticBindTarget } from "./semantic-bind-interactions";

interface SemanticBindToolbarProps {
  active: boolean;
  busy?: boolean;
  sourceLabel?: string;
  targets: SemanticBindTarget[];
  onBind(target: SemanticBindTarget): void;
  onCancel(): void;
  onToggle(): void;
}

export function SemanticBindToolbar({
  active,
  busy = false,
  sourceLabel,
  targets,
  onBind,
  onCancel,
  onToggle,
}: SemanticBindToolbarProps) {
  if (!sourceLabel) {
    return null;
  }

  return (
    <div className={`semantic-bind-toolbar${active ? " active" : ""}`} aria-label="Semantic bind">
      <button
        className="semantic-bind-icon-button"
        type="button"
        title="Bind"
        aria-pressed={active}
        disabled={busy}
        onClick={onToggle}
      >
        <Link2 size={15} aria-hidden="true" />
      </button>
      {active ? (
        <>
          <span className="semantic-bind-source">{sourceLabel}</span>
          <div className="semantic-bind-targets">
            {targets.map((target) => (
              <button
                className="semantic-bind-target"
                type="button"
                key={target.node.id}
                title={target.label}
                disabled={busy}
                onClick={() => onBind(target)}
              >
                {target.label}
              </button>
            ))}
          </div>
          <button
            className="semantic-bind-icon-button"
            type="button"
            title="Cancel"
            disabled={busy}
            onClick={onCancel}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </>
      ) : null}
    </div>
  );
}
