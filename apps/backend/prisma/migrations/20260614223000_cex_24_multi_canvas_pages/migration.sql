DROP INDEX IF EXISTS "CanvasDocument_projectId_key";
CREATE INDEX IF NOT EXISTS "CanvasDocument_projectId_idx" ON "CanvasDocument"("projectId");
