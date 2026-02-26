-- Add video URL and task tracking for AI video generation
ALTER TABLE "Lead" ADD COLUMN "videoUrl" TEXT;
ALTER TABLE "Lead" ADD COLUMN "videoTaskId" TEXT;
ALTER TABLE "Lead" ADD COLUMN "videoTaskProvider" TEXT;
