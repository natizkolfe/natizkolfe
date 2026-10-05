"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageIntro, Shell } from "@/components/page-intro";
import { useAuth, useDraft } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client-api";
import { addDays, formatDate, formatTime } from "@/lib/dates";
import { FASTING_LABEL, FULFILLMENT_LABEL, money } from "@/lib/format";
import { DishPhoto } from "@/components/dish-photo";
import { FulfillmentChoice } from "@/components/fulfillment-choice";
import { WeeklyContainer } from "@/components/weekly-container";
import { addonUnitPrice, dishLabel, dishSide, serviceQuote, sideLabel, weeklyContainer } from "@/lib/packages";
import { containerForDays, foodOffer, weeklyUnitPrice } from "@/lib/portions";
import { describeCustomization, lineCountLabel, scheduleProblems, unitPrice } from "@/lib/orders";
import type { DraftLine, MenuItem, OrderDraft, PublicSettings } from "@/lib/types";

export function OrderReview() {
  const router = useRouter();
  const { draft, hydrated, setDraft } = useDraft();
  const { user, ready } = useAuth();
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api<{ menu: MenuItem[] }>("/api/menu"), api<{ settings: PublicSettings }>("/api/settings")])
      .then(([menuData, settingsData]) => {
        setMenu(menuData.menu);
        setSettings(settingsData.settings);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  if (!hydrated || !ready) {
    return (
      <Shell>
        <p className="text-muted-foreground">Gathering the order…</p>
      </Shell>
    );
  }

  if (!draft || draft.lines.length === 0) {
    return (
      <Shell>
        <PageIntro title="Nothing to review yet" lede="Choose at least one meal for a weekly order, or a catering package." />
        <Button className="mt-6 h-11 px-4" render={<Link href={draft ? "/order/menu" : "/order"} />}>
          {draft ? "Back to the package" : "Start an order"}
        </Button>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <PageIntro title="The review could not load" lede={error} />
      </Shell>
    );
  }

  if (!menu || !settings) {
    return (
      <Shell>
        <p className="text-muted-foreground">Checking dates and prices…</p>
      </Shell>
    );
  }

  const problem =
    scheduleProblems(draft, settings) ??
    (draft.kind === "weekly" && !draft.lines.some((line) => line.source === "included")
      ? "Choose at least one meal."
      : draft.kind === "catering" && draft.lines.length === 0
        ? "Choose at least one catering food."
        : null);
  const rows = draft.lines.map((line) => {
    const item = menu.find((entry) => entry.id === line.itemId);
    return { line, item };
  });
  const quote = serviceQuote(
    draft,
    draft.lines.filter((line) => line.source === "addon").map((line) => line.itemId),
  );
  const subtotal = quote
    ? quote.total
    : rows.reduce((sum, row) => {
        if (!row.item) return sum;
        if (draft.kind === "weekly") {
          return sum + weeklyUnitPrice(row.line.itemId, row.line.source) * row.line.quantity;
        }
        const perDay =
          row.line.source === "addon"
            ? addonUnitPrice(draft.fastingPreference, row.line.itemId)
            : unitPrice(row.item, row.line.customization);
        return sum + perDay * row.line.quantity;
      }, 0);

  return (
    <Shell>
      <PageIntro
        eyebrow="Review"
        title="Read it the way the kitchen will."
        lede="Payment is the next step. Until the card clears, this stays a draft and the kitchen will not prepare it."
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4">
          {problem ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {problem}
            </p>
          ) : null}
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-2xl">Schedule</h2>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Order</dt>
                <dd>
                  {draft.kind === "weekly"
                    ? weeklyContainer(draft.durationDays).title
                    : `Catering for ${draft.guestCount}`}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">When</dt>
                <dd className="text-right">
                  {draft.kind === "weekly"
                    ? `${formatDate(draft.startDate)} – ${formatDate(addDays(draft.startDate, draft.durationDays - 1))}`
                    : `${formatDate(draft.eventDate)} · ${formatTime(draft.eventTime)}`}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Table</dt>
                <dd>{FASTING_LABEL[draft.fastingPreference]}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{FULFILLMENT_LABEL[draft.fulfillment]}</dt>
                <dd className="max-w-xs text-right">
                  {draft.fulfillment === "pickup" ? settings.pickupAddress : draft.address}
                </dd>
              </div>
            </dl>
          </section>
          {draft.kind === "weekly" ? (
            <WeeklyContainer days={draft.durationDays} selected />
          ) : null}
          {draft.kind === "weekly" ? (
            <WeeklySummary
              draft={draft}
              rows={rows}
              onRemove={(lineId) => setDraft({ ...draft, lines: draft.lines.filter((entry) => entry.lineId !== lineId) })}
            />
          ) : null}
          {draft.kind === "catering" ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl">Catering summary</h2>
              <span className="text-sm text-muted-foreground">{lineCountLabel(draft.lines)}</span>
            </div>
            {(["included", "addon", "other"] as const).map((group) => {
              const groupRows = rows.filter(({ line }) => {
                if (group === "other") return line.source !== "included" && line.source !== "addon";
                return line.source === group;
              });
              if (groupRows.length === 0) return null;
              const groupTotal = quote
                ? group === "included"
                  ? quote.baseTotal
                  : group === "addon"
                    ? quote.addons.reduce((sum, addon) => sum + addon.total, 0)
                    : 0
                : groupRows.reduce((sum, row) => {
                    if (!row.item) return sum;
                    const perDay =
                      row.line.source === "addon"
                        ? addonUnitPrice(draft.fastingPreference, row.line.itemId)
                        : unitPrice(row.item, row.line.customization);
                    return sum + perDay * row.line.quantity;
                  }, 0);
              return (
                <div key={group} className="mt-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-xs tracking-[0.14em] text-primary uppercase">
                      {group === "included" ? "Selected standard foods" : group === "addon" ? "Add-ons" : "Other dishes"}
                    </h3>
                    <span className="text-sm tabular-nums">{money(groupTotal)}</span>
                  </div>
                  <ul className="mt-3 grid gap-4">
                    {groupRows.map(({ line, item }) => (
                      <li key={line.lineId} className="border-t border-border pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <DishPhoto id={line.itemId} />
                            <div>
                              <p className="font-medium">
                                {dishLabel(line.itemId) ?? item?.name ?? "Unavailable dish"}
                                {draft.fastingPreference === "mixed" && dishSide(line.itemId)
                                  ? ` — ${sideLabel(dishSide(line.itemId)!)}`
                                  : ""}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {draft.kind === "weekly"
                                  ? `Packed for each day · ${draft.durationDays} days`
                                  : group === "included"
                                    ? "Standard selection"
                                    : `+${money(quote?.addons.find((addon) => addon.id === line.itemId)?.perPerson ?? addonUnitPrice(draft.fastingPreference, line.itemId))}/person`}
                              </p>
                            </div>
                          </div>
                          <p className="text-right text-sm tabular-nums">
                            {group === "included"
                              ? "In starting price"
                              : quote
                                ? `+${money(quote.addons.find((addon) => addon.id === line.itemId)?.perPerson ?? 0)} × ${quote.count} = ${money(quote.addons.find((addon) => addon.id === line.itemId)?.total ?? 0)}`
                                : item
                                  ? `+ ${money(addonUnitPrice(draft.fastingPreference, line.itemId) * line.quantity)}`
                                  : "—"}
                          </p>
                        </div>
                        {item ? (
                          <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                            {describeCustomization(item, line.customization).length ? (
                              describeCustomization(item, line.customization).map((entry) => <li key={entry}>{entry}</li>)
                            ) : (
                              <li>{group === "included" ? "Part of the starting catering price." : "Added on top of the starting price."}</li>
                            )}
                          </ul>
                        ) : (
                          <p className="mt-2 text-sm text-destructive">This dish left the menu. Remove it before paying.</p>
                        )}
                        {group !== "included" ? (
                          <button
                            type="button"
                            className="mt-2 text-xs text-muted-foreground"
                            onClick={() =>
                              setDraft({ ...draft, lines: draft.lines.filter((entry) => entry.lineId !== line.lineId) })
                            }
                          >
                            Remove
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>
          ) : null}
          {draft.fulfillment === "delivery" && draft.delivery ? (
            <section className="rounded-xl border border-border bg-card p-5">
              <h2 className="font-display text-2xl">Delivery</h2>
              <p className="mt-2 text-sm">{draft.delivery.address}</p>
              <p className="mt-2 text-sm tabular-nums">
                {draft.delivery.miles} miles × {money(draft.delivery.ratePerMile)} = {money(draft.delivery.fee)}
              </p>
            </section>
          ) : null}
          <FulfillmentChoice />
        </div>
        <aside className="h-fit rounded-xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <p className="text-sm text-muted-foreground">
            {quote ? "Estimated total" : "Total due before confirmation"}
          </p>
          <p className="mt-1 font-display text-4xl">{money(subtotal + (draft.fulfillment === "delivery" ? draft.delivery?.fee ?? 0 : 0))}</p>
          {draft.fulfillment === "delivery" && draft.delivery ? (
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Includes delivery, {draft.delivery.miles} miles × {money(draft.delivery.ratePerMile)} = {money(draft.delivery.fee)}.
            </p>
          ) : null}
          {quote ? (
            <div className="mt-2 grid gap-2 text-sm leading-6 text-muted-foreground">
              <p>
                Starting at {money(quote.basePer)} per person. {money(quote.basePer)} × {quote.count} guests = {money(quote.baseTotal)}.
              </p>
              {quote.addons.length ? (
                <p>
                  Your selection changes the catering price by +
                  {money(quote.addons.reduce((sum, addon) => sum + addon.perPerson, 0))}/person.
                </p>
              ) : null}
            </div>
          ) : null}
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {user
              ? `Paying as ${user.name}. The text message with your pickup code goes to ${user.phone} when the order is ready.`
              : "Sign in so the order, receipt, and pickup text have your name and phone."}
          </p>
          <div className="mt-4 grid gap-2">
            {user ? (
              <Button className="h-11" disabled={Boolean(problem)} onClick={() => router.push("/order/pay")}>
                Continue to payment
              </Button>
            ) : (
              <Button className="h-11" render={<Link href="/login?next=/order/review" />}>
                Sign in to pay
              </Button>
            )}
            <Button variant="outline" className="h-11 bg-background" render={<Link href="/order/menu" />}>
              {draft.kind === "catering" ? "Edit catering" : "Edit meals"}
            </Button>
          </div>
        </aside>
      </div>
    </Shell>
  );
}

function WeeklySummary({
  draft,
  rows,
  onRemove,
}: {
  draft: OrderDraft;
  rows: { line: DraftLine; item: MenuItem | undefined }[];
  onRemove: (lineId: string) => void;
}) {
  const container = weeklyContainer(draft.durationDays);
  const sides =
    draft.fastingPreference === "non_fasting"
      ? (["non_fasting"] as const)
      : draft.fastingPreference === "fasting"
        ? (["fasting"] as const)
        : (["fasting", "non_fasting"] as const);
  const addons = rows.filter(({ line }) => line.source === "addon");

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-2xl">Your Weekly Meal</h2>
      <p className="mt-2 text-sm">{container.title}</p>
      <p className="mt-1 text-sm text-muted-foreground">Container: {container.short}</p>
      {sides.map((side) => {
        const meals = rows.filter(({ line }) => {
          if (line.source !== "included") return false;
          if (draft.fastingPreference !== "mixed") return true;
          return (dishSide(line.itemId) ?? "fasting") === side;
        });
        if (meals.length === 0) return null;
        return (
          <div key={side} className="mt-5">
            <h3 className="text-xs tracking-[0.14em] text-primary uppercase">
              {side === "fasting" ? "Fasting" : "Non-Fasting"}
            </h3>
            <ul className="mt-3 grid gap-4">
              {meals.map(({ line, item }) => (
                <li key={line.lineId} className="border-t border-border pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <DishPhoto id={line.itemId} />
                      <div>
                        <p className="font-medium">{foodOffer(line.itemId)?.label ?? dishLabel(line.itemId) ?? item?.name ?? "Unavailable dish"}</p>
                        <p className="text-sm text-muted-foreground">{containerForDays(draft.durationDays).sizeLabel}</p>
                        <p className="text-sm text-muted-foreground">
                          {money(weeklyUnitPrice(line.itemId, "included"))} × {line.quantity}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm tabular-nums">
                      {money(weeklyUnitPrice(line.itemId, "included") * line.quantity)}
                    </p>
                  </div>
                  {item && describeCustomization(item, line.customization).length ? (
                    <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                      {describeCustomization(item, line.customization).map((entry) => (
                        <li key={entry}>{entry}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <div className="mt-5">
        <h3 className="text-xs tracking-[0.14em] text-primary uppercase">Add-ons</h3>
        {addons.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">None</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {addons.map(({ line, item }) => {
              const price =
                (draft.kind === "weekly" ? weeklyUnitPrice(line.itemId, "addon") : addonUnitPrice(draft.fastingPreference, line.itemId)) *
                line.quantity;
              return (
                <li key={line.lineId} className="flex items-start justify-between gap-3 border-t border-border pt-3">
                  <div>
                    <p className="text-sm">
                      {dishLabel(line.itemId) ?? item?.name} × {line.quantity}
                    </p>
                    <button type="button" className="mt-1 text-xs text-muted-foreground" onClick={() => onRemove(line.lineId)}>
                      Remove
                    </button>
                  </div>
                  <p className="text-sm tabular-nums">+{money(price)}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
