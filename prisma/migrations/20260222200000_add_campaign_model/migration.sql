-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "playbookJson" TEXT,
    "icp" TEXT,
    "proofPointsJson" TEXT,
    "leadBatchId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add campaignId to SentCampaign
ALTER TABLE "SentCampaign" ADD COLUMN "campaignId" TEXT;

-- CreateIndex
CREATE INDEX "Campaign_workspaceId_idx" ON "Campaign"("workspaceId");
CREATE INDEX "Campaign_leadBatchId_idx" ON "Campaign"("leadBatchId");
CREATE INDEX "SentCampaign_campaignId_idx" ON "SentCampaign"("campaignId");

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_leadBatchId_fkey" FOREIGN KEY ("leadBatchId") REFERENCES "LeadBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SentCampaign" ADD CONSTRAINT "SentCampaign_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
