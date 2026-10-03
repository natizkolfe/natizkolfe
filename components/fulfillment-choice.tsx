"use client";

import { useEffect, useState } from "react";
import { useDraft } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [open, setOpen] = useState(false);

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

  function accept(quote: DeliveryQuote) {
    setDraft({ ...draft!, fulfillment: "delivery", address: quote.address, delivery: quote });
    setOpen(false);
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="font-display text-3xl">Pickup or delivery</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Pickup has no delivery fee. Delivery is an optional add-on and is not included in the package price.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={choosePickup}
          className={cn(
            "rounded-lg border px-3 py-3 text-left",
            draft.fulfillment === "pickup" ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          <span className="block text-sm font-medium">Pickup</span>
          <span className="mt-1 block text-xs text-muted-foreground">No additional delivery fee</span>
        </button>
        {settings && !settings.deliveryEnabled ? (
          <p className="rounded-lg border border-border px-3 py-3 text-sm text-muted-foreground">
            Delivery is not available right now.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              "rounded-lg border px-3 py-3 text-left",
              accepted ? "border-primary bg-primary/5" : "border-border",
            )}
          >
            <span className="block text-sm font-medium">Delivery</span>
            <span className="mt-1 block text-xs text-muted-foreground">
              Additional fee based on distance, {money(rate)} per mile
            </span>
          </button>
        )}
      </div>
      {draft.fulfillment === "pickup" && settings ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{settings.pickupInstructions}</p>
      ) : null}
      {accepted ? (
        <div className="mt-4 rounded-lg border border-border bg-background px-3 py-3 text-sm">
          <p className="text-xs tracking-[0.14em] text-primary uppercase">Delivery add-on</p>
          <p className="mt-2">{accepted.address}</p>
          <p className="mt-2 tabular-nums">
            {milesLabel(accepted.miles)} × {money(accepted.ratePerMile)} = {money(accepted.fee)}
          </p>
          <button type="button" className="mt-2 text-xs text-primary" onClick={() => setOpen(true)}>
            Change the delivery address
          </button>
        </div>
      ) : null}
      <DeliveryDialog
        open={open}
        rate={rate}
        initialAddress={accepted?.address ?? ""}
        onOpenChange={setOpen}
        onAccept={accept}
      />
    </section>
  );
}

function DeliveryDialog({
  open,
  rate,
  initialAddress,
  onOpenChange,
  onAccept,
}: {
  open: boolean;
  rate: number;
  initialAddress: string;
  onOpenChange: (open: boolean) => void;
  onAccept: (quote: DeliveryQuote) => void;
}) {
  const [address, setAddress] = useState(initialAddress);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [quote, setQuote] = useState<DeliveryQuote | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setAddress(initialAddress);
    setQuote(null);
    setError("");
    setSuggestions([]);
  }, [open, initialAddress]);

  useEffect(() => {
    if (!open || quote || address.trim().length < 5) {
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
  }, [address, open, quote]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add delivery to your order?</DialogTitle>
          <DialogDescription>
            Delivery is an optional add-on. The delivery fee is calculated from the driving distance between our
            location and your address at {money(rate)} per mile. Checking the price does not add it to the order.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void calculate();
          }}
        >
          <Label htmlFor="delivery-address">Delivery address</Label>
          <Input
            id="delivery-address"
            value={address}
            autoComplete="street-address"
            placeholder="Street, city, and ZIP code"
            className="h-11 bg-background px-3"
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
          <Button type="submit" variant="outline" className="h-10 bg-background" disabled={pending}>
            {pending ? "Calculating…" : "Calculate delivery fee"}
          </Button>
        </form>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {quote ? (
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-xs tracking-[0.14em] text-primary uppercase">Delivery summary</p>
            <p className="mt-2 text-xs text-muted-foreground">Delivery address</p>
            <p className="text-sm">{quote.address}</p>
            <dl className="mt-3 grid gap-1 text-sm">
              <div className="flex justify-between gap-3">
                <dt>Distance</dt>
                <dd className="tabular-nums">{milesLabel(quote.miles)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>Rate</dt>
                <dd className="tabular-nums">{money(quote.ratePerMile)}/mile</dd>
              </div>
              <div className="flex justify-between gap-3 font-medium">
                <dt>Delivery fee</dt>
                <dd className="tabular-nums">{money(quote.fee)}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              {milesLabel(quote.miles)} × {money(quote.ratePerMile)} = {money(quote.fee)}
            </p>
          </div>
        ) : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" className="h-10 bg-background" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" className="h-10" disabled={!quote} onClick={() => quote && onAccept(quote)}>
            Agree & add delivery
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
