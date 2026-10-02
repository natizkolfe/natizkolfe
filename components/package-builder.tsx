"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CustomizeSheet, type CustomizeDraft } from "@/components/customize-sheet";
import { PackagePanel } from "@/components/package-panel";
import { PageIntro, Shell } from "@/components/page-intro";
import { useAuth, useDraft } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client-api";
import { money, SPICE_LABEL } from "@/lib/format";
import {
  buildPackageLines,
  dishLabel,
  packageFor,
  packageServingPrice,
  readAddonMemory,
  samePackageLines,
  servingCount,
} from "@/lib/packages";
import { unitPrice } from "@/lib/orders";
import type { FastingPreference, MenuItem, SpiceLevel } from "@/lib/types";
import { cn } from "cn";

const SPICES: SpiceLevel[] = ["mild", "medium", "hot"];

export function PackageBuilder() {
  const { draft, hydrated, setDraft } = useDraft();
  const { user } = useAuth();
  const [menu, setMenu] = useState<MenuItem[] | null>(null);
  const [error, setError] = useState("");
  const [addonPick, setAddonPick] = useState<{ preference: FastingPreference; ids: string[] } | null>(null);
  const [editing, setEditing] = useState<CustomizeDraft | null>(null);
  const [note, setNote] = useState("");
  const [spice, setSpice] = useState<SpiceLevel | null>(null);

  useEffect(() => {
    api<{ menu: MenuItem[] }>("/api/menu")
      .then((data) => setMenu(data.menu))
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const pkg = draft ? packageFor(draft.fastingPreference) : null;

  const selectedAddons =
    addonPick && draft && addonPick.preference === draft.fastingPreference ? addonPick.ids : [];

  useEffect(() => {
    if (!draft || !pkg || addonPick?.preference === draft.fastingPreference) return;
    const allowed = new Set(pkg.addons.map((dish) => dish.id));
    const fromLines = draft.lines
      .filter((line) => line.source === "addon" && allowed.has(line.itemId))
      .map((line) => line.itemId);
    const ids = fromLines.length ? fromLines : readAddonMemory()[pkg.id].filter((id) => allowed.has(id));
    setAddonPick({ preference: draft.fastingPreference, ids });
  }, [addonPick, draft, pkg]);

  useEffect(() => {
    if (!draft || !menu || !pkg || addonPick?.preference !== draft.fastingPreference) return;
    const next = buildPackageLines(draft, menu, addonPick.ids, draft.lines, user?.preferences);
    if (samePackageLines(draft.lines, next)) return;
    setDraft({ ...draft, lines: next });
  }, [addonPick, draft, menu, pkg, setDraft, user?.preferences]);

  if (!hydrated) {
    return (
      <Shell>
        <p className="text-muted-foreground">Opening your package…</p>
      </Shell>
    );
  }

  if (!draft) {
    return (
      <Shell>
        <PageIntro title="Start with the service" lede="Choose weekly meals or catering, then the fasting or non-fasting package." />
        <Button className="mt-6 h-11 px-4" render={<Link href="/order" />}>
          Set up the order
        </Button>
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell>
        <PageIntro title="The package did not load" lede={error} />
      </Shell>
    );
  }

  if (!menu) {
    return (
      <Shell>
        <p className="text-muted-foreground">Loading the standard packages…</p>
      </Shell>
    );
  }

  if (!pkg) {
    return (
      <Shell>
        <PageIntro
          title="Choose the table."
          lede="Gebeta starts from a fasting package or a non-fasting package. The standard dishes come with it."
        />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["fasting", "Fasting Package", "Misir, shiro, greens, and vegetables. No meat or dairy."],
              ["non_fasting", "Non-Fasting Package", "Doro wot, tibs, alicha, and greens."],
            ] as const
          ).map(([value, title, detail]) => (
            <button
              key={value}
              type="button"
              onClick={() => setDraft({ ...draft, fastingPreference: value, lines: [] })}
              className="rounded-xl border border-border bg-card p-5 text-left"
            >
              <span className="font-display text-2xl">{title}</span>
              <span className="mt-2 block text-sm leading-6 text-muted-foreground">{detail}</span>
            </button>
          ))}
        </div>
      </Shell>
    );
  }

  const prices = Object.fromEntries(menu.map((item) => [item.id, item.price]));
  const servings = servingCount(draft);
  const includedLines = draft.lines.filter((line) => line.source === "included");
  const addonLines = draft.lines.filter((line) => line.source === "addon");
  const includedTotal = includedLines.reduce((sum, line) => {
    const item = menu.find((entry) => entry.id === line.itemId);
    return item ? sum + unitPrice(item, line.customization) * line.quantity : sum;
  }, 0);
  const addonTotal = addonLines.reduce((sum, line) => {
    const item = menu.find((entry) => entry.id === line.itemId);
    return item ? sum + unitPrice(item, line.customization) * line.quantity : sum;
  }, 0);

  function chooseAddons(ids: string[]) {
    setAddonPick({ preference: draft!.fastingPreference, ids });
  }

  function applySpice(level: SpiceLevel) {
    if (!draft) return;
    setSpice(level);
    setDraft({
      ...draft,
      lines: draft.lines.map((line) => {
        const item = menu?.find((entry) => entry.id === line.itemId);
        if (!item?.allowSpice || !item.spiceLevels.includes(level)) return line;
        return { ...line, customization: { ...line.customization, spiceLevel: level } };
      }),
    });
  }

  function applyNote(value: string) {
    setNote(value);
    if (!draft) return;
    setDraft({
      ...draft,
      lines: draft.lines.map((line) =>
        line.source === "included" ? { ...line, customization: { ...line.customization, notes: value } } : line,
      ),
    });
  }

  function openLine(itemId: string) {
    const item = menu?.find((entry) => entry.id === itemId);
    const line = draft?.lines.find((entry) => entry.itemId === itemId);
    if (!item || !line || !draft) return;
    setEditing({
      item,
      lineId: line.lineId,
      quantity: line.quantity,
      dayIndex: line.dayIndex,
      mealSlot: line.mealSlot,
      customization: line.customization,
      days: draft.kind === "weekly" ? [{ index: 0, label: "Each day" }] : [],
      kind: draft.kind,
    });
  }

  function saveLine() {
    if (!editing || !draft) return;
    setDraft({
      ...draft,
      lines: draft.lines.map((line) =>
        line.lineId === editing.lineId
          ? {
              ...line,
              quantity: editing.quantity,
              mealSlot: editing.mealSlot,
              customization: editing.customization,
            }
          : line,
      ),
    });
    setEditing(null);
  }

  const servingLabel =
    draft.kind === "weekly"
      ? `${servings} days, one serving of the package each day`
      : `${servings} guests, one serving of the package each`;

  return (
    <Shell>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageIntro
          eyebrow={draft.kind === "weekly" ? `${draft.durationDays}-day meal preparation` : `Catering · ${draft.guestCount} guests`}
          title="The standard package is already on the order."
          lede="Included dishes do not need to be chosen. Open extra meals only if you want something beyond the package, then set the kitchen’s preferences."
        />
        <Button variant="outline" className="h-10 bg-card px-3" render={<Link href="/order" />}>
          Edit service
        </Button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid gap-6">
          <PackagePanel
            pkg={pkg}
            prices={prices}
            selectedAddonIds={selectedAddons}
            onSelectedAddonIds={chooseAddons}
            servingNote={servingLabel}
          />

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-3xl">Preferences</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Spice and a note apply to the included dishes. A single dish can still be adjusted on its own.
            </p>
            <fieldset className="mt-5 grid gap-2">
              <legend className="text-sm font-medium">Spice for the package</legend>
              <div className="flex flex-wrap gap-2">
                {SPICES.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => applySpice(level)}
                    className={cn(
                      "h-10 rounded-lg border px-3 text-sm",
                      spice === level ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background",
                    )}
                  >
                    {SPICE_LABEL[level]}
                  </button>
                ))}
              </div>
            </fieldset>
            <div className="mt-5 grid gap-2">
              <Label htmlFor="package-note">Note for the kitchen</Label>
              <Textarea
                id="package-note"
                value={note}
                onChange={(event) => applyNote(event.target.value)}
                placeholder="Allergies, ingredients to leave out, or how the table should be finished"
                className="min-h-24 bg-background"
              />
            </div>
            <ul className="mt-5 grid gap-2">
              {draft.lines.map((line) => (
                <li key={line.lineId} className="flex items-center justify-between gap-3 border-t border-border pt-2 text-sm">
                  <span>
                    {dishLabel(line.itemId) ?? line.itemId}
                    <span className="ml-2 text-xs text-muted-foreground uppercase">
                      {line.source === "addon" ? "Add-on" : "Included"}
                    </span>
                  </span>
                  <button type="button" className="text-xs text-primary" onClick={() => openLine(line.itemId)}>
                    Adjust this dish
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="h-fit rounded-xl border border-border bg-card p-5 lg:sticky lg:top-24">
          <p className="text-xs tracking-[0.16em] text-primary uppercase">{pkg.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">{servingLabel}</p>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt>Standard package</dt>
              <dd className="tabular-nums">{money(includedTotal)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Add-ons</dt>
              <dd className="tabular-nums">{money(addonTotal)}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {money(packageServingPrice(pkg, prices))} a serving before add-ons.
          </p>
          <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
            <span className="text-sm">Total</span>
            <span className="font-display text-3xl">{money(includedTotal + addonTotal)}</span>
          </div>
          <Button className="mt-4 h-11 w-full" render={<Link href="/order/review" />}>
            Review order
          </Button>
        </aside>
      </div>

      <CustomizeSheet draft={editing} onClose={() => setEditing(null)} onChange={setEditing} onSave={saveLine} />
    </Shell>
  );
}
