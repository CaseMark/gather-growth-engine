import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { encrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { domain, anthropicKey, instantlyKey } = await request.json();

    if (!domain || !anthropicKey || !instantlyKey) {
      return NextResponse.json(
        { error: "Domain, Anthropic key, and Instantly key are required" },
        { status: 400 }
      );
    }

    // Validate domain format (basic check)
    const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
    if (!domainRegex.test(domain)) {
      return NextResponse.json(
        { error: "Invalid domain format" },
        { status: 400 }
      );
    }

    // Encrypt API keys
    const encryptedAnthropicKey = encrypt(anthropicKey);
    const encryptedInstantlyKey = encrypt(instantlyKey);

    // Upsert workspace (create or update)
    const workspace = await prisma.workspace.upsert({
      where: { userId: session.user.id },
      update: {
        domain,
        anthropicKey: encryptedAnthropicKey,
        instantlyKey: encryptedInstantlyKey,
      },
      create: {
        userId: session.user.id,
        domain,
        anthropicKey: encryptedAnthropicKey,
        instantlyKey: encryptedInstantlyKey,
      },
    });

    return NextResponse.json(
      { message: "Onboarding data saved successfully", workspaceId: workspace.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        domain: true,
        productSummary: true,
        createdAt: true,
        updatedAt: true,
        // Don't return encrypted keys
      },
    });

    return NextResponse.json({ workspace }, { status: 200 });
  } catch (error) {
    console.error("Get workspace error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
