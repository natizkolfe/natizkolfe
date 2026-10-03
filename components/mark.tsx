export function MesobMark({ className = "size-8" }: { className?: string }) {
  return <img src="/gebeta-mark.png" alt="" className={`rounded-full ${className}`} />;
}

export function PlatterArt({ className = "" }: { className?: string }) {
  return <img src="/gebeta-logo.png" alt="Gebeta" className={`rounded-2xl ${className}`} />;
}

export function DishSwatch({ color, name }: { color: string; name: string }) {
  const hex = color.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);
  const light = (red * 299 + green * 587 + blue * 114) / 1000 > 180;
  return (
    <span
      aria-hidden
      className="grid size-14 shrink-0 place-items-center rounded-full border border-black/10 shadow-inner"
      style={{ backgroundColor: color, color: light ? "#1C140F" : "#FBF6EE" }}
    >
      <span className="font-display text-xl leading-none">{name.slice(0, 1)}</span>
    </span>
  );
}
