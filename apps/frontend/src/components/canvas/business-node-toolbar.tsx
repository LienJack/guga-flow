import type { CanvasNodeFamily, Phase3CanvasNodeType } from "@guga-flow/shared-types";
import {
  CANVAS_NODE_FAMILY_LABELS,
  getCanvasNodeRegistryItem,
  PHASE_3_CANVAS_NODE_TYPES,
} from "@guga-flow/shared-types";
import {
  BookOpen,
  Boxes,
  Clapperboard,
  Film,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Image as ImageIcon,
  MapPin,
  Package,
  PackageCheck,
  PanelTop,
  User,
  Video,
} from "lucide-react";
import React from "react";

import { getBusinessNodeDefinition } from "./business-node-data";

interface BusinessNodeToolbarProps {
  busy?: boolean;
  style?: React.CSSProperties;
  onCreate(type: Phase3CanvasNodeType): void;
}

const ICONS: Record<Phase3CanvasNodeType, React.ComponentType<{ size?: number }>> = {
  novel: BookOpen,
  source_text: FileText,
  source_image: FileImage,
  source_video: FileVideo,
  source_audio: FileAudio,
  scene_frame: PanelTop,
  scene: Boxes,
  shot: Clapperboard,
  character_asset: User,
  location_asset: MapPin,
  prop_asset: Package,
  panorama: ImageIcon,
  director_3d: Boxes,
  ai_text: FileText,
  ai_audio: FileAudio,
  image: ImageIcon,
  video: Video,
  editor_package: PackageCheck,
};

const ACTION_LABELS: Record<Phase3CanvasNodeType, string> = {
  novel: "添加文本节点",
  source_text: "添加文本素材",
  source_image: "添加图片素材",
  source_video: "添加视频素材",
  source_audio: "添加音频素材",
  scene_frame: "添加分镜框",
  scene: "添加场景节点",
  shot: "添加镜头节点",
  character_asset: "添加角色节点",
  location_asset: "添加地点节点",
  prop_asset: "添加道具节点",
  panorama: "添加全景节点",
  director_3d: "添加 3D 导演台",
  ai_text: "添加 AI 文本",
  ai_audio: "添加 AI 音频",
  image: "添加图片节点",
  video: "添加视频节点",
  editor_package: "添加导出包",
};

const TOOLBAR_FAMILY_ORDER: CanvasNodeFamily[] = [
  "business",
  "source_media",
  "ai_generation",
  "media_operation",
  "advanced_visual",
  "layout_helper",
];

const TOOLBAR_NODE_GROUPS = TOOLBAR_FAMILY_ORDER.map((family) => ({
  family,
  label: CANVAS_NODE_FAMILY_LABELS[family],
  types: PHASE_3_CANVAS_NODE_TYPES.filter(
    (type) => getCanvasNodeRegistryItem(type).family === family,
  ),
})).filter((group) => group.types.length > 0);

export function BusinessNodeToolbar({ busy = false, onCreate, style }: BusinessNodeToolbarProps) {
  return (
    <div className="business-node-toolbar" aria-label="Create canvas node" style={style}>
      {TOOLBAR_NODE_GROUPS.map((group) => (
        <section
          className="business-node-toolbar-group"
          aria-label={`${group.label} nodes`}
          key={group.family}
        >
          <div className="business-node-toolbar-heading">{group.label}</div>
          <div className="business-node-toolbar-actions">
            {group.types.map((type) => {
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
        </section>
      ))}
    </div>
  );
}
