-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "CanvasNodeType" AS ENUM ('novel', 'scene_frame', 'scene', 'shot', 'character_asset', 'location_asset', 'style_asset', 'prop_asset', 'image', 'video', 'editor_package', 'note');

-- CreateEnum
CREATE TYPE "CanvasEdgeRelation" AS ENUM ('derived_from', 'belongs_to_scene', 'references_character', 'references_location', 'references_style', 'references_prop', 'generated_image', 'generated_video', 'first_frame_for', 'selected_version_for', 'sent_to_editor', 'sequence_next');

-- CreateEnum
CREATE TYPE "NodeStatus" AS ENUM ('draft', 'queued', 'running', 'provider_waiting', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('image', 'video', 'document', 'package');

-- CreateEnum
CREATE TYPE "AssetPurpose" AS ENUM ('uploaded', 'shot_keyframe', 'character_reference', 'location_reference', 'style_reference', 'shot_clip', 'editor_package');

-- CreateEnum
CREATE TYPE "GenerationJobStatus" AS ENUM ('queued', 'running', 'provider_waiting', 'succeeded', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "GenerationOperation" AS ENUM ('novel_to_storyboard', 'shot_to_image', 'character_to_image', 'location_to_image', 'image_to_video', 'shot_to_video', 'batch_shots_to_images', 'batch_images_to_videos', 'editor_export');

-- CreateEnum
CREATE TYPE "EditorExportStatus" AS ENUM ('queued', 'running', 'succeeded', 'failed');

-- CreateEnum
CREATE TYPE "ProviderKind" AS ENUM ('llm', 'image', 'video', 'editor');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "defaultAspectRatio" TEXT NOT NULL DEFAULT '9:16',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NovelDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "wordCount" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'zh',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NovelDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanvasDocument" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "snapshotJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanvasNode" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "canvasDocumentId" TEXT NOT NULL,
    "tldrawShapeId" TEXT NOT NULL,
    "type" "CanvasNodeType" NOT NULL,
    "title" TEXT,
    "x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "width" DOUBLE PRECISION NOT NULL DEFAULT 320,
    "height" DOUBLE PRECISION NOT NULL DEFAULT 220,
    "zIndex" INTEGER NOT NULL DEFAULT 0,
    "status" "NodeStatus" NOT NULL DEFAULT 'draft',
    "dataJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanvasNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanvasEdge" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "canvasDocumentId" TEXT NOT NULL,
    "sourceNodeId" TEXT NOT NULL,
    "targetNodeId" TEXT NOT NULL,
    "sourceShapeId" TEXT,
    "targetShapeId" TEXT,
    "visualArrowShapeId" TEXT,
    "relation" "CanvasEdgeRelation" NOT NULL,
    "dataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanvasEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "purpose" "AssetPurpose" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "originalFilename" TEXT,
    "sizeBytes" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "durationMs" INTEGER,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GenerationJob" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "operation" "GenerationOperation" NOT NULL,
    "status" "GenerationJobStatus" NOT NULL DEFAULT 'queued',
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "sourceNodeId" TEXT,
    "targetNodeId" TEXT,
    "providerTaskId" TEXT,
    "inputJson" JSONB NOT NULL DEFAULT '{}',
    "outputJson" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditorExport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "packageAssetId" TEXT,
    "status" "EditorExportStatus" NOT NULL DEFAULT 'queued',
    "timelineJson" JSONB NOT NULL DEFAULT '{}',
    "storyboardCsv" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EditorExport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NodeVersion" (
    "id" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "label" TEXT,
    "dataJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NodeVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderConfig" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "kind" "ProviderKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT,
    "defaultModel" TEXT,
    "paramsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Project_ownerUserId_idx" ON "Project"("ownerUserId");

-- CreateIndex
CREATE INDEX "NovelDocument_projectId_idx" ON "NovelDocument"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "CanvasDocument_projectId_key" ON "CanvasDocument"("projectId");

-- CreateIndex
CREATE INDEX "CanvasNode_projectId_type_idx" ON "CanvasNode"("projectId", "type");

-- CreateIndex
CREATE INDEX "CanvasNode_canvasDocumentId_idx" ON "CanvasNode"("canvasDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "CanvasNode_canvasDocumentId_tldrawShapeId_key" ON "CanvasNode"("canvasDocumentId", "tldrawShapeId");

-- CreateIndex
CREATE INDEX "CanvasEdge_projectId_relation_idx" ON "CanvasEdge"("projectId", "relation");

-- CreateIndex
CREATE INDEX "CanvasEdge_canvasDocumentId_idx" ON "CanvasEdge"("canvasDocumentId");

-- CreateIndex
CREATE INDEX "CanvasEdge_sourceNodeId_idx" ON "CanvasEdge"("sourceNodeId");

-- CreateIndex
CREATE INDEX "CanvasEdge_targetNodeId_idx" ON "CanvasEdge"("targetNodeId");

-- CreateIndex
CREATE INDEX "Asset_projectId_type_idx" ON "Asset"("projectId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_projectId_storageKey_key" ON "Asset"("projectId", "storageKey");

-- CreateIndex
CREATE INDEX "GenerationJob_projectId_status_idx" ON "GenerationJob"("projectId", "status");

-- CreateIndex
CREATE INDEX "GenerationJob_providerTaskId_idx" ON "GenerationJob"("providerTaskId");

-- CreateIndex
CREATE INDEX "EditorExport_projectId_status_idx" ON "EditorExport"("projectId", "status");

-- CreateIndex
CREATE INDEX "NodeVersion_nodeId_idx" ON "NodeVersion"("nodeId");

-- CreateIndex
CREATE INDEX "ProviderConfig_kind_provider_idx" ON "ProviderConfig"("kind", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderConfig_projectId_kind_provider_key" ON "ProviderConfig"("projectId", "kind", "provider");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovelDocument" ADD CONSTRAINT "NovelDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasDocument" ADD CONSTRAINT "CanvasDocument_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasNode" ADD CONSTRAINT "CanvasNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasNode" ADD CONSTRAINT "CanvasNode_canvasDocumentId_fkey" FOREIGN KEY ("canvasDocumentId") REFERENCES "CanvasDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasEdge" ADD CONSTRAINT "CanvasEdge_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasEdge" ADD CONSTRAINT "CanvasEdge_canvasDocumentId_fkey" FOREIGN KEY ("canvasDocumentId") REFERENCES "CanvasDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasEdge" ADD CONSTRAINT "CanvasEdge_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "CanvasNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CanvasEdge" ADD CONSTRAINT "CanvasEdge_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "CanvasNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "CanvasNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GenerationJob" ADD CONSTRAINT "GenerationJob_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "CanvasNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorExport" ADD CONSTRAINT "EditorExport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditorExport" ADD CONSTRAINT "EditorExport_packageAssetId_fkey" FOREIGN KEY ("packageAssetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NodeVersion" ADD CONSTRAINT "NodeVersion_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CanvasNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderConfig" ADD CONSTRAINT "ProviderConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
