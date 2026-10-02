export function MesobMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden>
      <circle cx="32" cy="32" r="30" fill="#7C2430" />
      <circle cx="32" cy="32" r="22" fill="#F3EBDD" />
      <circle cx="32" cy="24" r="7" fill="#7C2430" />
      <circle cx="42" cy="36" r="6" fill="#C46A2B" />
      <circle cx="24" cy="38" r="6.5" fill="#234C38" />
      <circle cx="33" cy="44" r="4" fill="#E2B84A" />
    </svg>
  );
}

export function PlatterArt({ className = "" }: { className?: string }) {
  const pores = [
    [80, 70],
    [120, 96],
    [210, 60],
    [300, 90],
    [70, 180],
    [330, 170],
    [90, 280],
    [300, 300],
    [180, 40],
    [40, 120],
    [360, 240],
    [200, 330],
    [140, 300],
    [250, 80],
  ];
  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label="A platter of Ethiopian stews on injera">
      <circle cx="200" cy="200" r="188" fill="#E4CFAE" />
      <circle cx="200" cy="200" r="168" fill="#F6E7CF" />
      {pores.map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="7" fill="#E7D3B0" />
      ))}
      <circle cx="168" cy="150" r="46" fill="#7C2430" />
      <circle cx="248" cy="168" r="38" fill="#C46A2B" />
      <circle cx="150" cy="230" r="42" fill="#234C38" />
      <circle cx="230" cy="246" r="34" fill="#E2B84A" />
      <circle cx="206" cy="196" r="18" fill="#F7F1E6" />
      <circle cx="286" cy="230" r="22" fill="#9A2E3A" />
    </svg>
  );
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
