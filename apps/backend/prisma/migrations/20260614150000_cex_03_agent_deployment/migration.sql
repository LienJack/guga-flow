CREATE TABLE "AgentDeployment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'simple',
    "rolesJson" JSONB NOT NULL DEFAULT '{}',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentDeployment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentDeployment_projectId_key" ON "AgentDeployment"("projectId");

ALTER TABLE "AgentDeployment" ADD CONSTRAINT "AgentDeployment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
