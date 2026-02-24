/**
 * @jest-environment node
 */
import { POST } from "@/app/api/instantly/send/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({}));

jest.mock("@/lib/instantly", () => ({ getInstantlyClientForUserId: jest.fn() }));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findUnique: jest.fn() },
    leadBatch: { findFirst: jest.fn() },
    lead: { updateMany: jest.fn() },
    campaign: { findFirst: jest.fn(), update: jest.fn() },
    sentCampaign: { create: jest.fn(), createMany: jest.fn() },
  },
}));

const { getServerSession } = require("next-auth");
const { prisma } = require("@/lib/prisma");

describe("POST /api/instantly/send", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost/api/instantly/send", {
      method: "POST",
      body: JSON.stringify({ batchId: "batch-1", campaignName: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when campaign name is empty", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });

    const req = new Request("http://localhost/api/instantly/send", {
      method: "POST",
      body: JSON.stringify({ batchId: "batch-1", campaignName: "   " }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Campaign name is required");
  });

  it("returns 400 when batchId is missing", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });

    const req = new Request("http://localhost/api/instantly/send", {
      method: "POST",
      body: JSON.stringify({ campaignName: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("batchId is required");
  });

  it("returns 400 when lead has blank or too-short subject/body (no blank emails)", async () => {
    const { getInstantlyClientForUserId } = require("@/lib/instantly");
    (getInstantlyClientForUserId as jest.Mock).mockResolvedValue({
      client: { createCampaign: jest.fn(), bulkAddLeadsToCampaign: jest.fn(), addCampaignVariables: jest.fn(), activateCampaign: jest.fn(), applyRampForUnwarmedAccounts: jest.fn() },
    });

    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
      id: "ws-1",
      playbookApproved: true,
      playbookJson: JSON.stringify({
        steps: [
          { subject: "Hi", body: "Body", delayDays: 0 },
          { subject: "Follow", body: "Up", delayDays: 3 },
        ],
      }),
    });
    (prisma.leadBatch.findFirst as jest.Mock).mockResolvedValue({
      id: "batch-1",
      workspaceId: "ws-1",
      leads: [
        {
          id: "lead-1",
          email: "test@example.com",
          name: "Test",
          company: "Acme",
          stepsJson: JSON.stringify([
            { subject: "Hi", body: "Short" }, // subject <10, body <50
            { subject: "Follow up subject here", body: "This body has enough content to pass the fifty character minimum requirement." },
          ]),
        },
      ],
    });

    const req = new Request("http://localhost/api/instantly/send", {
      method: "POST",
      body: JSON.stringify({ batchId: "batch-1", campaignName: "Test" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Quality check failed");
    expect(data.error).toMatch(/subject|body|10|50/);
  });

  it("returns 400 when A/B test is enabled but subject lines are missing", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
      id: "ws-1",
      playbookApproved: true,
      playbookJson: "{}",
    });

    const req = new Request("http://localhost/api/instantly/send", {
      method: "POST",
      body: JSON.stringify({ batchId: "batch-1", campaignName: "AB Test", abTest: true }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("subjectLineA");
  });

  it("creates campaigns with delayUnit days (not minutes) for actual send", async () => {
    const createCampaignMock = jest.fn().mockResolvedValue({ id: "camp-1" });
    const bulkAddMock = jest.fn().mockResolvedValue({ leads_uploaded: 1, duplicated_leads: 0, in_blocklist: 0 });
    const addVarsMock = jest.fn().mockResolvedValue(undefined);
    const activateMock = jest.fn().mockResolvedValue(undefined);
    const applyRampMock = jest.fn().mockResolvedValue(undefined);

    const { getInstantlyClientForUserId } = require("@/lib/instantly");
    (getInstantlyClientForUserId as jest.Mock).mockResolvedValue({
      client: {
        createCampaign: createCampaignMock,
        bulkAddLeadsToCampaign: bulkAddMock,
        addCampaignVariables: addVarsMock,
        activateCampaign: activateMock,
        applyRampForUnwarmedAccounts: applyRampMock,
      },
    });

    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({
      id: "ws-1",
      playbookApproved: true,
      playbookJson: JSON.stringify({
        steps: [
          { subject: "Hi", body: "Body here", delayDays: 0 },
          { subject: "Follow up", body: "Follow up body content here", delayDays: 3 },
        ],
      }),
    });
    (prisma.leadBatch.findFirst as jest.Mock).mockResolvedValue({
      id: "batch-1",
      workspaceId: "ws-1",
      leads: [
        {
          id: "lead-1",
          email: "test@example.com",
          name: "Test",
          company: "Acme",
          stepsJson: JSON.stringify([
            { subject: "Hi Test at Acme", body: "This is a personalized body with enough content to pass the quality gate of fifty characters minimum." },
            { subject: "Follow up for Test", body: "This is the follow up body with enough content to pass the quality gate of fifty characters minimum." },
          ]),
        },
      ],
    });
    (prisma.sentCampaign.create as jest.Mock).mockResolvedValue({});

    const req = new Request("http://localhost/api/instantly/send", {
      method: "POST",
      body: JSON.stringify({ batchId: "batch-1", campaignName: "Real Campaign" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    expect(createCampaignMock).toHaveBeenCalled();
    const [, options] = createCampaignMock.mock.calls[0];
    expect(options.delayUnit).toBe("days");
    expect(options.sequenceSteps).toBeDefined();
    expect(options.sequenceSteps?.length).toBeGreaterThan(0);
  });
});
