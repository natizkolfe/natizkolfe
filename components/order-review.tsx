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
import { describeCustomization, lineCountLabel, scheduleProblems, unitPrice } from "@/lib/orders";
import type { MenuItem, PublicSettings } from "@/lib/types";

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
        <PageIntro title="Nothing to review yet" lede="Add at least one dish. Each one can carry its own notes." />
        <Button className="mt-6 h-11 px-4" render={<Link href={draft ? "/order/menu" : "/order"} />}>
          {draft ? "Back to the menu" : "Start an order"}
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

  const problem = scheduleProblems(draft, settings);
  const rows = draft.lines.map((line) => {
    const item = menu.find((entry) => entry.id === line.itemId);
    return { line, item };
  });
  const subtotal = rows.reduce((sum, row) => {
    if (!row.item) return sum;
    return sum + unitPrice(row.item, row.line.customization) * row.line.quantity;
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
                <dd>{draft.kind === "weekly" ? `${draft.durationDays}-day meal plan` : `Catering for ${draft.guestCount}`}</dd>
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
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-2xl">Dishes</h2>
              <span className="text-sm text-muted-foreground">{lineCountLabel(draft.lines)}</span>
            </div>
            <ul className="mt-4 grid gap-4">
              {rows.map(({ line, item }) => (
                <li key={line.lineId} className="border-t border-border pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {line.quantity} × {item?.name ?? "Unavailable dish"}
                      </p>
                      {draft.kind === "weekly" && line.dayIndex != null ? (
                        <p className="text-sm text-muted-foreground capitalize">
                          {formatDate(addDays(draft.startDate, line.dayIndex))} · {line.mealSlot}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      <label className="text-xs text-muted-foreground">
                        Qty
                        <input
                          className="ml-2 h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
                          type="number"
                          min={1}
                          value={line.quantity}
                          onChange={(event) => {
                            const quantity = Number(event.target.value);
                            if (!Number.isInteger(quantity) || quantity < 1) return;
                            setDraft({
                              ...draft,
                              lines: draft.lines.map((entry) =>
                                entry.lineId === line.lineId ? { ...entry, quantity } : entry,
                              ),
                            });
                          }}
                        />
                      </label>
                      <p className="text-sm tabular-nums">
                        {item ? money(unitPrice(item, line.customization) * line.quantity) : "—"}
                      </p>
                    </div>
                  </div>
                  {item ? (
                    <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                      {describeCustomization(item, line.customization).length ? (
                        describeCustomization(item, line.customization).map((entry) => <li key={entry}>{entry}</li>)
                      ) : (
                        <li>Standard preparation.</li>
                      )}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-destructive">This dish left the menu. Remove it before paying.</p>
                  )}
                  <button
                    type="button"
                    className="mt-2 text-xs text-muted-foreground"
                    onClick={() =>
                      setDraft({ ...draft, lines: draft.lines.filter((entry) => entry.lineId !== line.lineId) })
                    }
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <aside className="h-fit rounded-xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <p className="text-sm text-muted-foreground">Total due before confirmation</p>
          <p className="mt-1 font-display text-4xl">{money(subtotal)}</p>
          {draft.kind === "catering" ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {money(subtotal / draft.guestCount)} for each of {draft.guestCount} guests.
            </p>
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
              Edit dishes
            </Button>
          </div>
        </aside>
      </div>
    </Shell>
  );
}
