"use client";

import { Check } from "lucide-react";
import { DishPhoto } from "@/components/dish-photo";
import { money } from "@/lib/format";
import { cateringAddons, cateringFoodSections, type PackageDish } from "@/lib/packages";
import type { FastingPreference } from "@/lib/types";
import { cn } from "cn";

export function CateringMenu({
  preference,
  includedIds,
  addonIds,
  onIncludedIds,
  onAddonIds,
}: {
  preference: FastingPreference;
  includedIds: string[];
  addonIds: string[];
  onIncludedIds: (ids: string[]) => void;
  onAddonIds: (ids: string[]) => void;
}) {
  const sections = cateringFoodSections(preference);
  const extras = cateringAddons(preference);

  function toggle(ids: string[], id: string, onChange: (ids: string[]) => void) {
    onChange(ids.includes(id) ? ids.filter((entry) => entry !== id) : [...ids, id]);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs tracking-[0.16em] text-primary uppercase">Catering options</p>
        <h3 className="mt-2 font-display text-4xl">Choose your catering foods</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Recommended foods start selected. Uncheck any of them, or choose different foods. Nothing here is locked.
        </p>
        <div className="mt-6 grid gap-6">
          {sections.map((section) => (
            <div key={section.side} className="grid gap-2">
              <h4 className="text-xs tracking-[0.14em] text-primary uppercase">{section.title}</h4>
              {section.dishes.map((dish) => (
                <FoodCheck
                  key={dish.id}
                  dish={dish}
                  selected={includedIds.includes(dish.id)}
                  detail="Standard selection"
                  onToggle={() => toggle(includedIds, dish.id, onIncludedIds)}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6">
        <h3 className="font-display text-3xl">Add something extra</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          These are optional. Each one raises the price per person.
        </p>
        <ul className="mt-4 grid gap-2">
          {extras.map((dish) => (
            <li key={dish.id}>
              <FoodCheck
                dish={dish}
                selected={addonIds.includes(dish.id)}
                detail={`+${money(dish.pricePerPerson ?? 0)}/person`}
                onToggle={() => toggle(addonIds, dish.id, onAddonIds)}
              />
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function FoodCheck({
  dish,
  selected,
  detail,
  onToggle,
}: {
  dish: PackageDish;
  selected: boolean;
  detail: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left",
        selected ? "border-primary bg-primary/5" : "border-border bg-background",
      )}
    >
      <span
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded border",
          selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card",
        )}
      >
        {selected ? <Check className="size-3" aria-hidden /> : null}
      </span>
      <DishPhoto id={dish.id} />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{dish.label}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{detail}</span>
      </span>
    </button>
  );
}
