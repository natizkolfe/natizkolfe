import { addDays, formatDate, formatTime, isIsoDate, todayISO } from "@/lib/dates";
import { addonUnitPrice, cateringUnitPrice, serviceQuote, weeklyLineUnit } from "@/lib/packages";
import { FASTING_LABEL, FULFILLMENT_LABEL, KIND_LABEL, SPICE_LABEL } from "@/lib/format";
import type {
  Customization,
  Database,
  DraftLine,
  MenuItem,
  OrderDraft,
  OrderLine,
  OrderRecord,
  OrderStatus,
  Preferences,
  PublicSettings,
  Settings,
  SpiceLevel,
  UserRecord,
} from "@/lib/types";

export class OrderError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

const SPICES: SpiceLevel[] = ["none", "mild", "medium", "hot", "extra"];

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function emptyPreferences(): Preferences {
  return {
    fastingPreference: "mixed",
    spiceLevel: null,
    allergens: [],
    dislikedIngredients: [],
    dietary: [],
    notes: "",
  };
}

export function blankCustomization(): Customization {
  return {
    spiceLevel: null,
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
}

export function initialCustomization(item: MenuItem, prefs?: Preferences | null): Customization {
  const spice =
    item.allowSpice && prefs?.spiceLevel && item.spiceLevels.includes(prefs.spiceLevel)
      ? prefs.spiceLevel
      : item.defaultSpice;
  let fastingStyle: Customization["fastingStyle"] = null;
  if (item.canChooseFastingStyle) {
    if (prefs?.fastingPreference === "non_fasting") fastingStyle = "non_fasting";
    else fastingStyle = "fasting";
  }
  return {
    spiceLevel: spice,
    allergens: (prefs?.allergens ?? []).filter((entry) => item.allergenHints.includes(entry)),
    excludedIngredients: (prefs?.dislikedIngredients ?? []).filter((entry) =>
      item.ingredients.includes(entry),
    ),
    preferredIngredients: [],
    dietary: (prefs?.dietary ?? []).filter((entry) => item.dietaryOptions.includes(entry)),
    fastingStyle,
    choice: item.choice?.defaultOption ?? null,
    sauces: [],
    extras: [],
    notes: "",
  };
}

export function publicSettings(settings: Settings, now = new Date()): PublicSettings {
  const today = todayISO(settings.timezone, now);
  return {
    ...settings,
    today,
    earliestWeeklyDate: addDays(today, settings.weeklyLeadDays),
    earliestCateringDate: addDays(today, settings.cateringLeadDays),
  };
}

export function defaultDraft(settings: PublicSettings, kind: OrderDraft["kind"] = "weekly"): OrderDraft {
  return {
    kind,
    fulfillment: "pickup",
    fastingPreference: "fasting",
    durationDays: 7,
    startDate: settings.earliestWeeklyDate,
    guestCount: settings.minCateringGuests,
    eventDate: settings.earliestCateringDate,
    eventTime: "12:00",
    address: "",
    delivery: null,
    lines: [],
  };
}

export function presetQuantity(mode: "guests" | "half" | "double" | "per10", guests: number): number {
  if (mode === "half") return Math.max(1, Math.ceil(guests / 2));
  if (mode === "double") return guests * 2;
  if (mode === "per10") return Math.max(1, Math.ceil(guests / 10));
  return guests;
}

export function suggestedQuantity(item: MenuItem, draft: OrderDraft): number {
  if (draft.kind !== "catering") return 1;
  const guests = draft.guestCount;
  if (item.category === "condiment") return Math.max(1, Math.ceil(guests / 10));
  if (item.id === "injera") return guests * 2;
  if (item.category === "side") return Math.max(1, Math.ceil(guests / 2));
  if (item.category === "salad") return Math.max(1, Math.ceil(guests / 2));
  return guests;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

export function sanitizeCustomization(item: MenuItem, input: Partial<Customization> | null): Customization {
  const source = input ?? {};
  const notes = (source.notes ?? "").trim();
  if (notes.length > 400) {
    throw new OrderError("Kitchen notes need to stay under 400 characters.");
  }

  let spiceLevel: SpiceLevel | null = null;
  if (item.allowSpice) {
    const requested = source.spiceLevel ?? item.defaultSpice;
    if (requested && !item.spiceLevels.includes(requested)) {
      throw new OrderError(`${item.name} cannot be prepared at that spice level.`);
    }
    spiceLevel = requested && SPICES.includes(requested) ? requested : item.defaultSpice;
  }

  let fastingStyle: Customization["fastingStyle"] = null;
  if (item.canChooseFastingStyle) {
    fastingStyle = source.fastingStyle === "non_fasting" ? "non_fasting" : "fasting";
  }

  let choice: string | null = null;
  if (item.choice) {
    const requested = source.choice ?? item.choice.defaultOption;
    if (!item.choice.options.includes(requested)) {
      throw new OrderError(`${item.name} needs a valid ${item.choice.label.toLowerCase()} choice.`);
    }
    choice = requested;
  }

  const excludedIngredients = unique(source.excludedIngredients ?? []).filter((entry) =>
    item.ingredients.includes(entry),
  );
  if (item.ingredients.length > 0 && excludedIngredients.length >= item.ingredients.length) {
    throw new OrderError(`Leave at least one part of ${item.name}, or remove the dish.`);
  }

  return {
    spiceLevel,
    allergens: unique(source.allergens ?? []).filter((entry) => item.allergenHints.includes(entry)),
    excludedIngredients,
    preferredIngredients: unique(source.preferredIngredients ?? []).filter((entry) =>
      item.preferredOptions.includes(entry),
    ),
    dietary: unique(source.dietary ?? []).filter((entry) => item.dietaryOptions.includes(entry)),
    fastingStyle,
    choice,
    sauces: unique(source.sauces ?? []).filter((entry) => item.sauces.includes(entry)),
    extras: unique(source.extras ?? []).filter((entry) => item.extras.some((extra) => extra.id === entry)),
    notes,
  };
}

export function describeCustomization(item: MenuItem, customization: Customization): string[] {
  const lines: string[] = [];
  if (customization.fastingStyle === "fasting") {
    lines.push("Fasting preparation, no meat or dairy");
  } else if (customization.fastingStyle === "non_fasting") {
    lines.push("Non-fasting, finished with niter kibbeh");
  }
  if (customization.spiceLevel) {
    lines.push(`Spice: ${SPICE_LABEL[customization.spiceLevel]}`);
  }
  if (customization.choice && item.choice) {
    lines.push(`${item.choice.label}: ${customization.choice}`);
  }
  if (customization.allergens.length) {
    lines.push(`Allergies: ${customization.allergens.join(", ")}`);
  }
  if (customization.excludedIngredients.length) {
    lines.push(`Leave out: ${customization.excludedIngredients.join(", ")}`);
  }
  if (customization.preferredIngredients.length) {
    lines.push(`Prefer: ${customization.preferredIngredients.join(", ")}`);
  }
  if (customization.dietary.length) {
    lines.push(`Diet: ${customization.dietary.join(", ")}`);
  }
  if (customization.sauces.length) {
    lines.push(`Sauce: ${customization.sauces.join(", ")}`);
  }
  if (customization.extras.length) {
    const names = customization.extras.map(
      (id) => item.extras.find((extra) => extra.id === id)?.name ?? id,
    );
    lines.push(`Add-ons: ${names.join(", ")}`);
  }
  if (customization.notes) {
    lines.push(`Kitchen note: ${customization.notes}`);
  }
  return lines;
}

export function unitPrice(item: MenuItem, customization: Customization): number {
  const extras = customization.extras.reduce((sum, id) => {
    const extra = item.extras.find((entry) => entry.id === id);
    return sum + (extra?.price ?? 0);
  }, 0);
  return roundMoney(item.price + extras);
}

export function fulfillmentDate(order: Pick<OrderRecord, "kind" | "startDate" | "eventDate"> | OrderDraft): string {
  return order.kind === "weekly" ? order.startDate ?? "" : order.eventDate ?? "";
}

export function orderEndDate(order: Pick<OrderRecord, "kind" | "startDate" | "durationDays" | "eventDate"> | OrderDraft): string {
  if (order.kind === "catering") return order.eventDate ?? "";
  const start = order.startDate ?? "";
  const days = order.durationDays ?? 7;
  return addDays(start, days - 1);
}

function assertLeadTime(date: string, earliest: string, leadDays: number, label: string) {
  if (!isIsoDate(date)) {
    throw new OrderError(`Choose a valid ${label} date.`);
  }
  if (date < earliest) {
    throw new OrderError(
      `${label[0].toUpperCase()}${label.slice(1)} must be on or after ${formatDate(earliest)}. Orders need at least ${leadDays} days of notice.`,
    );
  }
}

export function cateringGuestsOnDate(db: Database, date: string, exceptId?: string): number {
  return db.orders.reduce((sum, order) => {
    if (order.id === exceptId) return sum;
    if (order.kind !== "catering" || order.eventDate !== date) return sum;
    if (order.status === "cancelled" || order.status === "payment_pending") return sum;
    return sum + (order.guestCount ?? 0);
  }, 0);
}

export function weeklyServingsOnDate(db: Database, date: string, exceptId?: string): number {
  return db.orders.reduce((sum, order) => {
    if (order.id === exceptId) return sum;
    if (order.kind !== "weekly" || !order.startDate || !order.durationDays) return sum;
    if (order.status === "cancelled" || order.status === "payment_pending") return sum;
    const end = addDays(order.startDate, order.durationDays - 1);
    if (date < order.startDate || date > end) return sum;
    const dayIndex = daysBetween(order.startDate, date);
    return (
      sum +
      order.lines.reduce((lineSum, line) => (line.dayIndex === dayIndex ? lineSum + line.quantity : lineSum), 0)
    );
  }, 0);
}

function daysBetween(start: string, date: string): number {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [dy, dm, dd] = date.split("-").map(Number);
  const a = Date.UTC(sy, sm - 1, sd);
  const b = Date.UTC(dy, dm - 1, dd);
  return Math.round((b - a) / 86400000);
}

export function assertCapacity(db: Database, draft: OrderDraft, exceptId?: string) {
  const settings = publicSettings(db.settings);
  if (draft.kind === "catering") {
    const used = cateringGuestsOnDate(db, draft.eventDate, exceptId);
    if (used + draft.guestCount > settings.maxGuestsPerDay) {
      const remaining = Math.max(0, settings.maxGuestsPerDay - used);
      throw new OrderError(
        `The kitchen can take ${remaining} more catering guests on ${formatDate(draft.eventDate)}. This order is for ${draft.guestCount}.`,
      );
    }
    return;
  }
  const days = weekdayCount(draft);
  for (let index = 0; index < days; index += 1) {
    const date = addDays(draft.startDate, index);
    const incoming = draft.lines.reduce(
      (sum, line) => (line.dayIndex === index ? sum + line.quantity : sum),
      0,
    );
    if (incoming === 0) continue;
    const used = weeklyServingsOnDate(db, date, exceptId);
    if (used + incoming > settings.maxWeeklyServingsPerDay) {
      const remaining = Math.max(0, settings.maxWeeklyServingsPerDay - used);
      throw new OrderError(
        `${formatDate(date)} can still take ${remaining} weekly servings. This plan puts ${incoming} on that day.`,
      );
    }
  }
}

function weekdayCount(draft: OrderDraft): number {
  return draft.durationDays;
}

export function buildLines(menu: MenuItem[], draft: OrderDraft): OrderLine[] {
  if (draft.lines.length === 0) {
    throw new OrderError("Add at least one dish before checkout.");
  }
  if (draft.lines.length > 80) {
    throw new OrderError("An order can hold up to 80 customized dishes.");
  }
  if (draft.fastingPreference === "mixed" && !draft.lines.some((entry) => entry.source === "included")) {
    throw new OrderError("Choose at least one standard dish for the mixed package. The package price stays the same.");
  }
  return draft.lines.map((line) => {
    const item = menu.find((entry) => entry.id === line.itemId);
    if (!item || !item.available) {
      throw new OrderError("One of the dishes is no longer on the menu. Remove it and choose again.");
    }
    if (!Number.isInteger(line.quantity) || line.quantity < 1) {
      throw new OrderError(`Choose a quantity for ${item.name}.`);
    }
    const max = draft.kind === "catering" ? 500 : 20;
    if (line.quantity > max) {
      throw new OrderError(`${item.name} can be ordered up to ${max} at a time.`);
    }
    if (draft.kind === "weekly") {
      if (line.dayIndex == null || line.dayIndex < 0 || line.dayIndex >= draft.durationDays) {
        throw new OrderError(`Place ${item.name} on a day inside the meal plan.`);
      }
      if (line.mealSlot !== "lunch" && line.mealSlot !== "dinner") {
        throw new OrderError(`Choose lunch or dinner for ${item.name}.`);
      }
    }
    const customization = sanitizeCustomization(item, line.customization);
    const unit =
      draft.kind === "catering"
        ? cateringUnitPrice(draft.fastingPreference, line, draft.lines)
        : weeklyLineUnit(draft.fastingPreference, line, draft.lines, unitPrice(item, customization));
    return {
      lineId: line.lineId,
      itemId: item.id,
      name: item.name,
      amharic: item.amharic,
      quantity: line.quantity,
      unitPrice: unit,
      total: roundMoney(unit * line.quantity),
      dayIndex: draft.kind === "weekly" ? line.dayIndex : null,
      mealSlot: draft.kind === "weekly" ? line.mealSlot : null,
      customization,
      summary: describeCustomization(item, customization),
    };
  });
}

export function scheduleProblems(draft: OrderDraft, settings: PublicSettings): string | null {
  if (draft.fulfillment !== "pickup" && draft.fulfillment !== "delivery") {
    return "Choose pickup or delivery.";
  }
  if (draft.fulfillment === "delivery") {
    if (!draft.delivery || draft.delivery.address.trim().length < 8 || typeof draft.delivery.fee !== "number") {
      return "Calculate the driving distance and accept the delivery fee before paying.";
    }
  }
  if (draft.kind === "weekly") {
    if (draft.durationDays !== 7 && draft.durationDays !== 14) {
      return "Weekly plans are 7 or 14 days.";
    }
    if (!isIsoDate(draft.startDate)) return "Choose a valid first meal date.";
    if (draft.startDate < settings.earliestWeeklyDate) {
      return `The first meal must be on or after ${formatDate(settings.earliestWeeklyDate)}. Weekly orders need at least ${settings.weeklyLeadDays} days of notice.`;
    }
    return null;
  }
  if (draft.kind === "catering") {
    if (!Number.isInteger(draft.guestCount)) return "Enter a whole number of guests.";
    if (draft.guestCount < settings.minCateringGuests) {
      return `Minimum guest required is ${settings.minCateringGuests}.`;
    }
    if (draft.guestCount > settings.maxGuestsPerDay) {
      return `One day can cover up to ${settings.maxGuestsPerDay} guests.`;
    }
    if (!isIsoDate(draft.eventDate)) return "Choose a valid event date.";
    if (draft.eventDate < settings.earliestCateringDate) {
      return `The event must be on or after ${formatDate(settings.earliestCateringDate)}. Catering needs at least ${settings.cateringLeadDays} days of notice.`;
    }
    if (!/^\d{2}:\d{2}$/.test(draft.eventTime)) return "Choose a pickup or delivery time.";
    return null;
  }
  return "Choose weekly meals or catering.";
}

export function validateDraft(db: Database, draft: OrderDraft, exceptId?: string): OrderLine[] {
  const settings = publicSettings(db.settings);
  const problem = scheduleProblems(draft, settings);
  if (problem) throw new OrderError(problem);
  if (draft.kind === "weekly") {
    assertLeadTime(draft.startDate, settings.earliestWeeklyDate, settings.weeklyLeadDays, "first meal date");
  } else {
    assertLeadTime(draft.eventDate, settings.earliestCateringDate, settings.cateringLeadDays, "event date");
  }

  const lines = buildLines(db.menu, draft);
  assertCapacity(db, draft, exceptId);
  return lines;
}

export function createOrder(db: Database, user: UserRecord, draft: OrderDraft): OrderRecord {
  const lines = validateDraft(db, draft);
  const now = new Date().toISOString();
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.total, 0));
  const deliveryFee = draft.fulfillment === "delivery" ? roundMoney(draft.delivery?.fee ?? 0) : 0;
  db.seq += 1;
  const order: OrderRecord = {
    id: `ord_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
    number: `GB-${db.seq}`,
    userId: user.id,
    status: "payment_pending",
    kind: draft.kind,
    fulfillment: draft.fulfillment,
    fastingPreference: draft.fastingPreference,
    durationDays: draft.kind === "weekly" ? draft.durationDays : null,
    startDate: draft.kind === "weekly" ? draft.startDate : null,
    guestCount: draft.kind === "catering" ? draft.guestCount : null,
    eventDate: draft.kind === "catering" ? draft.eventDate : null,
    eventTime: draft.kind === "catering" ? draft.eventTime : null,
    address: draft.fulfillment === "delivery" ? (draft.delivery?.address ?? draft.address).trim() : "",
    deliveryMiles: draft.fulfillment === "delivery" ? (draft.delivery?.miles ?? null) : null,
    deliveryFee: draft.fulfillment === "delivery" ? deliveryFee : null,
    deliveryRate: draft.fulfillment === "delivery" ? (draft.delivery?.ratePerMile ?? null) : null,
    customerName: user.name,
    customerPhone: user.phone,
    customerEmail: user.email,
    lines,
    subtotal,
    total: roundMoney(subtotal + deliveryFee),
    createdAt: now,
    updatedAt: now,
    paidAt: null,
    paymentLast4: null,
    attempts: [],
    verificationCode: null,
    smsSentAt: null,
    smsBody: null,
    statusHistory: [
      {
        status: "payment_pending",
        at: now,
        note: "Order placed. Waiting for payment before the kitchen starts.",
      },
    ],
    kitchenNote: "",
  };
  db.orders.unshift(order);
  return order;
}

export function cardDecision(cardNumber: string): { ok: boolean; message: string; last4: string } {
  const digits = cardNumber.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) {
    return { ok: false, message: "Enter a card number to pay.", last4: digits.slice(-4) };
  }
  const last4 = digits.slice(-4);
  if (digits.startsWith("4000")) {
    return {
      ok: false,
      message: "The card was declined. This order stays unpaid and will not be prepared.",
      last4,
    };
  }
  if (digits === "4242424242424242") {
    return { ok: true, message: "Payment approved.", last4 };
  }
  return {
    ok: false,
    message: "This demo checkout approves the test card 4242 4242 4242 4242. Any number starting with 4000 is declined.",
    last4,
  };
}

export function verificationCode(): string {
  return String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);
}

export function buildSms(order: OrderRecord, settings: Settings): string {
  const when =
    order.kind === "weekly"
      ? `${formatDate(order.startDate ?? "")} through ${formatDate(orderEndDate(order))}`
      : `${formatDate(order.eventDate ?? "")} at ${formatTime(order.eventTime ?? "")}`;
  const place =
    order.fulfillment === "pickup" ? settings.pickupAddress : order.address;
  const extra = order.fulfillment === "pickup" ? settings.pickupInstructions : settings.deliveryNote;
  return `Gebeta: Hi ${order.customerName}, order ${order.number} is ready. Your verification code is ${order.verificationCode}. ${place}. ${when}. ${extra}`;
}

export function payOrder(
  db: Database,
  order: OrderRecord,
  cardNumber: string,
  expiry: string,
  cvc: string,
  name: string,
): { ok: boolean; message: string } {
  if (order.status === "cancelled") {
    throw new OrderError("This order was cancelled.");
  }
  if (order.status !== "payment_pending") {
    throw new OrderError("This order is already paid.");
  }
  if (name.trim().length < 2) {
    throw new OrderError("Enter the name on the card.");
  }
  if (!/^\d{2}\/\d{2}$/.test(expiry.trim())) {
    throw new OrderError("Enter an expiry as MM/YY.");
  }
  if (!/^\d{3,4}$/.test(cvc.trim())) {
    throw new OrderError("Enter the card security code.");
  }

  const draft = draftFromOrder(order);
  validateDraft(db, draft, order.id);

  const decision = cardDecision(cardNumber);
  const now = new Date().toISOString();
  order.attempts.push({ at: now, success: decision.ok, message: decision.message });
  order.updatedAt = now;
  if (!decision.ok) {
    return decision;
  }
  order.status = "confirmed";
  order.paidAt = now;
  order.paymentLast4 = decision.last4;
  order.verificationCode = verificationCode();
  order.statusHistory.push({
    status: "confirmed",
    at: now,
    note: `Paid ${moneySafe(order.total)} with card ending ${decision.last4}. The kitchen can start on schedule.`,
  });
  return decision;
}

function moneySafe(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function draftFromOrder(order: OrderRecord): OrderDraft {
  return {
    kind: order.kind,
    fulfillment: order.fulfillment,
    fastingPreference: order.fastingPreference,
    durationDays: order.durationDays === 14 ? 14 : 7,
    startDate: order.startDate ?? "",
    guestCount: order.guestCount ?? 0,
    eventDate: order.eventDate ?? "",
    eventTime: order.eventTime ?? "",
    address: order.address,
    delivery:
      order.fulfillment === "delivery" && typeof order.deliveryFee === "number"
        ? {
            address: order.address,
            miles: order.deliveryMiles ?? 0,
            ratePerMile: order.deliveryRate ?? 0,
            fee: order.deliveryFee,
          }
        : null,
    lines: order.lines.map((line) => ({
      lineId: line.lineId,
      itemId: line.itemId,
      quantity: line.quantity,
      dayIndex: line.dayIndex,
      mealSlot: line.mealSlot,
      customization: line.customization,
    })),
  };
}

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  payment_pending: ["cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: [],
  picked_up: ["completed"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

export function allowedTransitions(order: OrderRecord): OrderStatus[] {
  if (order.status === "ready") {
    return [order.fulfillment === "pickup" ? "picked_up" : "delivered"];
  }
  return NEXT[order.status];
}

export function transitionOrder(db: Database, order: OrderRecord, status: OrderStatus, note = ""): void {
  const allowed = allowedTransitions(order);
  if (!allowed.includes(status)) {
    if (order.status === "payment_pending" && status !== "cancelled") {
      throw new OrderError("Payment has not cleared. Do not confirm or prepare this order.");
    }
    throw new OrderError(`This order cannot move from ${order.status} to ${status}.`);
  }
  const now = new Date().toISOString();
  order.status = status;
  order.updatedAt = now;
  let historyNote = note.trim();
  if (status === "ready") {
    order.smsSentAt = now;
    order.smsBody = buildSms(order, db.settings);
    historyNote = historyNote || "Marked ready. Pickup text sent with the verification code.";
  }
  if (status === "cancelled") {
    historyNote = historyNote || "Order cancelled before preparation.";
  }
  if (!historyNote) {
    historyNote = `Status set to ${status.replaceAll("_", " ")}.`;
  }
  order.statusHistory.push({ status, at: now, note: historyNote });
}

export function verifyHandoff(db: Database, order: OrderRecord, code: string): void {
  if (order.status !== "ready") {
    throw new OrderError("The verification code is used when the order is ready.");
  }
  const normalized = code.replace(/\D/g, "");
  if (normalized.length !== 6 || normalized !== order.verificationCode) {
    throw new OrderError("That verification code does not match this order.");
  }
  transitionOrder(
    db,
    order,
    order.fulfillment === "pickup" ? "picked_up" : "delivered",
    "Verified with the customer's code.",
  );
}

export function cancelByCustomer(db: Database, order: OrderRecord): void {
  if (order.status !== "payment_pending" && order.status !== "confirmed") {
    throw new OrderError("This order is already in the kitchen and can no longer be cancelled online.");
  }
  transitionOrder(db, order, "cancelled", "Cancelled by the customer.");
}

export function toCustomerOrder(order: OrderRecord) {
  return {
    ...order,
    verificationCode: order.smsSentAt ? order.verificationCode : null,
    smsBody: order.smsSentAt ? order.smsBody : null,
  };
}

export function scheduleLabel(order: OrderRecord): string {
  if (order.kind === "weekly" && order.startDate && order.durationDays) {
    return `${formatDate(order.startDate)} – ${formatDate(addDays(order.startDate, order.durationDays - 1))}`;
  }
  if (order.eventDate) {
    return `${formatDate(order.eventDate)}${order.eventTime ? ` · ${formatTime(order.eventTime)}` : ""}`;
  }
  return "";
}

export function orderHeadline(order: OrderRecord): string {
  if (order.kind === "catering") {
    return `${KIND_LABEL.catering} for ${order.guestCount} guests`;
  }
  return `${order.durationDays}-day meal plan`;
}

export function placeLabel(order: OrderRecord, settings: Settings): string {
  if (order.fulfillment === "pickup") return settings.pickupAddress;
  return order.address;
}

export function instructionsFor(order: OrderRecord, settings: Settings): string {
  return order.fulfillment === "pickup" ? settings.pickupInstructions : settings.deliveryNote;
}

export function customerTotal(menu: MenuItem[], draft: OrderDraft): { food: number; delivery: number; total: number } {
  const addonIds = draft.lines.filter((line) => line.source === "addon").map((line) => line.itemId);
  const quote = serviceQuote(draft, addonIds);
  const food = quote
    ? quote.total
    : draft.lines.reduce((sum, line) => {
        const item = menu.find((entry) => entry.id === line.itemId);
        if (!item) return sum;
        const unit =
          line.source === "addon"
            ? addonUnitPrice(draft.fastingPreference, line.itemId)
            : weeklyLineUnit(draft.fastingPreference, line, draft.lines, unitPrice(item, line.customization));
        return sum + unit * line.quantity;
      }, 0);
  const delivery = draft.fulfillment === "delivery" ? roundMoney(draft.delivery?.fee ?? 0) : 0;
  const foodRounded = roundMoney(food);
  return { food: foodRounded, delivery, total: roundMoney(foodRounded + delivery) };
}

export function lineCountLabel(lines: DraftLine[] | OrderLine[]): string {
  const servings = lines.reduce((sum, line) => sum + line.quantity, 0);
  const dishes = lines.length;
  return `${dishes} ${dishes === 1 ? "dish" : "dishes"} · ${servings} ${servings === 1 ? "serving" : "servings"}`;
}

export function fastingSummary(order: { fastingPreference: OrderRecord["fastingPreference"]; fulfillment: OrderRecord["fulfillment"] }): string {
  return `${FASTING_LABEL[order.fastingPreference]} · ${FULFILLMENT_LABEL[order.fulfillment]}`;
}
