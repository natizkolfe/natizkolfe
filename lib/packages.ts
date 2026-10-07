import { addonOffers, foodOffer, isPortionFood, linesFromPortions, offerGroups, picksFromLines, type PortionPicks } from "@/lib/portions";
import type { Customization, DraftLine, FastingPreference, MenuItem, OrderDraft, OrderKind } from "@/lib/types";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export const CATERING_PRICE_PER_PERSON = 21;

/** Temporary add-on price per catering guest. Replace this, or a single dish price, when final prices are set. */
export const CATERING_ADDON_PRICE = 20;

/**
 * Included weekly meals, per day, for a mixed order.
 * Swapping fasting and non-fasting dishes does not change this.
 * Replace the number when the weekly package price is confirmed.
 */
export const WEEKLY_PACKAGE_PRICE_PER_DAY = 56;

/** How many standard dishes a mixed package includes at the base price. */
export const MIXED_INCLUDED_SELECTIONS = 4;

/**
 * Charged only when a standard dish is added past the included allowance.
 * Replace these when the final add-on prices are set.
 */
export const MIXED_EXTRA_STANDARD_PRICE = {
  fasting: 4,
  non_fasting: 6,
} as const;

export interface PackageDish {
  id: string;
  label: string;
  side: "fasting" | "non_fasting";
  /** Extra charge per catering guest, or per weekly day. Omit on dishes that come with the package. */
  pricePerPerson?: number;
}

export interface MealPackage {
  id: FastingPreference;
  name: string;
  detail: string;
  included: PackageDish[];
  addons: PackageDish[];
  /** When set, the customer chooses this many dishes from `included`. */
  choiceLimit?: number;
}

const FASTING_PACKAGE: MealPackage = {
  id: "fasting",
  name: "Fasting Package",
  detail: "The standard fasting table. These dishes are already part of the package.",
  included: [
    { id: "misir-wot", label: "Misir Wot", side: "fasting" },
    { id: "gomen", label: "Gomen", side: "fasting" },
    { id: "atkilt-wot", label: "Atakilt", side: "fasting" },
  ],
  addons: [
    { id: "kik-alicha", label: "Kik Alicha", side: "fasting", pricePerPerson: CATERING_ADDON_PRICE },
    { id: "azifa", label: "Azifa", side: "fasting", pricePerPerson: CATERING_ADDON_PRICE },
    { id: "injera", label: "Extra Injera", side: "fasting", pricePerPerson: CATERING_ADDON_PRICE },
  ],
};

const NON_FASTING_PACKAGE: MealPackage = {
  id: "non_fasting",
  name: "Non-Fasting Package",
  detail: "The standard non-fasting table. Meat and butter dishes are already included.",
  included: [
    { id: "doro-wot", label: "Doro Wot", side: "non_fasting" },
    { id: "awaze-tibs", label: "Tibs", side: "non_fasting" },
    { id: "beef-alicha", label: "Alicha", side: "non_fasting" },
    { id: "gomen", label: "Gomen", side: "non_fasting" },
    { id: "timatim-salad", label: "Timatim Salad", side: "non_fasting" },
  ],
  addons: [
    { id: "kitfo", label: "Kitfo", side: "non_fasting", pricePerPerson: CATERING_ADDON_PRICE },
    { id: "key-wot", label: "Key Wot", side: "non_fasting", pricePerPerson: CATERING_ADDON_PRICE },
    { id: "ayib", label: "Ayib", side: "non_fasting", pricePerPerson: CATERING_ADDON_PRICE },
  ],
};

function mixedPool(): PackageDish[] {
  const seen = new Set<string>();
  const rows: PackageDish[] = [];
  for (const pkg of [FASTING_PACKAGE, NON_FASTING_PACKAGE]) {
    for (const dish of pkg.included) {
      if (seen.has(dish.id)) continue;
      seen.add(dish.id);
      rows.push({ id: dish.id, label: dish.label, side: pkg.id === "fasting" ? "fasting" : "non_fasting" });
    }
  }
  return rows;
}

const MIXED_PACKAGE: MealPackage = {
  id: "mixed",
  name: "Mixed Order",
  detail: "Choose standard fasting and non-fasting dishes. The mix does not change the package price.",
  included: mixedPool(),
  addons: [...FASTING_PACKAGE.addons, ...NON_FASTING_PACKAGE.addons],
  choiceLimit: MIXED_INCLUDED_SELECTIONS,
};

export const MEAL_PACKAGES: Record<FastingPreference, MealPackage> = {
  fasting: FASTING_PACKAGE,
  non_fasting: NON_FASTING_PACKAGE,
  mixed: MIXED_PACKAGE,
};

export const TABLE_OPTIONS: {
  id: FastingPreference;
  icons: [string, string];
  title: string;
  detail: string;
  note: string;
}[] = [
  {
    id: "fasting",
    icons: ["misir-wot", "gomen"],
    title: "Fasting",
    detail: "Traditional Ethiopian fasting meals.",
    note: "Recommended foods start selected",
  },
  {
    id: "non_fasting",
    icons: ["doro-wot", "awaze-tibs"],
    title: "Non-Fasting",
    detail: "Traditional Ethiopian non-fasting meals.",
    note: "Recommended foods start selected",
  },
  {
    id: "mixed",
    icons: ["misir-wot", "awaze-tibs"],
    title: "Mixed",
    detail: "Combine fasting and non-fasting meals based on your preferences.",
    note: "Choose from both lists",
  },
];

const ADDON_KEY = "gebeta-package-addons";
const INCLUDED_KEY = "gebeta-mixed-included";

export function packageFor(preference: FastingPreference): MealPackage {
  return MEAL_PACKAGES[preference];
}

/** Individual photos cut from the dish sheet. Swap a file later without changing the layout. */
export const DISH_IMAGES: Record<string, string> = {
  "doro-wot": "/dishes/doro-wot.jpg",
  "misir-wot": "/dishes/misir-wot.jpg",
  "gomen": "/dishes/gomen.jpg",
  "kitfo": "/dishes/kitfo.jpg",
  "atkilt-wot": "/dishes/atkilt-wot.jpg",
  "beef-alicha": "/dishes/beef-alicha.jpg",
  "awaze-tibs": "/dishes/awaze-tibs.jpg",
  "yebesiga-alicha": "/dishes/yebesiga-alicha.jpg",
  "timatim-fitfit": "/dishes/timatim-fitfit.jpg",
  "kik-alicha": "/dishes/kik-alicha.jpg",
  "quanta-firfir": "/dishes/quanta-firfir.jpg",
  "enkulal-firfir": "/dishes/enkulal-firfir.jpg",
  injera: "/dishes/injera.jpg",
};

export function dishImage(id: string): string | null {
  return DISH_IMAGES[id] ?? null;
}

export function dishLabel(id: string): string | null {
  for (const pkg of Object.values(MEAL_PACKAGES)) {
    const match = [...pkg.included, ...pkg.addons].find((dish) => dish.id === id);
    if (match) return match.label;
  }
  return foodOffer(id)?.label ?? null;
}

export function dishSide(id: string): "fasting" | "non_fasting" | null {
  const mixed = [...MIXED_PACKAGE.included, ...MIXED_PACKAGE.addons].find((dish) => dish.id === id);
  if (mixed) return mixed.side;
  if (FASTING_PACKAGE.included.some((dish) => dish.id === id) || FASTING_PACKAGE.addons.some((dish) => dish.id === id)) {
    return "fasting";
  }
  if (NON_FASTING_PACKAGE.included.some((dish) => dish.id === id) || NON_FASTING_PACKAGE.addons.some((dish) => dish.id === id)) {
    return "non_fasting";
  }
  return foodOffer(id)?.side ?? null;
}

export function sideLabel(side: "fasting" | "non_fasting"): string {
  return side === "fasting" ? "Fasting" : "Non-fasting";
}

export function mixSummary(ids: string[]): string {
  const chosen = MIXED_PACKAGE.included.filter((dish) => ids.includes(dish.id));
  if (chosen.length === 0) return "Choose any mix. An even split is not required.";
  const fasting = chosen.filter((dish) => dish.side === "fasting").length;
  const nonFasting = chosen.length - fasting;
  const fastingPct = Math.round((fasting / chosen.length) * 100);
  return `${fastingPct}% fasting / ${100 - fastingPct}% non-fasting · ${fasting} fasting, ${nonFasting} non-fasting`;
}

/** Standard dishes not chosen as included, priced as add-ons, plus named extras from both tables. */
export function mixedAddonChoices(includedIds: string[]): PackageDish[] {
  const included = new Set(includedIds);
  const overflow = MIXED_PACKAGE.included
    .filter((dish) => !included.has(dish.id))
    .map((dish) => ({ ...dish, pricePerPerson: MIXED_EXTRA_STANDARD_PRICE[dish.side] }));
  return [...overflow, ...MIXED_PACKAGE.addons];
}

export function addonUnitPrice(preference: FastingPreference, id: string): number {
  const named = packageFor(preference).addons.find((dish) => dish.id === id);
  if (named?.pricePerPerson != null) return named.pricePerPerson;
  if (preference === "mixed") {
    const dish = MIXED_PACKAGE.included.find((entry) => entry.id === id);
    if (dish) return MIXED_EXTRA_STANDARD_PRICE[dish.side];
  }
  return 0;
}

export function servingCount(draft: Pick<OrderDraft, "kind" | "durationDays" | "guestCount">): number {
  if (draft.kind === "catering") return Math.max(1, draft.guestCount || 1);
  return draft.durationDays;
}

/** Swap `imageSrc` for a photo later. Null keeps the drawn placeholder. */
export const WEEKLY_CONTAINERS: Record<
  7 | 14,
  {
    days: 7 | 14;
    weeks: 1 | 2;
    title: string;
    imageSrc: string | null;
    imageAlt: string;
    sizeNote: string;
    short: string;
  }
> = {
  7: {
    days: 7,
    weeks: 1,
    title: "1 Week Meal Service",
    imageSrc: "/containers/24oz-round.png",
    imageAlt: "24 oz round food container with a clear lid",
    sizeNote: "24 oz Round Container",
    short: "24 oz Round",
  },
  14: {
    days: 14,
    weeks: 2,
    title: "2 Week Meal Service",
    imageSrc: "/containers/28oz-square.png",
    imageAlt: "28 oz square food container with a clear lid",
    sizeNote: "28 oz Square Container",
    short: "28 oz Square",
  },
};

export function weeklyContainer(days: number | null | undefined) {
  return days === 14 ? WEEKLY_CONTAINERS[14] : WEEKLY_CONTAINERS[7];
}

export interface CateringQuoteLine {
  id: string;
  label: string;
  perPerson: number;
  total: number;
}

export interface ServiceQuote {
  count: number;
  countLabel: "guests" | "days";
  basePer: number;
  baseTotal: number;
  addons: CateringQuoteLine[];
  total: number;
}

export function defaultCateringSelection(preference: FastingPreference): string[] {
  return packageFor(preference).included.map((dish) => dish.id);
}

const EMPTY_CUSTOMIZATION: Customization = {
  spiceLevel: "none",
  allergens: [],
  excludedIngredients: [],
  preferredIngredients: [],
  dietary: [],
  fastingStyle: null,
  choice: null,
  sauces: [],
  extras: [],
  notes: "",
};

export function weeklyDishFits(id: string, preference: FastingPreference): boolean {
  if (offerGroups(preference).some((group) => group.offers.some((offer) => offer.id === id))) return true;
  return addonOffers(preference).some((offer) => offer.id === id);
}

export function cateringDishFits(id: string, preference: FastingPreference): boolean {
  const pkg = packageFor(preference);
  return pkg.included.some((dish) => dish.id === id) || pkg.addons.some((dish) => dish.id === id);
}

function dishFits(id: string, preference: FastingPreference, kind: OrderKind): boolean {
  return kind === "weekly" ? weeklyDishFits(id, preference) : cateringDishFits(id, preference);
}

/** True when the new meal type would drop a food the customer already has. */
export function mealTypeDropsLines(lines: DraftLine[], next: FastingPreference, kind: OrderKind): boolean {
  return lines.some((line) => !dishFits(line.itemId, next, kind));
}

/**
 * Keep foods that belong to the next meal type.
 * Switching between fasting and non-fasting catering adds that side's recommended foods
 * when they were not part of the previous list. Mixed keeps the current foods and does not add the other side.
 */
export function linesForMealType(
  lines: DraftLine[],
  previous: FastingPreference,
  next: FastingPreference,
  kind: OrderKind,
  guestCount = 1,
): DraftLine[] {
  const kept = lines.filter((line) => dishFits(line.itemId, next, kind));
  if (kind !== "catering" || next === "mixed" || next === previous) return kept;
  const previousIncluded = new Set(packageFor(previous).included.map((dish) => dish.id));
  const have = new Set(kept.map((line) => line.itemId));
  const added: DraftLine[] = defaultCateringSelection(next)
    .filter((id) => !have.has(id) && !previousIncluded.has(id))
    .map((id) => ({
      lineId: `pkg-${id}`,
      itemId: id,
      quantity: Math.max(1, guestCount || 1),
      dayIndex: null,
      mealSlot: null,
      customization: EMPTY_CUSTOMIZATION,
      source: "included",
      portionId: null,
    }));
  return [...kept, ...added];
}

export function cateringFoodSections(preference: FastingPreference): { side: "fasting" | "non_fasting"; title: string; dishes: PackageDish[] }[] {
  if (preference === "non_fasting") {
    return [{ side: "non_fasting", title: "Non-Fasting", dishes: NON_FASTING_PACKAGE.included }];
  }
  if (preference === "fasting") {
    return [{ side: "fasting", title: "Fasting", dishes: FASTING_PACKAGE.included }];
  }
  const fastingIds = new Set(FASTING_PACKAGE.included.map((dish) => dish.id));
  return [
    { side: "fasting", title: "Fasting", dishes: FASTING_PACKAGE.included },
    {
      side: "non_fasting",
      title: "Non-Fasting",
      dishes: NON_FASTING_PACKAGE.included.filter((dish) => !fastingIds.has(dish.id)),
    },
  ];
}

export function cateringAddons(preference: FastingPreference): PackageDish[] {
  return packageFor(preference).addons;
}

export function cateringSelectionChanged(preference: FastingPreference, includedIds: string[]): boolean {
  const defaults = defaultCateringSelection(preference);
  if (includedIds.length !== defaults.length) return true;
  const chosen = new Set(includedIds);
  return defaults.some((id) => !chosen.has(id));
}

export function serviceQuote(draft: Pick<OrderDraft, "kind" | "guestCount" | "durationDays" | "fastingPreference">, addonIds: string[]): ServiceQuote | null {
  if (draft.kind !== "catering") return null;
  const count = Number.isInteger(draft.guestCount) && draft.guestCount > 0 ? draft.guestCount : 0;
  const basePer = CATERING_PRICE_PER_PERSON;
  const chosen = new Set(addonIds);
  const catalog = packageFor(draft.fastingPreference).addons;
  const addons = catalog
    .filter((dish) => chosen.has(dish.id))
    .map((dish) => {
      const perPerson = addonUnitPrice(draft.fastingPreference, dish.id);
      return { id: dish.id, label: dish.label, perPerson, total: roundMoney(perPerson * count) };
    });
  const baseTotal = roundMoney(basePer * count);
  return {
    count,
    countLabel: "guests",
    basePer,
    baseTotal,
    addons,
    total: roundMoney(baseTotal + addons.reduce((sum, line) => sum + line.total, 0)),
  };
}

/** What one catering line contributes before it is multiplied by the guest count. */
export function cateringUnitPrice(
  preference: FastingPreference,
  line: Pick<DraftLine, "itemId" | "source">,
  lines: Pick<DraftLine, "itemId" | "source">[] = [],
): number {
  const extra = line.source === "addon" ? addonUnitPrice(preference, line.itemId) : 0;
  const carrier = lines.find((entry) => entry.source !== "addon")?.itemId ?? lines[0]?.itemId;
  return (line.itemId === carrier ? CATERING_PRICE_PER_PERSON : 0) + extra;
}

/** Weekly meals are priced per container. Add-ons use their own rate. The container size comes from the 1-week or 2-week choice. */
export function weeklyLineUnit(
  preference: FastingPreference,
  line: Pick<DraftLine, "itemId" | "source">,
  _lines: Pick<DraftLine, "itemId" | "source">[],
  menuUnit: number,
): number {
  if (line.source === "addon") return addonUnitPrice(preference, line.itemId);
  return menuUnit;
}

export type AddonMemory = Record<FastingPreference, string[]>;

export function readAddonMemory(): AddonMemory {
  const empty: AddonMemory = { fasting: [], non_fasting: [], mixed: [] };
  if (typeof window === "undefined") return empty;
  try {
    const raw = sessionStorage.getItem(ADDON_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<AddonMemory>;
    return {
      fasting: Array.isArray(parsed.fasting) ? parsed.fasting.filter((id) => typeof id === "string") : [],
      non_fasting: Array.isArray(parsed.non_fasting) ? parsed.non_fasting.filter((id) => typeof id === "string") : [],
      mixed: Array.isArray(parsed.mixed) ? parsed.mixed.filter((id) => typeof id === "string") : [],
    };
  } catch {
    return empty;
  }
}

export function writeAddonMemory(preference: FastingPreference, ids: string[]) {
  if (typeof window === "undefined") return;
  const current = readAddonMemory();
  current[preference] = ids;
  sessionStorage.setItem(ADDON_KEY, JSON.stringify(current));
}

export function readIncludedMemory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(INCLUDED_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function writeIncludedMemory(ids: string[]) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(INCLUDED_KEY, JSON.stringify(ids));
}

export function buildPackageLines(
  draft: OrderDraft,
  menu: MenuItem[],
  addonIds: string[],
  previous: DraftLine[],
  customize: (item: MenuItem) => Customization,
  includedIds: string[] = [],
  quantities: Record<string, number> = {},
  portions: PortionPicks | null = null,
): DraftLine[] {
  const pkg = packageFor(draft.fastingPreference);
  const weekly = draft.kind === "weekly";
  if (weekly) {
    if (portions) return linesFromPortions(draft, menu, portions, previous, customize);
    const meals = linesFromPortions(
      draft,
      menu,
      picksFromLines(previous.filter((line) => line.source !== "addon")),
      previous,
      customize,
    );
    const chosen = new Set(addonIds);
    const previousById = new Map(previous.map((line) => [line.itemId, line]));
    const extras = pkg.addons.filter((dish) => chosen.has(dish.id) && !isPortionFood(dish.id));
    const addonLines = extras.flatMap((row) => {
      const item = menu.find((entry) => entry.id === row.id && entry.available);
      if (!item) return [];
      const existing = previousById.get(row.id);
      return [
        {
          lineId: existing?.lineId ?? `pkg-${row.id}`,
          itemId: row.id,
          quantity: 1,
          dayIndex: 0,
          mealSlot: existing?.mealSlot ?? "lunch",
          customization: existing?.customization ?? customize(item),
          source: "addon" as const,
          portionId: null,
        },
      ];
    });
    return [...meals, ...addonLines];
  }
  const chosen = new Set(addonIds);
  const previousById = new Map(previous.map((line) => [line.itemId, line]));
  const uniqueIncluded = includedIds.filter((id, index) => includedIds.indexOf(id) === index);
  const includedDishes = uniqueIncluded.flatMap((id) => {
    const dish = pkg.included.find((entry) => entry.id === id);
    return dish ? [dish] : [];
  });
  const includedSet = new Set(includedDishes.map((dish) => dish.id));
  const addonDishes = pkg.addons.filter((dish) => chosen.has(dish.id) && !includedSet.has(dish.id));
  const rows = [
    ...includedDishes.map((dish) => ({ ...dish, source: "included" as const })),
    ...addonDishes.map((dish) => ({ ...dish, source: "addon" as const })),
  ];
  return rows.flatMap((row) => {
    const item = menu.find((entry) => entry.id === row.id && entry.available);
    if (!item) return [];
    const existing = previousById.get(row.id);
    const requested = quantities[row.id];
    const quantity = weekly
      ? Math.max(1, Math.min(20, requested ?? existing?.quantity ?? 1))
      : servingCount(draft);
    return [
      {
        lineId: existing?.lineId ?? `pkg-${row.id}`,
        itemId: row.id,
        quantity,
        dayIndex: weekly ? 0 : null,
        mealSlot: weekly ? (existing?.mealSlot ?? "lunch") : null,
        customization: existing?.customization ?? customize(item),
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
      previous.dayIndex === line.dayIndex &&
      (previous.portionId ?? null) === (line.portionId ?? null)
    );
  });
}
