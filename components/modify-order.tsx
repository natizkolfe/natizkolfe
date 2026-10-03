"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PageIntro, Shell } from "@/components/page-intro";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/client-api";
import { formatWhen } from "@/lib/dates";
import { money, SPICE_LABEL } from "@/lib/format";
import { formatDeadline, modificationWindow } from "@/lib/orders";
import { packageFor } from "@/lib/packages";
import type { Customization, MenuItem, OrderRecord, PublicSettings, SpiceLevel } from "@/lib/types";

const SPICES: SpiceLevel[] = ["none", "mild", "medium", "hot", "extra"];

export function ModifyOrder({ orderId }: { orderId: string }) {
  const router = useRouter();
  const { user, ready } = useAuth();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [addons, setAddons] = useState<string[]>([]);
  const [custom, setCustom] = useState<Record<string, Partial<Customization>>>({});
  const [quote, setQuote] = useState<{ due: number; total: number; changes: string[] } | null>(null);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!ready || !user) return;
    let ignore = false;
    Promise.all([
      api<{ order: OrderRecord }>(`/api/orders/${orderId}`),
      api<{ menu: MenuItem[] }>("/api/menu"),
      api<{ settings: PublicSettings }>("/api/settings"),
    ])
      .then(([orderData, menuData, settingsData]) => {
        if (ignore) return;
        setOrder(orderData.order);
        setMenu(menuData.menu);
        setSettings(settingsData.settings);
        setAddons(orderData.order.lines.filter((line) => line.source === "addon").map((line) => line.itemId));
        setName(orderData.order.customerName);
        const next: Record<string, Partial<Customization>> = {};
        for (const line of orderData.order.lines) {
          next[line.itemId] = {
            spiceLevel: line.customization.spiceLevel,
            allergens: line.customization.allergens,
            excludedIngredients: line.customization.excludedIngredients,
            dietary: line.customization.dietary,
            notes: line.customization.notes,
          };
        }
        setCustom(next);
      })
      .catch((reason: Error) => {
        if (!ignore) setError(reason.message);
      });
    return () => {
      ignore = true;
    };
  }, [ready, user, orderId]);

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
        <PageIntro title="Sign in to change this order" />
        <Button className="mt-6 h-11 px-4" render={<Link href={`/login?next=/orders/${orderId}/modify`} />}>
          Sign in
        </Button>
      </Shell>
    );
  }
  if (!order || !settings) {
    return (
      <Shell>
        <p className="text-muted-foreground">{error || "Loading the order…"}</p>
      </Shell>
    );
  }

  const window = modificationWindow(order, settings);
  if (!window.open && window.reason === "time") {
    return (
      <Shell>
        <PageIntro
          eyebrow={order.number}
          title="Order Modification Period Closed"
          lede="This order is scheduled within the next 24 hours. Online modifications are no longer available."
        />
        <Button className="mt-6 h-11 px-4" render={<Link href={`/orders/${order.id}`} />}>
          Back to the order
        </Button>
      </Shell>
    );
  }
  if (!window.open) {
    return (
      <Shell>
        <PageIntro
          eyebrow={order.number}
          title="Online modifications are closed"
          lede="The kitchen has already moved this order forward. Call Gebeta if something still needs to change."
        />
        <Button className="mt-6 h-11 px-4" render={<Link href={`/orders/${order.id}`} />}>
          Back to the order
        </Button>
      </Shell>
    );
  }

  const catalog = packageFor(order.fastingPreference).addons.filter(
    (dish) => !order.lines.some((line) => line.source !== "addon" && line.itemId === dish.id),
  );

  function updateLine(itemId: string, patch: Partial<Customization>) {
    setQuote(null);
    setCustom((current) => ({ ...current, [itemId]: { ...current[itemId], ...patch } }));
  }

  async function submit(preview: boolean) {
    setPending(true);
    setError("");
    try {
      const data = await api<{ preview: boolean; due: number; total: number; changes: string[]; order: OrderRecord }>(
        `/api/orders/${orderId}/modify`,
        {
          method: "POST",
          body: JSON.stringify({
            preview,
            addonIds: addons,
            customizations: custom,
            cardNumber,
            expiry,
            cvc,
            name,
          }),
        },
      );
      if (data.preview) {
        setQuote({ due: data.due, total: data.total, changes: data.changes });
        return;
      }
      router.push(`/orders/${orderId}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update the order.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Shell>
      <PageIntro
        eyebrow={order.number}
        title="Modify order"
        lede={`Changes stay open until ${formatDeadline(window.deadline) || formatWhen(window.deadline ?? "")}. A higher total is charged before the change is confirmed.`}
      />
      <div className="mt-8 grid gap-4">
        {order.lines.map((line) => {
          const item = menu.find((entry) => entry.id === line.itemId);
          const current = custom[line.itemId] ?? line.customization;
          return (
            <section key={line.lineId} className="rounded-xl border border-border bg-card p-5">
              <p className="font-medium">
                {line.name} <span className="text-sm text-muted-foreground">{line.source === "addon" ? "Add-on" : "Included"}</span>
              </p>
              {item?.allowSpice ? (
                <label className="mt-3 grid gap-1 text-sm">
                  Spice
                  <select
                    className="h-11 rounded-md border border-border bg-background px-3"
                    value={current.spiceLevel ?? ""}
                    onChange={(event) => updateLine(line.itemId, { spiceLevel: (event.target.value || null) as SpiceLevel | null })}
                  >
                    {SPICES.filter((level) => item.spiceLevels.includes(level)).map((level) => (
                      <option key={level} value={level}>
                        {SPICE_LABEL[level]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {item && item.allergenHints.length > 0 ? (
                <fieldset className="mt-3">
                  <legend className="text-sm">Allergies</legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {item.allergenHints.map((hint) => (
                      <label key={hint} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={(current.allergens ?? []).includes(hint)}
                          onChange={(event) => {
                            const currentList = current.allergens ?? [];
                            updateLine(line.itemId, {
                              allergens: event.target.checked ? [...currentList, hint] : currentList.filter((entry) => entry !== hint),
                            });
                          }}
                        />
                        {hint}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              {item && item.ingredients.length > 0 ? (
                <fieldset className="mt-3">
                  <legend className="text-sm">Leave out</legend>
                  <div className="mt-2 flex flex-wrap gap-3">
                    {item.ingredients.map((ingredient) => (
                      <label key={ingredient} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={(current.excludedIngredients ?? []).includes(ingredient)}
                          onChange={(event) => {
                            const currentList = current.excludedIngredients ?? [];
                            updateLine(line.itemId, {
                              excludedIngredients: event.target.checked
                                ? [...currentList, ingredient]
                                : currentList.filter((entry) => entry !== ingredient),
                            });
                          }}
                        />
                        {ingredient}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ) : null}
              <label className="mt-3 grid gap-1 text-sm">
                Note for the kitchen
                <Input
                  className="h-11 bg-background px-3"
                  value={current.notes ?? ""}
                  onChange={(event) => updateLine(line.itemId, { notes: event.target.value })}
                />
              </label>
            </section>
          );
        })}
        <section className="rounded-xl border border-border bg-card p-5">
          <h2 className="font-display text-2xl">Add-ons</h2>
          {catalog.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No extra dishes are available for this package.</p>
          ) : (
            <ul className="mt-3 grid gap-2">
              {catalog.map((dish) => (
                <li key={dish.id}>
                  <label className="flex items-center justify-between gap-3 text-sm">
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={addons.includes(dish.id)}
                        onChange={(event) => {
                          setQuote(null);
                          setAddons((current) =>
                            event.target.checked ? [...current, dish.id] : current.filter((id) => id !== dish.id),
                          );
                          if (event.target.checked && !custom[dish.id]) {
                            const item = menu.find((entry) => entry.id === dish.id);
                            if (item) {
                              setCustom((current) => ({
                                ...current,
                                [dish.id]: { spiceLevel: item.defaultSpice, allergens: [], excludedIngredients: [], dietary: [], notes: "" },
                              }));
                            }
                          }
                        }}
                      />
                      {dish.label}
                    </span>
                    {dish.pricePerPerson ? <span>+{money(dish.pricePerPerson)} each</span> : null}
                  </label>
                </li>
              ))}
            </ul>
          )}
        </section>
        {quote ? (
          <section className="rounded-xl border border-border bg-card p-5">
            <h2 className="font-display text-2xl">Review the change</h2>
            <ul className="mt-3 grid gap-1 text-sm">
              {quote.changes.map((change) => (
                <li key={change}>{change}</li>
              ))}
            </ul>
            <p className="mt-3 text-sm">New total {money(quote.total)}</p>
            {quote.due > 0 ? (
              <div className="mt-4 grid gap-3">
                <p className="text-sm">Pay {money(quote.due)} before this change is confirmed.</p>
                <Label htmlFor="mod-name">Name on card</Label>
                <Input id="mod-name" className="h-11 bg-background px-3" value={name} onChange={(event) => setName(event.target.value)} />
                <Label htmlFor="mod-card">Card number</Label>
                <Input id="mod-card" className="h-11 bg-background px-3" value={cardNumber} onChange={(event) => setCardNumber(event.target.value)} />
                <div className="grid grid-cols-2 gap-3">
                  <Input className="h-11 bg-background px-3" placeholder="MM/YY" value={expiry} onChange={(event) => setExpiry(event.target.value)} />
                  <Input className="h-11 bg-background px-3" placeholder="CVC" value={cvc} onChange={(event) => setCvc(event.target.value)} />
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">The new total is not higher, so no extra payment is required.</p>
            )}
          </section>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" className="h-11 bg-card px-4" disabled={pending} onClick={() => submit(true)}>
            {pending ? "Checking…" : "Review changes"}
          </Button>
          {quote ? (
            <Button type="button" className="h-11 px-4" disabled={pending} onClick={() => submit(false)}>
              {quote.due > 0 ? "Pay and update order" : "Update order"}
            </Button>
          ) : null}
          <Button variant="outline" className="h-11 bg-card px-4" render={<Link href={`/orders/${order.id}`} />}>
            Cancel
          </Button>
        </div>
      </div>
    </Shell>
  );
}
