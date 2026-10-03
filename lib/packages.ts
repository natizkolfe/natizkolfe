import type { Customization, DraftLine, FastingPreference, MenuItem, OrderDraft } from "@/lib/types";

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export const CATERING_PRICE_PER_PERSON = 21;

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
    { id: "shiro-wot", label: "Shiro", side: "fasting" },
    { id: "gomen", label: "Gomen", side: "fasting" },
    { id: "atkilt-wot", label: "Atakilt", side: "fasting" },
    { id: "fosolia", label: "Vegetable Side", side: "fasting" },
  ],
  addons: [
    { id: "kik-alicha", label: "Kik Alicha", side: "fasting", pricePerPerson: 4 },
    { id: "azifa", label: "Azifa", side: "fasting", pricePerPerson: 3 },
    { id: "injera", label: "Extra Injera", side: "fasting", pricePerPerson: 2 },
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
    { id: "timatim-salad", label: "Vegetable Side", side: "non_fasting" },
  ],
  addons: [
    { id: "kitfo", label: "Kitfo", side: "non_fasting", pricePerPerson: 9 },
    { id: "key-wot", label: "Key Wot", side: "non_fasting", pricePerPerson: 7 },
    { id: "ayib", label: "Ayib", side: "non_fasting", pricePerPerson: 3 },
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
    icons: ["shiro-wot", "gomen"],
    title: "Fasting",
    detail: "Traditional Ethiopian fasting meals.",
    note: "Standard package included",
  },
  {
    id: "non_fasting",
    icons: ["doro-wot", "awaze-tibs"],
    title: "Non-Fasting",
    detail: "Traditional Ethiopian non-fasting meals.",
    note: "Standard package included",
  },
  {
    id: "mixed",
    icons: ["shiro-wot", "awaze-tibs"],
    title: "Mixed",
    detail: "Combine fasting and non-fasting meals based on your preferences.",
    note: "Customize your standard selections",
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
  "shiro-wot": "/dishes/shiro-wot.jpg",
  "misir-wot": "/dishes/misir-wot.jpg",
  "gomen": "/dishes/gomen.jpg",
  "kitfo": "/dishes/kitfo.jpg",
  "atkilt-wot": "/dishes/atkilt-wot.jpg",
  "beef-alicha": "/dishes/beef-alicha.jpg",
  "awaze-tibs": "/dishes/awaze-tibs.jpg",
  "yebesiga-alicha": "/dishes/yebesiga-alicha.jpg",
  "timatim-fitfit": "/dishes/timatim-fitfit.jpg",
  fosolia: "/dishes/fosolia.jpg",
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
  return null;
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
  return null;
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
  { days: 7 | 14; weeks: 1 | 2; title: string; imageSrc: string | null; imageAlt: string; sizeNote: string }
> = {
  7: {
    days: 7,
    weeks: 1,
    title: "1 Week Meal Package",
    imageSrc: "/containers/1-week.png",
    imageAlt: "Glass container for the 1 week meal package",
    sizeNote: "Container size to be confirmed.",
  },
  14: {
    days: 14,
    weeks: 2,
    title: "2 Week Meal Package",
    imageSrc: "/containers/2-week.png",
    imageAlt: "Larger glass container for the 2 week meal package",
    sizeNote: "Container size to be confirmed.",
  },
};

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

export function serviceQuote(draft: Pick<OrderDraft, "kind" | "guestCount" | "durationDays" | "fastingPreference">, addonIds: string[]): ServiceQuote | null {
  const catering = draft.kind === "catering";
  const mixedWeekly = draft.kind === "weekly" && draft.fastingPreference === "mixed";
  if (!catering && !mixedWeekly) return null;
  const count = catering ? (Number.isInteger(draft.guestCount) && draft.guestCount > 0 ? draft.guestCount : 0) : draft.durationDays;
  const basePer = catering ? CATERING_PRICE_PER_PERSON : WEEKLY_PACKAGE_PRICE_PER_DAY;
  const chosen = new Set(addonIds);
  const catalog = draft.fastingPreference === "mixed" ? mixedAddonChoices([]) : packageFor(draft.fastingPreference).addons;
  const addons = catalog
    .filter((dish) => chosen.has(dish.id))
    .map((dish) => {
      const perPerson = addonUnitPrice(draft.fastingPreference, dish.id);
      return { id: dish.id, label: dish.label, perPerson, total: roundMoney(perPerson * count) };
    });
  const baseTotal = roundMoney(basePer * count);
  return {
    count,
    countLabel: catering ? "guests" : "days",
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
  const pkg = packageFor(preference);
  if (line.source === "included") {
    const first = pkg.choiceLimit
      ? lines.find((entry) => entry.source === "included")?.itemId
      : pkg.included[0]?.id;
    return line.itemId === first ? CATERING_PRICE_PER_PERSON : 0;
  }
  if (line.source === "addon") return addonUnitPrice(preference, line.itemId);
  return 0;
}

/** Weekly included dishes keep their menu price, except a mixed package, which has one flat rate. */
export function weeklyLineUnit(
  preference: FastingPreference,
  line: Pick<DraftLine, "itemId" | "source">,
  lines: Pick<DraftLine, "itemId" | "source">[],
  menuUnit: number,
): number {
  if (line.source === "addon") return addonUnitPrice(preference, line.itemId);
  if (preference === "mixed" && line.source === "included") {
    const first = lines.find((entry) => entry.source === "included")?.itemId;
    return line.itemId === first ? WEEKLY_PACKAGE_PRICE_PER_DAY : 0;
  }
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
): DraftLine[] {
  const pkg = packageFor(draft.fastingPreference);
  const quantity = servingCount(draft);
  const chosen = new Set(addonIds);
  const previousById = new Map(previous.map((line) => [line.itemId, line]));
  const includedDishes = pkg.choiceLimit
    ? includedIds
        .filter((id, index) => includedIds.indexOf(id) === index)
        .slice(0, pkg.choiceLimit)
        .flatMap((id) => {
          const dish = pkg.included.find((entry) => entry.id === id);
          return dish ? [dish] : [];
        })
    : pkg.included;
  const includedSet = new Set(includedDishes.map((dish) => dish.id));
  const addonDishes = [
    ...(pkg.choiceLimit ? pkg.included.filter((dish) => chosen.has(dish.id) && !includedSet.has(dish.id)) : []),
    ...pkg.addons.filter((dish) => chosen.has(dish.id)),
  ];
  const rows = [
    ...includedDishes.map((dish) => ({ ...dish, source: "included" as const })),
    ...addonDishes.map((dish) => ({ ...dish, source: "addon" as const })),
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
      previous.dayIndex === line.dayIndex
    );
  });
}
