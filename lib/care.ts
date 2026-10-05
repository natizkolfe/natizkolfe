import type {
  CareFoodSnapshot,
  CareInstruction,
  CareSections,
  CareSnapshot,
  Database,
  OrderKind,
  OrderRecord,
} from "@/lib/types";

export const CARE_FIELDS: { key: keyof CareSections; label: string; customer: string }[] = [
  { key: "storage", label: "Storage instructions", customer: "Storage" },
  { key: "serving", label: "Serving instructions", customer: "Serving" },
  { key: "utensils", label: "Utensil instructions", customer: "Utensils" },
  { key: "reheating", label: "Reheating instructions", customer: "Reheating" },
  { key: "leftovers", label: "Leftover instructions", customer: "Leftovers" },
  { key: "notes", label: "Additional notes", customer: "Longer storage" },
];

export const EMPTY_CARE_SECTIONS = (): CareSections => ({
  storage: "",
  serving: "",
  utensils: "",
  reheating: "",
  leftovers: "",
  notes: "",
});

const TOKEN = /^[A-Za-z0-9_-]{20,80}$/;
const FOOD = /^[a-z0-9-]{1,64}$/;

export function newCareToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function containerSize(order: { kind: OrderKind; durationDays: number | null }): string {
  if (order.kind !== "weekly") return "Catering";
  return order.durationDays === 14 ? "28 oz" : "24 oz";
}

function sectionText(value: string): string {
  return value.trim();
}

function appendSections(base: CareSections, extra: CareSections): CareSections {
  const next = { ...base };
  for (const field of CARE_FIELDS) {
    const add = sectionText(extra[field.key]);
    if (!add) continue;
    const current = sectionText(next[field.key]);
    next[field.key] = current ? `${current}\n\n${add}` : add;
  }
  return next;
}

function overrideSections(base: CareSections, extra: CareSections): CareSections {
  const next = { ...base };
  for (const field of CARE_FIELDS) {
    const add = sectionText(extra[field.key]);
    if (add) next[field.key] = add;
  }
  return next;
}

function hasText(sections: CareSections): boolean {
  return CARE_FIELDS.some((field) => sectionText(sections[field.key]).length > 0);
}

function matches(
  instruction: CareInstruction,
  foodId: string,
  kind: OrderKind,
  durationDays: number | null,
): boolean {
  if (!instruction.active) return false;
  if (!instruction.foodIds.includes(foodId)) return false;
  if (instruction.service && instruction.service !== kind) return false;
  if (instruction.durationDays != null && instruction.durationDays !== durationDays) return false;
  return true;
}

export function resolveOrderCare(
  instructions: CareInstruction[],
  order: { kind: OrderKind; durationDays: number | null; lines: { itemId: string; name: string }[] },
): CareFoodSnapshot[] {
  const foods: CareFoodSnapshot[] = [];
  const seen = new Set<string>();
  for (const line of order.lines) {
    if (seen.has(line.itemId)) continue;
    seen.add(line.itemId);
    const matching = instructions.filter((instruction) =>
      matches(instruction, line.itemId, order.kind, order.kind === "weekly" ? order.durationDays : null),
    );
    const base = matching.filter((instruction) => instruction.durationDays == null && instruction.kind === "template");
    const overrides = matching.filter((instruction) => instruction.durationDays == null && instruction.kind === "override");
    const extras = matching.filter((instruction) => instruction.durationDays != null);
    let sections = EMPTY_CARE_SECTIONS();
    const sources: CareFoodSnapshot["sources"] = [];
    let placeholder = false;
    for (const instruction of base) {
      sections = appendSections(sections, instruction.sections);
      sources.push({ id: instruction.id, name: instruction.name, version: instruction.version });
      if (instruction.placeholder) placeholder = true;
    }
    for (const instruction of overrides) {
      sections = overrideSections(sections, instruction.sections);
      sources.push({ id: instruction.id, name: instruction.name, version: instruction.version });
      if (instruction.placeholder) placeholder = true;
    }
    for (const instruction of extras) {
      sections = appendSections(sections, instruction.sections);
      sources.push({ id: instruction.id, name: instruction.name, version: instruction.version });
      if (instruction.placeholder) placeholder = true;
    }
    if (!hasText(sections)) continue;
    foods.push({ foodId: line.itemId, name: line.name, sections, placeholder, sources });
  }
  return foods;
}

export function captureCare(db: Database, order: OrderRecord, at = new Date().toISOString()): void {
  if (!order.careToken) order.careToken = newCareToken();
  const foods = resolveOrderCare(db.careInstructions ?? [], order);
  const versions = foods.flatMap((food) => food.sources.map((source) => source.version));
  const max = versions.length ? Math.max(...versions) : 1;
  const snapshot: CareSnapshot = {
    version: `1.${max}`,
    capturedAt: at,
    placeholder: foods.some((food) => food.placeholder),
    foods,
  };
  order.care = snapshot;
}

/** Freeze the current instructions the first time a paid order needs a care sheet. */
export function publishCare(db: Database, order: OrderRecord): void {
  if (!order.careToken) order.careToken = newCareToken();
  if (!order.paidAt || order.care) return;
  captureCare(db, order);
}

export interface PublicCareFood {
  foodId: string;
  name: string;
  sections: CareSections;
}

export interface PublicCare {
  orderNumber: string;
  version: string;
  placeholder: boolean;
  foods: PublicCareFood[];
}

export function publicCare(order: OrderRecord, foodId?: string): PublicCare | "unknown-food" | null {
  if (!order.careToken || !TOKEN.test(order.careToken) || !order.care) return null;
  const foods = order.care.foods.map((food) => ({
    foodId: food.foodId,
    name: food.name,
    sections: food.sections,
  }));
  if (!foodId) {
    return {
      orderNumber: order.number,
      version: order.care.version,
      placeholder: order.care.placeholder,
      foods,
    };
  }
  if (!FOOD.test(foodId)) return null;
  const match = foods.filter((food) => food.foodId === foodId);
  if (match.length === 0) return "unknown-food";
  return {
    orderNumber: order.number,
    version: order.care.version,
    placeholder: order.care.placeholder,
    foods: match,
  };
}

export function findCareOrder(db: Database, token: string): OrderRecord | undefined {
  if (!TOKEN.test(token)) return undefined;
  return db.orders.find((order) => order.careToken === token);
}

export interface CareLabel {
  foodId: string;
  name: string;
  quantity: number;
  size: string;
  path: string;
}

/**
 * One QR per dish. Weekly prints that code once, even when the dish is ordered
 * more than once. Catering reprints the same code once for each guest.
 */
export function labelCopies(order: OrderRecord): number {
  if (order.kind === "catering") return Math.max(1, order.guestCount ?? 1);
  return 1;
}

export function careLabels(order: OrderRecord): CareLabel[] {
  if (!order.careToken || !order.care) return [];
  const size = containerSize(order);
  const quantity = labelCopies(order);
  return order.care.foods.map((food) => ({
    foodId: food.foodId,
    name: food.name,
    quantity,
    size,
    path: `/care/${order.careToken}/${food.foodId}`,
  }));
}

function clip(value: unknown, max: number): string {
  return String(value ?? "").trim().slice(0, max);
}

export function readCareInput(
  body: Record<string, unknown>,
  menuIds: Set<string>,
  templates: CareInstruction[],
): { ok: true; value: Omit<CareInstruction, "id" | "version" | "updatedAt"> } | { ok: false; message: string } {
  const name = clip(body.name, 80);
  if (name.length < 2) return { ok: false, message: "Give the instruction a name." };
  const kind = body.kind === "override" ? "override" : body.kind === "template" ? "template" : null;
  if (!kind) return { ok: false, message: "Choose a template or a food-specific override." };
  const foodIds = Array.isArray(body.foodIds)
    ? [...new Set(body.foodIds.map((id) => String(id)).filter((id) => menuIds.has(id)))]
    : [];
  if (foodIds.length === 0) return { ok: false, message: "Choose at least one food." };
  const service = body.service === "weekly" || body.service === "catering" ? body.service : "";
  let durationDays: 7 | 14 | null = null;
  if (service !== "catering" && (body.durationDays === 7 || body.durationDays === 14)) durationDays = body.durationDays;
  const templateId =
    kind === "override" && typeof body.templateId === "string" && templates.some((entry) => entry.id === body.templateId)
      ? body.templateId
      : null;
  const source = body.sections && typeof body.sections === "object" ? (body.sections as Record<string, unknown>) : {};
  const sections = EMPTY_CARE_SECTIONS();
  for (const field of CARE_FIELDS) sections[field.key] = clip(source[field.key], 4000);
  if (!hasText(sections)) return { ok: false, message: "Add at least one instruction." };
  return {
    ok: true,
    value: {
      kind,
      name,
      foodIds,
      category: clip(body.category, 40),
      service,
      durationDays,
      templateId,
      sections,
      active: body.active !== false,
      placeholder: body.placeholder !== false,
    },
  };
}
