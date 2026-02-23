import Link from "next/link";
import { APP_DISPLAY_NAME } from "@/lib/app-config";

const GITHUB_REPO = "https://github.com/mayankgbh/gather-growth-engine";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold tracking-tight text-zinc-100">
            {APP_DISPLAY_NAME}
          </span>
          <nav className="flex items-center gap-6">
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              GitHub
            </a>
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-zinc-200"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Sign up free
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-6 pt-20 pb-16 text-center sm:pt-28 sm:pb-24">
          <p className="mb-4 inline-block rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400">
            Free to use — now and forever
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-100 sm:text-5xl md:text-6xl">
            Outbound that runs itself
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-zinc-400 sm:text-xl">
            Add your domain and ICP. We crawl your site, build the playbook,
            personalize every email per lead, send via Instantly, and tune for
            opens and replies. No SDR required.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            You bring your own <strong className="text-zinc-400">Anthropic</strong> and <strong className="text-zinc-400">Instantly</strong> API keys — we never charge for usage.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/signup"
              className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500"
            >
              Get started free
            </Link>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-6 py-3 font-medium text-zinc-300 hover:border-zinc-600 hover:bg-zinc-800/50 hover:text-zinc-100"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              View on GitHub
            </a>
          </div>
        </section>

        {/* Explainer */}
        <section className="border-y border-zinc-800/80 bg-zinc-900/50">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <h2 className="text-center text-2xl font-semibold text-zinc-100 sm:text-3xl">
              What it does
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-400">
              An automated outbound engine that does what SDRs do: research, sequence, personalize, send, and learn.
            </p>
            <ul className="mx-auto mt-12 grid max-w-3xl gap-6 sm:grid-cols-2">
              {[
                { title: "Crawl & playbook", desc: "We crawl your site, infer your ICP, and generate a multi-step email playbook you can edit and approve." },
                { title: "Personalize per lead", desc: "Each lead gets a full sequence written for them — every step, every email — using your playbook and their profile." },
                { title: "Verify & classify", desc: "Verify emails and classify leads by persona and vertical so you can target and measure what works." },
                { title: "Send via Instantly", desc: "One click sends campaigns to Instantly with your chosen accounts. We handle sequence, line breaks, and variables." },
                { title: "Learn what works", desc: "Track opens, clicks, and replies. We use that to suggest better subject lines and segments for the next run." },
              ].map((item, i) => (
                <li key={i} className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-5">
                  <h3 className="font-medium text-zinc-200">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-zinc-500">{item.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Free & open source */}
        <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 sm:p-10">
            <h2 className="text-xl font-semibold text-zinc-100 sm:text-2xl">
              Free now and forever
            </h2>
            <p className="mt-3 text-zinc-400">
              Get going at no cost. No credit card, no trial countdown. We want you to run outbound without lock-in.
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              You provide your own <strong className="text-zinc-400">Anthropic</strong> and <strong className="text-zinc-400">Instantly</strong> API keys during onboarding; we don&apos;t store or charge for them.
            </p>
            <h2 className="mt-10 text-xl font-semibold text-zinc-100 sm:text-2xl">
              Open source — fork and own it
            </h2>
            <p className="mt-3 text-zinc-400">
              The project is on GitHub. Fork it, self-host it, or contribute. You own your data and your pipeline.
            </p>
            <a
              href={GITHUB_REPO}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300"
            >
              <span>Fork on GitHub</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        {/* More coming soon */}
        <section className="border-t border-zinc-800/80 bg-zinc-950">
          <div className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
            <h2 className="text-xl font-semibold text-zinc-100 sm:text-2xl">
              More features coming soon
            </h2>
            <p className="mt-3 text-zinc-400">
              We’re actively building: smarter sequencing, more integrations, and better analytics. Stay tuned or open an issue on GitHub to shape the roadmap.
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-zinc-800/80 px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-semibold text-zinc-100 sm:text-3xl">
              Ready to run outbound on autopilot?
            </h2>
            <p className="mt-4 text-zinc-400">
              Sign up free. Connect your site, playbook, and Instantly — then send.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/signup"
                className="rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500"
              >
                Get started free
              </Link>
              <Link
                href="/login"
                className="rounded-lg border border-zinc-700 px-6 py-3 font-medium text-zinc-300 hover:border-zinc-600 hover:text-zinc-100"
              >
                Log in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-800 px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="text-sm text-zinc-500">{APP_DISPLAY_NAME}</span>
          <div className="flex flex-wrap items-center justify-center gap-6">
            <a href="https://gatherhq.com" target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 hover:text-zinc-400">
              Visit gatherhq.com
            </a>
            <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" className="text-sm text-zinc-500 hover:text-zinc-400">
              GitHub
            </a>
            <Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-400">
              Log in
            </Link>
            <Link href="/signup" className="text-sm text-zinc-500 hover:text-zinc-400">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
