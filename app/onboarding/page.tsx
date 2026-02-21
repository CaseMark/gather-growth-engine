import Link from "next/link";

export default function OnboardingPage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 px-6 py-4">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/dashboard" className="text-lg font-semibold">
            Gather Growth Engine
          </Link>
          <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-100">
            ← Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-2xl font-semibold">Onboarding</h1>
        <p className="mt-2 text-zinc-400">
          Enter your domain and API keys. We’ll crawl your home page and use
          these to run the engine. (Form not wired yet — placeholder.)
        </p>

        <form className="mt-10 space-y-8" action="#" method="POST">
          <div>
            <label htmlFor="domain" className="block text-sm font-medium text-zinc-300">
              Your domain
            </label>
            <input
              id="domain"
              name="domain"
              type="text"
              placeholder="acme.com"
              className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-sm font-medium text-zinc-300">API keys</h2>
            <div>
              <label htmlFor="anthropic_key" className="block text-sm text-zinc-400">
                Anthropic API key
              </label>
              <input
                id="anthropic_key"
                name="anthropic_key"
                type="password"
                placeholder="sk-ant-..."
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="instantly_key" className="block text-sm text-zinc-400">
                Instantly API key
              </label>
              <input
                id="instantly_key"
                name="instantly_key"
                type="password"
                placeholder="Instantly API key"
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full rounded-md bg-emerald-600 py-3 font-medium text-white hover:bg-emerald-500"
          >
            Save and continue
          </button>
        </form>
      </main>
    </div>
  );
}
