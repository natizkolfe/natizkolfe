import { dishImage } from "@/lib/packages";

export function DishPhoto({ id, size = "md" }: { id: string; size?: "sm" | "md" }) {
  const src = dishImage(id);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      className={`${size === "sm" ? "size-9" : "size-12"} shrink-0 rounded-full border border-border bg-white object-cover`}
    />
  );
}
