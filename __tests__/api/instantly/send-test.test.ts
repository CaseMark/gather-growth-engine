/**
 * @jest-environment node
 */
import { POST } from "@/app/api/instantly/send/test/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({}));

jest.mock("@/lib/instantly", () => ({ getInstantlyClientForUserId: jest.fn() }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findUnique: jest.fn() },
    leadBatch: { findFirst: jest.fn() },
  },
}));

const { getServerSession } = require("next-auth");
const { prisma } = require("@/lib/prisma");

describe("POST /api/instantly/send/test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates test campaign with delayUnit minutes (not days)", async () => {
    const createCampaignMock = jest.fn().mockResolvedValue({ id: "test-camp-1" });
    const bulkAddMock = jest.fn().mockResolvedValue({ leads_uploaded: 1, duplicated_leads: 0, in_blocklist: 0 });
    const addVarsMock = jest.fn().mockResolvedValue(undefined);
    const activateMock = jest.fn().mockResolvedValue(undefined);

    const { getInstantlyClientForUserId } = require("@/lib/instantly");
    (getInstantlyClientForUserId as jest.Mock).mockResolvedValue({
      client: {
        createCampaign: createCampaignMock,
        bulkAddLeadsToCampaign: bulkAddMock,
        addCampaignVariables: addVarsMock,
        activateCampaign: activateMock,
      },
    });

    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
      id: "ws-1",
      playbookJson: JSON.stringify({
        steps: [
          { subject: "Hi", body: "Body", delayDays: 0 },
          { subject: "Follow up", body: "Follow body", delayDays: 3 },
        ],
      }),
    });
    (prisma.leadBatch.findFirst as jest.Mock).mockResolvedValue({
      id: "batch-1",
      workspaceId: "ws-1",
      leads: [
        {
          id: "lead-1",
          email: "lead@example.com",
          stepsJson: JSON.stringify([
            { subject: "Test subject line here", body: "This is a personalized body with enough content to pass the quality gate of fifty characters." },
            { subject: "Follow up subject", body: "Follow up body with enough content to pass the quality gate of fifty characters minimum." },
          ]),
        },
      ],
    });

    const req = new Request("http://localhost/api/instantly/send/test", {
      method: "POST",
      body: JSON.stringify({
        batchId: "batch-1",
        campaignName: "Test Campaign",
        testEmail: "me@example.com",
      }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(createCampaignMock).toHaveBeenCalled();
    const [, options] = createCampaignMock.mock.calls[0];
    expect(options.delayUnit).toBe("minutes");
    expect(options.sequenceSteps).toBeDefined();
  });
});
