"use client";

import { useEffect, useState } from "react";
import { useDraft } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client-api";
import { money } from "@/lib/format";
import type { DeliveryQuote, PublicSettings } from "@/lib/types";
import { cn } from "cn";

function milesLabel(miles: number): string {
  const text = Number.isInteger(miles) ? String(miles) : miles.toFixed(1);
  return `${text} ${miles === 1 ? "mile" : "miles"}`;
}

export function FulfillmentChoice() {
  const { draft, setDraft } = useDraft();
  const [settings, setSettings] = useState<PublicSettings | null>(null);

  useEffect(() => {
    api<{ settings: PublicSettings }>("/api/settings")
      .then((data) => setSettings(data.settings))
      .catch(() => setSettings(null));
  }, []);

  if (!draft) return null;
  const accepted = draft.fulfillment === "delivery" ? draft.delivery : null;
  const rate = settings?.deliveryRatePerMile ?? 2;

  function choosePickup() {
    setDraft({ ...draft!, fulfillment: "pickup", delivery: null, address: "" });
  }

  function chooseDelivery() {
    if (draft!.fulfillment === "delivery") return;
    setDraft({ ...draft!, fulfillment: "delivery", delivery: null, address: "" });
  }

  function accept(quote: DeliveryQuote) {
    setDraft({ ...draft!, fulfillment: "delivery", address: quote.address, delivery: quote });
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-3xl">How would you like to receive your order?</h2>
      <div className="mt-4 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Pickup or delivery">
        <button
          type="button"
          role="radio"
          aria-checked={draft.fulfillment === "pickup"}
          onClick={choosePickup}
          className={cn(
            "rounded-lg border px-3 py-3 text-left",
            draft.fulfillment === "pickup" ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          <span className="block text-sm font-medium">Pickup</span>
          <span className="mt-1 block text-xs text-muted-foreground">No delivery fee</span>
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">Pickup from the Gebeta location.</span>
        </button>
        {settings && !settings.deliveryEnabled ? (
          <p className="rounded-lg border border-border px-3 py-3 text-sm text-muted-foreground">
            Delivery is not available right now.
          </p>
        ) : (
          <button
            type="button"
            role="radio"
            aria-checked={draft.fulfillment === "delivery"}
            onClick={chooseDelivery}
            className={cn(
              "rounded-lg border px-3 py-3 text-left",
              draft.fulfillment === "delivery" ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            <span className="block text-sm font-medium">Delivery</span>
            <span className="mt-1 block text-xs text-muted-foreground">Additional delivery fee applies</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Delivery is an additional paid service, {money(rate)} per mile.
            </span>
          </button>
        )}
      </div>
      {draft.fulfillment === "pickup" && settings ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{settings.pickupInstructions}</p>
      ) : null}
      {draft.fulfillment === "delivery" ? (
        <DeliveryPanel rate={rate} initialAddress={accepted?.address ?? draft.address} accepted={accepted} onAccept={accept} />
      ) : null}
    </section>
  );
}

function DeliveryPanel({
  rate,
  initialAddress,
  accepted,
  onAccept,
}: {
  rate: number;
  initialAddress: string;
  accepted: DeliveryQuote | null;
  onAccept: (quote: DeliveryQuote) => void;
}) {
  const [address, setAddress] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [quote, setQuote] = useState<DeliveryQuote | null>(accepted);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setAddress(initialAddress);
    setQuote(accepted);
  }, [initialAddress, accepted]);

  useEffect(() => {
    if (quote || address.trim().length < 5) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ q: address.trim() });
      fetch(`/api/delivery/suggest?${params}`)
        .then((response) => response.json())
        .then((data: { suggestions?: string[] }) => {
          if (!cancelled) setSuggestions(data.suggestions ?? []);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        });
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [address, quote]);

  async function calculate() {
    setPending(true);
    setError("");
    setQuote(null);
    try {
      const data = await api<{ quote: DeliveryQuote }>("/api/delivery/quote", {
        method: "POST",
        body: JSON.stringify({ address }),
      });
      setQuote(data.quote);
      setAddress(data.quote.address);
      setSuggestions([]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "We couldn't calculate that delivery fee.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 grid gap-3 rounded-lg border border-border bg-background p-4">
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void calculate();
        }}
      >
        <Label htmlFor="delivery-address">Enter delivery address</Label>
        <Input
          id="delivery-address"
          value={address}
          autoComplete="street-address"
          placeholder="Street, city, and ZIP code"
          className="h-11 bg-card px-3"
          onChange={(event) => {
            setAddress(event.target.value);
            setQuote(null);
          }}
        />
        {suggestions.length > 0 ? (
          <ul className="grid gap-1">
            {suggestions.map((suggestion) => (
              <li key={suggestion}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-1 text-left text-xs text-muted-foreground hover:bg-muted"
                  onClick={() => {
                    setAddress(suggestion);
                    setQuote(null);
                    setSuggestions([]);
                  }}
                >
                  {suggestion}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <Button type="submit" variant="outline" className="h-10 w-fit bg-card" disabled={pending}>
          {pending ? "Calculating…" : "Calculate delivery fee"}
        </Button>
      </form>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {quote ? (
        <div className="rounded-lg border border-border bg-card p-3">
          <p className="text-xs tracking-[0.14em] text-primary uppercase">Delivery summary</p>
          <p className="mt-2 text-sm">{quote.address}</p>
          <p className="mt-2 text-sm tabular-nums">
            {milesLabel(quote.miles)} × {money(quote.ratePerMile)} = {money(quote.fee)}
          </p>
          <Button type="button" className="mt-3 h-10" onClick={() => onAccept(quote)}>
            Add delivery to this order
          </Button>
        </div>
      ) : null}
    </div>
  );
}
