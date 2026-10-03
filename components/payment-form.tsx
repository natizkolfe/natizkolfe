"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client-api";
import type { OrderRecord } from "@/lib/types";

const control = "h-11 bg-background px-3";

export const TEST_CARD = {
  number: "4242 4242 4242 4242",
  expiry: "12/28",
  cvc: "123",
};

export function TestCardButton({ onUse }: { onUse: () => void }) {
  return (
    <button
      type="button"
      onClick={onUse}
      className="rounded-xl border border-primary/30 bg-[#2A1814] px-4 py-4 text-left text-[#F6EFE4]"
    >
      <p className="text-xs tracking-[0.16em] text-[#E7C98A] uppercase">Test card</p>
      <p className="mt-2 font-display text-2xl tracking-wide">{TEST_CARD.number}</p>
      <p className="mt-2 text-sm">
        {TEST_CARD.expiry} · {TEST_CARD.cvc} · Approved
      </p>
      <p className="mt-1 text-xs text-[#F6EFE4]/70">Tap to fill checkout and place a paid test order.</p>
    </button>
  );
}

export function PaymentForm({
  orderId,
  payerName,
  prepare,
  onPaid,
  onUnpaid,
}: {
  orderId?: string;
  payerName: string;
  prepare?: () => Promise<string>;
  onPaid: (order: OrderRecord) => void;
  onUnpaid: (message: string, order: OrderRecord | null) => void;
}) {
  const [name, setName] = useState(payerName);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    let id = orderId;
    try {
      if (prepare) id = await prepare();
      if (!id) throw new Error("The order could not be opened for payment.");
      const result = await api<{ ok: boolean; message: string; order: OrderRecord }>(`/api/orders/${id}/pay`, {
        method: "POST",
        body: JSON.stringify({ name, cardNumber, expiry, cvc }),
      });
      onPaid(result.order);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Payment failed.";
      setError(message);
      if (!id) {
        onUnpaid(message, null);
      } else {
        try {
          const latest = await api<{ order: OrderRecord }>(`/api/orders/${id}`);
          onUnpaid(message, latest.order);
        } catch {
          onUnpaid(message, null);
        }
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-4" autoComplete="off" onSubmit={submit}>
      <TestCardButton
        onUse={() => {
          setCardNumber(TEST_CARD.number);
          setExpiry(TEST_CARD.expiry);
          setCvc(TEST_CARD.cvc);
          setError("");
        }}
      />
      <p className="text-xs leading-5 text-muted-foreground">
        A card number starting with 4000 is declined, and the order stays unpaid.
      </p>
      <div className="grid gap-2">
        <Label htmlFor="card-name">Name on card</Label>
        <Input
          id="card-name"
          name="gebeta-card-name"
          className={control}
          autoComplete="off"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onInput={(event) => setName(event.currentTarget.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="card-number">Card number</Label>
        <Input
          id="card-number"
          className={control}
          inputMode="numeric"
          name="gebeta-card-number"
          autoComplete="off"
          placeholder="4242 4242 4242 4242"
          value={cardNumber}
          onChange={(event) => setCardNumber(event.target.value)}
          onInput={(event) => setCardNumber(event.currentTarget.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="expiry">Expiry</Label>
          <Input
            id="expiry"
            className={control}
            name="gebeta-expiry"
            autoComplete="off"
            placeholder="MM/YY"
            value={expiry}
            onChange={(event) => setExpiry(event.target.value)}
            onInput={(event) => setExpiry(event.currentTarget.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cvc">Security code</Label>
          <Input
            id="cvc"
            className={control}
            name="gebeta-cvc"
            autoComplete="off"
            placeholder="123"
            value={cvc}
            onChange={(event) => setCvc(event.target.value)}
            onInput={(event) => setCvc(event.currentTarget.value)}
          />
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" className="h-11" disabled={pending}>
        {pending ? "Contacting the card…" : "Pay and confirm"}
      </Button>
    </form>
  );
}
