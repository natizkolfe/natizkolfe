"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomizeSheet, type CustomizeDraft } from "@/components/customize-sheet";
import { GuestCountField } from "@/components/guest-count-field";
import { FulfillmentChoice } from "@/components/fulfillment-choice";
import { DishPhoto } from "@/components/dish-photo";
import { MixedPackagePanel } from "@/components/mixed-package-panel";
import { PortionMenu } from "@/components/portion-menu";
import { PackagePanel } from "@/components/package-panel";
import { PageIntro, Shell } from "@/components/page-intro";
import { WeeklyContainer } from "@/components/weekly-container";
import { useAuth, useDraft } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client-api";
import { money, SPICE_LABEL } from "@/lib/format";
import {
  buildPackageLines,
  dishLabel,
  dishSide,
  MIXED_INCLUDED_SELECTIONS,
  mixedAddonChoices,
  packageFor,
  readAddonMemory,
  readIncludedMemory,
  samePackageLines,
  serviceQuote,
  servingCount,
  sideLabel,
  weeklyContainer,
  writeAddonMemory,
  writeIncludedMemory,
} from "@/lib/packages";
import { containerForDays, picksFromLines, readPortionMemory, weeklyUnitPrice, writePortionMemory, type PortionPicks } from "@/lib/portions";
import { initialCustomization } from "@/lib/orders";
import type { FastingPreference, MenuItem, PublicSettings, SpiceLevel } from "@/lib/types";
import { cn } from "cn";

const SPICES: SpiceLevel[] = ["mild", "medium", "hot"];

export function PackageBuilder() {
  const { draft, hydrated, setDraft } = useDraft();
  const { user } = useAuth();
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState("");
  const [pick, setPick] = useState<{
    preference: FastingPreference;
    addonIds: string[];
    includedIds: string[];
    quantities: Record<string, number>;
    portions: PortionPicks;
  } | null>(null);
  const [editing, setEditing] = useState<CustomizeDraft | null>(null);
  const [note, setNote] = useState("");
  const [spice, setSpice] = useState<SpiceLevel | null>(null);
  const [guestLimits, setGuestLimits] = useState({ min: 10, max: 80 });

  useEffect(() => {
    api<{ menu: MenuItem[] }>("/api/menu")
      .then((data) => setMenu(data.menu))
      .catch((reason: Error) => setError(reason.message));
    api<{ settings: PublicSettings }>("/api/settings")
      .then((data) =>
        setGuestLimits({ min: data.settings.minCateringGuests, max: data.settings.maxGuestsPerDay }),
      )
      .catch(() => setGuestLimits({ min: 10, max: 80 }));
  }, []);

  useEffect(() => {
    if (!draft || draft.kind !== "catering") return;
    if (draft.guestCount >= guestLimits.min && draft.guestCount <= guestLimits.max) return;
    const guestCount = Math.min(guestLimits.max, Math.max(guestLimits.min, draft.guestCount || guestLimits.min));
    setDraft({ ...draft, guestCount });
  }, [draft, guestLimits, setDraft]);

  const pkg = draft ? packageFor(draft.fastingPreference) : null;

  const selectedAddons = pick && draft && pick.preference === draft.fastingPreference ? pick.addonIds : [];
  const selectedIncluded = pick && draft && pick.preference === draft.fastingPreference ? pick.includedIds : [];

  useEffect(() => {
    if (!draft || pick?.preference === draft.fastingPreference) return;
    const current = packageFor(draft.fastingPreference);
    const allowedAddons = new Set(
      draft.kind === "weekly"
        ? current.addons.map((dish) => dish.id)
        : draft.fastingPreference === "mixed"
          ? mixedAddonChoices([]).map((dish) => dish.id)
          : current.addons.map((dish) => dish.id),
    );
    const allowedIncluded = new Set(current.included.map((dish) => dish.id));
    const fromLines = draft.lines
      .filter((line) => line.source === "addon" && allowedAddons.has(line.itemId))
      .map((line) => line.itemId);
    const addonIds = (
      fromLines.length ? fromLines : readAddonMemory()[draft.fastingPreference].filter((id) => allowedAddons.has(id))
    );
    const fromIncluded = draft.lines
      .filter((line) => line.source === "included" && allowedIncluded.has(line.itemId))
      .map((line) => line.itemId);
    const remembered = draft.fastingPreference === "mixed" ? readIncludedMemory() : [];
    const includedSource = fromIncluded.length ? fromIncluded : draft.kind === "weekly" ? [] : remembered;
    const includedIds = includedSource
      .filter((id) => allowedIncluded.has(id))
      .slice(0, draft.kind === "weekly" ? undefined : (current.choiceLimit ?? MIXED_INCLUDED_SELECTIONS));
    const quantities: Record<string, number> = {};
    let portions: PortionPicks = {};
    if (draft.kind === "weekly") {
      portions = picksFromLines(draft.lines);
      if (Object.keys(portions).length === 0) portions = readPortionMemory(draft.fastingPreference);
    }
    setPick({
      preference: draft.fastingPreference,
      addonIds: addonIds.filter((id) => !includedIds.includes(id)),
      includedIds,
      quantities,
      portions,
    });
  }, [draft, pick]);

  useEffect(() => {
    if (!draft || !menu || !pick || pick.preference !== draft.fastingPreference) return;
    const next = buildPackageLines(
      draft,
      menu,
      pick.addonIds,
      draft.lines,
      (item) => initialCustomization(item, user?.preferences),
      pick.includedIds,
      draft.kind === "weekly" ? pick.quantities : {},
      draft.kind === "weekly" ? pick.portions : null,
    );
    if (samePackageLines(draft.lines, next)) return;
    setDraft({ ...draft, lines: next });
  }, [pick, draft, menu, setDraft, user?.preferences]);

  if (!hydrated) {
    return (
      <Shell>
        <p className="text-muted-foreground">Opening your package…</p>
      </Shell>
    );
  }

  if (!draft) {
    return (
      <Shell>
        <PageIntro title="Start with the service" lede="Choose weekly meals or catering, then the fasting or non-fasting package." />
        <Button className="mt-6 h-11 px-4" render={<Link href="/order" />}>
          Set up the order
        </Button>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <PageIntro title="The package did not load" lede={error} />
      </Shell>
    );
  }

  if (!menu || !pkg) {
    return (
      <Shell>
        <p className="text-muted-foreground">Loading the standard packages…</p>
      </Shell>
    );
  }

  const order = draft;
  const meal = pkg;
  const servings = servingCount(order);
  const mixed = order.fastingPreference === "mixed";
  const quote = serviceQuote(order, selectedAddons);
  const weeklyIncluded = draft.lines
    .filter((line) => line.source === "included")
    .reduce((sum, line) => sum + weeklyUnitPrice(line.itemId, "included") * line.quantity, 0);
  const weeklyAddons = draft.lines
    .filter((line) => line.source === "addon")
    .reduce((sum, line) => sum + weeklyUnitPrice(line.itemId, "addon") * line.quantity, 0);
  const delivery = draft.fulfillment === "delivery" ? draft.delivery : null;

  function chooseAddons(ids: string[]) {
    setPick((current) => {
      if (!current) return current;
      const next = ids.filter((id) => !current.includedIds.includes(id));
      writeAddonMemory(order.fastingPreference, next);
      return { ...current, addonIds: next };
    });
  }

  function chooseIncluded(ids: string[]) {
    setPick((current) => {
      if (!current) return current;
      const next = order.kind === "weekly" ? ids : ids.slice(0, meal.choiceLimit ?? MIXED_INCLUDED_SELECTIONS);
      const addonIds = current.addonIds.filter((id) => !next.includes(id));
      const quantities = { ...current.quantities };
      for (const id of Object.keys(quantities)) {
        if (!next.includes(id)) delete quantities[id];
      }
      for (const id of next) quantities[id] = quantities[id] ?? 1;
      if (order.fastingPreference === "mixed") writeIncludedMemory(next);
      writeAddonMemory(order.fastingPreference, addonIds);
      return { ...current, includedIds: next, addonIds, quantities };
    });
  }

  function choosePortions(portions: PortionPicks) {
    setPick((current) => (current ? { ...current, portions } : current));
    writePortionMemory(order.fastingPreference, portions);
  }

  function chooseQuantity(id: string, quantity: number) {
    if (quantity < 1 || quantity > 20) return;
    setPick((current) => {
      if (!current) return current;
      return { ...current, quantities: { ...current.quantities, [id]: quantity } };
    });
  }

  function applySpice(level: SpiceLevel) {
    if (!draft) return;
    setSpice(level);
    setDraft({
      ...draft,
      lines: draft.lines.map((line) => {
        const item = menu?.find((entry) => entry.id === line.itemId);
        if (!item?.allowSpice || !item.spiceLevels.includes(level)) return line;
        return { ...line, customization: { ...line.customization, spiceLevel: level } };
      }),
    });
  }

  function applyNote(value: string) {
    setNote(value);
    if (!draft) return;
    setDraft({
      ...draft,
      lines: draft.lines.map((line) =>
        line.source === "included" ? { ...line, customization: { ...line.customization, notes: value } } : line,
      ),
    });
  }

  function openLine(itemId: string) {
    const item = menu?.find((entry) => entry.id === itemId);
    const line = draft?.lines.find((entry) => entry.itemId === itemId);
    if (!item || !line || !draft) return;
    setEditing({
      item,
      lineId: line.lineId,
      quantity: line.quantity,
      dayIndex: line.dayIndex,
      mealSlot: line.mealSlot,
      customization: line.customization,
      days: draft.kind === "weekly" ? [{ index: 0, label: "Each day" }] : [],
      kind: draft.kind,
    });
  }

  function saveLine() {
    if (!editing || !draft) return;
    setDraft({
      ...draft,
      lines: draft.lines.map((line) =>
        line.lineId === editing.lineId
          ? {
              ...line,
              quantity: editing.quantity,
              mealSlot: editing.mealSlot,
              customization: editing.customization,
            }
          : line,
      ),
    });
    setEditing(null);
  }

  const container = draft.kind === "weekly" ? weeklyContainer(draft.durationDays) : null;
  const weeklyMeals = draft.lines.filter((line) => line.source === "included");
  const needsMeal = draft.kind === "weekly" ? weeklyMeals.length === 0 : mixed && weeklyMeals.length === 0;
  const servingLabel =
    draft.kind === "weekly"
      ? container
        ? `${container.sizeNote}. Choose how many of each meal.`
        : ""
      : `${servings} guests, one serving of the package each`;

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageIntro
          eyebrow={draft.kind === "weekly" ? `${draft.durationDays}-day meal preparation` : `Catering · ${draft.guestCount} guests`}
          title={draft.kind === "weekly" ? "Choose your meals." : mixed ? "Choose the dishes in the standard price." : "The standard package is already on the order."}
          lede={
            draft.kind === "weekly"
              ? "Nothing is selected until you choose it. One week uses the 24 oz round container. Two weeks uses the 28 oz square container."
              : mixed
                ? "Pick fasting and non-fasting meals for the mixed package. That mix stays inside the standard price. Extra meals are the only add-on charge."
                : "Included dishes do not need to be chosen. Open extra meals only if you want something beyond the package, then set the kitchen’s preferences."
          }
        />
        <Button variant="outline" className="h-10 bg-card px-3" render={<Link href="/order" />}>
          Edit service
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-6">
          {draft.kind === "weekly" ? (
            <div className="grid gap-3">
              <div className="flex flex-wrap gap-2">
                {([7, 14] as const).map((days) => (
                  <Button
                    key={days}
                    variant={draft.durationDays === days ? "default" : "outline"}
                    className="h-10 px-3"
                    onClick={() => setDraft({ ...draft, durationDays: days })}
                  >
                    {days === 7 ? "1 Week" : "2 Weeks"}
                  </Button>
                ))}
              </div>
              <WeeklyContainer days={draft.durationDays} selected />
            </div>
          ) : null}
          {draft.kind === "weekly" ? (
            <PortionMenu
              preference={draft.fastingPreference}
              days={draft.durationDays}
              picks={pick?.portions ?? {}}
              onPicks={choosePortions}
            />
          ) : mixed ? (
            <MixedPackagePanel
              billing="catering"
              selectedIncludedIds={selectedIncluded}
              onSelectedIncludedIds={chooseIncluded}
              quantities={pick?.quantities ?? {}}
              onQuantity={chooseQuantity}
              selectedAddonIds={selectedAddons}
              onSelectedAddonIds={chooseAddons}
              servingNote={servingLabel}
            />
          ) : (
            <PackagePanel
              pkg={pkg}
              billing="catering"
              selectedMealIds={selectedIncluded}
              onSelectedMealIds={chooseIncluded}
              quantities={pick?.quantities ?? {}}
              onQuantity={chooseQuantity}
              selectedAddonIds={selectedAddons}
              onSelectedAddonIds={chooseAddons}
              servingNote={servingLabel}
            />
          )}

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-3xl">Food preferences and allergies</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Spice and a note apply to the meals you selected. A single dish can still be adjusted on its own.
            </p>
            <fieldset className="mt-5 grid gap-2">
              <legend className="text-sm font-medium">Spice for the package</legend>
              <div className="flex flex-wrap gap-2">
                {SPICES.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => applySpice(level)}
                    className={cn(
                      "h-10 rounded-lg border px-3 text-sm",
                      spice === level ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
                    )}
                  >
                    {SPICE_LABEL[level]}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="mt-5 grid gap-2">
              <Label htmlFor="package-note">Note for the kitchen</Label>
              <Textarea
                id="package-note"
                value={note}
                onChange={(event) => applyNote(event.target.value)}
                placeholder="Allergies, ingredients to leave out, or how the table should be finished"
                className="min-h-24 bg-background"
              />
            </div>
            <ul className="mt-5 grid gap-2">
              {draft.lines.map((line) => (
                <li key={line.lineId} className="flex items-center justify-between gap-3 border-t border-border pt-2 text-sm">
                  <span className="flex items-center gap-3">
                    <DishPhoto id={line.itemId} />
                    <span>
                    {dishLabel(line.itemId) ?? line.itemId}
                    {mixed && dishSide(line.itemId) ? (
                      <span className="ml-2 text-xs text-muted-foreground">{sideLabel(dishSide(line.itemId)!)}</span>
                    ) : null}
                    <span className="ml-2 text-xs text-muted-foreground uppercase">
                      {line.source === "addon"
                        ? "Add-on"
                        : draft.kind === "weekly"
                          ? `${line.quantity} × ${container?.short ?? "container"}`
                          : "Included in standard price"}
                    </span>
                    </span>
                  </span>
                  <button type="button" className="text-xs text-primary" onClick={() => openLine(line.itemId)}>
                    Adjust this dish
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <FulfillmentChoice />
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <p className="text-xs tracking-[0.16em] text-primary uppercase">
            {draft.kind === "catering" ? "Catering order summary" : pkg.name}
          </p>
          {quote ? (
            <div className="mt-4 grid gap-3">
              {draft.kind === "catering" ? (
                <div className="grid gap-2">
                  <Label htmlFor="guest-count">People</Label>
                  <GuestCountField
                    id="guest-count"
                    count={draft.guestCount}
                    min={guestLimits.min}
                    max={guestLimits.max}
                    onChange={(guestCount) => setDraft({ ...draft, guestCount })}
                  />
                </div>
              ) : null}
              <p className="font-display text-3xl">
                {quote.count} {quote.countLabel}
              </p>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span>{mixed ? "Mixed standard package" : "Standard meal package"}</span>
                <span className="tabular-nums">
                  {money(quote.basePer)} × {quote.count} = {money(quote.baseTotal)}
                </span>
              </div>
              {mixed ? (
                <ul className="grid gap-1 text-sm">
                  {draft.lines
                    .filter((line) => line.source === "included")
                    .map((line) => (
                      <li key={line.lineId}>
                        ✓ {dishLabel(line.itemId)}
                        {dishSide(line.itemId) ? ` — ${sideLabel(dishSide(line.itemId)!)}` : ""}
                      </li>
                    ))}
                </ul>
              ) : null}
              {quote.addons.map((addon) => (
                <div key={addon.id} className="flex items-baseline justify-between gap-3 text-sm">
                  <span>{addon.label} add-on</span>
                  <span className="tabular-nums">
                    +{money(addon.perPerson)} × {quote.count} = {money(addon.total)}
                  </span>
                </div>
              ))}
              {delivery ? (
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span>Delivery</span>
                  <span className="tabular-nums">
                    {delivery.miles} miles × {money(delivery.ratePerMile)} = {money(delivery.fee)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm">Estimated total</span>
                <span className="font-display text-3xl">{money(quote.total + (delivery?.fee ?? 0))}</span>
              </div>
              {mixed && !draft.lines.some((line) => line.source === "included") ? (
                <p className="text-xs leading-5 text-muted-foreground">
                  Choose at least one standard dish. The package price stays the same.
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <p className="mt-3 font-display text-2xl">{container?.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">Container: {container?.short}</p>
              <ul className="mt-4 grid gap-2 text-sm">
                {weeklyMeals.length === 0 ? (
                  <li className="text-muted-foreground">Choose at least one meal.</li>
                ) : (
                  weeklyMeals.map((line) => {
                    const price = weeklyUnitPrice(line.itemId, "included");
                    return (
                      <li key={line.lineId}>
                        <span className="font-medium">{dishLabel(line.itemId) ?? line.itemId}</span>
                        <span className="mt-0.5 block text-muted-foreground">{containerForDays(draft.durationDays).sizeLabel}</span>
                        <span className="mt-0.5 block text-muted-foreground">
                          {money(price)} × {line.quantity} = {money(price * line.quantity)}
                        </span>
                      </li>
                    );
                  })
                )}
              </ul>
              <dl className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt>Meals</dt>
                  <dd className="tabular-nums">{money(weeklyIncluded)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Add-ons</dt>
                  <dd className="tabular-nums">{money(weeklyAddons)}</dd>
                </div>
                {delivery ? (
                  <div className="flex justify-between gap-3">
                    <dt>Delivery</dt>
                    <dd className="tabular-nums">
                      {delivery.miles} miles × {money(delivery.ratePerMile)} = {money(delivery.fee)}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm">Total</span>
                <span className="font-display text-3xl">{money(weeklyIncluded + weeklyAddons + (delivery?.fee ?? 0))}</span>
              </div>
            </>
          )}
          <Button
            className="mt-4 h-11 w-full"
            disabled={needsMeal}
            render={<Link href="/order/review" />}
          >
            Review order
          </Button>
        </aside>
      </div>

      <CustomizeSheet draft={editing} onClose={() => setEditing(null)} onChange={setEditing} onSave={saveLine} />
    </Shell>
  );
}
