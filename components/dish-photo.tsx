import { dishImage } from "@/lib/packages";

export function DishPhoto({ id, size = "md" }: { id: string; size?: "sm" | "md" }) {
  const src = dishImage(id);
  const frame = size === "sm" ? "size-9" : "size-12";
  if (!src) return <span className={`${frame} shrink-0 rounded-full border border-border bg-muted`} aria-hidden />;
  return (
    <img
      src={src}
      alt=""
      className={`${frame} shrink-0 rounded-full border border-border bg-white object-cover`}
    />
  );
}
