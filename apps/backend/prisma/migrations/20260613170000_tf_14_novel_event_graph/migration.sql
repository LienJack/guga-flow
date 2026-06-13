-- CreateTable
CREATE TABLE "NovelEventGraph" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "novelDocumentId" TEXT NOT NULL,
    "chaptersJson" JSONB NOT NULL DEFAULT '[]',
    "eventsJson" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NovelEventGraph_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NovelEventGraph_projectId_novelDocumentId_idx" ON "NovelEventGraph"("projectId", "novelDocumentId");

-- CreateIndex
CREATE INDEX "NovelEventGraph_novelDocumentId_createdAt_idx" ON "NovelEventGraph"("novelDocumentId", "createdAt");

-- AddForeignKey
ALTER TABLE "NovelEventGraph" ADD CONSTRAINT "NovelEventGraph_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NovelEventGraph" ADD CONSTRAINT "NovelEventGraph_novelDocumentId_fkey" FOREIGN KEY ("novelDocumentId") REFERENCES "NovelDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
