"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import type { OrderDraft } from "@/lib/types";

export function PromoCodeField({
  draft,
  onChange,
}: {
  draft: OrderDraft;
  onChange: (next: OrderDraft) => void;
}) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const applied = Boolean(draft.promoCode && draft.promoPercent);

  async function apply(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await api<{ code: string; percent: number }>("/api/promo/apply", {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      onChange({ ...draft, promoCode: result.code, promoPercent: result.percent });
      setCode("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This promo code is invalid. Please check the code and try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-4 border-t border-border pt-4">
      <p className="font-medium">Have a Promo Code?</p>
      {applied ? (
        <div className="mt-2">
          <p className="text-sm text-primary">✓ Promo Code Applied — {draft.promoPercent}% Discount</p>
          <p className="mt-1 font-mono text-sm tracking-wide">{draft.promoCode}</p>
          <button
            type="button"
            className="mt-2 text-sm text-muted-foreground underline"
            onClick={() => onChange({ ...draft, promoCode: null, promoPercent: null })}
          >
            Remove
          </button>
        </div>
      ) : (
        <form className="mt-2 flex gap-2" onSubmit={apply}>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Enter Promo Code"
            aria-label="Enter Promo Code"
            className="h-11 bg-background px-3 uppercase"
            autoComplete="off"
            spellCheck={false}
          />
          <Button type="submit" className="h-11 px-4" disabled={pending || !code.trim()}>
            {pending ? "Checking…" : "Apply"}
          </Button>
        </form>
      )}
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
