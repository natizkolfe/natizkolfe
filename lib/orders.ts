import { addDays, formatDate, formatTime, formatWhen, isIsoDate, todayISO, zonedDateTime } from "@/lib/dates";
import {
  confirmationNotice,
  deliveryEnRouteNotice,
  orderUpdatedNotice,
  pickupReadyNotice,
  scheduledClock,
  scheduledDate,
  staffNewOrderNotice,
  thankYouNotice,
} from "@/lib/notices";
import { addonUnitPrice, buildPackageLines, cateringUnitPrice, serviceQuote, weeklyLineUnit } from "@/lib/packages";
import { containerForDays, foodOffer, weeklyUnitPrice } from "@/lib/portions";
import { FASTING_LABEL, FULFILLMENT_LABEL, KIND_LABEL, SPICE_LABEL } from "@/lib/format";
import type {
  Customization,
  Database,
  DraftLine,
  MenuItem,
  OrderDraft,
  OrderLine,
  OrderRecord,
  OrderRevision,
  OrderStatus,
  Preferences,
  PrepCheck,
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
  if (draft.kind === "weekly" && !draft.lines.some((entry) => entry.source === "included")) {
    throw new OrderError("Choose at least one meal.");
  }
  if (
    draft.kind === "catering" &&
    draft.fastingPreference === "mixed" &&
    !draft.lines.some((entry) => entry.source === "included")
  ) {
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
    let unit: number;
    let portionSummary: string[] = [];
    if (draft.kind === "catering") {
      unit = cateringUnitPrice(draft.fastingPreference, line, draft.lines);
    } else if (line.source === "addon") {
      unit = weeklyUnitPrice(line.itemId, "addon");
    } else {
      const offer = foodOffer(line.itemId);
      if (!offer || offer.kind !== "meal") throw new OrderError(`Choose a meal for ${item.name}.`);
      unit = offer.price;
      portionSummary = [containerForDays(draft.durationDays).sizeLabel];
    }
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
      summary: [...portionSummary, ...describeCustomization(item, customization)],
      source: line.source === "addon" ? "addon" : "included",
      portionId: draft.kind === "weekly" ? (line.portionId ?? null) : null,
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
    number: `GBT-${db.seq}`,
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
    checks: [],
    notices: [],
    revisions: [],
    feedback: null,
    completedAt: null,
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
  order.verificationCode = order.number;
  order.checks = buildChecks(order);
  order.notices.push(staffNewOrderNotice(order, now), confirmationNotice(order, now));
  order.statusHistory.push({
    status: "confirmed",
    at: now,
    note: `Paid ${moneySafe(order.total)} with card ending ${decision.last4}. Order ID ${order.number} is the pickup verification code.`,
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
      source: line.source,
      portionId: line.portionId ?? null,
    })),
  };
}

const NEXT: Record<OrderStatus, OrderStatus[]> = {
  payment_pending: ["cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["quality_check"],
  quality_check: ["ready"],
  ready: [],
  out_for_delivery: ["completed"],
  picked_up: ["completed"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
};

export function allowedTransitions(order: OrderRecord): OrderStatus[] {
  if (order.status === "ready") {
    return order.fulfillment === "delivery" ? ["out_for_delivery"] : [];
  }
  return NEXT[order.status];
}

export function transitionOrder(
  db: Database,
  order: OrderRecord,
  status: OrderStatus,
  note = "",
  handoff = false,
): void {
  const allowed = allowedTransitions(order);
  const pickupClose = handoff && status === "completed" && order.status === "ready" && order.fulfillment === "pickup";
  if (!pickupClose && !allowed.includes(status)) {
    if (order.status === "payment_pending" && status !== "cancelled") {
      throw new OrderError("Payment has not cleared. Do not confirm or prepare this order.");
    }
    throw new OrderError(`This order cannot move from ${order.status} to ${status}.`);
  }
  if (status === "ready") {
    if (order.checks.length === 0) order.checks = buildChecks(order);
    if (order.checks.some((check) => !check.done)) {
      throw new OrderError("Finish the preparation checklist, including the quality check, before marking this order ready.");
    }
  }
  const now = new Date().toISOString();
  order.status = status;
  order.updatedAt = now;
  let historyNote = note.trim();
  if (status === "ready" && order.fulfillment === "pickup") {
    const message = pickupReadyNotice(order, db.settings, now);
    order.notices.push(message);
    order.smsSentAt = now;
    order.smsBody = message.body;
    historyNote = historyNote || "Marked ready for pickup. The customer was notified with the order ID.";
  }
  if (status === "ready" && order.fulfillment === "delivery") {
    historyNote = historyNote || "Ready for delivery. The customer is notified when the order leaves.";
  }
  if (status === "out_for_delivery") {
    order.notices.push(deliveryEnRouteNotice(order, now));
    historyNote = historyNote || "Out for delivery. The customer was notified that the order is on the way.";
  }
  if (status === "completed" || status === "picked_up" || status === "delivered") {
    order.completedAt = order.completedAt ?? now;
    if (!order.notices.some((entry) => entry.kind === "thank_you")) {
      order.notices.push(thankYouNotice(order, now));
    }
    historyNote = historyNote || (order.fulfillment === "pickup" ? "Picked up and completed." : "Delivered and completed.");
  }
  if (status === "cancelled") {
    historyNote = historyNote || "Order cancelled before preparation.";
  }
  if (!historyNote) {
    historyNote = `Status set to ${status.replaceAll("_", " ")}.`;
  }
  order.statusHistory.push({ status, at: now, note: historyNote });
}

export function codesMatch(input: string, code: string | null): boolean {
  if (!code) return false;
  const normalize = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  const given = normalize(input);
  const expected = normalize(code);
  return given.length >= 6 && given === expected;
}

export function verifyHandoff(db: Database, order: OrderRecord, code: string): void {
  if (order.fulfillment !== "pickup") {
    throw new OrderError("Delivery orders are closed when staff mark them delivered.");
  }
  if (order.status !== "ready") {
    throw new OrderError("The verification code is used when the order is ready for pickup.");
  }
  if (!codesMatch(code, order.verificationCode ?? order.number)) {
    throw new OrderError("That verification code does not match this order.");
  }
  transitionOrder(db, order, "completed", `Picked up. Verified with ${order.number}.`, true);
}

export function cancelByCustomer(db: Database, order: OrderRecord): void {
  if (order.status !== "payment_pending" && order.status !== "confirmed") {
    throw new OrderError("This order is already in the kitchen and can no longer be cancelled online.");
  }
  transitionOrder(db, order, "cancelled", "Cancelled by the customer.");
}

export function toCustomerOrder(order: OrderRecord) {
  const paid = Boolean(order.paidAt);
  return {
    ...order,
    verificationCode: paid ? order.verificationCode : null,
    smsBody: order.smsSentAt ? order.smsBody : null,
    kitchenNote: "",
    notices: order.notices.filter((entry) => entry.audience === "customer"),
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
        if (draft.kind === "weekly") {
          return sum + weeklyUnitPrice(line.itemId, line.source) * line.quantity;
        }
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

export function buildChecks(order: OrderRecord): PrepCheck[] {
  const included = new Map<string, string>();
  const addons = new Map<string, string>();
  for (const line of order.lines) {
    if (line.source === "addon") addons.set(line.itemId, `${line.name} add-on`);
    else included.set(line.itemId, line.name);
  }
  return [
    ...[...included.entries()].map(([id, label]) => ({ id: `dish:${id}`, label, done: false })),
    ...[...addons.entries()].map(([id, label]) => ({ id: `addon:${id}`, label, done: false })),
    { id: "package", label: "Package and containers", done: false },
    { id: "quality", label: "Final quality check", done: false },
  ];
}

export function orderAllergies(order: OrderRecord): string[] {
  return [...new Set(order.lines.flatMap((line) => line.customization.allergens))];
}

export function specialInstructions(order: OrderRecord): string[] {
  const lines: string[] = [];
  for (const line of order.lines) {
    const bits: string[] = [];
    if (line.customization.spiceLevel) bits.push(SPICE_LABEL[line.customization.spiceLevel]);
    if (line.customization.excludedIngredients.length) {
      bits.push(`No ${line.customization.excludedIngredients.join(", ").toLowerCase()}`);
    }
    if (line.customization.dietary.length) bits.push(line.customization.dietary.join(", "));
    if (line.customization.notes.trim()) bits.push(line.customization.notes.trim());
    if (bits.length) lines.push(`${line.name}: ${bits.join(" • ")}`);
  }
  return lines;
}

export function fulfillmentInstant(order: OrderRecord, timeZone: string): Date {
  return zonedDateTime(scheduledDate(order), scheduledClock(order), timeZone);
}

export function modificationWindow(order: OrderRecord, settings: Settings, now = new Date()): { open: boolean; reason: "time" | "status" | null; deadline: string | null } {
  const instant = fulfillmentInstant(order, settings.timezone);
  const deadline = new Date(instant.getTime() - 24 * 60 * 60 * 1000);
  if (order.status !== "confirmed" && order.status !== "preparing") {
    return { open: false, reason: "status", deadline: deadline.toISOString() };
  }
  if (instant.getTime() - now.getTime() <= 24 * 60 * 60 * 1000) {
    return { open: false, reason: "time", deadline: deadline.toISOString() };
  }
  return { open: true, reason: null, deadline: deadline.toISOString() };
}

export function setPrepCheck(order: OrderRecord, checkId: string, done: boolean): void {
  if (!["confirmed", "preparing", "quality_check"].includes(order.status)) {
    throw new OrderError("The checklist can be updated while the order is being prepared.");
  }
  const check = order.checks.find((entry) => entry.id === checkId);
  if (!check) throw new OrderError("That preparation item is not on this order.");
  check.done = done;
  order.updatedAt = new Date().toISOString();
}

export function acknowledgeOrder(order: OrderRecord): void {
  const now = new Date().toISOString();
  for (const revision of order.revisions) {
    if (!revision.acknowledgedAt) revision.acknowledgedAt = now;
  }
  for (const entry of order.notices) {
    if (entry.audience === "staff" && !entry.acknowledgedAt) entry.acknowledgedAt = now;
  }
  order.updatedAt = now;
}

export function saveFeedback(order: OrderRecord, rating: number, comment: string): void {
  if (!["picked_up", "delivered", "completed"].includes(order.status)) {
    throw new OrderError("Feedback opens after the order is picked up or delivered.");
  }
  if (order.feedback) throw new OrderError("Feedback is already on this order.");
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new OrderError("Choose a rating from 1 to 5.");
  }
  const text = comment.trim();
  if (text.length > 800) throw new OrderError("Keep the comment under 800 characters.");
  order.feedback = { rating, comment: text, at: new Date().toISOString() };
  order.updatedAt = order.feedback.at;
}

export interface ReviseResult {
  preview: boolean;
  due: number;
  total: number;
  changes: string[];
  order: OrderRecord;
}

export function reviseOrder(
  db: Database,
  order: OrderRecord,
  input: {
    addonIds: string[];
    customizations: Record<string, Partial<Customization>>;
    preview: boolean;
    cardNumber?: string;
    expiry?: string;
    cvc?: string;
    name?: string;
  },
): ReviseResult {
  const window = modificationWindow(order, db.settings);
  if (!window.open) {
    throw new OrderError(
      window.reason === "time"
        ? "This order is scheduled within the next 24 hours. Online modifications are no longer available."
        : "Online modifications are closed because preparation has moved ahead.",
      409,
    );
  }
  const draft = draftFromOrder(order);
  const includedIds = order.lines.filter((line) => line.source !== "addon").map((line) => line.itemId);
  const includedSet = new Set(includedIds);
  const addonIds = input.addonIds.filter((id) => !includedSet.has(id));
  const nextLines = buildPackageLines(
    draft,
    db.menu,
    addonIds,
    draft.lines,
    (item) => initialCustomization(item),
    includedIds,
  );
  for (const line of nextLines) {
    const custom = input.customizations[line.itemId];
    if (!custom) continue;
    line.customization = { ...line.customization, ...custom };
  }
  draft.lines = nextLines;
  const lines = validateDraft(db, draft, order.id);
  const changes = describeRevision(order.lines, lines);
  if (changes.length === 0) throw new OrderError("Nothing on the order changed.");
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.total, 0));
  const delivery = order.fulfillment === "delivery" ? roundMoney(order.deliveryFee ?? 0) : 0;
  const total = roundMoney(subtotal + delivery);
  const due = roundMoney(Math.max(0, total - order.total));
  if (input.preview || due > 0) {
    if (input.preview || !input.cardNumber) {
      return { preview: true, due, total, changes, order };
    }
  }
  if (due > 0) {
    if (!input.cardNumber || !input.expiry || !input.cvc || !input.name) {
      return { preview: true, due, total, changes, order };
    }
    if (input.name.trim().length < 2) throw new OrderError("Enter the name on the card.");
    if (!/^\d{2}\/\d{2}$/.test(input.expiry.trim())) throw new OrderError("Enter an expiry as MM/YY.");
    if (!/^\d{3,4}$/.test(input.cvc.trim())) throw new OrderError("Enter the card security code.");
    const decision = cardDecision(input.cardNumber);
    const now = new Date().toISOString();
    if (!decision.ok) {
      order.attempts.push({ at: now, success: false, message: decision.message });
      order.updatedAt = now;
      throw new OrderError(decision.message, 402);
    }
    order.paymentLast4 = decision.last4;
    order.attempts.push({ at: now, success: true, message: `Additional ${moneySafe(due)} approved.` });
  }
  applyRevision(order, lines, subtotal, total, changes, due);
  return { preview: false, due, total, changes, order };
}

function applyRevision(order: OrderRecord, lines: OrderLine[], subtotal: number, total: number, changes: string[], due: number): void {
  const now = new Date().toISOString();
  const previous = new Map(order.checks.map((check) => [check.id, check.done]));
  order.lines = lines;
  order.subtotal = subtotal;
  order.total = total;
  order.updatedAt = now;
  order.checks = buildChecks(order).map((check) => ({ ...check, done: previous.get(check.id) ?? false }));
  const revision: OrderRevision = { at: now, summary: changes, acknowledgedAt: null };
  order.revisions.push(revision);
  order.notices.push(orderUpdatedNotice(order, changes, now));
  const paymentNote = due > 0 ? ` Additional ${moneySafe(due)} was paid.` : "";
  order.statusHistory.push({
    status: order.status,
    at: now,
    note: `Customer updated the order.${paymentNote} ${changes.join(" ")}`,
  });
}

function describeRevision(before: OrderLine[], after: OrderLine[]): string[] {
  const changes: string[] = [];
  const beforeById = new Map(before.map((line) => [line.itemId, line]));
  const afterById = new Map(after.map((line) => [line.itemId, line]));
  for (const line of after) {
    if (!beforeById.has(line.itemId)) changes.push(`${line.name} added`);
  }
  for (const line of before) {
    if (!afterById.has(line.itemId)) changes.push(`${line.name} removed`);
  }
  for (const line of after) {
    const previous = beforeById.get(line.itemId);
    if (!previous) continue;
    if (previous.customization.spiceLevel !== line.customization.spiceLevel) {
      const from = previous.customization.spiceLevel ? SPICE_LABEL[previous.customization.spiceLevel] : "kitchen default";
      const to = line.customization.spiceLevel ? SPICE_LABEL[line.customization.spiceLevel] : "kitchen default";
      changes.push(`${line.name} spice changed from ${from} → ${to}`);
    }
    if (previous.customization.allergens.join("|") !== line.customization.allergens.join("|")) {
      const next = line.customization.allergens.join(", ");
      changes.push(next ? `${line.name} allergy note set to ${next}` : `${line.name} allergy note cleared`);
    }
    if (previous.customization.excludedIngredients.join("|") !== line.customization.excludedIngredients.join("|")) {
      const next = line.customization.excludedIngredients.join(", ");
      changes.push(next ? `${line.name}: leave out ${next}` : `${line.name}: ingredient exclusions cleared`);
    }
    if (previous.customization.dietary.join("|") !== line.customization.dietary.join("|")) {
      changes.push(`${line.name} preferences updated`);
    }
    if (previous.customization.notes.trim() !== line.customization.notes.trim()) {
      changes.push(`${line.name} special instructions updated`);
    }
  }
  return changes;
}

export function orderMatchesQuery(order: OrderRecord, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const compact = needle.replace(/[^a-z0-9]/g, "");
  const number = order.number.toLowerCase().replace(/[^a-z0-9]/g, "");
  return (
    order.number.toLowerCase().includes(needle) ||
    (compact.length >= 3 && number.includes(compact)) ||
    order.customerName.toLowerCase().includes(needle) ||
    order.customerPhone.replace(/\D/g, "").includes(needle.replace(/\D/g, "")) ||
    order.customerEmail.toLowerCase().includes(needle)
  );
}

export function formatDeadline(iso: string | null): string {
  return iso ? formatWhen(iso) : "";
}
