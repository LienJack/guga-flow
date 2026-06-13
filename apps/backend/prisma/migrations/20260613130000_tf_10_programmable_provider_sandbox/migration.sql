CREATE TABLE "ProgrammableProvider" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "ProviderKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "activeVersionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgrammableProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProgrammableProviderVersion" (
    "id" TEXT NOT NULL,
    "programmableProviderId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "sourceCode" TEXT NOT NULL,
    "manifestJson" JSONB,
    "status" TEXT NOT NULL,
    "diagnosticsJson" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProgrammableProviderVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProgrammableProvider_projectId_kind_provider_key" ON "ProgrammableProvider"("projectId", "kind", "provider");
CREATE INDEX "ProgrammableProvider_projectId_kind_idx" ON "ProgrammableProvider"("projectId", "kind");
CREATE INDEX "ProgrammableProvider_activeVersionId_idx" ON "ProgrammableProvider"("activeVersionId");
CREATE UNIQUE INDEX "ProgrammableProviderVersion_programmableProviderId_version_key" ON "ProgrammableProviderVersion"("programmableProviderId", "version");
CREATE INDEX "ProgrammableProviderVersion_programmableProviderId_idx" ON "ProgrammableProviderVersion"("programmableProviderId");
CREATE INDEX "ProgrammableProviderVersion_status_idx" ON "ProgrammableProviderVersion"("status");

ALTER TABLE "ProgrammableProvider" ADD CONSTRAINT "ProgrammableProvider_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgrammableProvider" ADD CONSTRAINT "ProgrammableProvider_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "ProgrammableProviderVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProgrammableProviderVersion" ADD CONSTRAINT "ProgrammableProviderVersion_programmableProviderId_fkey" FOREIGN KEY ("programmableProviderId") REFERENCES "ProgrammableProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
