"use client";

import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { DishPhoto } from "@/components/dish-photo";
import { MealChoiceRow } from "@/components/meal-quantity";
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
  chooseMeals = false,
  selectedMealIds = [],
  quantities = {},
  onSelectedMealIds,
  onQuantity,
}: {
  pkg: MealPackage;
  selectedAddonIds: string[];
  onSelectedAddonIds: (ids: string[]) => void;
  actions?: ReactNode;
  servingNote?: string;
  billing?: "catering" | "weekly";
  chooseMeals?: boolean;
  selectedMealIds?: string[];
  quantities?: Record<string, number>;
  onSelectedMealIds?: (ids: string[]) => void;
  onQuantity?: (id: string, quantity: number) => void;
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

  function toggleMeal(id: string) {
    if (!onSelectedMealIds) return;
    const next = selectedMealIds.includes(id)
      ? selectedMealIds.filter((entry) => entry !== id)
      : [...selectedMealIds, id];
    onSelectedMealIds(next);
    if (!selectedMealIds.includes(id)) onQuantity?.(id, quantities[id] ?? 1);
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
      <p className="text-xs tracking-[0.16em] text-primary uppercase">
        {chooseMeals ? "Your meal selection" : "Standard meals included"}
      </p>
      <h3 className="mt-2 font-display text-4xl">{pkg.name}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {chooseMeals ? "Check the foods you want. Each one starts at one container." : pkg.detail}
      </p>
      {chooseMeals ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {selectedMealIds.length === 0 ? "Nothing selected yet." : `${selectedMealIds.length} selected`}
        </p>
      ) : (
        <p className="mt-4 text-sm">
          {pkg.included.length} dishes included
          {billing === "catering" ? (
            <span className="text-muted-foreground"> · {money(CATERING_PRICE_PER_PERSON)} per person</span>
          ) : null}
        </p>
      )}
      <p className="mt-4 text-xs tracking-[0.14em] text-primary uppercase">
        {chooseMeals ? "Choose your meals" : "Included in Standard Package"}
      </p>
      <ul className="mt-3 grid gap-2">
        {chooseMeals
          ? pkg.included.map((dish) => (
              <MealChoiceRow
                key={dish.id}
                id={dish.id}
                label={dish.label}
                selected={selectedMealIds.includes(dish.id)}
                quantity={quantities[dish.id] ?? 1}
                onToggle={() => toggleMeal(dish.id)}
                onQuantity={(quantity) => onQuantity?.(dish.id, quantity)}
              />
            ))
          : pkg.included.map((dish) => (
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
          <span className="block text-sm font-medium">{chooseMeals ? "Want something extra?" : extraLabel}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {chooseMeals
              ? "Optional. Add-ons are a separate charge from the meals you selected."
              : "Optional. These stay separate from the foods already in the package."}
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
                      {billing === "catering" ? `+ ${money(price)}/person` : `+ ${money(price)}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {billing === "catering"
              ? "Each add-on is an extra charge per person, on top of the $21 standard package."
              : "Each add-on is an extra charge. It is not part of the meals you selected."}
          </p>
        </div>
      ) : null}

      {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}
