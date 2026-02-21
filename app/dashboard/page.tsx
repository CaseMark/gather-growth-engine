"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold">
            Gather Growth Engine
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="text-zinc-100">
              Dashboard
            </Link>
            <Link href="/onboarding" className="text-zinc-400 hover:text-zinc-100">
              Onboarding
            </Link>
            <span className="text-sm text-zinc-400">{session.user?.email}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="text-sm text-zinc-400 hover:text-zinc-100"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-zinc-400">
          Welcome, {session.user?.name || session.user?.email}! Once onboarding is done you'll see playbooks, leads,
          and send stats here.
        </p>
        <div className="mt-8">
          <Link
            href="/onboarding"
            className="inline-flex rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
          >
            Go to onboarding (domain + keys)
          </Link>
        </div>
      </main>
    </div>
  );
}
