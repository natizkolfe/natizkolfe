"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageIntro } from "@/components/page-intro";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/client-api";
import { todayISO } from "@/lib/dates";
import { displayStatus, FASTING_LABEL, FULFILLMENT_LABEL, money, statusTone } from "@/lib/format";
import { serviceName } from "@/lib/notices";
import { orderAllergies, orderMatchesQuery, scheduleLabel, specialInstructions } from "@/lib/orders";
import type { OrderNotice, OrderRecord, OrderStatus, PublicSettings } from "@/lib/types";
import { cn } from "cn";

type BoardFilter = "attention" | "new" | "preparing" | "ready" | "deliveries" | "today" | "upcoming";

const OPEN = new Set<OrderStatus>(["confirmed", "preparing", "quality_check", "ready", "out_for_delivery"]);

export function StaffBoard() {
  const [orders, setOrders] = useState<OrderRecord[] | null>(null);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<BoardFilter>("attention");
  const [query, setQuery] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const seen = useRef<Set<string> | null>(null);

  function absorb(next: OrderRecord[]) {
    const fresh = next.flatMap((order) =>
      order.notices.filter((notice) => notice.audience === "staff" && !notice.acknowledgedAt),
    );
    if (seen.current === null) {
      seen.current = new Set(fresh.map((notice) => notice.id));
      return;
    }
    for (const notice of fresh) {
      if (seen.current.has(notice.id)) continue;
      seen.current.add(notice.id);
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification(notice.title, { body: notice.body });
      }
    }
  }

  useEffect(() => {
    if (typeof Notification === "undefined") setPermission("unsupported");
    else setPermission(Notification.permission);
    let ignore = false;
    function load() {
      Promise.all([
        api<{ orders: OrderRecord[] }>("/api/admin/orders"),
        api<{ settings: PublicSettings }>("/api/admin/settings"),
      ])
        .then(([orderData, settingsData]) => {
          if (ignore) return;
          absorb(orderData.orders);
          setOrders(orderData.orders);
          setSettings(settingsData.settings);
        })
        .catch((reason: Error) => {
          if (!ignore) setError(reason.message);
        });
    }
    load();
    const timer = window.setInterval(load, 15000);
    return () => {
      ignore = true;
      window.clearInterval(timer);
    };
  }, []);

  const today = settings ? todayISO(settings.timezone) : "";
  const paid = orders?.filter((order) => order.paidAt && order.status !== "cancelled") ?? [];
  const counts = {
    new: paid.filter((order) => order.status === "confirmed").length,
    preparing: paid.filter((order) => order.status === "preparing" || order.status === "quality_check").length,
    ready: paid.filter((order) => order.status === "ready" || order.status === "out_for_delivery").length,
    deliveries: paid.filter((order) => order.fulfillment === "delivery" && OPEN.has(order.status)).length,
    today: paid.filter((order) => scheduledDay(order) === today && OPEN.has(order.status)).length,
    upcoming: paid.filter((order) => scheduledDay(order) > today && OPEN.has(order.status)).length,
  };

  const alerts = useMemo(() => {
    if (!orders) return [];
    return orders.flatMap((order) =>
      order.notices
        .filter((notice) => notice.audience === "staff" && !notice.acknowledgedAt)
        .map((notice) => ({ order, notice })),
    );
  }, [orders]);

  const visible = useMemo(() => {
    if (!orders) return [];
    const searching = query.trim().length > 0;
    return orders
      .filter((order) => order.paidAt && order.status !== "cancelled")
      .filter((order) => (searching ? orderMatchesQuery(order, query) : matchesFilter(order, filter, today)))
      .sort((a, b) => scheduledDay(a).localeCompare(scheduledDay(b)) || a.number.localeCompare(b.number));
  }, [orders, filter, today, query]);

  const pickupMatch = visible.find((order) => order.fulfillment === "pickup" && order.status === "ready" && query.trim().length > 2);

  return (
    <div>
      <PageIntro
        eyebrow="Staff"
        title="What needs the kitchen"
        lede="Paid orders only. Each card shows who it is for, what to cook, when it leaves, and anything the kitchen must not miss."
      />
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {permission === "granted" ? (
          <p className="text-sm text-gomen">This browser will alert when a new paid order arrives.</p>
        ) : permission === "default" ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 bg-card"
            onClick={async () => {
              const result = await Notification.requestPermission();
              setPermission(result);
            }}
          >
            Alert this phone
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Phone alerts are off for this browser. New orders still show at the top of this board.</p>
        )}
        {settings?.staffPhone ? <p className="text-sm text-muted-foreground">Staff phone {settings.staffPhone}</p> : null}
      </div>
      {alerts.length > 0 ? (
        <ul className="mt-4 grid gap-2">
          {alerts.map(({ order, notice }) => (
            <li key={notice.id}>
              <AlertRow order={order} notice={notice} />
            </li>
          ))}
        </ul>
      ) : null}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Summary label="New orders" value={counts.new} active={filter === "new"} onClick={() => setFilter("new")} />
        <Summary label="Preparing" value={counts.preparing} active={filter === "preparing"} onClick={() => setFilter("preparing")} />
        <Summary label="Ready" value={counts.ready} active={filter === "ready"} onClick={() => setFilter("ready")} />
        <Summary label="Deliveries" value={counts.deliveries} active={filter === "deliveries"} onClick={() => setFilter("deliveries")} />
        <Summary label="Today's orders" value={counts.today} active={filter === "today"} onClick={() => setFilter("today")} />
        <Summary label="Upcoming orders" value={counts.upcoming} active={filter === "upcoming"} onClick={() => setFilter("upcoming")} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" variant={filter === "attention" ? "default" : "outline"} className={cn("h-10", filter === "attention" ? "" : "bg-card")} onClick={() => setFilter("attention")}>
          Needs attention
        </Button>
        <Input
          className="h-11 max-w-md bg-card px-3"
          placeholder="Order ID, customer name, or phone"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>
      {!orders ? (
        <p className="mt-6 text-muted-foreground">Loading the board…</p>
      ) : visible.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border bg-card px-4 py-8 text-sm text-muted-foreground">
          Nothing in this view.
        </p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {visible.map((order) => (
            <li key={order.id}>
              <OrderCard order={order} highlight={pickupMatch?.id === order.id} onChanged={setOrders} />
            </li>
          ))}
        </ul>
      )}
      <FeedbackList orders={orders ?? []} />
    </div>
  );
}

function scheduledDay(order: OrderRecord): string {
  return order.kind === "catering" ? (order.eventDate ?? "") : (order.startDate ?? "");
}

function matchesFilter(order: OrderRecord, filter: BoardFilter, today: string): boolean {
  if (order.status === "cancelled" || order.status === "payment_pending") return false;
  if (filter === "attention") return OPEN.has(order.status);
  if (filter === "new") return order.status === "confirmed";
  if (filter === "preparing") return order.status === "preparing" || order.status === "quality_check";
  if (filter === "ready") return order.status === "ready" || order.status === "out_for_delivery";
  if (filter === "deliveries") return order.fulfillment === "delivery" && OPEN.has(order.status);
  if (filter === "today") return scheduledDay(order) === today && OPEN.has(order.status);
  return scheduledDay(order) > today && OPEN.has(order.status);
}

function Summary({ label, value, active, onClick }: { label: string; value: number; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("rounded-xl border bg-card p-4 text-left", active ? "border-primary" : "border-border")}
    >
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-4xl">{value}</p>
    </button>
  );
}

function AlertRow({ order, notice }: { order: OrderRecord; notice: OrderNotice }) {
  return (
    <Link href={`/admin/orders/${order.id}`} className="block rounded-xl border border-primary/40 bg-primary/5 px-4 py-3">
      <p className="text-sm font-medium">{notice.title}</p>
      <p className="mt-1 whitespace-pre-line text-sm leading-6 text-muted-foreground">{notice.body}</p>
    </Link>
  );
}

function OrderCard({
  order,
  highlight,
  onChanged,
}: {
  order: OrderRecord;
  highlight: boolean;
  onChanged: (orders: OrderRecord[]) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const included = order.lines.filter((line) => line.source !== "addon");
  const addons = order.lines.filter((line) => line.source === "addon");
  const allergies = orderAllergies(order);
  const instructions = specialInstructions(order);
  const updated = order.revisions.some((revision) => !revision.acknowledgedAt);

  async function start() {
    setPending(true);
    setError("");
    try {
      await api(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "preparing", acknowledge: true }),
      });
      const data = await api<{ orders: OrderRecord[] }>("/api/admin/orders");
      onChanged(data.orders);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not start.");
    } finally {
      setPending(false);
    }
  }

  return (
    <article className={cn("rounded-2xl border bg-card p-5", highlight || updated ? "border-primary" : "border-border")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-3xl">
            {order.number} <span className="text-lg text-gomen">PAID</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{scheduleLabel(order)}</p>
        </div>
        <Badge className={cn("border text-sm", statusTone(order.status))}>{displayStatus(order.status, order.fulfillment)}</Badge>
      </div>
      {updated ? <p className="mt-3 text-sm font-medium text-primary">ORDER UPDATED — review what the customer changed.</p> : null}
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <Fact label="Customer" value={order.customerName} />
        <Fact label="Service" value={serviceName(order)} />
        <Fact label="Meal type" value={FASTING_LABEL[order.fastingPreference]} />
        <Fact label="Fulfillment" value={FULFILLMENT_LABEL[order.fulfillment]} />
        {order.guestCount ? <Fact label="Guests" value={String(order.guestCount)} /> : null}
        {order.durationDays ? <Fact label="Package" value={order.durationDays === 14 ? "2 weeks" : "1 week"} /> : null}
      </dl>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-xs tracking-[0.14em] text-primary uppercase">Standard package</p>
          <ul className="mt-2 grid gap-1 text-sm">
            {included.map((line) => (
              <li key={line.lineId}>✓ {line.name}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs tracking-[0.14em] text-primary uppercase">Add-ons</p>
          {addons.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">None</p>
          ) : (
            <ul className="mt-2 grid gap-1 text-sm">
              {addons.map((line) => (
                <li key={line.lineId}>+ {line.name}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {instructions.length > 0 ? (
        <p className="mt-4 text-sm">
          <span className="font-medium">Special instructions. </span>
          {instructions.join(" · ")}
        </p>
      ) : null}
      {allergies.length > 0 ? (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2">
          <p className="text-xs font-medium tracking-[0.14em] text-destructive">ALLERGY ALERT</p>
          <p className="mt-1 font-medium">{allergies.join(", ")}</p>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-2xl">{money(order.total)}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-11 bg-background px-4" render={<Link href={`/admin/orders/${order.id}`} />}>
            View full order
          </Button>
          {order.status === "confirmed" ? (
            <Button type="button" className="h-11 px-4" disabled={pending} onClick={start}>
              {pending ? "Starting…" : "Start preparation"}
            </Button>
          ) : null}
        </div>
      </div>
      {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

function FeedbackList({ orders }: { orders: OrderRecord[] }) {
  const rows = orders.filter((order) => order.feedback).slice(0, 8);
  if (rows.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-2xl">Customer feedback</h2>
      <ul className="mt-3 grid gap-2">
        {rows.map((order) => (
          <li key={order.id} className="rounded-xl border border-border bg-card px-4 py-3 text-sm">
            <p className="font-medium">
              {order.number} · {order.customerName} · {order.feedback?.rating} of 5
            </p>
            {order.feedback?.comment ? <p className="mt-1 text-muted-foreground">{order.feedback.comment}</p> : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
