"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageIntro, Shell } from "@/components/page-intro";
import { PaymentForm } from "@/components/payment-form";
import { useAuth, useDraft } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client-api";
import { money } from "@/lib/format";
import { customerTotal } from "@/lib/orders";
import type { MenuItem, OrderRecord } from "@/lib/types";

export function PayOrder() {
  const router = useRouter();
  const { draft, hydrated, clearDraft } = useDraft();
  const { user, ready } = useAuth();
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ menu: MenuItem[] }>("/api/menu")
      .then((data) => setMenu(data.menu))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  if (!hydrated || !ready) {
    return (
      <Shell>
        <p className="text-muted-foreground">Preparing checkout…</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <PageIntro title="Sign in to pay" lede="The order stays on this browser until you sign in." />
        <Button className="mt-6 h-11 px-4" render={<Link href="/login?next=/order/pay" />}>
          Sign in
        </Button>
      </Shell>
    );
  }

  if (!draft || draft.lines.length === 0) {
    return (
      <Shell>
        <PageIntro title="There is no draft to pay" lede="If you already placed the order, it is waiting under your orders." />
        <Button className="mt-6 h-11 px-4" render={<Link href="/orders" />}>
          Your orders
        </Button>
      </Shell>
    );
  }

  const charge = menu ? customerTotal(menu, draft) : null;

  async function prepare() {
    if (!draft) throw new Error("The draft is missing.");
    const created = await api<{ order: OrderRecord }>("/api/orders", {
      method: "POST",
      body: JSON.stringify(draft),
    });
    clearDraft();
    return created.order.id;
  }

  return (
    <Shell>
      <PageIntro
        eyebrow="Payment"
        title="Pay before the kitchen starts."
        lede="A declined card leaves the order unpaid. It will not be confirmed, cooked, or marked ready."
      />
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,28rem)_minmax(0,1fr)]">
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="mb-4 font-display text-4xl">{charge ? money(charge.total) : "…"}</p>
          {charge?.delivery ? (
            <p className="mb-4 text-sm text-muted-foreground">
              Includes a {money(charge.delivery)} delivery add-on. The order price does not include it.
            </p>
          ) : null}
          <PaymentForm
            payerName={user.name}
            prepare={prepare}
            onPaid={(order) => router.push(`/orders/${order.id}`)}
            onUnpaid={(_message, order) => {
              if (order) router.push(`/orders/${order.id}`);
            }}
          />
          <Button variant="outline" className="mt-3 h-11 w-full bg-background" render={<Link href="/order/review" />}>
            Back to review
          </Button>
        </section>
        <aside className="text-sm leading-7 text-muted-foreground">
          <p>
            After payment the order ID is your verification code. It stays on the confirmation, your order history, and the receipt. Staff ask for it at pickup.
          </p>
        </aside>
      </div>
    </Shell>
  );
}
