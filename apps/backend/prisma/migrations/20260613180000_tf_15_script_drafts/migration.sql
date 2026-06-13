-- CreateTable
CREATE TABLE "ScriptDraft" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "novelDocumentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "strategy" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "scriptJson" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScriptDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ScriptDraft_novelDocumentId_version_key" ON "ScriptDraft"("novelDocumentId", "version");

-- CreateIndex
CREATE INDEX "ScriptDraft_projectId_novelDocumentId_idx" ON "ScriptDraft"("projectId", "novelDocumentId");

-- AddForeignKey
ALTER TABLE "ScriptDraft" ADD CONSTRAINT "ScriptDraft_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScriptDraft" ADD CONSTRAINT "ScriptDraft_novelDocumentId_fkey" FOREIGN KEY ("novelDocumentId") REFERENCES "NovelDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
