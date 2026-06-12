import type {
  CanvasNodeRecord,
  CanvasSnapshotJson,
  NodeStatus,
  UpdateCanvasNodeInput,
} from "@guga-flow/shared-types";
import { NODE_STATUSES } from "@guga-flow/shared-types";
import React, { FormEvent, useEffect, useState } from "react";

import { getBusinessNodeDefinition, isPhase3CanvasNodeType } from "./business-node-data";
import { getBusinessNodeFields } from "./business-node-inspector-sections";

interface BusinessNodeFormProps {
  node: CanvasNodeRecord;
  onSave(input: UpdateCanvasNodeInput): Promise<void>;
}

type FieldValue = string | number;

const STATUS_LABELS: Record<NodeStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  running: "Running",
  provider_waiting: "Waiting",
  succeeded: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function BusinessNodeForm({ node, onSave }: BusinessNodeFormProps) {
  const [title, setTitle] = useState(node.title ?? "");
  const [status, setStatus] = useState<NodeStatus>(node.status);
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>(() =>
    formDataFromNode(node),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setTitle(node.title ?? "");
    setStatus(node.status);
    setFieldValues(formDataFromNode(node));
    setError(null);
    setSaved(false);
  }, [node]);

  if (!isPhase3CanvasNodeType(node.type)) {
    return (
      <div className="empty-state small">
        <strong>Unsupported node</strong>
        <span>{node.type}</span>
      </div>
    );
  }

  const definition = getBusinessNodeDefinition(node.type);
  const fields = getBusinessNodeFields(node.type);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);

    try {
      await onSave({
        title,
        status,
        dataJson: dataJsonFromForm(node, fieldValues),
      });
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save node");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="business-node-form" onSubmit={handleSubmit}>
      <div className="panel-heading compact">
        <h2>{definition.label}</h2>
        <span>{STATUS_LABELS[status]}</span>
      </div>

      <label className="field-label">
        <span>Title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>

      <label className="field-label">
        <span>Status</span>
        <select value={status} onChange={(event) => setStatus(event.target.value as NodeStatus)}>
          {NODE_STATUSES.map((nextStatus) => (
            <option value={nextStatus} key={nextStatus}>
              {STATUS_LABELS[nextStatus]}
            </option>
          ))}
        </select>
      </label>

      <div className="business-node-field-grid">
        {fields.map((field) => {
          const value = fieldValues[field.key] ?? "";
          const commonProps = {
            value: String(value),
            onChange: (
              event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
            ) => {
              const nextValue =
                field.inputType === "number" && event.target.value !== ""
                  ? Number(event.target.value)
                  : event.target.value;
              setFieldValues((current) => ({ ...current, [field.key]: nextValue }));
            },
          };

          return (
            <label className="field-label" key={field.key}>
              <span>{field.label}</span>
              {field.multiline ? (
                <textarea rows={field.key === "sourceText" ? 7 : 4} {...commonProps} />
              ) : (
                <input type={field.inputType ?? "text"} {...commonProps} />
              )}
            </label>
          );
        })}
      </div>

      {error ? <p className="form-error">{error}</p> : null}
      {saved ? <p className="form-success">Saved</p> : null}

      <button className="primary-action compact" type="submit" disabled={busy}>
        Save
      </button>
    </form>
  );
}

function formDataFromNode(node: CanvasNodeRecord): Record<string, FieldValue> {
  if (!isPhase3CanvasNodeType(node.type)) {
    return {};
  }

  const data = objectData(node.dataJson);
  const result: Record<string, FieldValue> = {};
  for (const field of getBusinessNodeFields(node.type)) {
    const value = data[field.key];
    if (typeof value === "string" || typeof value === "number") {
      result[field.key] = value;
    }
  }

  return result;
}

function dataJsonFromForm(
  node: CanvasNodeRecord,
  values: Record<string, FieldValue>,
): { [key: string]: CanvasSnapshotJson } {
  if (!isPhase3CanvasNodeType(node.type)) {
    return {};
  }

  const result: { [key: string]: CanvasSnapshotJson } = {};
  for (const field of getBusinessNodeFields(node.type)) {
    const value = values[field.key];
    if (value === "" || value === undefined) {
      continue;
    }
    if (field.inputType === "number") {
      const numberValue = Number(value);
      if (Number.isFinite(numberValue)) {
        result[field.key] = numberValue;
      }
      continue;
    }
    result[field.key] = String(value);
  }

  return result;
}

function objectData(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return {};
}
