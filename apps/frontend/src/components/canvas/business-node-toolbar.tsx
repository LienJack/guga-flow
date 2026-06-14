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

const ACTION_LABELS: Record<Phase3CanvasNodeType, string> = {
  novel: "添加文本节点",
  scene_frame: "添加分镜框",
  scene: "添加场景节点",
  shot: "添加镜头节点",
  character_asset: "添加角色节点",
  location_asset: "添加地点节点",
  image: "添加图片节点",
  video: "添加视频节点",
  editor_package: "添加导出包",
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
            <span>{ACTION_LABELS[type] ?? definition.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
