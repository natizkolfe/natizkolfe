"use client";

import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { DishPhoto } from "@/components/dish-photo";
import { money } from "@/lib/format";
import { CATERING_PRICE_PER_PERSON, writeAddonMemory, type MealPackage } from "@/lib/packages";
import { cn } from "cn";

export function PackagePanel({
  pkg,
  selectedAddonIds,
  onSelectedAddonIds,
  actions,
  servingNote,
  billing = "catering",
}: {
  pkg: MealPackage;
  selectedAddonIds: string[];
  onSelectedAddonIds: (ids: string[]) => void;
  actions?: ReactNode;
  servingNote?: string;
  billing?: "catering" | "weekly";
}) {
  const [open, setOpen] = useState(selectedAddonIds.length > 0);
  const extraLabel = pkg.id === "fasting" ? "Add extra fasting items" : "Add extra non-fasting items";

  function toggleAddon(id: string) {
    const next = selectedAddonIds.includes(id)
      ? selectedAddonIds.filter((entry) => entry !== id)
      : [...selectedAddonIds, id];
    onSelectedAddonIds(next);
    writeAddonMemory(pkg.id, next);
    if (!selectedAddonIds.includes(id)) setOpen(true);
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
      <p className="text-xs tracking-[0.16em] text-primary uppercase">Standard meals included</p>
      <h3 className="mt-2 font-display text-4xl">{pkg.name}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{pkg.detail}</p>
      <p className="mt-4 text-sm">
        {pkg.included.length} dishes included
        {billing === "catering" ? (
          <span className="text-muted-foreground"> · {money(CATERING_PRICE_PER_PERSON)} per person</span>
        ) : null}
      </p>
      <p className="mt-4 text-xs tracking-[0.14em] text-primary uppercase">Included in Standard Package</p>
      <ul className="mt-3 grid gap-2">
        {pkg.included.map((dish) => (
          <li key={dish.id} className="flex items-center gap-3 text-sm">
            <span className="flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-3" aria-hidden />
            </span>
            <DishPhoto id={dish.id} />
            <span>{dish.label}</span>
            <span className="ml-auto text-xs tracking-wide text-muted-foreground uppercase">Included</span>
          </li>
        ))}
      </ul>
      {servingNote ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{servingNote}</p> : null}

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="mt-6 flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-medium">{extraLabel}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Optional. These stay separate from the foods already in the package.
          </span>
        </span>
        <span
          className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", open ? "bg-primary" : "bg-muted")}
          aria-hidden
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-card shadow-sm transition-all",
              open ? "left-5" : "left-0.5",
            )}
          />
        </span>
      </button>

      {open ? (
        <div className="mt-3 rounded-lg border border-dashed border-border bg-background/70 p-3">
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">Optional add-ons</p>
          <ul className="mt-3 grid gap-2">
            {pkg.addons.map((dish) => {
              const selected = selectedAddonIds.includes(dish.id);
              const price = dish.pricePerPerson ?? 0;
              return (
                <li key={dish.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleAddon(dish.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm",
                      selected ? "border-primary bg-primary/5" : "border-border",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center rounded border",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card",
                      )}
                    >
                      {selected ? <Check className="size-3" aria-hidden /> : null}
                    </span>
                    <DishPhoto id={dish.id} />
                    <span>{dish.label}</span>
                    <span className="ml-auto text-sm tabular-nums">
                      {billing === "catering" ? `+ ${money(price)}/person` : `+ ${money(price)} each day`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {billing === "catering"
              ? "Each add-on is an extra charge per person, on top of the $21 standard package."
              : "Each add-on is an extra charge for every day of the container you chose."}
          </p>
        </div>
      ) : null}

      {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}
