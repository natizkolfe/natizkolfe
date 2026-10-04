"use client";

import { Check, Minus, Plus } from "lucide-react";
import { DishPhoto } from "@/components/dish-photo";
import { money } from "@/lib/format";
import {
  CONTAINER_MARK,
  addonOffers,
  containerForDays,
  offerGroups,
  type FoodOffer,
  type PortionPicks,
} from "@/lib/portions";
import type { FastingPreference } from "@/lib/types";
import { cn } from "cn";

export function PortionMenu({
  preference,
  days,
  picks,
  onPicks,
}: {
  preference: FastingPreference;
  days: 7 | 14;
  picks: PortionPicks;
  onPicks: (picks: PortionPicks) => void;
}) {
  const container = containerForDays(days);
  const mark = CONTAINER_MARK[container.container];
  const groups = offerGroups(preference).filter((group) => group.offers.length > 0);
  const extras = addonOffers(preference);

  function toggle(id: string) {
    if (picks[id]) {
      const next = { ...picks };
      delete next[id];
      onPicks(next);
      return;
    }
    onPicks({ ...picks, [id]: { optionId: "container", quantity: 1 } });
  }

  function setQuantity(id: string, quantity: number) {
    const current = picks[id];
    if (!current || quantity < 1 || quantity > 20) return;
    onPicks({ ...picks, [id]: { ...current, quantity } });
  }

  return (
    <div className="grid gap-6">
      {groups.map((group) => (
        <section key={`${group.side}-${group.title}`} className="grid gap-3">
          {groups.length > 1 ? (
            <h4 className="text-xs tracking-[0.14em] text-primary uppercase">{group.title}</h4>
          ) : null}
          {group.offers.map((offer) => (
            <MealRow
              key={offer.id}
              offer={offer}
              selected={Boolean(picks[offer.id])}
              quantity={picks[offer.id]?.quantity ?? 1}
              sizeLabel={container.sizeLabel}
              mark={mark}
              onToggle={() => toggle(offer.id)}
              onQuantity={(quantity) => setQuantity(offer.id, quantity)}
            />
          ))}
        </section>
      ))}

      <section className="grid gap-3">
        <div>
          <h4 className="text-xs tracking-[0.14em] text-primary uppercase">Add more to your order</h4>
          <p className="mt-1 text-sm text-muted-foreground">Optional. Each add-on is a separate charge.</p>
        </div>
        {extras.map((offer) => (
          <MealRow
            key={offer.id}
            offer={offer}
            selected={Boolean(picks[offer.id])}
            quantity={picks[offer.id]?.quantity ?? 1}
            onToggle={() => toggle(offer.id)}
            onQuantity={(quantity) => setQuantity(offer.id, quantity)}
          />
        ))}
      </section>
    </div>
  );
}

function MealRow({
  offer,
  selected,
  quantity,
  sizeLabel,
  mark,
  onToggle,
  onQuantity,
}: {
  offer: FoodOffer;
  selected: boolean;
  quantity: number;
  sizeLabel?: string;
  mark?: { src: string; alt: string };
  onToggle: () => void;
  onQuantity: (quantity: number) => void;
}) {
  return (
    <article className="rounded-xl border border-border bg-background px-3 py-3">
      <div className="flex items-center gap-3">
        <button type="button" aria-pressed={selected} onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <span
            className={cn(
              "flex size-5 shrink-0 items-center justify-center rounded border",
              selected ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card",
            )}
          >
            {selected ? <Check className="size-3" aria-hidden /> : null}
          </span>
          <DishPhoto id={offer.id} />
          <span className="min-w-0">
            <span className="block text-sm font-medium">{offer.label}</span>
            <span className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
              {mark && sizeLabel ? (
                <>
                  <img src={mark.src} alt={mark.alt} className="h-8 w-12 object-contain" />
                  {sizeLabel}
                </>
              ) : (
                <span>Add-on</span>
              )}
            </span>
          </span>
        </button>
        <span className="shrink-0 text-sm tabular-nums">
          {offer.kind === "addon" ? `+${money(offer.price)}` : money(offer.price)}
        </span>
        {selected ? (
          <span className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              aria-label={`Fewer ${offer.label}`}
              disabled={quantity <= 1}
              onClick={() => onQuantity(quantity - 1)}
              className="flex size-8 items-center justify-center rounded-md border border-border bg-card disabled:opacity-40"
            >
              <Minus className="size-3.5" aria-hidden />
            </button>
            <span className="w-6 text-center text-sm tabular-nums">{quantity}</span>
            <button
              type="button"
              aria-label={`More ${offer.label}`}
              disabled={quantity >= 20}
              onClick={() => onQuantity(quantity + 1)}
              className="flex size-8 items-center justify-center rounded-md border border-border bg-card disabled:opacity-40"
            >
              <Plus className="size-3.5" aria-hidden />
            </button>
          </span>
        ) : null}
      </div>
    </article>
  );
}
