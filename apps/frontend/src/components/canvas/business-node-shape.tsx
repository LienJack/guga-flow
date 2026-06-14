import type { CanvasNodeRecord, NodeStatus, Phase3CanvasNodeType } from "@guga-flow/shared-types";
import type { TLShape } from "tldraw";

import { buildBusinessNodeCardModel, type BusinessNodeCardModel } from "./business-node-data";

export const BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE = {
  novel: "business_novel",
  source_text: "business_source_text",
  source_image: "business_source_image",
  source_video: "business_source_video",
  source_audio: "business_source_audio",
  scene_frame: "business_scene_frame",
  scene: "business_scene",
  shot: "business_shot",
  character_asset: "business_character_asset",
  location_asset: "business_location_asset",
  ai_text: "business_ai_text",
  ai_audio: "business_ai_audio",
  image: "business_image",
  video: "business_video",
  editor_package: "business_editor_package",
} as const satisfies Record<Phase3CanvasNodeType, string>;

export type BusinessNodeShapeType =
  (typeof BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE)[Phase3CanvasNodeType];

export interface BusinessNodeShapeProps extends Omit<BusinessNodeCardModel, "collapsed"> {
  status: NodeStatus;
}

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    business_novel: BusinessNodeShapeProps;
    business_source_text: BusinessNodeShapeProps;
    business_source_image: BusinessNodeShapeProps;
    business_source_video: BusinessNodeShapeProps;
    business_source_audio: BusinessNodeShapeProps;
    business_scene_frame: BusinessNodeShapeProps;
    business_scene: BusinessNodeShapeProps;
    business_shot: BusinessNodeShapeProps;
    business_character_asset: BusinessNodeShapeProps;
    business_location_asset: BusinessNodeShapeProps;
    business_ai_text: BusinessNodeShapeProps;
    business_ai_audio: BusinessNodeShapeProps;
    business_image: BusinessNodeShapeProps;
    business_video: BusinessNodeShapeProps;
    business_editor_package: BusinessNodeShapeProps;
  }
}

export type BusinessNodeShape = TLShape<BusinessNodeShapeType>;

const NODE_TYPE_BY_SHAPE_TYPE = new Map<BusinessNodeShapeType, Phase3CanvasNodeType>(
  Object.entries(BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE).map(([nodeType, shapeType]) => [
    shapeType,
    nodeType as Phase3CanvasNodeType,
  ]),
);

export function getBusinessNodeShapeType(type: Phase3CanvasNodeType): BusinessNodeShapeType {
  return BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE[type];
}

export function getBusinessNodeTypeFromShapeType(
  type: string,
): Phase3CanvasNodeType | undefined {
  return NODE_TYPE_BY_SHAPE_TYPE.get(type as BusinessNodeShapeType);
}

export function isBusinessNodeShapeType(type: string): type is BusinessNodeShapeType {
  return NODE_TYPE_BY_SHAPE_TYPE.has(type as BusinessNodeShapeType);
}

export function isBusinessNodeShape(shape: TLShape | undefined): shape is BusinessNodeShape {
  return Boolean(shape && isBusinessNodeShapeType(shape.type));
}

export function buildBusinessNodeShapeProps(node: CanvasNodeRecord): BusinessNodeShapeProps {
  const { collapsed: _collapsed, ...props } = buildBusinessNodeCardModel(node);
  return props;
}
