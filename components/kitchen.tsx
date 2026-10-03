"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageIntro, Shell } from "@/components/page-intro";
import { useAuth } from "@/components/providers";
import { StatusTimeline } from "@/components/status-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client-api";
import { formatWhen } from "@/lib/dates";
import { money, STATUS_LABEL, statusTone } from "@/lib/format";
import { allowedTransitions, orderHeadline, scheduleLabel } from "@/lib/orders";
import type { MenuItem, OrderRecord, OrderStatus, PublicSettings, PublicUser } from "@/lib/types";
import { cn } from "cn";

const NAV = [
  { href: "/admin", label: "Board" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/settings", label: "Capacity" },
  { href: "/admin/customers", label: "Customers" },
];

export function KitchenFrame({ children }: { children: React.ReactNode }) {
  const { staff, ready, refresh } = useAuth();
  const pathname = usePathname();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  if (!ready) {
    return (
      <Shell>
        <p className="text-muted-foreground">Checking the kitchen door…</p>
      </Shell>
    );
  }

  if (!staff) {
    return (
      <Shell className="max-w-md">
        <PageIntro
          eyebrow="Staff"
          title="Kitchen entrance"
          lede="Orders, the menu, and pickup codes live here. Customers never see this door from the payment screen."
        />
        <form
          className="mt-6 grid gap-3 rounded-xl border border-border bg-card p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setPending(true);
            setError("");
            try {
              await api("/api/admin/login", { method: "POST", body: JSON.stringify({ password }) });
              await refresh();
            } catch (reason) {
              setError(reason instanceof Error ? reason.message : "Could not enter.");
            } finally {
              setPending(false);
            }
          }}
        >
          <Label htmlFor="staff-password">Kitchen password</Label>
          <Input
            id="staff-password"
            type="password"
            className="h-11 bg-background px-3"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-11" disabled={pending}>
            {pending ? "Checking…" : "Enter"}
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            The demo password is <span className="font-medium text-foreground">gebeta-staff</span> unless the server was given another one.
          </p>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-3xl">Kitchen</p>
        <Button
          variant="outline"
          className="h-9 bg-card"
          onClick={async () => {
            await api("/api/admin/logout", { method: "POST" });
            await refresh();
          }}
        >
          Lock the kitchen
        </Button>
      </div>
      <div className="grid gap-8 md:grid-cols-[11rem_minmax(0,1fr)]">
        <nav className="flex gap-2 overflow-x-auto md:grid md:h-fit">
          {NAV.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm",
                pathname === link.href ? "bg-primary text-primary-foreground" : "bg-card text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div>{children}</div>
      </div>
    </Shell>
  );
}

export function KitchenBoard() {
  const [orders, setOrders] = useState<OrderRecord[] | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"active" | OrderStatus | "all">("active");

  useEffect(() => {
    api<{ orders: OrderRecord[] }>("/api/admin/orders")
      .then((data) => setOrders(data.orders))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const visible = useMemo(() => {
    if (!orders) return [];
    if (filter === "all") return orders;
    if (filter === "active") {
      return orders.filter((order) => !["completed", "cancelled"].includes(order.status));
    }
    return orders.filter((order) => order.status === filter);
  }, [orders, filter]);

  const counts = {
    payment_pending: orders?.filter((order) => order.status === "payment_pending").length ?? 0,
    confirmed: orders?.filter((order) => order.status === "confirmed").length ?? 0,
    preparing: orders?.filter((order) => order.status === "preparing").length ?? 0,
    ready: orders?.filter((order) => order.status === "ready").length ?? 0,
  };

  return (
    <div>
      <PageIntro
        title="Prep board"
        lede="Unpaid orders stay out of the cooking queue. Move a paid order only one step at a time, and take the verification code at the door."
      />
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(
          [
            ["payment_pending", "Unpaid"],
            ["confirmed", "Confirmed"],
            ["preparing", "Preparing"],
            ["ready", "Ready"],
          ] as const
        ).map(([status, label]) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilter(status)}
            className="rounded-xl border border-border bg-card p-4 text-left"
          >
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="font-display text-3xl">{counts[status]}</p>
          </button>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <FilterChip current={filter} id="active" label="Open" onClick={setFilter} />
        <FilterChip current={filter} id="all" label="Everything" onClick={setFilter} />
      </div>
      {!orders ? (
        <p className="mt-6 text-muted-foreground">Loading the book…</p>
      ) : visible.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border bg-card px-4 py-8 text-sm text-muted-foreground">
          The kitchen is clear.
        </p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {visible.map((order) => (
            <li key={order.id}>
              <Link href={`/admin/orders/${order.id}`} className="grid gap-2 rounded-xl border border-border bg-card p-4 sm:grid-cols-[8rem_1fr_auto] sm:items-center">
                <span className="font-medium">{order.number}</span>
                <span>
                  <span className="block">{order.customerName}</span>
                  <span className="text-sm text-muted-foreground">
                    {orderHeadline(order)} · {scheduleLabel(order)}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <Badge className={cn("border", statusTone(order.status))}>{STATUS_LABEL[order.status]}</Badge>
                  <span className="text-sm tabular-nums">{money(order.total)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterChip({
  current,
  id,
  label,
  onClick,
}: {
  current: string;
  id: "active" | "all";
  label: string;
  onClick: (id: "active" | "all") => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm",
        current === id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
      )}
    >
      {label}
    </button>
  );
}

const NEXT_LABEL: Partial<Record<OrderStatus, string>> = {
  preparing: "Start preparing",
  ready: "Mark ready and send the text",
  completed: "Close the order",
  cancelled: "Cancel",
};

export function KitchenTicket({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [note, setNote] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let ignore = false;
    api<{ order: OrderRecord }>(`/api/admin/orders/${orderId}`)
      .then((data) => {
        if (ignore) return;
        setOrder(data.order);
        setNote(data.order.kitchenNote);
      })
      .catch((reason: Error) => {
        if (!ignore) setError(reason.message);
      });
    return () => {
      ignore = true;
    };
  }, [orderId]);

  if (error && !order) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!order) return <p className="text-muted-foreground">Opening the ticket…</p>;

  const next = allowedTransitions(order).filter((status) => status !== "picked_up" && status !== "delivered");

  async function act(status?: OrderStatus) {
    setPending(true);
    setError("");
    try {
      const data = await api<{ order: OrderRecord }>(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        body: JSON.stringify({ kitchenNote: note, status }),
      });
      setOrder(data.order);
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
          Back to the board
        </Link>
        <h1 className="mt-2 font-display text-4xl">{order.number}</h1>
        <p className="mt-1 text-muted-foreground">
          {order.customerName} · {order.customerPhone} · {orderHeadline(order)}
        </p>
      </div>
      {order.status === "payment_pending" ? (
        <p className="rounded-lg border border-amber-700/30 bg-amber-100 px-3 py-2 text-sm text-amber-950">
          Payment has not cleared. Do not confirm or prepare this order.
        </p>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-3">
          {order.lines.map((line) => (
            <article key={line.lineId} className="rounded-xl border border-border bg-card p-4">
              <p className="font-medium">
                {line.quantity} × {line.name}
              </p>
              {order.kind === "weekly" && line.dayIndex != null ? (
                <p className="text-sm capitalize text-muted-foreground">
                  Day {line.dayIndex + 1} · {line.mealSlot}
                </p>
              ) : null}
              <ul className="mt-2 grid gap-1 text-sm">
                {line.summary.map((entry) => (
                  <li key={entry} className={entry.startsWith("Allergies") ? "font-medium text-primary" : ""}>
                    {entry}
                  </li>
                ))}
                {line.summary.length === 0 ? <li className="text-muted-foreground">Standard preparation.</li> : null}
              </ul>
            </article>
          ))}
          <div className="grid gap-2">
            <Label htmlFor="kitchen-note">Kitchen note</Label>
            <Textarea id="kitchen-note" value={note} onChange={(event) => setNote(event.target.value)} />
            <Button type="button" variant="outline" className="h-10 w-fit bg-card" disabled={pending} onClick={() => act()}>
              Save note
            </Button>
          </div>
        </div>
        <aside className="grid h-fit gap-4">
          <section className="rounded-xl border border-border bg-card p-4">
            <Badge className={cn("border", statusTone(order.status))}>{STATUS_LABEL[order.status]}</Badge>
            <p className="mt-3 text-sm">{scheduleLabel(order)}</p>
            <p className="text-sm text-muted-foreground">{money(order.total)} {order.paidAt ? "paid" : "unpaid"}</p>
            {typeof order.deliveryFee === "number" ? (
              <p className="mt-2 text-sm">
                Delivery {money(order.deliveryFee)} · {order.deliveryMiles} miles · {order.address}
              </p>
            ) : null}
            {order.verificationCode && order.paidAt ? (
              <p className="mt-3 text-sm">
                Code on file: <span className="font-medium tracking-widest">{order.verificationCode}</span>
              </p>
            ) : null}
            {order.smsBody ? <p className="mt-3 text-sm leading-6 text-muted-foreground">{order.smsBody}</p> : null}
            <div className="mt-4 grid gap-2">
              {next.map((status) => (
                <Button key={status} type="button" className="h-10" disabled={pending} onClick={() => act(status)}>
                  {NEXT_LABEL[status] ?? STATUS_LABEL[status]}
                </Button>
              ))}
            </div>
            {order.status === "ready" ? (
              <form className="mt-4 grid gap-2 border-t border-border pt-4" onSubmit={verify}>
                <Label htmlFor="code">Verification code</Label>
                <Input id="code" className="h-11 bg-background px-3 tracking-widest" value={code} onChange={(event) => setCode(event.target.value)} />
                <Button type="submit" className="h-10" disabled={pending}>
                  {order.fulfillment === "pickup" ? "Verify pickup" : "Verify delivery"}
                </Button>
              </form>
            ) : null}
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </section>
          <section className="rounded-xl border border-border bg-card p-4">
            <StatusTimeline history={order.statusHistory} fulfillment={order.fulfillment} status={order.status} />
          </section>
        </aside>
      </div>
    </div>
  );
}

export function KitchenMenu() {
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api<{ menu: MenuItem[] }>("/api/menu")
      .then((data) => setMenu(data.menu))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  async function save(item: MenuItem) {
    setError("");
    setMessage("");
    try {
      const data = await api<{ item: MenuItem }>(`/api/admin/menu/${item.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: item.name,
          description: item.description,
          price: Number(item.price),
          available: item.available,
        }),
      });
      setMenu((current) => current?.map((entry) => (entry.id === data.item.id ? data.item : entry)) ?? null);
      setMessage(`${data.item.name} saved.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save.");
    }
  }

  if (!menu) return <p className="text-muted-foreground">{error || "Loading the menu…"}</p>;

  return (
    <div>
      <PageIntro title="Menu and prices" lede="Unavailable dishes disappear from new orders. Orders already placed keep the price they were paid at." />
      {message ? <p className="mt-4 text-sm text-gomen">{message}</p> : null}
      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      <div className="mt-6 grid gap-3">
        {menu.map((item) => (
          <form
            key={item.id}
            className="grid gap-3 rounded-xl border border-border bg-card p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void save(item);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem_auto]">
              <Input
                className="h-10 bg-background px-3"
                value={item.name}
                onChange={(event) =>
                  setMenu((current) =>
                    current?.map((entry) => (entry.id === item.id ? { ...entry, name: event.target.value } : entry)) ?? null,
                  )
                }
              />
              <Input
                className="h-10 bg-background px-3"
                type="number"
                min={0}
                step="0.01"
                value={item.price}
                onChange={(event) =>
                  setMenu((current) =>
                    current?.map((entry) =>
                      entry.id === item.id ? { ...entry, price: Number(event.target.value) } : entry,
                    ) ?? null,
                  )
                }
              />
              <Button type="submit" className="h-10">
                Save
              </Button>
            </div>
            <Textarea
              value={item.description}
              onChange={(event) =>
                setMenu((current) =>
                  current?.map((entry) => (entry.id === item.id ? { ...entry, description: event.target.value } : entry)) ?? null,
                )
              }
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={item.available}
                onChange={(event) =>
                  setMenu((current) =>
                    current?.map((entry) => (entry.id === item.id ? { ...entry, available: event.target.checked } : entry)) ?? null,
                  )
                }
              />
              Available for new orders
            </label>
          </form>
        ))}
      </div>
    </div>
  );
}

export function KitchenSettings() {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [zipText, setZipText] = useState("");

  useEffect(() => {
    Promise.all([api<{ settings: PublicSettings }>("/api/admin/settings"), api<{ orders: OrderRecord[] }>("/api/admin/orders")])
      .then(([settingsData, ordersData]) => {
        setSettings(settingsData.settings);
        setZipText((settingsData.settings.deliveryZipCodes ?? []).join(", "));
        setOrders(ordersData.orders);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  if (!settings) return <p className="text-muted-foreground">{error || "Loading capacity…"}</p>;

  const upcoming = orders
    .filter((order) => order.status !== "cancelled" && order.status !== "payment_pending")
    .reduce<Record<string, { guests: number; servings: number }>>((map, order) => {
      const date = order.kind === "catering" ? order.eventDate : order.startDate;
      if (!date) return map;
      map[date] ??= { guests: 0, servings: 0 };
      if (order.kind === "catering") map[date].guests += order.guestCount ?? 0;
      map[date].servings += order.lines.reduce((sum, line) => sum + line.quantity, 0);
      return map;
    }, {});

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      const data = await api<{ settings: PublicSettings }>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify({
          weeklyLeadDays: Number(settings?.weeklyLeadDays),
          cateringLeadDays: Number(settings?.cateringLeadDays),
          minCateringGuests: Number(settings?.minCateringGuests),
          maxGuestsPerDay: Number(settings?.maxGuestsPerDay),
          maxWeeklyServingsPerDay: Number(settings?.maxWeeklyServingsPerDay),
          pickupAddress: settings?.pickupAddress,
          pickupInstructions: settings?.pickupInstructions,
          deliveryNote: settings?.deliveryNote,
          deliveryOrigin: settings?.deliveryOrigin,
          deliveryRatePerMile: Number(settings?.deliveryRatePerMile),
          maxDeliveryMiles: Number(settings?.maxDeliveryMiles),
          minDeliveryFee: Number(settings?.minDeliveryFee),
          deliveryEnabled: settings?.deliveryEnabled,
          freeDelivery: settings?.freeDelivery,
          deliveryZipCodes: zipText,
        }),
      });
      setSettings(data.settings);
      setZipText((data.settings.deliveryZipCodes ?? []).join(", "));
      setMessage("Kitchen settings saved.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save.");
    }
  }

  return (
    <div className="grid gap-6">
      <PageIntro title="Notice and capacity" lede="Lead time can differ for weekly meals and catering. Guest capacity is what stops a day from being oversold." />
      <form className="grid gap-4 rounded-xl border border-border bg-card p-5" onSubmit={save}>
        <div className="grid gap-3 sm:grid-cols-2">
          <NumberField label="Weekly notice, days" value={settings.weeklyLeadDays} onChange={(value) => setSettings({ ...settings, weeklyLeadDays: value })} />
          <NumberField label="Catering notice, days" value={settings.cateringLeadDays} onChange={(value) => setSettings({ ...settings, cateringLeadDays: value })} />
          <NumberField label="Minimum guests" value={settings.minCateringGuests} onChange={(value) => setSettings({ ...settings, minCateringGuests: value })} />
          <NumberField label="Max guests a day" value={settings.maxGuestsPerDay} onChange={(value) => setSettings({ ...settings, maxGuestsPerDay: value })} />
          <NumberField label="Max weekly servings a day" value={settings.maxWeeklyServingsPerDay} onChange={(value) => setSettings({ ...settings, maxWeeklyServingsPerDay: value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="address">Pickup address</Label>
          <Input id="address" className="h-11 bg-background px-3" value={settings.pickupAddress} onChange={(event) => setSettings({ ...settings, pickupAddress: event.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pickup">Pickup instructions</Label>
          <Textarea id="pickup" value={settings.pickupInstructions} onChange={(event) => setSettings({ ...settings, pickupInstructions: event.target.value })} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="delivery">Delivery note</Label>
          <Textarea id="delivery" value={settings.deliveryNote} onChange={(event) => setSettings({ ...settings, deliveryNote: event.target.value })} />
        </div>
        <div className="grid gap-3 border-t border-border pt-4">
          <h2 className="font-display text-2xl">Delivery pricing</h2>
          <div className="grid gap-2">
            <Label htmlFor="origin">Starting location</Label>
            <Input
              id="origin"
              className="h-11 bg-background px-3"
              value={settings.deliveryOrigin}
              onChange={(event) => setSettings({ ...settings, deliveryOrigin: event.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <NumberField
              label="Price per mile"
              value={settings.deliveryRatePerMile}
              step="0.01"
              onChange={(value) => setSettings({ ...settings, deliveryRatePerMile: value })}
            />
            <NumberField
              label="Maximum miles, 0 for none"
              value={settings.maxDeliveryMiles}
              onChange={(value) => setSettings({ ...settings, maxDeliveryMiles: value })}
            />
            <NumberField
              label="Minimum delivery fee"
              value={settings.minDeliveryFee}
              step="0.01"
              onChange={(value) => setSettings({ ...settings, minDeliveryFee: value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="zips">Delivery ZIP codes, leave blank for all</Label>
            <Input
              id="zips"
              className="h-11 bg-background px-3"
              value={zipText}
              onChange={(event) => setZipText(event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.deliveryEnabled}
              onChange={(event) => setSettings({ ...settings, deliveryEnabled: event.target.checked })}
            />
            Delivery is available
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={settings.freeDelivery}
              onChange={(event) => setSettings({ ...settings, freeDelivery: event.target.checked })}
            />
            Free delivery promotion
          </label>
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-gomen">{message}</p> : null}
        <Button type="submit" className="h-11 w-fit px-4">
          Save settings
        </Button>
      </form>
      <section>
        <h2 className="font-display text-2xl">Paid load by first date</h2>
        {Object.keys(upcoming).length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No paid orders are holding capacity.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {Object.entries(upcoming)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, load]) => (
                <li key={date} className="flex justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <span>{date}</span>
                  <span>
                    {load.guests} catering guests · {load.servings} servings
                  </span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
  step = "1",
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input className="h-11 bg-background px-3" type="number" step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

type CustomerRow = PublicUser & { orderCount: number; paidTotal: number };

export function KitchenCustomers() {
  const [customers, setCustomers] = useState<CustomerRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ customers: CustomerRow[] }>("/api/admin/customers")
      .then((data) => setCustomers(data.customers))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  if (!customers) return <p className="text-muted-foreground">{error || "Loading customers…"}</p>;

  return (
    <div>
      <PageIntro title="Customers" lede="Phone numbers are here because that is where the ready text is sent." />
      {customers.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No accounts yet.</p>
      ) : (
        <ul className="mt-6 grid gap-2">
          {customers.map((customer) => (
            <li key={customer.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-muted-foreground">
                  {customer.orderCount} orders · {money(customer.paidTotal)} paid
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {customer.email} · {customer.phone}
              </p>
              {customer.preferences.allergens.length ? (
                <p className="mt-2 text-sm text-primary">Allergies: {customer.preferences.allergens.join(", ")}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">Joined {formatWhen(customer.createdAt)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
