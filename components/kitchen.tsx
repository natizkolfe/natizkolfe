"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PageIntro, Shell } from "@/components/page-intro";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client-api";
import { formatWhen } from "@/lib/dates";
import { money } from "@/lib/format";
import type { MenuItem, OrderRecord, PublicSettings, PublicUser } from "@/lib/types";
import { cn } from "cn";

export { StaffBoard as KitchenBoard } from "@/components/staff-board";
export { StaffTicket as KitchenTicket } from "@/components/staff-ticket";

const NAV = [
  { href: "/admin", label: "Orders" },
  { href: "/admin/menu", label: "Menu" },
  { href: "/admin/settings", label: "Capacity" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/promo", label: "Promo codes" },
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
          staffPhone: settings?.staffPhone,
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
        <div className="grid gap-2">
          <Label htmlFor="staff-phone">Staff alert phone</Label>
          <Input
            id="staff-phone"
            className="h-11 bg-background px-3"
            value={settings.staffPhone}
            onChange={(event) => setSettings({ ...settings, staffPhone: event.target.value })}
          />
          <p className="text-xs text-muted-foreground">
            New paid orders also alert the browser that has the staff portal open, including a phone.
          </p>
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
        <PageIntro title="Customers" lede="Phone numbers are here because pickup and delivery notices go to the customer." />
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
