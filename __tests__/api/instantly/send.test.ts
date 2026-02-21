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
});
