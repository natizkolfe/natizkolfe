import { initialCustomization } from "@/lib/orders";
import type { DraftLine, FastingPreference, MenuItem, OrderDraft, Preferences } from "@/lib/types";

export interface PackageDish {
  id: string;
  label: string;
}

export interface MealPackage {
  id: "fasting" | "non_fasting";
  name: string;
  detail: string;
  included: PackageDish[];
  addons: PackageDish[];
}

export const MEAL_PACKAGES: Record<"fasting" | "non_fasting", MealPackage> = {
  fasting: {
    id: "fasting",
    name: "Fasting Package",
    detail: "The standard fasting table. These dishes are already part of the package.",
    included: [
      { id: "misir-wot", label: "Misir Wot" },
      { id: "shiro-wot", label: "Shiro" },
      { id: "gomen", label: "Gomen" },
      { id: "atkilt-wot", label: "Atakilt" },
      { id: "fosolia", label: "Vegetable Side" },
    ],
    addons: [
      { id: "kik-alicha", label: "Kik Alicha" },
      { id: "azifa", label: "Azifa" },
      { id: "injera", label: "Extra Injera" },
    ],
  },
  non_fasting: {
    id: "non_fasting",
    name: "Non-Fasting Package",
    detail: "The standard non-fasting table. Meat and butter dishes are already included.",
    included: [
      { id: "doro-wot", label: "Doro Wot" },
      { id: "awaze-tibs", label: "Tibs" },
      { id: "beef-alicha", label: "Alicha" },
      { id: "gomen", label: "Gomen" },
      { id: "timatim-salad", label: "Vegetable Side" },
    ],
    addons: [
      { id: "kitfo", label: "Kitfo" },
      { id: "key-wot", label: "Key Wot" },
      { id: "ayib", label: "Ayib" },
    ],
  },
};

const ADDON_KEY = "gebeta-package-addons";

export function packageFor(preference: FastingPreference): MealPackage | null {
  if (preference === "fasting" || preference === "non_fasting") return MEAL_PACKAGES[preference];
  return null;
}

export function dishLabel(id: string): string | null {
  for (const pkg of Object.values(MEAL_PACKAGES)) {
    const match = [...pkg.included, ...pkg.addons].find((dish) => dish.id === id);
    if (match) return match.label;
  }
  return null;
}

export function servingCount(draft: Pick<OrderDraft, "kind" | "durationDays" | "guestCount">): number {
  if (draft.kind === "catering") return Math.max(1, draft.guestCount || 1);
  return draft.durationDays;
}

export function packageServingPrice(pkg: MealPackage, prices: Record<string, number>): number {
  return pkg.included.reduce((sum, dish) => sum + (prices[dish.id] ?? 0), 0);
}

export type AddonMemory = { fasting: string[]; non_fasting: string[] };

export function readAddonMemory(): AddonMemory {
  const empty: AddonMemory = { fasting: [], non_fasting: [] };
  if (typeof window === "undefined") return empty;
  try {
    const raw = sessionStorage.getItem(ADDON_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<AddonMemory>;
    return {
      fasting: Array.isArray(parsed.fasting) ? parsed.fasting.filter((id) => typeof id === "string") : [],
      non_fasting: Array.isArray(parsed.non_fasting) ? parsed.non_fasting.filter((id) => typeof id === "string") : [],
    };
  } catch {
    return empty;
  }
}

export function writeAddonMemory(preference: "fasting" | "non_fasting", ids: string[]) {
  if (typeof window === "undefined") return;
  const current = readAddonMemory();
  current[preference] = ids;
  sessionStorage.setItem(ADDON_KEY, JSON.stringify(current));
}

export function buildPackageLines(
  draft: OrderDraft,
  menu: MenuItem[],
  addonIds: string[],
  previous: DraftLine[],
  prefs?: Preferences | null,
): DraftLine[] {
  const pkg = packageFor(draft.fastingPreference);
  if (!pkg) return previous;
  const quantity = servingCount(draft);
  const chosen = new Set(addonIds);
  const previousById = new Map(previous.map((line) => [line.itemId, line]));
  const rows = [
    ...pkg.included.map((dish) => ({ ...dish, source: "included" as const })),
    ...pkg.addons.filter((dish) => chosen.has(dish.id)).map((dish) => ({ ...dish, source: "addon" as const })),
  ];
  return rows.flatMap((row) => {
    const item = menu.find((entry) => entry.id === row.id && entry.available);
    if (!item) return [];
    const existing = previousById.get(row.id);
    return [
      {
        lineId: existing?.lineId ?? `pkg-${row.id}`,
        itemId: row.id,
        quantity,
        dayIndex: draft.kind === "weekly" ? 0 : null,
        mealSlot: draft.kind === "weekly" ? (existing?.mealSlot ?? "lunch") : null,
        customization: existing?.customization ?? initialCustomization(item, prefs),
        source: row.source,
      },
    ];
  });
}

export function samePackageLines(current: DraftLine[], next: DraftLine[]): boolean {
  if (current.length !== next.length) return false;
  return next.every((line, index) => {
    const previous = current[index];
    return (
      previous?.itemId === line.itemId &&
      previous.quantity === line.quantity &&
      previous.source === line.source &&
      previous.dayIndex === line.dayIndex
    );
  });
}
