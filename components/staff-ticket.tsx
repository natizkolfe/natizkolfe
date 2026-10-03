"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusTimeline } from "@/components/status-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client-api";
import { formatDateLong, formatTime, formatWhen } from "@/lib/dates";
import { displayStatus, FASTING_LABEL, FULFILLMENT_LABEL, money, statusTone } from "@/lib/format";
import { moneyParts, scheduledDate, serviceName } from "@/lib/notices";
import { allowedTransitions, orderAllergies, specialInstructions } from "@/lib/orders";
import type { OrderRecord, OrderStatus, PublicSettings } from "@/lib/types";
import { cn } from "cn";

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  preparing: "Start preparation",
  quality_check: "Send to quality check",
  ready: "Mark order ready",
  out_for_delivery: "Out for delivery",
  completed: "Mark delivered",
  cancelled: "Cancel order",
};

export function StaffTicket({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      api<{ order: OrderRecord }>(`/api/admin/orders/${orderId}`),
      api<{ settings: PublicSettings }>("/api/admin/settings"),
    ])
      .then(([orderData, settingsData]) => {
        if (ignore) return;
        setOrder(orderData.order);
        setNote(orderData.order.kitchenNote);
        setSettings(settingsData.settings);
      })
      .catch((reason: Error) => {
        if (!ignore) setError(reason.message);
      });
    return () => {
      ignore = true;
    };
  }, [orderId]);

  if (error && !order) return <p className="text-sm text-destructive">{error}</p>;
  if (!order || !settings) return <p className="text-muted-foreground">Opening the order…</p>;

  const next = allowedTransitions(order).filter((status) => status !== "picked_up" && status !== "delivered");
  const allergies = orderAllergies(order);
  const instructions = specialInstructions(order);
  const parts = moneyParts(order);
  const included = order.lines.filter((line) => line.source !== "addon");
  const addons = order.lines.filter((line) => line.source === "addon");
  const pendingUpdate = order.revisions.some((revision) => !revision.acknowledgedAt);
  const unreadStaff = order.notices.some((entry) => entry.audience === "staff" && !entry.acknowledgedAt);
  const checksDone = order.checks.length > 0 && order.checks.every((check) => check.done);

  async function patch(body: Record<string, unknown>) {
    setPending(true);
    setError("");
    try {
      const data = await api<{ order: OrderRecord }>(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setOrder(data.order);
      setNote(data.order.kitchenNote);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update.");
    } finally {
      setPending(false);
    }
  }

  async function verify(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const data = await api<{ order: OrderRecord }>(`/api/admin/orders/${orderId}/verify`, {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      setOrder(data.order);
      setCode("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Code did not match.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin" className="text-sm text-primary">
          Back to orders
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-5xl">{order.number}</h1>
          <Badge className={cn("border px-3 py-1 text-sm", statusTone(order.status))}>
            {displayStatus(order.status, order.fulfillment)}
          </Badge>
        </div>
        <p className="mt-2 text-lg">
          {order.customerName} · {serviceName(order)} · {FASTING_LABEL[order.fastingPreference]}
        </p>
      </div>

      {order.status === "payment_pending" ? (
        <p className="rounded-lg border border-amber-700/30 bg-amber-100 px-3 py-2 text-sm text-amber-950">
          Payment has not cleared. Do not prepare this order.
        </p>
      ) : (
        <p className="text-sm font-medium text-gomen">Payment status: PAID</p>
      )}

      {allergies.length > 0 ? (
        <section className="rounded-xl border-2 border-destructive bg-destructive/10 px-4 py-3">
          <p className="text-sm font-medium tracking-[0.16em] text-destructive">ALLERGY ALERT</p>
          <p className="mt-1 text-lg font-medium">{allergies.join(", ")}</p>
          <p className="mt-1 text-sm">Keep this separate from the regular notes. Do not hide it in the kitchen ticket.</p>
        </section>
      ) : null}

      {unreadStaff && !pendingUpdate ? (
        <Button type="button" variant="outline" className="h-11 w-fit bg-card" disabled={pending} onClick={() => patch({ acknowledge: true })}>
          Acknowledge new order
        </Button>
      ) : null}

      {pendingUpdate ? (
        <section className="rounded-xl border border-primary bg-primary/5 px-4 py-3">
          <p className="font-medium">ORDER UPDATED — {order.number}</p>
          <p className="mt-1 text-sm">Customer modified this order.</p>
          <ul className="mt-2 grid gap-1 text-sm">
            {order.revisions
              .filter((revision) => !revision.acknowledgedAt)
              .flatMap((revision) => revision.summary)
              .map((line) => (
                <li key={line}>Changed: {line}</li>
              ))}
          </ul>
          <Button type="button" className="mt-3 h-11" disabled={pending} onClick={() => patch({ acknowledge: true })}>
            I have reviewed this update
          </Button>
        </section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-4">
          <Section title="Customer">
            <Fact label="Name" value={order.customerName} />
            <Fact label="Phone" value={order.customerPhone} />
            <Fact label="Email" value={order.customerEmail} />
          </Section>
          <Section title="Order">
            <Fact label="Order ID / verification code" value={order.verificationCode ?? order.number} />
            <Fact label="Order date" value={formatWhen(order.createdAt)} />
            <Fact label="Scheduled" value={scheduleValue(order)} />
            <Fact label="Service" value={serviceName(order)} />
            <Fact label="Meal type" value={FASTING_LABEL[order.fastingPreference]} />
            <Fact label="Length" value={order.kind === "catering" ? "Catering" : order.durationDays === 14 ? "2 weeks" : "1 week"} />
            {order.guestCount ? <Fact label="Guests" value={String(order.guestCount)} /> : null}
          </Section>
          <Section title="Food preparation">
            <p className="text-xs tracking-[0.14em] text-primary uppercase">Standard meals</p>
            <ul className="mt-2 grid gap-3">
              {included.map((line) => (
                <li key={line.lineId}>
                  <p className="font-medium">
                    {line.quantity} × {line.name}
                  </p>
                  <PrepNotes line={line.summary} />
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs tracking-[0.14em] text-primary uppercase">Add-ons</p>
            {addons.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">None</p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {addons.map((line) => (
                  <li key={line.lineId}>
                    <p className="font-medium">
                      {line.quantity} × {line.name}
                    </p>
                    <PrepNotes line={line.summary} />
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-sm">
              Container: {order.kind === "weekly" ? (order.durationDays === 14 ? "2 week meal package" : "1 week meal package") : "Catering service"}
            </p>
            {instructions.length > 0 ? (
              <div className="mt-4">
                <p className="text-xs tracking-[0.14em] text-primary uppercase">Special instructions</p>
                <ul className="mt-2 grid gap-1 text-sm">
                  {instructions.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </Section>
          <Section title="Payment">
            <Fact label="Payment status" value={order.paidAt ? "PAID" : "UNPAID"} />
            <Fact label="Food package" value={money(parts.food)} />
            <Fact label="Add-ons" value={money(parts.addons)} />
            <Fact label="Delivery fee" value={money(parts.delivery)} />
            <Fact label="Total paid" value={money(order.total)} />
            {order.paymentLast4 ? <Fact label="Card" value={`Ending ${order.paymentLast4}`} /> : null}
          </Section>
          <Section title="Fulfillment">
            <Fact label="Method" value={FULFILLMENT_LABEL[order.fulfillment]} />
            {order.fulfillment === "pickup" ? (
              <>
                <Fact label="Pickup location" value={settings.pickupAddress} />
                <Fact label="Instructions" value={settings.pickupInstructions} />
              </>
            ) : (
              <>
                <Fact label="Delivery address" value={order.address} />
                <Fact label="Delivery instructions" value={settings.deliveryNote} />
                <Fact label="Distance" value={order.deliveryMiles != null ? `${order.deliveryMiles} miles` : "Not calculated"} />
                <Fact label="Delivery fee" value={money(order.deliveryFee ?? 0)} />
              </>
            )}
            {order.completedAt ? <Fact label="Completed" value={formatWhen(order.completedAt)} /> : null}
          </Section>
          {order.feedback ? (
            <Section title="Feedback">
              <Fact label="Rating" value={`${order.feedback.rating} of 5`} />
              <Fact label="Comment" value={order.feedback.comment || "No written comment"} />
            </Section>
          ) : null}
        </div>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-24">
          <section className="rounded-xl border border-border bg-card p-4">
            <h2 className="font-display text-2xl">Preparation checklist</h2>
            <p className="mt-1 text-sm text-muted-foreground">{order.number}</p>
            {order.checks.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">The checklist appears once the order is paid.</p>
            ) : (
              <ul className="mt-3 grid gap-2">
                {order.checks.map((check) => (
                  <li key={check.id}>
                    <button
                      type="button"
                      disabled={pending || !["confirmed", "preparing", "quality_check"].includes(order.status)}
                      onClick={() => patch({ checkId: check.id, done: !check.done })}
                      className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-left text-base"
                    >
                      <span className={cn("grid size-6 shrink-0 place-items-center rounded border", check.done ? "border-primary bg-primary text-primary-foreground" : "border-border")}>
                        {check.done ? "✓" : ""}
                      </span>
                      <span className={check.done ? "text-muted-foreground line-through" : "font-medium"}>{check.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {order.status === "quality_check" && !checksDone ? (
              <p className="mt-3 text-sm text-muted-foreground">Check every item, including the quality check, before the order can be marked ready.</p>
            ) : null}
            <div className="mt-4 grid gap-2">
              {next.map((status) => (
                <Button
                  key={status}
                  type="button"
                  className="h-12 text-base"
                  disabled={pending || (status === "ready" && !checksDone)}
                  onClick={() => patch({ status, kitchenNote: note })}
                >
                  {NEXT_LABEL[status] ?? displayStatus(status, order.fulfillment)}
                </Button>
              ))}
            </div>
            {order.status === "ready" && order.fulfillment === "pickup" ? (
              <form className="mt-4 grid gap-2 border-t border-border pt-4" onSubmit={verify}>
                <Label htmlFor="code">Pickup verification</Label>
                <p className="text-sm text-muted-foreground">Ask for {order.number}, or search by the customer name and phone on the board.</p>
                <Input id="code" className="h-12 bg-background px-3 text-lg tracking-wide" value={code} onChange={(event) => setCode(event.target.value)} placeholder={order.number} />
                <Button type="submit" className="h-12 text-base" disabled={pending}>
                  Confirm pickup
                </Button>
              </form>
            ) : null}
            {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          </section>
          <section className="rounded-xl border border-border bg-card p-4">
            <Label htmlFor="kitchen-note">Kitchen note</Label>
            <Textarea id="kitchen-note" className="mt-2" value={note} onChange={(event) => setNote(event.target.value)} />
            <Button type="button" variant="outline" className="mt-2 h-10 bg-background" disabled={pending} onClick={() => patch({ kitchenNote: note })}>
              Save note
            </Button>
          </section>
          <section className="rounded-xl border border-border bg-card p-4">
            <StatusTimeline history={order.statusHistory} fulfillment={order.fulfillment} status={order.status} />
          </section>
        </aside>
      </div>
    </div>
  );
}

function scheduleValue(order: OrderRecord): string {
  const date = formatDateLong(scheduledDate(order));
  if (order.kind === "catering" && order.eventTime) return `${date} at ${formatTime(order.eventTime)}`;
  return date;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-border pt-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-base">{value}</p>
    </div>
  );
}

function PrepNotes({ line }: { line: string[] }) {
  if (line.length === 0) return <p className="text-sm text-muted-foreground">Standard preparation.</p>;
  return (
    <ul className="mt-1 grid gap-1 text-sm">
      {line.map((entry) => (
        <li key={entry} className={entry.startsWith("Allergies") ? "font-medium text-destructive" : "text-muted-foreground"}>
          {entry}
        </li>
      ))}
    </ul>
  );
}
