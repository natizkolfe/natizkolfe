"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { DishPhoto } from "@/components/dish-photo";
import { GuestCountField } from "@/components/guest-count-field";
import { FulfillmentChoice } from "@/components/fulfillment-choice";
import { PageIntro, Shell } from "@/components/page-intro";
import { WeeklyContainer } from "@/components/weekly-container";
import { useAuth, useDraft } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client-api";
import { formatDate } from "@/lib/dates";
import { money } from "@/lib/format";
import { CATERING_PRICE_PER_PERSON, TABLE_OPTIONS } from "@/lib/packages";
import { defaultDraft, scheduleProblems } from "@/lib/orders";
import type { FastingPreference, OrderKind, PublicSettings } from "@/lib/types";
import { cn } from "cn";

const control = "h-11 bg-card px-3";

export function OrderSetup() {
  const router = useRouter();
  const params = useSearchParams();
  const { draft, hydrated, setDraft } = useDraft();
  const { user } = useAuth();
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [error, setError] = useState("");
  const [capacity, setCapacity] = useState<{ remaining: number; max: number; unit: string } | null>(null);
  const [loadError, setLoadError] = useState("");
  const pendingKind = useRef<OrderKind | null>(null);

  useEffect(() => {
    api<{ settings: PublicSettings }>("/api/settings")
      .then((data) => setSettings(data.settings))
      .catch((reason: Error) => setLoadError(reason.message));
  }, []);

  useEffect(() => {
    if (!hydrated || !settings) return;
    const requested = params.get("kind");
    const kind: OrderKind | null = requested === "catering" || requested === "weekly" ? requested : null;
    const table = params.get("table");
    const requestedTable: FastingPreference | null =
      table === "fasting" || table === "non_fasting" || table === "mixed" ? table : null;
    if (!draft) {
      const next = defaultDraft(settings, kind ?? "weekly");
      if (requestedTable) next.fastingPreference = requestedTable;
      else if (user?.preferences.fastingPreference) {
        next.fastingPreference = user.preferences.fastingPreference;
      }
      setDraft(next);
      return;
    }
    if (kind && draft.kind !== kind) {
      if (pendingKind.current) return;
      setDraft({
        ...defaultDraft(settings, kind),
        fulfillment: draft.fulfillment,
        fastingPreference: requestedTable ?? draft.fastingPreference,
        address: draft.address,
        delivery: draft.delivery ?? null,
        lines: [],
      });
      return;
    }
    if (pendingKind.current === draft.kind) pendingKind.current = null;
    if (requestedTable && draft.fastingPreference !== requestedTable) {
      setDraft({ ...draft, fastingPreference: requestedTable, lines: [] });
    }
  }, [hydrated, settings, draft, params, setDraft, user?.preferences.fastingPreference]);

  const active = draft;
  const date = active?.kind === "catering" ? active.eventDate : active?.startDate;

  useEffect(() => {
    if (!active || active.kind !== "catering" || !date) return;
    let ignore = false;
    fetch(`/api/capacity?date=${date}&kind=catering`)
      .then((response) => response.json())
      .then((data: { remaining: number; max: number; unit: string }) => {
        if (!ignore) setCapacity(data);
      })
      .catch(() => {
        if (!ignore) setCapacity(null);
      });
    return () => {
      ignore = true;
    };
  }, [active, date]);

  useEffect(() => {
    if (!settings || !active || active.kind !== "catering") return;
    if (active.guestCount >= settings.minCateringGuests && active.guestCount <= settings.maxGuestsPerDay) return;
    const guestCount = Math.min(
      settings.maxGuestsPerDay,
      Math.max(settings.minCateringGuests, active.guestCount || settings.minCateringGuests),
    );
    update({ guestCount });
  }, [settings, active]);

  const problem = useMemo(() => {
    if (!active || !settings) return null;
    return scheduleProblems(active, settings);
  }, [active, settings]);

  function update(patch: Partial<NonNullable<typeof draft>>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function chooseKind(kind: OrderKind) {
    if (!settings || !active || active.kind === kind) return;
    pendingKind.current = kind;
    setDraft({
      ...defaultDraft(settings, kind),
      fulfillment: active.fulfillment,
      fastingPreference: active.fastingPreference,
      address: active.address,
      delivery: active.delivery ?? null,
    });
    router.replace(kind === "weekly" ? "/order?kind=weekly" : "/order?kind=catering", { scroll: false });
  }

  function continueOrder() {
    if (!active || !settings) return;
    const issue = scheduleProblems(active, settings);
    if (issue) {
      setError(issue);
      return;
    }
    if (active.kind === "catering" && capacity && active.guestCount > capacity.remaining) {
      setError(
        `Only ${capacity.remaining} catering seats are still open on ${formatDate(active.eventDate)}.`,
      );
      return;
    }
    setError("");
    router.push("/order/menu");
  }

  if (loadError) {
    return (
      <Shell>
        <PageIntro title="The order form did not load" lede={loadError} />
      </Shell>
    );
  }

  if (!hydrated || !settings || !active) {
    return (
      <Shell>
        <p className="text-muted-foreground">Setting the kitchen calendar…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageIntro
        eyebrow="New order"
        title={active.kind === "weekly" ? "Plan the week." : "Count the table."}
        lede="Choose the service, then fasting, non-fasting, or a mixed order. A mixed order uses the same standard price and lets you choose the dishes. Payment still has to clear before the kitchen confirms it."
      />

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <KindCard
          selected={active.kind === "weekly"}
          title="Weekly meal preparation"
          detail="Seven or fourteen days of the standard package, with optional extra dishes."
          onClick={() => chooseKind("weekly")}
        />
        <KindCard
          selected={active.kind === "catering"}
          title="Catering by guest count"
          detail={`The standard meal starts at ${money(CATERING_PRICE_PER_PERSON)} per person. Add-ons are extra per person.`}
          onClick={() => chooseKind("catering")}
        />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <form
          className="grid gap-6 rounded-xl border border-border bg-card p-5 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            continueOrder();
          }}
        >
          {active.kind === "weekly" ? (
            <div className="grid gap-4">
              <fieldset className="grid gap-3">
                <legend className="text-sm font-medium">Choose the container</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {([7, 14] as const).map((days) => {
                    const selected = active.durationDays === days;
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => update({ durationDays: days })}
                        className={cn(
                          "rounded-xl border p-3 text-left",
                          selected ? "border-primary bg-primary/5 shadow-[inset_0_0_0_1px_var(--primary)]" : "border-border bg-background",
                        )}
                      >
                        <WeeklyContainer days={days} selected={selected} />
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="grid gap-2">
                <Label htmlFor="startDate">First meal date</Label>
                <Input
                  id="startDate"
                  className={control}
                  type="date"
                  min={settings.earliestWeeklyDate}
                  value={active.startDate}
                  onChange={(event) => update({ startDate: event.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Earliest day is {formatDate(settings.earliestWeeklyDate)}, {settings.weeklyLeadDays} days from today.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="guests">Guests</Label>
                <GuestCountField
                  id="guests"
                  count={active.guestCount}
                  min={settings.minCateringGuests}
                  max={settings.maxGuestsPerDay}
                  onChange={(guestCount) => update({ guestCount })}
                />
                <p className="text-xs text-muted-foreground">
                  Standard package is {money(CATERING_PRICE_PER_PERSON)} per person.
                </p>
                {Number.isInteger(active.guestCount) && active.guestCount > 0 ? (
                  <p className="text-sm">
                    {active.guestCount} × {money(CATERING_PRICE_PER_PERSON)} ={" "}
                    {money(CATERING_PRICE_PER_PERSON * active.guestCount)} before add-ons.
                  </p>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eventDate">Event date</Label>
                <Input
                  id="eventDate"
                  className={control}
                  type="date"
                  min={settings.earliestCateringDate}
                  value={active.eventDate}
                  onChange={(event) => update({ eventDate: event.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="eventTime">Time</Label>
                <Input
                  id="eventTime"
                  className={control}
                  type="time"
                  value={active.eventTime}
                  onChange={(event) => update({ eventTime: event.target.value })}
                />
              </div>
            </div>
          )}

          <fieldset className="grid gap-2">
            <legend className="text-sm font-medium">Meal type</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {TABLE_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => update({ fastingPreference: option.id, lines: [] })}
                  className={cn(
                    "rounded-lg border px-3 py-3 text-left",
                    active.fastingPreference === option.id ? "border-primary bg-primary/5" : "border-border bg-background",
                  )}
                >
                  <span className="flex gap-1" aria-hidden>
                    {option.icons.map((id) => (
                      <DishPhoto key={id} id={id} size="sm" />
                    ))}
                  </span>
                  <span className="mt-2 block text-sm font-medium">{option.title}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">{option.detail}</span>
                  <span className="mt-2 block text-xs font-medium">{option.note}</span>
                  {option.id === "mixed" ? (
                    <span className="mt-1 block text-xs text-muted-foreground">Same standard price</span>
                  ) : null}
                </button>
              ))}
            </div>
          </fieldset>

          <FulfillmentChoice />

          {error || problem ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error || problem}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button type="submit" className="h-11 px-4">
              View the package
            </Button>
          </div>
        </form>

        <aside className="h-fit rounded-xl border border-border bg-card p-5">
          <p className="text-xs tracking-[0.16em] text-primary uppercase">Before you pay</p>
          <ol className="mt-4 grid gap-3 text-sm leading-6">
            <li>1. Choose the service, then fasting, non-fasting, or mixed.</li>
            <li>2. A mixed order lets you pick the included dishes. Add-ons are optional.</li>
            <li>3. Set spice and notes, then review.</li>
            <li>4. Pay. Nothing is confirmed until the card clears.</li>
          </ol>
          {active.kind === "catering" && capacity ? (
            <p className="mt-4 border-t border-border pt-4 text-sm leading-6">
              {capacity.remaining} of {capacity.max} guest seats are still open on {formatDate(active.eventDate)}.
              Seats are held when payment succeeds.
            </p>
          ) : (
            <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-muted-foreground">
              Weekly service can prepare up to {settings.maxWeeklyServingsPerDay} servings a day.
            </p>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function KindCard({
  selected,
  title,
  detail,
  onClick,
}: {
  selected: boolean;
  title: string;
  detail: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-5 text-left",
        selected ? "border-primary bg-card shadow-[inset_0_0_0_1px_var(--primary)]" : "border-border bg-card/60",
      )}
    >
      <span className="font-display text-2xl">{title}</span>
      <span className="mt-2 block text-sm leading-6 text-muted-foreground">{detail}</span>
    </button>
  );
}
