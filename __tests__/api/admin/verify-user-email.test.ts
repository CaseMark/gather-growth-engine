/**
 * @jest-environment node
 */
import { POST } from "@/app/api/admin/verify-user-email/route";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

jest.mock("@/lib/auth", () => ({}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn(), update: jest.fn() },
  },
}));

const { getServerSession } = require("next-auth");
const { prisma } = require("@/lib/prisma");

describe("POST /api/admin/verify-user-email", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, ADMIN_EMAILS: "admin@test.com" };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns 403 when not authenticated", async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/verify-user-email", {
      method: "POST",
      body: JSON.stringify({ email: "user@test.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Forbidden");
  });

  it("returns 403 when authenticated but not admin", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: "user@test.com" } });

    const req = new Request("http://localhost/api/admin/verify-user-email", {
      method: "POST",
      body: JSON.stringify({ email: "other@test.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Forbidden");
  });

  it("returns 400 when neither email nor userId provided", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: "admin@test.com" } });

    const req = new Request("http://localhost/api/admin/verify-user-email", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Provide email or userId");
  });

  it("returns 404 when user not found by email", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: "admin@test.com" } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    const req = new Request("http://localhost/api/admin/verify-user-email", {
      method: "POST",
      body: JSON.stringify({ email: "nobody@test.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("User not found");
  });

  it("verifies user by email and returns 200", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: "admin@test.com" } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "user@test.com",
    });
    (prisma.user.update as jest.Mock).mockResolvedValue(undefined);

    const req = new Request("http://localhost/api/admin/verify-user-email", {
      method: "POST",
      body: JSON.stringify({ email: "user@test.com" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toBe("User email verified");
    expect(data.email).toBe("user@test.com");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        emailVerified: expect.any(Date),
        emailVerificationToken: null,
      },
    });
  });

  it("verifies user by userId when provided", async () => {
    (getServerSession as jest.Mock).mockResolvedValue({ user: { email: "admin@test.com" } });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: "user-2",
      email: "other@test.com",
    });
    (prisma.user.update as jest.Mock).mockResolvedValue(undefined);

    const req = new Request("http://localhost/api/admin/verify-user-email", {
      method: "POST",
      body: JSON.stringify({ userId: "user-2" }),
      headers: { "Content-Type": "application/json" },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.email).toBe("other@test.com");
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: "user-2" } });
  });
});
