ALTER TYPE "GenerationOperation" ADD VALUE IF NOT EXISTS 'asset_caption';
ALTER TYPE "GenerationOperation" ADD VALUE IF NOT EXISTS 'asset_classification';
ALTER TYPE "GenerationOperation" ADD VALUE IF NOT EXISTS 'workflow_run';
ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'canvas_fragment';

CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "activeVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkflowDefinitionVersion" (
    "id" TEXT NOT NULL,
    "workflowDefinitionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "sourceJson" JSONB NOT NULL,
    "mappingJson" JSONB NOT NULL,
    "diagnosticsJson" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowDefinitionVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CanvasFragmentImport" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "schemaVersion" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "summaryJson" JSONB NOT NULL DEFAULT '{}',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanvasFragmentImport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkflowDefinition_projectId_provider_key" ON "WorkflowDefinition"("projectId", "provider");
CREATE INDEX "WorkflowDefinition_projectId_kind_idx" ON "WorkflowDefinition"("projectId", "kind");
CREATE INDEX "WorkflowDefinition_activeVersionId_idx" ON "WorkflowDefinition"("activeVersionId");
CREATE UNIQUE INDEX "WorkflowDefinitionVersion_workflowDefinitionId_version_key" ON "WorkflowDefinitionVersion"("workflowDefinitionId", "version");
CREATE INDEX "WorkflowDefinitionVersion_workflowDefinitionId_idx" ON "WorkflowDefinitionVersion"("workflowDefinitionId");
CREATE INDEX "CanvasFragmentImport_projectId_status_idx" ON "CanvasFragmentImport"("projectId", "status");
CREATE INDEX "CanvasFragmentImport_projectId_createdAt_idx" ON "CanvasFragmentImport"("projectId", "createdAt");

ALTER TABLE "WorkflowDefinition" ADD CONSTRAINT "WorkflowDefinition_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkflowDefinition" ADD CONSTRAINT "WorkflowDefinition_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "WorkflowDefinitionVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkflowDefinitionVersion" ADD CONSTRAINT "WorkflowDefinitionVersion_workflowDefinitionId_fkey" FOREIGN KEY ("workflowDefinitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasFragmentImport" ADD CONSTRAINT "CanvasFragmentImport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
