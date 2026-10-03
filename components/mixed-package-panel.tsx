"use client";

import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { DishPhoto } from "@/components/dish-photo";
import { money } from "@/lib/format";
import {
  CATERING_PRICE_PER_PERSON,
  MEAL_PACKAGES,
  MIXED_INCLUDED_SELECTIONS,
  WEEKLY_PACKAGE_PRICE_PER_DAY,
  mixSummary,
  mixedAddonChoices,
  sideLabel,
  writeAddonMemory,
  writeIncludedMemory,
  type PackageDish,
} from "@/lib/packages";
import { cn } from "cn";

const SIDES = [
  ["fasting", "Fasting items"],
  ["non_fasting", "Non-fasting items"],
] as const;

export function MixedPackagePanel({
  selectedIncludedIds,
  onSelectedIncludedIds,
  selectedAddonIds,
  onSelectedAddonIds,
  actions,
  servingNote,
  billing = "catering",
}: {
  selectedIncludedIds: string[];
  onSelectedIncludedIds: (ids: string[]) => void;
  selectedAddonIds: string[];
  onSelectedAddonIds: (ids: string[]) => void;
  actions?: ReactNode;
  servingNote?: string;
  billing?: "catering" | "weekly";
}) {
  const [open, setOpen] = useState(selectedAddonIds.length > 0);
  const pkg = MEAL_PACKAGES.mixed;
  const limit = pkg.choiceLimit ?? MIXED_INCLUDED_SELECTIONS;
  const atLimit = selectedIncludedIds.length >= limit;
  const extras = mixedAddonChoices(selectedIncludedIds);
  const priceNote =
    billing === "catering"
      ? `${money(CATERING_PRICE_PER_PERSON)} per person. The mix does not change this.`
      : `${money(WEEKLY_PACKAGE_PRICE_PER_DAY)} each day. The mix does not change this.`;

  function toggleIncluded(id: string) {
    const selected = selectedIncludedIds.includes(id);
    const next = selected
      ? selectedIncludedIds.filter((entry) => entry !== id)
      : atLimit
        ? selectedIncludedIds
        : [...selectedIncludedIds, id];
    if (!selected && atLimit) return;
    onSelectedIncludedIds(next);
    writeIncludedMemory(next);
    if (!selected && selectedAddonIds.includes(id)) {
      const addons = selectedAddonIds.filter((entry) => entry !== id);
      onSelectedAddonIds(addons);
      writeAddonMemory("mixed", addons);
    }
  }

  function toggleAddon(id: string) {
    const next = selectedAddonIds.includes(id)
      ? selectedAddonIds.filter((entry) => entry !== id)
      : [...selectedAddonIds, id];
    onSelectedAddonIds(next);
    writeAddonMemory("mixed", next);
    if (!selectedAddonIds.includes(id)) setOpen(true);
  }

  return (
    <article className="flex h-full flex-col rounded-2xl border border-border bg-card p-6">
      <p className="text-xs tracking-[0.16em] text-primary uppercase">Mixed standard package</p>
      <h3 className="mt-2 font-display text-4xl">{pkg.name}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{pkg.detail}</p>
      <p className="mt-4 text-sm">{priceNote}</p>
      <p className="mt-2 text-sm text-muted-foreground">
        {selectedIncludedIds.length} of {limit} standard selections · Included in standard price
      </p>

      <div className="mt-5 grid gap-5">
        {SIDES.map(([side, title]) => (
          <section key={side}>
            <h4 className="text-xs tracking-[0.14em] text-primary uppercase">{title}</h4>
            <ul className="mt-3 grid gap-2">
              {pkg.included
                .filter((dish) => dish.side === side)
                .map((dish) => (
                  <IncludedRow
                    key={dish.id}
                    dish={dish}
                    selected={selectedIncludedIds.includes(dish.id)}
                    disabled={atLimit && !selectedIncludedIds.includes(dish.id)}
                    onToggle={() => toggleIncluded(dish.id)}
                  />
                ))}
            </ul>
          </section>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">{mixSummary(selectedIncludedIds)}</p>
      {atLimit ? (
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          The standard package includes {limit} dishes. Further dishes are add-ons.
        </p>
      ) : null}
      {servingNote ? <p className="mt-3 text-xs leading-5 text-muted-foreground">{servingNote}</p> : null}

      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="mt-6 flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-3 text-left"
      >
        <span>
          <span className="block text-sm font-medium">Add extra meals</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Optional. Extra fasting and non-fasting dishes are paid add-ons.
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
          <p className="text-xs tracking-[0.14em] text-muted-foreground uppercase">Paid add-ons</p>
          {SIDES.map(([side, title]) => {
            const rows = extras.filter((dish) => dish.side === side);
            if (rows.length === 0) return null;
            return (
              <section key={side} className="mt-4">
                <h4 className="text-xs tracking-[0.14em] text-primary uppercase">
                  {side === "fasting" ? "Additional fasting dishes" : "Additional non-fasting dishes"}
                </h4>
                <p className="mt-1 text-xs text-muted-foreground">{title} outside the standard allowance.</p>
                <ul className="mt-3 grid gap-2">
                  {rows.map((dish) => {
                    const selected = selectedAddonIds.includes(dish.id);
                    const overflow = pkg.included.some((entry) => entry.id === dish.id);
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
                          <span>
                            <span className="block">{dish.label}</span>
                            {overflow ? (
                              <span className="block text-xs text-muted-foreground">Outside the standard allowance</span>
                            ) : null}
                          </span>
                          <span className="ml-auto text-sm tabular-nums">
                            {billing === "catering"
                              ? `+ ${money(dish.pricePerPerson ?? 0)}/person`
                              : `+ ${money(dish.pricePerPerson ?? 0)} each day`}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {billing === "catering"
              ? "Add-ons are an extra charge per person, on top of the $21 standard package."
              : "Add-ons are an extra charge for every day of the container you chose."}
          </p>
        </div>
      ) : null}

      {actions ? <div className="mt-6 flex flex-wrap gap-2">{actions}</div> : null}
    </article>
  );
}

function IncludedRow({
  dish,
  selected,
  disabled,
  onToggle,
}: {
  dish: PackageDish;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={selected}
        disabled={disabled}
        onClick={onToggle}
        className={cn(
          "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm",
          selected ? "border-primary bg-primary/5" : "border-border",
          disabled && "opacity-50",
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
        <span className="text-xs text-muted-foreground">{sideLabel(dish.side)}</span>
        <span className="ml-auto text-xs tracking-wide text-muted-foreground uppercase">
          {selected ? "Included in standard price" : "Standard selection"}
        </span>
      </button>
    </li>
  );
}
