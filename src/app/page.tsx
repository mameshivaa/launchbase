import Link from "next/link";
import { landingPageConfig } from "@/config/landing-page";

function ImageSlot({
  title,
  eyebrow,
  ratio = "aspect-[16/10]",
  primary = false,
}: {
  title: string;
  eyebrow: string;
  ratio?: string;
  primary?: boolean;
}) {
  const { theme } = landingPageConfig;

  return (
    <div
      className={`${ratio} relative overflow-hidden rounded-2xl border shadow-sm ${
        primary
          ? "border-white/10"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      }`}
      style={primary ? { backgroundColor: theme.heroSurface } : undefined}
    >
      <div
        className="absolute inset-0"
        style={{
          background: primary
            ? `linear-gradient(135deg, ${theme.accentStrong}, rgba(21,128,61,0.05) 42%, rgba(255,255,255,0.06))`
            : `linear-gradient(135deg, ${theme.accentSoft}, transparent 42%), linear-gradient(180deg, rgba(250,250,250,0.88), rgba(244,244,245,0.72))`,
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(63,63,70,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(63,63,70,0.08)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="absolute inset-x-5 top-5 flex items-center justify-between">
        <div className="flex gap-1.5">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: theme.accent }}
          />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
            primary
              ? "border-white/10 bg-white/10 text-[#b7f7d8]"
              : "border-zinc-200 bg-white/80 text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/80"
          }`}
        >
          Media slot
        </span>
      </div>
      <div className="absolute inset-x-5 bottom-5">
        <p
          className="text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: primary ? theme.accent : theme.accentDark }}
        >
          {eyebrow}
        </p>
        <h2
          className={`mt-2 text-xl font-semibold tracking-tight ${
            primary ? "text-white" : "text-zinc-950 dark:text-zinc-50"
          }`}
        >
          {title}
        </h2>
      </div>
    </div>
  );
}

function OperationCard({
  label,
  title,
  detail,
}: {
  label: string;
  title: string;
  detail: string;
}) {
  const { theme } = landingPageConfig;

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm shadow-zinc-200/60 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-black/20">
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: theme.accentDark }}
      >
        {label}
      </p>
      <h2 className="mt-3 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        {detail}
      </p>
    </article>
  );
}

export default function Home() {
  const { brand, ctas, mediaSlots, operations, stackItems, theme } =
    landingPageConfig;

  return (
    <main className="flex-1 bg-zinc-100 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.92fr_1.08fr] lg:px-8 lg:py-14">
          <div className="flex flex-col justify-center">
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em]"
              style={{ color: theme.accentDark }}
            >
              {brand.eyebrow}
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
              {brand.headline}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
              {brand.description}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {ctas.map((cta) => (
                <Link
                  key={cta.href}
                  href={cta.href}
                  className={
                    cta.variant === "primary"
                      ? "rounded-xl px-5 py-3 text-sm font-semibold text-zinc-950 shadow-sm transition-colors"
                      : "rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
                  }
                  style={
                    cta.variant === "primary"
                      ? { backgroundColor: theme.accent }
                      : undefined
                  }
                >
                  {cta.label}
                </Link>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-2">
              {stackItems.map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4">
            <ImageSlot
              primary
              eyebrow={mediaSlots.hero.eyebrow}
              title={mediaSlots.hero.title}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {mediaSlots.secondary.map((slot) => (
                <ImageSlot
                  key={slot.eyebrow}
                  ratio="aspect-[4/3]"
                  eyebrow={slot.eyebrow}
                  title={slot.title}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        {operations.map((item) => (
          <OperationCard
            key={item.label}
            label={item.label}
            title={item.title}
            detail={item.detail}
          />
        ))}
      </section>
    </main>
  );
}
