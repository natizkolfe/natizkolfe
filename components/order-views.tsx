"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaymentForm } from "@/components/payment-form";
import { PageIntro, Shell } from "@/components/page-intro";
import { useAuth } from "@/components/providers";
import { StatusTimeline } from "@/components/status-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/client-api";
import { formatTime, formatWhen } from "@/lib/dates";
import { displayStatus, FULFILLMENT_LABEL, KIND_LABEL, money, statusTone } from "@/lib/format";
import { formatDeadline, instructionsFor, modificationWindow, orderHeadline, placeLabel, scheduleLabel } from "@/lib/orders";
import type { OrderRecord, PublicSettings } from "@/lib/types";
import { cn } from "cn";

export function OrdersList() {
  const { user, ready } = useAuth();
  const [orders, setOrders] = useState<OrderRecord[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready || !user) return;
    api<{ orders: OrderRecord[] }>("/api/orders")
      .then((data) => setOrders(data.orders))
      .catch((reason: Error) => setError(reason.message));
  }, [ready, user]);

  if (!ready) {
    return (
      <Shell>
        <p className="text-muted-foreground">Looking up your account…</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <PageIntro title="Sign in to see orders" lede="Receipts, status changes, and pickup codes stay with your account." />
        <Button className="mt-6 h-11 px-4" render={<Link href="/login?next=/orders" />}>
          Sign in
        </Button>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageIntro
        eyebrow="Orders"
        title={`Orders for ${user.name.split(" ")[0]}`}
        lede="Unpaid orders stay out of the kitchen. Paid orders move from confirmed, to preparing, to ready."
      />
      {error ? <p className="mt-6 text-sm text-destructive">{error}</p> : null}
      {!orders ? (
        <p className="mt-6 text-muted-foreground">Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-card px-5 py-10">
          <p className="font-display text-3xl">No orders yet.</p>
          <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
            A weekly plan or a catering table can be placed a week ahead. You will get a text when it is ready to collect.
          </p>
          <Button className="mt-5 h-11 px-4" render={<Link href="/order" />}>
            Start an order
          </Button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link href={`/orders/${order.id}`} className="block rounded-xl border border-border bg-card p-4 hover:border-primary/40">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-2xl">{order.number}</p>
                    <p className="text-sm text-muted-foreground">
                      {orderHeadline(order)} · {scheduleLabel(order)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge className={cn("border", statusTone(order.status))}>{displayStatus(order.status, order.fulfillment)}</Badge>
                    <p className="mt-2 text-sm tabular-nums">{money(order.total)}</p>
                  </div>
                </div>
                {order.status === "ready" ? (
                  <p className="mt-3 text-sm text-gomen">Ready. Your verification code is on the order.</p>
                ) : null}
                {order.status === "payment_pending" ? (
                  <p className="mt-3 text-sm text-amber-900">Payment is still open. This order is not confirmed.</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Shell>
  );
}

export function OrderDetail({ orderId }: { orderId: string }) {
  const { user, ready } = useAuth();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [feedbackPending, setFeedbackPending] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    let ignore = false;
    Promise.all([
      api<{ order: OrderRecord }>(`/api/orders/${orderId}`),
      api<{ settings: PublicSettings }>("/api/settings"),
    ])
      .then(([orderData, settingsData]) => {
        if (ignore) return;
        setOrder(orderData.order);
        setSettings(settingsData.settings);
      })
      .catch((reason: Error) => {
        if (!ignore) setError(reason.message);
      });
    return () => {
      ignore = true;
    };
  }, [ready, user, orderId]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      api<{ order: OrderRecord }>(`/api/orders/${orderId}`)
        .then((data) => {
          setOrder((current) => {
            if (!current || !["confirmed", "preparing", "quality_check", "ready", "out_for_delivery"].includes(current.status)) return current;
            return data.order;
          });
        })
        .catch(() => undefined);
    }, 15000);
    return () => window.clearInterval(timer);
  }, [orderId]);

  if (!ready) {
    return (
      <Shell>
        <p className="text-muted-foreground">Looking up your account…</p>
      </Shell>
    );
  }

  if (!user) {
    return (
      <Shell>
        <PageIntro title="Sign in to open this order" />
        <Button className="mt-6 h-11 px-4" render={<Link href={`/login?next=/orders/${orderId}`} />}>
          Sign in
        </Button>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <PageIntro title="This order is not available" lede={error} />
        <Button className="mt-6 h-11 px-4" render={<Link href="/orders" />}>
          All orders
        </Button>
      </Shell>
    );
  }

  if (!order || !settings) {
    return (
      <Shell>
        <p className="text-muted-foreground">Loading the order…</p>
      </Shell>
    );
  }

  async function cancel() {
    if (!order) return;
    const warning =
      order.status === "confirmed"
        ? "Cancel this paid order? The demo does not refund the card. The kitchen will not prepare it."
        : "Leave this order unpaid and cancel it?";
    if (!window.confirm(warning)) return;
    setCancelling(true);
    try {
      const data = await api<{ order: OrderRecord }>(`/api/orders/${order.id}/cancel`, { method: "POST" });
      setOrder(data.order);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not cancel.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageIntro
          eyebrow={order.number}
          title={order.status === "payment_pending" ? "Payment is still open." : "Your order is in the book."}
          lede={orderHeadline(order)}
        />
        <Badge className={cn("border", statusTone(order.status))}>{displayStatus(order.status, order.fulfillment)}</Badge>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid gap-4">
          {order.paidAt && order.verificationCode ? (
            <section className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs tracking-[0.16em] text-primary uppercase">Order ID / verification code</p>
              <p className="mt-2 font-display text-5xl">{order.verificationCode}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Give this code to staff when you pick up the order. It is also on your confirmation.
              </p>
            </section>
          ) : null}
          {order.notices.map((notice) => (
            <section key={notice.id} className="rounded-xl border border-border bg-card p-5">
              <p className="text-xs tracking-[0.16em] text-primary uppercase">{notice.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {notice.kind === "customer_confirmation" ? order.customerEmail : order.customerPhone} · {formatWhen(notice.at)}
              </p>
              <div className="mt-4 whitespace-pre-line text-sm leading-6">{notice.body}</div>
              {notice.kind === "thank_you" && !order.feedback ? (
                <form
                  className="mt-4 grid gap-3"
                  onSubmit={async (event) => {
                    event.preventDefault();
                    setFeedbackPending(true);
                    setError("");
                    try {
                      const data = await api<{ order: OrderRecord }>(`/api/orders/${order.id}/feedback`, {
                        method: "POST",
                        body: JSON.stringify({ rating, comment }),
                      });
                      setOrder(data.order);
                    } catch (reason) {
                      setError(reason instanceof Error ? reason.message : "Could not save feedback.");
                    } finally {
                      setFeedbackPending(false);
                    }
                  }}
                >
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={cn("text-2xl", star <= rating ? "text-primary" : "text-muted-foreground")}
                        onClick={() => setRating(star)}
                        aria-label={`${star} star${star === 1 ? "" : "s"}`}
                      >
                        {star <= rating ? "★" : "☆"}
                      </button>
                    ))}
                  </div>
                  <label className="grid gap-1 text-sm">
                    Comment, optional
                    <textarea
                      className="min-h-24 rounded-md border border-border bg-background px-3 py-2"
                      value={comment}
                      onChange={(event) => setComment(event.target.value)}
                    />
                  </label>
                  <Button type="submit" className="h-11 w-fit px-4" disabled={feedbackPending || rating < 1}>
                    {feedbackPending ? "Sending…" : "Leave feedback"}
                  </Button>
                </form>
              ) : null}
              {notice.kind === "thank_you" && order.feedback ? (
                <p className="mt-3 text-sm">You rated this order {order.feedback.rating} of 5.</p>
              ) : null}
            </section>
          ))}

          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-2xl">What was ordered</h2>
            <ul className="mt-4 grid gap-4">
              {order.lines.map((line) => (
                <li key={line.lineId} className="border-t border-border pt-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        {line.quantity} × {line.name} <span className="text-muted-foreground">{line.amharic}</span>
                      </p>
                      {order.kind === "weekly" ? (
                        <p className="text-sm text-muted-foreground">
                          {line.quantity} × {order.durationDays === 14 ? "28 oz Square" : "24 oz Round"}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-sm tabular-nums">{money(line.total)}</p>
                  </div>
                  <ul className="mt-2 grid gap-1 text-sm text-muted-foreground">
                    {line.summary.length ? line.summary.map((entry) => <li key={entry}>{entry}</li>) : <li>Standard preparation.</li>}
                  </ul>
                </li>
              ))}
            </ul>
            {typeof order.deliveryFee === "number" ? (
              <div className="mt-4 border-t border-border pt-4">
                <div className="flex justify-between gap-3">
                  <p className="font-medium">Delivery</p>
                  <p className="text-sm tabular-nums">{money(order.deliveryFee)}</p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{order.address}</p>
                <p className="mt-1 text-sm tabular-nums">
                  {order.deliveryMiles} miles × {money(order.deliveryRate ?? 0)} = {money(order.deliveryFee)}
                </p>
              </div>
            ) : null}
          </section>

          {order.status === "payment_pending" ? (
            <section className="rounded-xl border border-amber-700/30 bg-card p-5">
              <h2 className="font-display text-2xl">This order is unpaid</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                It is not confirmed and it will not be prepared. Pay to move it into the kitchen, or cancel it.
              </p>
              {order.attempts.filter((attempt) => !attempt.success).slice(-1).map((attempt) => (
                <p key={attempt.at} className="mt-3 text-sm text-destructive">
                  {attempt.message}
                </p>
              ))}
              <div className="mt-4">
                <PaymentForm
                  orderId={order.id}
                  payerName={user.name}
                  onPaid={(next) => setOrder(next)}
                  onUnpaid={(_message, next) => {
                    if (next) setOrder(next);
                  }}
                />
              </div>
            </section>
          ) : null}
        </div>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-24">
          <section className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Total {order.paidAt ? "paid" : "due"}</p>
            <p className="font-display text-4xl">{money(order.total)}</p>
            <dl className="mt-4 grid gap-2 text-sm">
              <Row label="Placed" value={formatWhen(order.createdAt)} />
              <Row label="Type" value={KIND_LABEL[order.kind]} />
              <Row label="When" value={scheduleLabel(order)} />
              {order.kind === "catering" && order.eventTime ? <Row label="Time" value={formatTime(order.eventTime)} /> : null}
              <Row label={FULFILLMENT_LABEL[order.fulfillment]} value={placeLabel(order, settings)} />
              <Row label="Instructions" value={instructionsFor(order, settings)} />
              {order.paymentLast4 ? <Row label="Card" value={`Ending ${order.paymentLast4}`} /> : null}
              {order.paidAt ? <Row label="Paid" value={formatWhen(order.paidAt)} /> : null}
            </dl>
            {order.paidAt ? <ModifyBlock order={order} settings={settings} /> : null}
            {(order.status === "payment_pending" || order.status === "confirmed") && (
              <Button variant="outline" className="mt-4 h-10 w-full bg-background" disabled={cancelling} onClick={cancel}>
                {cancelling ? "Cancelling…" : "Cancel order"}
              </Button>
            )}
          </section>
          <section className="rounded-xl border border-border bg-card p-5">
            <StatusTimeline history={order.statusHistory} fulfillment={order.fulfillment} status={order.status} />
          </section>
        </aside>
      </div>
    </Shell>
  );
}

function ModifyBlock({ order, settings }: { order: OrderRecord; settings: PublicSettings }) {
  const window = modificationWindow(order, settings);
  if (!window.open && window.reason === "time") {
    return (
      <div className="mt-4 rounded-lg border border-border bg-background px-3 py-3">
        <p className="font-medium">Order Modification Period Closed</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This order is scheduled within the next 24 hours. Online modifications are no longer available.
        </p>
      </div>
    );
  }
  if (!window.open) return null;
  return (
    <div className="mt-4">
      <p className="text-sm text-muted-foreground">Changes are open until {formatDeadline(window.deadline)}.</p>
      <Button className="mt-2 h-10 w-full" render={<Link href={`/orders/${order.id}/modify`} />}>
        Modify order
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-t border-border pt-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
