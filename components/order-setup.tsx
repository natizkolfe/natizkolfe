"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { GuestCountField } from "@/components/guest-count-field";
import { MealTypeField, useMealTypeNavigation } from "@/components/meal-type-field";
import { PageIntro, Shell } from "@/components/page-intro";
import { WeeklyContainer } from "@/components/weekly-container";
import { useAuth, useDraft } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client-api";
import { formatDate } from "@/lib/dates";
import { money } from "@/lib/format";
import { CATERING_PRICE_PER_PERSON } from "@/lib/packages";
import { defaultDraft, scheduleProblems } from "@/lib/orders";
import type { FastingPreference, OrderKind, PublicSettings } from "@/lib/types";

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
  const selectMealType = useMealTypeNavigation("/order");

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

  function update(patch: Partial<NonNullable<typeof draft>>) {
    setDraft((current) => (current ? { ...current, ...patch } : current));
  }

  function continueOrder(days?: 7 | 14) {
    if (!active || !settings) return;
    const next = days ? { ...active, durationDays: days } : active;
    if (days) setDraft(next);
    const issue = scheduleProblems({ ...next, fulfillment: "pickup", delivery: null }, settings);
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
    router.push(`/order/menu?kind=${next.kind}&table=${next.fastingPreference}`);
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

  const mealType = (
    <MealTypeField
      kind={active.kind}
      preference={active.fastingPreference}
      lines={active.lines}
      onSelect={selectMealType}
    />
  );

  if (active.kind === "catering") {
    return (
      <Shell>
        <PageIntro
          eyebrow="Catering"
          title="Catering options"
          lede="Choose fasting, non-fasting, or mixed, then tell us how many people you are serving. The foods come next."
        />
        <form
          className="mt-8 grid gap-6 rounded-xl border border-border bg-card p-5 sm:p-6"
          onSubmit={(event) => {
            event.preventDefault();
            continueOrder();
          }}
        >
          {mealType}
          <div className="grid gap-2">
            <Label htmlFor="guests">How many people are you serving?</Label>
            <GuestCountField
              id="guests"
              count={active.guestCount}
              min={settings.minCateringGuests}
              max={settings.maxGuestsPerDay}
              onChange={(guestCount) => update({ guestCount })}
            />
            <p className="text-xs text-muted-foreground">
              Starting at {money(CATERING_PRICE_PER_PERSON)} per person. Extras can raise this.
            </p>
            {Number.isInteger(active.guestCount) && active.guestCount > 0 ? (
              <p className="text-sm">
                {active.guestCount} × {money(CATERING_PRICE_PER_PERSON)} ={" "}
                {money(CATERING_PRICE_PER_PERSON * active.guestCount)} starting price.
              </p>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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
          {capacity ? (
            <p className="text-sm leading-6 text-muted-foreground">
              {capacity.remaining} of {capacity.max} guest seats are still open on {formatDate(active.eventDate)}.
            </p>
          ) : null}
          {error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="h-11 w-fit px-4">
            Choose your foods
          </Button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageIntro
        eyebrow="Weekly meal"
        title="How long do you want your weekly meal service?"
        lede="Choose fasting, non-fasting, or mixed, then open the one-week or two-week package."
      />
      <form
        className="mt-8 grid gap-6 rounded-xl border border-border bg-card p-5 sm:p-6"
        onSubmit={(event) => event.preventDefault()}
      >
        {mealType}
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
        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium">Choose duration</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {([7, 14] as const).map((days) => (
              <div key={days} className="grid content-between gap-3 rounded-xl border border-border bg-background p-3">
                <WeeklyContainer days={days} />
                <Button type="button" className="h-10" onClick={() => continueOrder(days)}>
                  View package
                </Button>
              </div>
            ))}
          </div>
        </fieldset>
        {error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </form>
    </Shell>
  );
}
