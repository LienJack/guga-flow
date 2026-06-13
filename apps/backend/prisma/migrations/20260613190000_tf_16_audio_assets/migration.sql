ALTER TYPE "AssetType" ADD VALUE IF NOT EXISTS 'audio';

ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'shot_audio';
ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'voice_reference';
ALTER TYPE "AssetPurpose" ADD VALUE IF NOT EXISTS 'background_music';
