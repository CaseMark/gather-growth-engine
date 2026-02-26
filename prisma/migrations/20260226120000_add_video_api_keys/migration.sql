-- Add optional video API keys for Luma and Runway (per-user, encrypted)
ALTER TABLE "Workspace" ADD COLUMN "lumaApiKey" TEXT;
ALTER TABLE "Workspace" ADD COLUMN "runwayApiKey" TEXT;
