"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client-api";
import type { OrderRecord } from "@/lib/types";

const control = "h-11 bg-background px-3";

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
    <form className="grid gap-4" onSubmit={submit}>
      <div className="rounded-lg border border-gold/40 bg-accent/40 px-3 py-3 text-sm leading-6">
        Demo checkout. <span className="font-medium">4242 4242 4242 4242</span> is approved. A number starting with{" "}
        <span className="font-medium">4000</span> is declined, and the order stays unpaid.
      </div>
      <div className="grid gap-2">
        <Label htmlFor="card-name">Name on card</Label>
        <Input id="card-name" className={control} value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="card-number">Card number</Label>
        <Input
          id="card-number"
          className={control}
          inputMode="numeric"
          autoComplete="off"
          placeholder="4242 4242 4242 4242"
          value={cardNumber}
          onChange={(event) => setCardNumber(event.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor="expiry">Expiry</Label>
          <Input
            id="expiry"
            className={control}
            placeholder="MM/YY"
            value={expiry}
            onChange={(event) => setExpiry(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="cvc">Security code</Label>
          <Input
            id="cvc"
            className={control}
            placeholder="123"
            value={cvc}
            onChange={(event) => setCvc(event.target.value)}
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
