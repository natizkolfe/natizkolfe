import { WEEKLY_CONTAINERS } from "@/lib/packages";
import { cn } from "cn";

export function WeeklyContainer({
  days,
  selected = false,
  className,
}: {
  days: 7 | 14;
  selected?: boolean;
  className?: string;
}) {
  const container = WEEKLY_CONTAINERS[days];

  return (
    <figure className={cn("grid h-full gap-3", className)}>
      <figcaption>
        <p className="font-display text-2xl">{container.title}</p>
      </figcaption>
      <div
        className={cn(
          "flex h-28 items-center justify-center overflow-hidden rounded-xl border bg-white px-3",
          selected ? "border-primary" : "border-border",
        )}
      >
        {container.imageSrc ? (
          <img
            src={container.imageSrc}
            alt={container.imageAlt}
            className="max-h-full w-full object-contain"
          />
        ) : (
          <ContainerDrawing weeks={container.weeks} />
        )}
      </div>
      <p className="text-sm font-medium">{container.sizeNote}</p>
    </figure>
  );
}

function ContainerDrawing({ weeks }: { weeks: 1 | 2 }) {
  if (weeks === 1) {
    return (
      <svg viewBox="0 0 220 120" className="h-28 w-52" role="img" aria-label="Placeholder one-week container">
        <rect x="28" y="34" width="164" height="62" rx="10" fill="#E7D3A1" stroke="#7C2430" strokeWidth="3" />
        <path d="M36 34c18-22 130-22 148 0" fill="#F6EFE4" stroke="#7C2430" strokeWidth="3" />
        <circle cx="78" cy="66" r="10" fill="#8E2A2A" />
        <circle cx="110" cy="62" r="12" fill="#2F6B45" />
        <circle cx="142" cy="68" r="9" fill="#C46A2B" />
        <text x="110" y="112" textAnchor="middle" fill="#5E4C3D" fontSize="11" fontFamily="Georgia, serif">
          1-week placeholder
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 260 180" className="h-44 w-64" role="img" aria-label="Placeholder two-week container">
      <rect x="48" y="78" width="164" height="58" rx="10" fill="#E7D3A1" stroke="#7C2430" strokeWidth="3" />
      <rect x="36" y="28" width="188" height="62" rx="12" fill="#F3E2C0" stroke="#234C38" strokeWidth="3" />
      <path d="M46 28c22-18 146-18 168 0" fill="#F6EFE4" stroke="#234C38" strokeWidth="3" />
      <circle cx="92" cy="58" r="9" fill="#8E2A2A" />
      <circle cx="122" cy="54" r="11" fill="#2F6B45" />
      <circle cx="154" cy="60" r="8" fill="#C46A2B" />
      <circle cx="100" cy="108" r="9" fill="#7C2430" />
      <circle cx="132" cy="104" r="12" fill="#3E7A4A" />
      <circle cx="166" cy="110" r="8" fill="#C4A15A" />
      <text x="130" y="164" textAnchor="middle" fill="#5E4C3D" fontSize="11" fontFamily="Georgia, serif">
        2-week placeholder
      </text>
    </svg>
  );
}
