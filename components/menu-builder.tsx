"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CustomizeSheet, type CustomizeDraft } from "@/components/customize-sheet";
import { DishSwatch } from "@/components/mark";
import { PageIntro, Shell } from "@/components/page-intro";
import { useAuth, useDraft } from "@/components/providers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/lib/client-api";
import { weekdayLabels } from "@/lib/dates";
import { CATEGORY_LABEL, money } from "@/lib/format";
import { CATERING_PRESETS } from "@/lib/menu-seed";
import { describeCustomization, initialCustomization, lineCountLabel, presetQuantity, suggestedQuantity, unitPrice } from "@/lib/orders";
import type { DraftLine, MenuCategory, MenuItem, OrderDraft } from "@/lib/types";

const FILTERS: { id: "all" | "fasting" | "non_fasting" | MenuCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "fasting", label: "Fasting" },
  { id: "non_fasting", label: "Non-fasting" },
  { id: "platter", label: "Platters" },
  { id: "stew", label: "Stews" },
  { id: "salad", label: "Salads" },
  { id: "side", label: "Sides" },
  { id: "condiment", label: "Condiments" },
];

export function MenuBuilder() {
  const { draft, hydrated, setDraft } = useDraft();
  const { user } = useAuth();
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState("");
  const [filterOverride, setFilterOverride] = useState<(typeof FILTERS)[number]["id"] | null>(null);
  const [dayIndex, setDayIndex] = useState(0);
  const [editing, setEditing] = useState<CustomizeDraft | null>(null);
  const [basketOpen, setBasketOpen] = useState(false);

  useEffect(() => {
    api<{ menu: MenuItem[] }>("/api/menu")
      .then((data) => setMenu(data.menu))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const filter =
    filterOverride ??
    (draft?.fastingPreference === "fasting"
      ? "fasting"
      : draft?.fastingPreference === "non_fasting"
        ? "non_fasting"
        : "all");

  const days = useMemo(() => {
    if (!draft || draft.kind !== "weekly") return [];
    return weekdayLabels(draft.startDate, draft.durationDays).map((day, index) => ({
      index,
      label: `${day.label} ${day.day}`,
    }));
  }, [draft]);

  if (!hydrated) {
    return (
      <Shell>
        <p className="text-muted-foreground">Opening your order…</p>
      </Shell>
    );
  }

  if (!draft) {
    return (
      <Shell>
        <PageIntro
          title="Start with a date"
          lede="Weekly meals and catering both need a pickup or delivery day at least a week out before dishes can be added."
        />
        <Button className="mt-6 h-11 px-4" render={<Link href="/order" />}>
          Set up the order
        </Button>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <PageIntro title="The menu did not load" lede={error} />
        <Button className="mt-6 h-11 px-4" onClick={() => location.reload()}>
          Try again
        </Button>
      </Shell>
    );
  }

  if (!menu) {
    return (
      <Shell>
        <p className="text-muted-foreground">Loading the menu…</p>
      </Shell>
    );
  }

  const visible = menu.filter((item) => {
    if (!item.available) return false;
    if (filter === "all") return true;
    if (filter === "fasting") return item.fasting || item.canChooseFastingStyle;
    if (filter === "non_fasting") return !item.fasting || item.canChooseFastingStyle;
    return item.category === filter;
  });

  function openNew(item: MenuItem) {
    setEditing({
      item,
      lineId: null,
      quantity: suggestedQuantity(item, draft as OrderDraft),
      dayIndex: draft?.kind === "weekly" ? dayIndex : null,
      mealSlot: draft?.kind === "weekly" ? "lunch" : null,
      customization: initialCustomization(item, user?.preferences),
      days,
      kind: draft?.kind ?? "weekly",
    });
  }

  function openExisting(line: DraftLine) {
    const item = menu?.find((entry) => entry.id === line.itemId);
    if (!item || !draft) return;
    setEditing({
      item,
      lineId: line.lineId,
      quantity: line.quantity,
      dayIndex: line.dayIndex,
      mealSlot: line.mealSlot,
      customization: line.customization,
      days,
      kind: draft.kind,
    });
  }

  function saveLine() {
    if (!editing || !draft) return;
    if (editing.customization.excludedIngredients.length >= editing.item.ingredients.length && editing.item.ingredients.length > 0) {
      toast.error(`Leave at least one part of ${editing.item.name}.`);
      return;
    }
    const line: DraftLine = {
      lineId: editing.lineId ?? crypto.randomUUID(),
      itemId: editing.item.id,
      quantity: editing.quantity,
      dayIndex: draft.kind === "weekly" ? editing.dayIndex : null,
      mealSlot: draft.kind === "weekly" ? editing.mealSlot : null,
      customization: editing.customization,
    };
    setDraft({
      ...draft,
      lines: editing.lineId ? draft.lines.map((entry) => (entry.lineId === editing.lineId ? line : entry)) : [...draft.lines, line],
    });
    setEditing(null);
    toast.success(editing.lineId ? `${editing.item.name} updated` : `${editing.item.name} added`);
  }

  function removeLine(lineId: string) {
    if (!draft) return;
    setDraft({ ...draft, lines: draft.lines.filter((line) => line.lineId !== lineId) });
  }

  function applyPreset(presetId: string) {
    const preset = CATERING_PRESETS.find((entry) => entry.id === presetId);
    if (!preset || !draft || !menu || draft.kind !== "catering") return;
    const lines: DraftLine[] = preset.items.flatMap((entry) => {
      const item = menu.find((dish) => dish.id === entry.id);
      if (!item || !item.available) return [];
      return [
        {
          lineId: crypto.randomUUID(),
          itemId: item.id,
          quantity: presetQuantity(entry.qty, draft.guestCount),
          dayIndex: null,
          mealSlot: null,
          customization: initialCustomization(item, user?.preferences),
        },
      ];
    });
    setDraft({ ...draft, lines });
    toast.success(`${preset.name} replaced the current dishes. Change any plate before you pay.`);
  }

  function copyDay() {
    if (!draft) return;
    const source = draft.lines.filter((line) => line.dayIndex === dayIndex);
    if (source.length === 0) {
      toast.error("Add something to this day first.");
      return;
    }
    const copies = days.flatMap((day) => {
      if (day.index === dayIndex) return source;
      return source.map((line) => ({
        ...line,
        lineId: crypto.randomUUID(),
        dayIndex: day.index,
        customization: structuredClone(line.customization),
      }));
    });
    setDraft({ ...draft, lines: copies });
    toast.success("This day replaced the rest of the plan.");
  }

  const subtotal = draft.lines.reduce((sum, line) => {
    const item = menu.find((entry) => entry.id === line.itemId);
    if (!item) return sum;
    return sum + unitPrice(item, line.customization) * line.quantity;
  }, 0);

  const basket = (
    <Basket
      draft={draft}
      menu={menu}
      onEdit={openExisting}
      onRemove={removeLine}
      subtotal={subtotal}
    />
  );

  return (
    <Shell className="pb-28 lg:pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageIntro
          eyebrow={draft.kind === "weekly" ? "Weekly meals" : `Catering · ${draft.guestCount} guests`}
          title="Choose what goes on the injera."
          lede="Each dish keeps its own spice, allergies, and notes. Nothing here is copied onto the rest of the order unless you ask."
        />
        <Button variant="outline" className="h-10 bg-card px-3" render={<Link href="/order" />}>
          Edit dates
        </Button>
      </div>

      {draft.kind === "weekly" ? (
        <div className="mt-6 flex items-center gap-2 overflow-x-auto">
          {days.map((day) => {
            const count = draft.lines.filter((line) => line.dayIndex === day.index).length;
            return (
              <button
                key={day.index}
                type="button"
                onClick={() => setDayIndex(day.index)}
                className={`min-w-16 rounded-lg border px-3 py-2 text-left ${
                  dayIndex === day.index ? "border-primary bg-card" : "border-transparent bg-card/50"
                }`}
              >
                <span className="block text-sm font-medium">{day.label}</span>
                <span className="text-xs text-muted-foreground">{count === 0 ? "Empty" : `${count} dishes`}</span>
              </button>
            );
          })}
          <Button type="button" variant="ghost" className="shrink-0" onClick={copyDay}>
            Copy this day across the plan
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          {CATERING_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className="rounded-lg border border-border bg-card px-3 py-3 text-left"
            >
              <span className="block text-sm font-medium">{preset.name}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{preset.detail}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 flex gap-2 overflow-x-auto">
        {FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            onClick={() => setFilterOverride(entry.id)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${
              filter === entry.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
            }`}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-3">
          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border bg-card px-4 py-8 text-sm text-muted-foreground">
              Nothing in this group is on the board today.
            </p>
          ) : (
            visible.map((item) => (
              <article key={item.id} className="flex gap-4 rounded-xl border border-border bg-card p-4">
                <DishSwatch color={item.swatch} name={item.name} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="font-display text-2xl leading-none">{item.name}</h2>
                    <span className="text-sm text-muted-foreground">{item.amharic}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{item.fasting ? "Fasting" : "Non-fasting"}</Badge>
                    {item.canChooseFastingStyle ? <Badge variant="outline">Can go either way</Badge> : null}
                    <span className="text-sm">{money(item.price)}</span>
                    <span className="text-xs text-muted-foreground">{CATEGORY_LABEL[item.category]}</span>
                  </div>
                </div>
                <Button type="button" className="h-10 shrink-0 self-center px-3" onClick={() => openNew(item)}>
                  Add
                </Button>
              </article>
            ))
          )}
        </div>
        <aside className="hidden h-fit lg:sticky lg:top-24 lg:block">{basket}</aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <button type="button" className="text-left" onClick={() => setBasketOpen(true)}>
            <span className="block text-sm font-medium">{lineCountLabel(draft.lines)}</span>
            <span className="text-sm text-muted-foreground">{money(subtotal)}</span>
          </button>
          <Button className="h-11 px-4" render={<Link href="/order/review" />}>
            Review
          </Button>
        </div>
      </div>

      <Sheet open={basketOpen} onOpenChange={setBasketOpen}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Your order</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">{basket}</div>
        </SheetContent>
      </Sheet>

      <CustomizeSheet draft={editing} onClose={() => setEditing(null)} onChange={setEditing} onSave={saveLine} />
    </Shell>
  );
}

function Basket({
  draft,
  menu,
  onEdit,
  onRemove,
  subtotal,
}: {
  draft: OrderDraft;
  menu: MenuItem[];
  onEdit: (line: DraftLine) => void;
  onRemove: (lineId: string) => void;
  subtotal: number;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="font-display text-2xl">This order</p>
      <p className="mt-1 text-sm text-muted-foreground">{lineCountLabel(draft.lines)}</p>
      {draft.lines.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          The platter is empty. Add a dish and set only the choices that belong to it.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {draft.lines.map((line) => {
            const item = menu.find((entry) => entry.id === line.itemId);
            if (!item) return null;
            const summary = describeCustomization(item, line.customization);
            return (
              <li key={line.lineId} className="border-t border-border pt-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      {line.quantity} × {item.name}
                    </p>
                    {draft.kind === "weekly" && line.dayIndex != null ? (
                      <p className="text-xs text-muted-foreground capitalize">
                        Day {line.dayIndex + 1} · {line.mealSlot}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-sm tabular-nums">{money(unitPrice(item, line.customization) * line.quantity)}</p>
                </div>
                {summary.length ? (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{summary.join(" · ")}</p>
                ) : null}
                <div className="mt-2 flex gap-2">
                  <button type="button" className="text-xs text-primary" onClick={() => onEdit(line)}>
                    Customize
                  </button>
                  <button type="button" className="text-xs text-muted-foreground" onClick={() => onRemove(line.lineId)}>
                    Remove
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
        <span className="text-sm">Subtotal</span>
        <span className="font-medium tabular-nums">{money(subtotal)}</span>
      </div>
      {draft.kind === "catering" && draft.guestCount > 0 ? (
        <p className="mt-1 text-right text-xs text-muted-foreground">
          About {money(subtotal / draft.guestCount)} a guest before you adjust portions.
        </p>
      ) : null}
      <Button className="mt-4 h-11 w-full" render={<Link href="/order/review" />}>
        Review order
      </Button>
    </div>
  );
}
