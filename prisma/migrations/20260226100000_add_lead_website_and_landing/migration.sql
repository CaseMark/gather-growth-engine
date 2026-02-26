-- Add website and landingPageToken to Lead for enhancement tools
ALTER TABLE "Lead" ADD COLUMN "website" TEXT;
ALTER TABLE "Lead" ADD COLUMN "landingPageToken" TEXT;
