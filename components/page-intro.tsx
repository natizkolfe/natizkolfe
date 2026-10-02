export function PageIntro({
  eyebrow,
  title,
  lede,
}: {
  eyebrow?: string;
  title: string;
  lede?: string;
}) {
  return (
    <header className="max-w-3xl">
      {eyebrow ? <p className="text-xs tracking-[0.18em] text-primary uppercase">{eyebrow}</p> : null}
      <h1 className="mt-2 font-display text-4xl leading-[1.05] text-balance sm:text-5xl">{title}</h1>
      {lede ? <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{lede}</p> : null}
    </header>
  );
}

export function Shell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 ${className}`}>{children}</div>;
}
