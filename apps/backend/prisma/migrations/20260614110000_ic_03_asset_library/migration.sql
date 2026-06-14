ALTER TABLE "Asset" ADD COLUMN "collectionId" TEXT;

CREATE TABLE "AssetCollection" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'manual',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetCollection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetTag" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssetTagAssignment" (
    "assetId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssetTagAssignment_pkey" PRIMARY KEY ("assetId","tagId")
);

CREATE INDEX "Asset_projectId_collectionId_idx" ON "Asset"("projectId", "collectionId");
CREATE INDEX "AssetCollection_projectId_parentId_idx" ON "AssetCollection"("projectId", "parentId");
CREATE UNIQUE INDEX "AssetCollection_projectId_name_key" ON "AssetCollection"("projectId", "name");
CREATE INDEX "AssetTag_projectId_idx" ON "AssetTag"("projectId");
CREATE UNIQUE INDEX "AssetTag_projectId_name_key" ON "AssetTag"("projectId", "name");
CREATE INDEX "AssetTagAssignment_tagId_idx" ON "AssetTagAssignment"("tagId");

ALTER TABLE "Asset" ADD CONSTRAINT "Asset_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "AssetCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetCollection" ADD CONSTRAINT "AssetCollection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetCollection" ADD CONSTRAINT "AssetCollection_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AssetCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AssetTag" ADD CONSTRAINT "AssetTag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetTagAssignment" ADD CONSTRAINT "AssetTagAssignment_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AssetTagAssignment" ADD CONSTRAINT "AssetTagAssignment_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "AssetTag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
