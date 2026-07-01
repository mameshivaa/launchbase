export const landingPageConfig = {
  brand: {
    name: "LaunchBase",
    eyebrow: "Supabase-powered launch operations",
    headline: "A launch OS startups can make their own.",
    description:
      "LaunchBase gives early teams the structure for waitlists, feature requests, voting, roadmap planning, and changelog publishing. Drop in your own product screenshots and run it locally on Supabase.",
  },
  theme: {
    accent: "#3ecf8e",
    accentDark: "#299764",
    accentHover: "#34b978",
    heroSurface: "#0f1f19",
    accentSoft: "rgba(62,207,142,0.16)",
    accentStrong: "rgba(62,207,142,0.32)",
  },
  ctas: [
    {
      label: "Open public demo",
      href: "/launchbase-demo",
      variant: "primary",
    },
    {
      label: "Open admin dashboard",
      href: "/launchbase-demo/admin",
      variant: "secondary",
    },
  ],
  stackItems: [
    "Supabase Auth",
    "Postgres RLS",
    "Next.js App Router",
    "Local-first OSS",
  ],
  mediaSlots: {
    hero: {
      eyebrow: "Hero image",
      title: "Place your product screenshot or launch page capture here",
    },
    secondary: [
      {
        eyebrow: "Admin",
        title: "Dashboard screenshot",
      },
      {
        eyebrow: "Public page",
        title: "Customer-facing roadmap",
      },
    ],
  },
  operations: [
    {
      label: "Waitlist",
      title: "Capture launch demand",
      detail:
        "Collect signups, track source, and move leads from pending to invited.",
    },
    {
      label: "Feature requests",
      title: "Prioritize from signal",
      detail: "Turn requests and votes into a short list of product decisions.",
    },
    {
      label: "Roadmap",
      title: "Show what is next",
      detail:
        "Keep planned, active, and shipped work visible without a heavy PM suite.",
    },
    {
      label: "Changelog",
      title: "Publish momentum",
      detail: "Draft and publish updates when customer-visible work lands.",
    },
  ],
} as const;
