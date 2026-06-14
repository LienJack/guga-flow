import type { Phase3CanvasNodeType } from "@guga-flow/shared-types";
import { NODE_STATUSES, PHASE_3_CANVAS_NODE_TYPES } from "@guga-flow/shared-types";
import React from "react";
import {
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  T,
  resizeBox,
  type RecordProps,
  type TLResizeInfo,
} from "tldraw";

import { getBusinessNodeDefinition } from "./business-node-data";
import { BusinessNodeCard } from "./business-node-card";
import {
  BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE,
  type BusinessNodeShape,
  type BusinessNodeShapeProps,
} from "./business-node-shape";

export const BUSINESS_NODE_DEFAULT_WIDTH = 360;
export const BUSINESS_NODE_DEFAULT_HEIGHT = 220;
export const BUSINESS_NODE_MIN_WIDTH = 260;
export const BUSINESS_NODE_MIN_HEIGHT = 160;

export const businessNodeShapeProps: RecordProps<BusinessNodeShape> = {
  nodeId: T.string,
  nodeType: T.literalEnum(...PHASE_3_CANVAS_NODE_TYPES),
  title: T.string,
  status: T.literalEnum(...NODE_STATUSES),
  summary: T.string,
  detail: T.string,
  w: T.number,
  h: T.number,
};

abstract class BaseBusinessNodeShapeUtil extends ShapeUtil<BusinessNodeShape> {
  static override props = businessNodeShapeProps;

  protected abstract readonly nodeType: Phase3CanvasNodeType;

  override canResize() {
    return true;
  }

  override getDefaultProps(): BusinessNodeShapeProps {
    const definition = getBusinessNodeDefinition(this.nodeType);

    return {
      nodeId: "",
      nodeType: this.nodeType,
      title: definition.defaultTitle,
      status: "draft",
      summary: definition.summaryFallback,
      detail: definition.detailFallback,
      w: BUSINESS_NODE_DEFAULT_WIDTH,
      h: BUSINESS_NODE_DEFAULT_HEIGHT,
    };
  }

  override getGeometry(shape: BusinessNodeShape) {
    return new Rectangle2d({
      width: shape.props.w,
      height: shape.props.h,
      isFilled: true,
    });
  }

  override component(shape: BusinessNodeShape) {
    return (
      <HTMLContainer className="business-node-html-container">
        <BusinessNodeCard {...shape.props} />
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: BusinessNodeShape): Path2D {
    const path = new Path2D();
    path.rect(0, 0, shape.props.w, shape.props.h);
    return path;
  }

  override onResize(shape: BusinessNodeShape, info: TLResizeInfo<BusinessNodeShape>) {
    return resizeBox(shape, info, {
      minWidth: BUSINESS_NODE_MIN_WIDTH,
      minHeight: BUSINESS_NODE_MIN_HEIGHT,
    });
  }
}

export class NovelBusinessNodeShapeUtil extends BaseBusinessNodeShapeUtil {
  static override type = BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE.novel;
  protected override readonly nodeType = "novel" as const;
}

export class SourceTextBusinessNodeShapeUtil extends BaseBusinessNodeShapeUtil {
  static override type = BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE.source_text;
  protected override readonly nodeType = "source_text" as const;
}

export class SourceImageBusinessNodeShapeUtil extends BaseBusinessNodeShapeUtil {
  static override type = BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE.source_image;
  protected override readonly nodeType = "source_image" as const;
}

export class SourceVideoBusinessNodeShapeUtil extends BaseBusinessNodeShapeUtil {
  static override type = BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE.source_video;
  protected override readonly nodeType = "source_video" as const;
}

export class SourceAudioBusinessNodeShapeUtil extends BaseBusinessNodeShapeUtil {
  static override type = BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE.source_audio;
  protected override readonly nodeType = "source_audio" as const;
}

export class SceneFrameBusinessNodeShapeUtil extends BaseBusinessNodeShapeUtil {
  static override type = BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE.scene_frame;
  protected override readonly nodeType = "scene_frame" as const;
}

export class SceneBusinessNodeShapeUtil extends BaseBusinessNodeShapeUtil {
  static override type = BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE.scene;
  protected override readonly nodeType = "scene" as const;
}

export class ShotBusinessNodeShapeUtil extends BaseBusinessNodeShapeUtil {
  static override type = BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE.shot;
  protected override readonly nodeType = "shot" as const;
}

export class CharacterAssetBusinessNodeShapeUtil extends BaseBusinessNodeShapeUtil {
  static override type = BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE.character_asset;
  protected override readonly nodeType = "character_asset" as const;
}

export class LocationAssetBusinessNodeShapeUtil extends BaseBusinessNodeShapeUtil {
  static override type = BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE.location_asset;
  protected override readonly nodeType = "location_asset" as const;
}

export class ImageBusinessNodeShapeUtil extends BaseBusinessNodeShapeUtil {
  static override type = BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE.image;
  protected override readonly nodeType = "image" as const;
}

export class VideoBusinessNodeShapeUtil extends BaseBusinessNodeShapeUtil {
  static override type = BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE.video;
  protected override readonly nodeType = "video" as const;
}

export class EditorPackageBusinessNodeShapeUtil extends BaseBusinessNodeShapeUtil {
  static override type = BUSINESS_NODE_SHAPE_TYPE_BY_NODE_TYPE.editor_package;
  protected override readonly nodeType = "editor_package" as const;
}

export const businessNodeShapeUtils = [
  NovelBusinessNodeShapeUtil,
  SourceTextBusinessNodeShapeUtil,
  SourceImageBusinessNodeShapeUtil,
  SourceVideoBusinessNodeShapeUtil,
  SourceAudioBusinessNodeShapeUtil,
  SceneFrameBusinessNodeShapeUtil,
  SceneBusinessNodeShapeUtil,
  ShotBusinessNodeShapeUtil,
  CharacterAssetBusinessNodeShapeUtil,
  LocationAssetBusinessNodeShapeUtil,
  ImageBusinessNodeShapeUtil,
  VideoBusinessNodeShapeUtil,
  EditorPackageBusinessNodeShapeUtil,
] as const;
