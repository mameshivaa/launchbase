type SectionHeaderProps = {
  id?: string;
  title: string;
  description?: string;
};

export function SectionHeader({ id, title, description }: SectionHeaderProps) {
  return (
    <div id={id} className="scroll-mt-24">
      <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {title}
      </h2>
      {description ? (
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}
