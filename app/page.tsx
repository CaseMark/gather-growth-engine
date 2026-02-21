import Link from "next/link";
import { APP_DISPLAY_NAME } from "@/lib/app-config";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-lg font-semibold">{APP_DISPLAY_NAME}</span>
          <nav className="flex gap-6">
            <Link href="/login" className="text-zinc-400 hover:text-zinc-100">
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-500"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24">
        <h1 className="max-w-2xl text-center text-4xl font-bold tracking-tight sm:text-5xl">
          Outbound that runs itself
        </h1>
        <p className="mt-6 max-w-xl text-center text-lg text-zinc-400">
          Add your domain and ICP. We crawl, build the playbook, personalize at
          scale, send via Instantly, and optimize for opens and visits.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            href="/signup"
            className="rounded-md bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-zinc-700 px-6 py-3 font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
          >
            Log in
          </Link>
        </div>
      </main>
    </div>
  );
}
