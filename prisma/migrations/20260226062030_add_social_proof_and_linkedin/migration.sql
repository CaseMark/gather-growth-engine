-- DropIndex
DROP INDEX "Campaign_leadBatchId_idx";

-- DropIndex
DROP INDEX "Campaign_workspaceId_idx";

-- DropIndex
DROP INDEX "SentCampaign_campaignId_idx";

-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "linkedinMessage" TEXT;

-- AlterTable
ALTER TABLE "Workspace" ADD COLUMN     "socialProofJson" TEXT;

-- AddForeignKey
ALTER TABLE "SentCampaign" ADD CONSTRAINT "SentCampaign_leadBatchId_fkey" FOREIGN KEY ("leadBatchId") REFERENCES "LeadBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
