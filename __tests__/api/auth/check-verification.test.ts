/**
 * @jest-environment node
 */
import { GET } from "@/app/api/auth/check-verification/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    workspace: { findUnique: jest.fn() },
  },
}));

const { getServerSession } = require("next-auth");
const { prisma } = require("@/lib/prisma");

describe("GET /api/auth/check-verification", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns verified: false and hasWorkspace: false when not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost/api/auth/check-verification");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.verified).toBe(false);
    expect(data.hasWorkspace).toBe(false);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it("returns verified: true and hasWorkspace: true when user is verified and has workspace", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      emailVerified: new Date(),
    });
    (prisma.workspace.findUnique as jest.Mock).mockResolvedValue({ id: "ws-1" });

    const req = new Request("http://localhost/api/auth/check-verification");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.verified).toBe(true);
    expect(data.hasWorkspace).toBe(true);
  });

  it("returns verified: false when user has no emailVerified", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      emailVerified: null,
    });
    (prisma.workspace.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost/api/auth/check-verification");
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.verified).toBe(false);
    expect(data.hasWorkspace).toBe(false);
  });
});
