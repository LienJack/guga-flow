ALTER TYPE "CanvasNodeType" ADD VALUE IF NOT EXISTS 'ai_audio';
ALTER TYPE "CanvasEdgeRelation" ADD VALUE IF NOT EXISTS 'generated_audio';
ALTER TYPE "GenerationOperation" ADD VALUE IF NOT EXISTS 'ai_audio_generation';
