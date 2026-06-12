import type { Phase3CanvasNodeType } from "@guga-flow/shared-types";
import { PHASE_3_CANVAS_NODE_TYPES } from "@guga-flow/shared-types";
import {
  BookOpen,
  Boxes,
  Clapperboard,
  Film,
  Image as ImageIcon,
  MapPin,
  PackageCheck,
  PanelTop,
  User,
  Video,
} from "lucide-react";
import React from "react";

import { getBusinessNodeDefinition } from "./business-node-data";

interface BusinessNodeToolbarProps {
  busy?: boolean;
  onCreate(type: Phase3CanvasNodeType): void;
}

const ICONS: Record<Phase3CanvasNodeType, React.ComponentType<{ size?: number }>> = {
  novel: BookOpen,
  scene_frame: PanelTop,
  scene: Boxes,
  shot: Clapperboard,
  character_asset: User,
  location_asset: MapPin,
  image: ImageIcon,
  video: Video,
  editor_package: PackageCheck,
};

export function BusinessNodeToolbar({ busy = false, onCreate }: BusinessNodeToolbarProps) {
  return (
    <div className="business-node-toolbar" aria-label="Create business node">
      {PHASE_3_CANVAS_NODE_TYPES.map((type) => {
        const definition = getBusinessNodeDefinition(type);
        const Icon = ICONS[type] ?? Film;

        return (
          <button
            className="business-node-tool"
            type="button"
            key={type}
            title={`Create ${definition.label}`}
            disabled={busy}
            onClick={() => onCreate(type)}
          >
            <Icon size={15} aria-hidden="true" />
            <span>{definition.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
