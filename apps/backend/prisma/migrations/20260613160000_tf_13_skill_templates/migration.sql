-- CreateTable
CREATE TABLE "SkillTemplate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "activeVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillTemplateVersion" (
    "id" TEXT NOT NULL,
    "skillTemplateId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "sourceText" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "diagnosticsJson" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillTemplateVersion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SkillTemplate_projectId_kind_slug_key" ON "SkillTemplate"("projectId", "kind", "slug");

-- CreateIndex
CREATE INDEX "SkillTemplate_projectId_kind_idx" ON "SkillTemplate"("projectId", "kind");

-- CreateIndex
CREATE INDEX "SkillTemplate_activeVersionId_idx" ON "SkillTemplate"("activeVersionId");

-- CreateIndex
CREATE UNIQUE INDEX "SkillTemplateVersion_skillTemplateId_version_key" ON "SkillTemplateVersion"("skillTemplateId", "version");

-- CreateIndex
CREATE INDEX "SkillTemplateVersion_skillTemplateId_idx" ON "SkillTemplateVersion"("skillTemplateId");

-- CreateIndex
CREATE INDEX "SkillTemplateVersion_status_idx" ON "SkillTemplateVersion"("status");

-- AddForeignKey
ALTER TABLE "SkillTemplate" ADD CONSTRAINT "SkillTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillTemplate" ADD CONSTRAINT "SkillTemplate_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "SkillTemplateVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillTemplateVersion" ADD CONSTRAINT "SkillTemplateVersion_skillTemplateId_fkey" FOREIGN KEY ("skillTemplateId") REFERENCES "SkillTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
