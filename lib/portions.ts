import type { Customization, DraftLine, FastingPreference, MenuItem, OrderDraft } from "@/lib/types";

export type ContainerShape = "round" | "square";

/** Temporary price for a regular weekly meal. Change this when final prices are set. */
export const WEEKLY_MEAL_PRICE = 20;

/** Temporary price for a weekly add-on. Change this when final prices are set. */
export const WEEKLY_ADDON_PRICE = 20;

/** Habesha Defo does not use the regular meal price. */
export const HABESHA_DEFO_PRICE = 15;

export const CONTAINER_PORTION_ID = "container";

export interface PortionOption {
  id: string;
  label: string;
  sizeLabel: string;
  container: ContainerShape;
  price: number;
}

export interface FoodOffer {
  id: string;
  label: string;
  description: string;
  side: "fasting" | "non_fasting";
  kind: "meal" | "addon";
  price: number;
}

export interface PortionPick {
  optionId: string;
  quantity: number;
}

export type PortionPicks = Record<string, PortionPick>;

function meal(
  id: string,
  label: string,
  description: string,
  side: FoodOffer["side"],
  price = WEEKLY_MEAL_PRICE,
): FoodOffer {
  return { id, label, description, side, kind: "meal", price };
}

function addon(id: string, label: string, description: string, side: FoodOffer["side"]): FoodOffer {
  return { id, label, description, side, kind: "addon", price: WEEKLY_ADDON_PRICE };
}

const MEALS: FoodOffer[] = [
  meal("misir-wot", "Misir Wot", "Red lentils in a berbere sauce.", "fasting"),
  meal("gomen", "Gomen", "Collard greens with garlic, ginger, and green chili.", "fasting"),
  meal("atkilt-wot", "Atakilt", "Cabbage, potato, and carrot simmered with turmeric.", "fasting"),
  meal("doro-wot", "Doro Wot", "Traditional Ethiopian chicken stew.", "non_fasting"),
  meal("awaze-tibs", "Tibs", "Sautéed beef with peppers and awaze.", "non_fasting"),
  meal("beef-alicha", "Beef Alicha", "A mild beef stew with turmeric and ginger.", "non_fasting"),
  meal("timatim-salad", "Timatim Salad", "Tomato salad with onion, jalapeño, and lemon.", "non_fasting"),
  meal("habesha-defo", "Habesha Defo", "Traditional Habesha bread.", "fasting", HABESHA_DEFO_PRICE),
];

const ADDONS: FoodOffer[] = [
  addon("kik-alicha", "Kik Alicha", "Yellow split peas in a mild turmeric sauce.", "fasting"),
  addon("azifa", "Azifa", "Green lentils with onion, mustard, and lemon.", "fasting"),
  addon("kitfo", "Kitfo", "Minced beef with mitmita and niter kibbeh.", "non_fasting"),
  addon("key-wot", "Key Wot", "Beef stewed in a deep berbere sauce.", "non_fasting"),
  addon("ayib", "Ayib", "Fresh farmer cheese, cool and mild.", "non_fasting"),
];

const OFFERS = [...MEALS, ...ADDONS];
const BY_ID = new Map(OFFERS.map((entry) => [entry.id, entry]));

const FASTING_MEAL_IDS = ["misir-wot", "gomen", "atkilt-wot"];
const NON_FASTING_MEAL_IDS = ["doro-wot", "awaze-tibs", "beef-alicha", "gomen", "timatim-salad"];

export const CONTAINER_MARK: Record<ContainerShape, { src: string; alt: string }> = {
  round: { src: "/containers/24oz-round.png", alt: "24 oz round container" },
  square: { src: "/containers/28oz-square.png", alt: "28 oz square container" },
};

export function containerForDays(days: number | null | undefined): PortionOption {
  if (days === 14) {
    return { id: CONTAINER_PORTION_ID, label: "28 oz", sizeLabel: "28 oz", container: "square", price: WEEKLY_MEAL_PRICE };
  }
  return { id: CONTAINER_PORTION_ID, label: "24 oz", sizeLabel: "24 oz", container: "round", price: WEEKLY_MEAL_PRICE };
}

export function foodOffer(id: string): FoodOffer | null {
  return BY_ID.get(id) ?? null;
}

export function isPortionFood(id: string): boolean {
  return foodOffer(id)?.kind === "meal";
}

export function weeklyUnitPrice(itemId: string, source: "included" | "addon" | undefined): number {
  const offer = foodOffer(itemId);
  if (offer) return offer.price;
  if (source === "addon") return WEEKLY_ADDON_PRICE;
  return WEEKLY_MEAL_PRICE;
}

export function offerGroups(preference: FastingPreference): { side: "fasting" | "non_fasting"; title: string; offers: FoodOffer[] }[] {
  const take = (ids: string[]) => ids.flatMap((id) => {
    const row = foodOffer(id);
    return row ? [row] : [];
  });
  const habesha = foodOffer("habesha-defo");
  const withBread = (offers: FoodOffer[]) => (habesha ? [...offers, habesha] : offers);
  if (preference === "fasting") {
    return [{ side: "fasting", title: "Fasting", offers: withBread(take(FASTING_MEAL_IDS)) }];
  }
  if (preference === "non_fasting") {
    return [{ side: "non_fasting", title: "Non-Fasting", offers: withBread(take(NON_FASTING_MEAL_IDS)) }];
  }
  const fasting = take(FASTING_MEAL_IDS);
  const seen = new Set(fasting.map((row) => row.id));
  return [
    { side: "fasting", title: "Fasting", offers: fasting },
    { side: "non_fasting", title: "Non-Fasting", offers: take(NON_FASTING_MEAL_IDS).filter((row) => !seen.has(row.id)) },
    { side: "fasting", title: "Habesha Defo", offers: habesha ? [habesha] : [] },
  ];
}

export function addonOffers(preference: FastingPreference): FoodOffer[] {
  return ADDONS.filter((offer) => preference === "mixed" || offer.side === preference);
}

export function picksFromLines(lines: Pick<DraftLine, "itemId" | "quantity" | "source">[]): PortionPicks {
  const picks: PortionPicks = {};
  for (const line of lines) {
    const offer = foodOffer(line.itemId);
    if (!offer) continue;
    if (offer.kind === "addon" && line.source !== "addon") continue;
    if (offer.kind === "meal" && line.source === "addon") continue;
    picks[line.itemId] = { optionId: offer.kind === "addon" ? "addon" : CONTAINER_PORTION_ID, quantity: line.quantity };
  }
  return picks;
}

const PICK_KEY = "gebeta-portion-picks";

export function readPortionMemory(preference: FastingPreference): PortionPicks {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(PICK_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { preference?: string; picks?: PortionPicks };
    if (parsed.preference !== preference || !parsed.picks) return {};
    const picks: PortionPicks = {};
    for (const [id, pick] of Object.entries(parsed.picks)) {
      if (!foodOffer(id) || !pick) continue;
      const quantity = Number(pick.quantity);
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) continue;
      picks[id] = { optionId: foodOffer(id)?.kind === "addon" ? "addon" : CONTAINER_PORTION_ID, quantity };
    }
    return picks;
  } catch {
    return {};
  }
}

export function writePortionMemory(preference: FastingPreference, picks: PortionPicks) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(PICK_KEY, JSON.stringify({ preference, picks }));
}

export function linesFromPortions(
  draft: OrderDraft,
  menu: MenuItem[],
  picks: PortionPicks,
  previous: DraftLine[],
  customize: (item: MenuItem) => Customization,
): DraftLine[] {
  const previousById = new Map(previous.map((line) => [line.itemId, line]));
  return Object.entries(picks).flatMap(([id, pick]) => {
    const offer = foodOffer(id);
    const item = menu.find((entry) => entry.id === id && entry.available);
    if (!offer || !item) return [];
    const existing = previousById.get(id);
    const addonLine = offer.kind === "addon";
    return [
      {
        lineId: existing?.lineId ?? `pkg-${id}`,
        itemId: id,
        quantity: Math.max(1, Math.min(20, pick.quantity)),
        dayIndex: 0,
        mealSlot: existing?.mealSlot ?? "lunch",
        customization: existing?.customization ?? customize(item),
        source: addonLine ? ("addon" as const) : ("included" as const),
        portionId: addonLine ? null : CONTAINER_PORTION_ID,
      },
    ];
  });
}
