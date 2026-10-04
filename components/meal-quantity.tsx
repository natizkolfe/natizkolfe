"use client";

import { Check, Minus, Plus } from "lucide-react";
import { DishPhoto } from "@/components/dish-photo";
import { cn } from "cn";

export function MealChoiceRow({
  id,
  label,
  detail,
  selected,
  quantity,
  onToggle,
  onQuantity,
}: {
  id: string;
  label: string;
  detail?: string;
  selected: boolean;
  quantity: number;
  onToggle: () => void;
  onQuantity: (quantity: number) => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-lg border border-border px-3 py-2 text-sm">
      <button
        type="button"
        aria-pressed={selected}
        onClick={onToggle}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={cn(
            "flex size-5 shrink-0 items-center justify-center rounded border",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card",
          )}
        >
          {selected ? <Check className="size-3" aria-hidden /> : null}
        </span>
        <DishPhoto id={id} />
        <span className="min-w-0">
          <span className="block">{label}</span>
          {detail ? <span className="block text-xs text-muted-foreground">{detail}</span> : null}
        </span>
      </button>
      {selected ? (
        <span className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label={`Fewer ${label}`}
            disabled={quantity <= 1}
            onClick={() => onQuantity(quantity - 1)}
            className="flex size-8 items-center justify-center rounded-md border border-border bg-background disabled:opacity-40"
          >
            <Minus className="size-3.5" aria-hidden />
          </button>
          <span className="w-6 text-center tabular-nums" aria-live="polite">
            {quantity}
          </span>
          <button
            type="button"
            aria-label={`More ${label}`}
            disabled={quantity >= 20}
            onClick={() => onQuantity(quantity + 1)}
            className="flex size-8 items-center justify-center rounded-md border border-border bg-background disabled:opacity-40"
          >
            <Plus className="size-3.5" aria-hidden />
          </button>
        </span>
      ) : null}
    </li>
  );
}
