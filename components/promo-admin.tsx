"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PageIntro } from "@/components/page-intro";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client-api";
import type { PromoCode, PromoStatus } from "@/lib/types";

const STATUS_LABEL: Record<PromoStatus, string> = {
  available: "Available",
  used: "Used",
  disabled: "Disabled",
};

function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(iso));
}

export function PromoAdmin() {
  const [codes, setCodes] = useState<PromoCode[] | null>(null);
  const [error, setError] = useState("");
  const [forName, setForName] = useState("");
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [created, setCreated] = useState<PromoCode | null>(null);

  function load() {
    return api<{ promoCodes: PromoCode[] }>("/api/admin/promo")
      .then((data) => setCodes(data.promoCodes))
      .catch((reason: Error) => setError(reason.message));
  }

  useEffect(() => {
    void load();
  }, []);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const result = await api<{ promo: PromoCode }>("/api/admin/promo", {
        method: "POST",
        body: JSON.stringify({ forName, note }),
      });
      setCreated(result.promo);
      setForName("");
      setNote("");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The promo code could not be created.");
    } finally {
      setPending(false);
    }
  }

  async function disable(id: string) {
    setError("");
    try {
      await api(`/api/admin/promo/${id}`, { method: "POST", body: JSON.stringify({ action: "disable" }) });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The promo code could not be disabled.");
    }
  }

  if (!codes) return <p className="text-muted-foreground">{error || "Loading promo codes…"}</p>;

  return (
    <div>
      <PageIntro
        title="Promo codes"
        lede="Generate a one-time 5% code and give it to someone yourself. Codes are not shown on the public site."
      />
      <form className="mt-6 grid max-w-xl gap-3 rounded-xl border border-border bg-card p-5" onSubmit={generate}>
        <div className="grid gap-2">
          <Label htmlFor="promo-for">Customer/Friend Name</Label>
          <Input
            id="promo-for"
            className="h-11 bg-background px-3"
            value={forName}
            placeholder="Optional"
            onChange={(event) => setForName(event.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="promo-note">Internal Note</Label>
          <Textarea
            id="promo-note"
            className="min-h-20 bg-background px-3 py-2"
            value={note}
            placeholder="Optional"
            onChange={(event) => setNote(event.target.value)}
          />
        </div>
        <Button type="submit" className="h-11 w-fit px-4" disabled={pending}>
          {pending ? "Generating…" : "+ Generate Promo Code"}
        </Button>
        {created ? (
          <div className="rounded-lg border border-border bg-background p-4 text-sm">
            <p>
              Promo Code: <span className="font-mono text-base tracking-wide">{created.code}</span>
            </p>
            {created.forName ? <p className="mt-1">For: {created.forName}</p> : null}
            {created.note ? <p className="mt-1">Note: {created.note}</p> : null}
          </div>
        ) : null}
      </form>
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      {codes.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No promo codes yet.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="py-2 pr-3 font-medium">Promo Code</th>
                <th className="py-2 pr-3 font-medium">Discount</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 pr-3 font-medium">Used By</th>
                <th className="py-2 pr-3 font-medium">Order</th>
                <th className="py-2 pr-3 font-medium">Created</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {codes.map((promo) => (
                <tr key={promo.id} className="border-t border-border align-top">
                  <td className="py-3 pr-3">
                    <p className="font-mono tracking-wide">{promo.code}</p>
                    {promo.forName ? <p className="mt-1 text-muted-foreground">For: {promo.forName}</p> : null}
                    {promo.note ? <p className="text-muted-foreground">Note: {promo.note}</p> : null}
                  </td>
                  <td className="py-3 pr-3 tabular-nums">{promo.discountPercent}%</td>
                  <td className="py-3 pr-3">{STATUS_LABEL[promo.status]}</td>
                  <td className="py-3 pr-3">
                    {promo.usedByName ? (
                      <>
                        <p>{promo.usedByName}</p>
                        <p className="text-muted-foreground">{shortDate(promo.usedAt)}</p>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 pr-3">
                    {promo.orderId && promo.orderNumber ? (
                      <Link href={`/admin/orders/${promo.orderId}`} className="underline">
                        {promo.orderNumber}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="py-3 pr-3">{shortDate(promo.createdAt)}</td>
                  <td className="py-3 text-right">
                    {promo.status === "available" ? (
                      <Button type="button" variant="outline" className="h-9 bg-background" onClick={() => disable(promo.id)}>
                        Disable
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
