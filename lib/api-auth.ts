import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

/**
 * API key for programmatic access (MCP, cron, integrations).
 * Set MCP_API_KEY or GATHER_GROWTH_API_KEY in env. Pass as X-API-Key header.
 * Optional: MCP_USER_ID — when set, API key auth is treated as this user (for MCP tools that need a workspace).
 */
function getApiKeyFromEnv(): string | null {
  return process.env.MCP_API_KEY ?? process.env.GATHER_GROWTH_API_KEY ?? null;
}

function getApiKeyUserId(): string | null {
  return process.env.MCP_USER_ID?.trim() ?? null;
}

export type AuthResult =
  | { type: "session"; userId: string }
  | { type: "api_key"; userId?: string }
  | { type: "none" };

/**
 * Authenticate from session (cookie) or X-API-Key header.
 * Use this in API routes that should support both dashboard and MCP/programmatic access.
 */
export async function getAuth(request: Request): Promise<AuthResult> {
  const apiKey = request.headers.get("x-api-key")?.trim() ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  const expectedKey = getApiKeyFromEnv();
  if (expectedKey && apiKey && apiKey === expectedKey) {
    return { type: "api_key", userId: getApiKeyUserId() ?? undefined };
  }
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    return { type: "session", userId: session.user.id };
  }
  return { type: "none" };
}

export function requireAuth(auth: AuthResult): { userId?: string } {
  if (auth.type === "none") {
    throw new Error("Unauthorized");
  }
  const userId = auth.type === "session" ? auth.userId : auth.userId;
  return { userId };
}
