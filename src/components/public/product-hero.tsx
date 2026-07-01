type ProductHeroProps = {
  name: string;
  slug: string;
};

export function ProductHero({ name, slug }: ProductHeroProps) {
  return (
    <header className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white px-6 py-10 sm:px-10 sm:py-12 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
      <div className="relative flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <p className="text-xs font-medium uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            Public product page
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
            {name}
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-zinc-600 dark:text-zinc-400">
            Public roadmap, waitlist, feature requests, voting, and changelog —
            powered by Supabase.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <a
            href="#waitlist"
            className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600"
          >
            Join the waitlist
          </a>
          <a
            href="#feature-requests"
            className="inline-flex items-center justify-center rounded-lg border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
          >
            Request a feature
          </a>
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          <span className="font-mono">/{slug}</span>
          <span className="mx-2 text-zinc-300 dark:text-zinc-700">·</span>
          Row-level security enforced on every query
        </p>
      </div>
    </header>
  );
}
