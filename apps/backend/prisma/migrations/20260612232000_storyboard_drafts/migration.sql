-- CreateEnum
CREATE TYPE "StoryboardDraftStatus" AS ENUM ('draft', 'valid', 'invalid', 'ready');

-- CreateTable
CREATE TABLE "StoryboardDraft" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "novelDocumentId" TEXT NOT NULL,
    "status" "StoryboardDraftStatus" NOT NULL DEFAULT 'draft',
    "storyboardJson" JSONB,
    "validationIssuesJson" JSONB NOT NULL DEFAULT '[]',
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "errorMessage" TEXT,
    "readyForImport" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryboardDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoryboardDraft_projectId_status_idx" ON "StoryboardDraft"("projectId", "status");

-- CreateIndex
CREATE INDEX "StoryboardDraft_novelDocumentId_idx" ON "StoryboardDraft"("novelDocumentId");

-- AddForeignKey
ALTER TABLE "StoryboardDraft" ADD CONSTRAINT "StoryboardDraft_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoryboardDraft" ADD CONSTRAINT "StoryboardDraft_novelDocumentId_fkey" FOREIGN KEY ("novelDocumentId") REFERENCES "NovelDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
