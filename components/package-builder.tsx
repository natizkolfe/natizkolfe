"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomizeSheet, type CustomizeDraft } from "@/components/customize-sheet";
import { GuestCountField } from "@/components/guest-count-field";
import { FulfillmentChoice } from "@/components/fulfillment-choice";
import { DishPhoto } from "@/components/dish-photo";
import { MixedPackagePanel } from "@/components/mixed-package-panel";
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
  addonUnitPrice,
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
  writeAddonMemory,
  writeIncludedMemory,
} from "@/lib/packages";
import { initialCustomization, unitPrice } from "@/lib/orders";
import type { FastingPreference, MenuItem, PublicSettings, SpiceLevel } from "@/lib/types";
import { cn } from "cn";

const SPICES: SpiceLevel[] = ["mild", "medium", "hot"];

export function PackageBuilder() {
  const { draft, hydrated, setDraft } = useDraft();
  const { user } = useAuth();
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState("");
  const [pick, setPick] = useState<{ preference: FastingPreference; addonIds: string[]; includedIds: string[] } | null>(
    null,
  );
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
      draft.fastingPreference === "mixed"
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
    const includedIds =
      draft.fastingPreference === "mixed"
        ? (fromIncluded.length ? fromIncluded : readIncludedMemory())
            .filter((id) => allowedIncluded.has(id))
            .slice(0, current.choiceLimit ?? MIXED_INCLUDED_SELECTIONS)
        : [];
    setPick({
      preference: draft.fastingPreference,
      addonIds: addonIds.filter((id) => !includedIds.includes(id)),
      includedIds,
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
    .reduce((sum, line) => {
      const item = menu.find((entry) => entry.id === line.itemId);
      return item ? sum + unitPrice(item, line.customization) * line.quantity : sum;
    }, 0);
  const weeklyAddons = draft.lines
    .filter((line) => line.source === "addon")
    .reduce((sum, line) => {
      const perDay = addonUnitPrice(order.fastingPreference, line.itemId);
      return sum + perDay * line.quantity;
    }, 0);
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
      const next = ids.slice(0, meal.choiceLimit ?? MIXED_INCLUDED_SELECTIONS);
      const addonIds = current.addonIds.filter((id) => !next.includes(id));
      writeIncludedMemory(next);
      writeAddonMemory(order.fastingPreference, addonIds);
      return { ...current, includedIds: next, addonIds };
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

  const servingLabel =
    draft.kind === "weekly"
      ? `${servings} days, one serving of the package each day`
      : `${servings} guests, one serving of the package each`;

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageIntro
          eyebrow={draft.kind === "weekly" ? `${draft.durationDays}-day meal preparation` : `Catering · ${draft.guestCount} guests`}
          title={mixed ? "Choose the dishes in the standard price." : "The standard package is already on the order."}
          lede={
            mixed
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
          {draft.kind === "weekly" ? <WeeklyContainer days={draft.durationDays} selected /> : null}
          {mixed ? (
            <MixedPackagePanel
              billing={draft.kind === "catering" ? "catering" : "weekly"}
              selectedIncludedIds={selectedIncluded}
              onSelectedIncludedIds={chooseIncluded}
              selectedAddonIds={selectedAddons}
              onSelectedAddonIds={chooseAddons}
              servingNote={servingLabel}
            />
          ) : (
            <PackagePanel
              pkg={pkg}
              billing={draft.kind === "catering" ? "catering" : "weekly"}
              selectedAddonIds={selectedAddons}
              onSelectedAddonIds={chooseAddons}
              servingNote={servingLabel}
            />
          )}

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-3xl">Food preferences and allergies</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Spice and a note apply to the included dishes. A single dish can still be adjusted on its own.
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
                      {line.source === "addon" ? "Add-on" : "Included in standard price"}
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
              <p className="mt-2 text-sm text-muted-foreground">{servingLabel}</p>
              <dl className="mt-4 grid gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt>Standard package</dt>
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
            disabled={mixed && !draft.lines.some((line) => line.source === "included")}
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
