import { formatDateLong, formatTime } from "@/lib/dates";
import { FASTING_LABEL, FULFILLMENT_LABEL, SPICE_LABEL, money } from "@/lib/format";
import type { OrderNotice, OrderRecord, Settings } from "@/lib/types";

function notice(partial: Omit<OrderNotice, "id" | "at" | "acknowledgedAt">, at: string): OrderNotice {
  return {
    ...partial,
    id: `ntc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    at,
    acknowledgedAt: null,
  };
}

export function serviceName(order: OrderRecord): string {
  if (order.kind === "catering") return "Catering";
  return order.durationDays === 14 ? "Weekly Meal – 2 Weeks" : "Weekly Meal – 1 Week";
}

export function scheduledDate(order: OrderRecord): string {
  return order.kind === "catering" ? (order.eventDate ?? "") : (order.startDate ?? "");
}

export function scheduledClock(order: OrderRecord): string {
  if (order.kind === "catering" && order.eventTime) return order.eventTime;
  return "12:00";
}

function placeLines(address: string): string {
  const [first, ...rest] = address.split(",").map((part) => part.trim());
  if (!rest.length) return address;
  return `${first}\n${rest.join(", ")}`;
}

export function moneyParts(order: OrderRecord): { food: number; addons: number; delivery: number } {
  const addons = Math.round(order.lines.filter((line) => line.source === "addon").reduce((sum, line) => sum + line.total, 0) * 100) / 100;
  const delivery = order.fulfillment === "delivery" ? (order.deliveryFee ?? 0) : 0;
  const food = Math.round((order.subtotal - addons) * 100) / 100;
  return { food, addons, delivery };
}

function mealLines(order: OrderRecord): string {
  const included = order.lines.filter((line) => line.source !== "addon");
  if (included.length === 0) return "None listed";
  const container = order.kind === "weekly" ? (order.durationDays === 14 ? "28 oz Square" : "24 oz Round") : "";
  return included
    .map((line) => (container ? `${line.name} — Quantity: ${line.quantity} — Container: ${container}` : line.name))
    .join("\n");
}

function addonLines(order: OrderRecord): string {
  const addons = order.lines.filter((line) => line.source === "addon");
  if (addons.length === 0) return "None";
  return addons.map((line) => line.name).join("\n");
}

function preferenceLines(order: OrderRecord): string[] {
  const lines: string[] = [];
  for (const line of order.lines) {
    const spice = line.customization.spiceLevel ? SPICE_LABEL[line.customization.spiceLevel] : "";
    const leaveOut = line.customization.excludedIngredients.join(", ");
    const diet = line.customization.dietary.join(", ");
    const note = line.customization.notes.trim();
    const bits = [spice && `${spice} spice`, leaveOut && `No ${leaveOut.toLowerCase()}`, diet, note].filter(Boolean);
    if (bits.length) lines.push(`${line.name}: ${bits.join(" • ")}`);
  }
  return lines;
}

export function staffNewOrderNotice(order: OrderRecord, at: string): OrderNotice {
  const when = formatDateLong(scheduledDate(order));
  const body = [
    `Order: ${order.number}`,
    `Service: ${serviceName(order)}`,
    `Meal Type: ${FASTING_LABEL[order.fastingPreference]}`,
    `Fulfillment: ${FULFILLMENT_LABEL[order.fulfillment]}`,
    `Scheduled: ${when}`,
    "",
    "New paid order received. Open the Staff Portal to review the order.",
  ].join("\n");
  return notice({ kind: "staff_new_order", audience: "staff", title: "New Gebeta Order", body }, at);
}

export function confirmationNotice(order: OrderRecord, at: string): OrderNotice {
  const parts = moneyParts(order);
  const prefs = preferenceLines(order);
  const lines = [
    `Hello ${order.customerName},`,
    "",
    "Thank you for choosing Gebeta Catering. We have received your order.",
    "",
    `Order ID / Verification Code: ${order.number}`,
    "",
    `Service: ${serviceName(order)}`,
    `Meal Type: ${FASTING_LABEL[order.fastingPreference]}`,
  ];
  if (order.kind === "catering" && order.guestCount) lines.push(`Number of Guests: ${order.guestCount}`);
  lines.push(
    `Fulfillment: ${FULFILLMENT_LABEL[order.fulfillment]}`,
    `Scheduled Date: ${formatDateLong(scheduledDate(order))}`,
  );
  if (order.kind === "catering" && order.eventTime) lines.push(`Scheduled Time: ${formatTime(order.eventTime)}`);
  lines.push(
    "",
    "Your Meals",
    mealLines(order),
    "",
    "Add-Ons",
    addonLines(order),
    "",
    "Preferences",
    prefs.length ? prefs.join("\n") : "None added",
    "",
    "Order Total",
    `Food Package: ${money(parts.food)}`,
    `Add-Ons: ${money(parts.addons)}`,
    ...(order.promoCode && order.promoDiscount
      ? [
          `Subtotal: ${money(order.subtotal)}`,
          `Promo Discount (${order.promoPercent}%): −${money(order.promoDiscount)}`,
        ]
      : []),
    `Delivery: ${money(parts.delivery)}`,
    "",
    `Total Paid: ${money(order.total)}`,
    "",
    "Payment Status: PAID",
    "",
    "Your order has been received. We will notify you when your food is ready for pickup.",
    "",
    "If you selected Delivery, we will notify you when your order is on its way.",
    "",
    "Thank you for choosing Gebeta Catering.",
  );
  return notice(
    { kind: "customer_confirmation", audience: "customer", title: "Gebeta Order Confirmation", body: lines.join("\n") },
    at,
  );
}

export function pickupReadyNotice(order: OrderRecord, settings: Settings, at: string): OrderNotice {
  const body = [
    `Hello ${order.customerName},`,
    "",
    `Your Gebeta order ${order.number} is ready for pickup.`,
    "",
    "Pickup Location:",
    placeLines(settings.pickupAddress),
    "",
    `Verification Code: ${order.number}`,
    "",
    "Please provide your verification code when picking up your order.",
    "",
    "Thank you for choosing Gebeta Catering.",
  ].join("\n");
  return notice({ kind: "ready_pickup", audience: "customer", title: "Your Gebeta Order Is Ready!", body }, at);
}

export function deliveryEnRouteNotice(order: OrderRecord, at: string): OrderNotice {
  const body = [
    `Hello ${order.customerName},`,
    "",
    `Your order ${order.number} has left Gebeta and is on its way to your delivery address.`,
    "",
    "We will notify you when your order has been completed.",
    "",
    "Thank you for choosing Gebeta Catering.",
  ].join("\n");
  return notice(
    { kind: "out_for_delivery", audience: "customer", title: "Your Gebeta Order Is On the Way!", body },
    at,
  );
}

export function thankYouNotice(order: OrderRecord, at: string): OrderNotice {
  const body = [
    `Hello ${order.customerName},`,
    "",
    "We hope you enjoyed your meal.",
    "",
    "How was your experience? Leave a rating and a note on your order.",
    "",
    "Thank you for choosing Gebeta Catering.",
  ].join("\n");
  return notice({ kind: "thank_you", audience: "customer", title: "Thank You for Choosing Gebeta!", body }, at);
}

export function orderUpdatedNotice(order: OrderRecord, changes: string[], at: string): OrderNotice {
  const body = ["Customer modified this order.", "", "Changed:", ...changes].join("\n");
  return notice(
    { kind: "order_updated", audience: "staff", title: `ORDER UPDATED — ${order.number}`, body },
    at,
  );
}
