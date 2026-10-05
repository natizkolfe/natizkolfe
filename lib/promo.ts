import type { Database, OrderRecord, PromoCode } from "@/lib/types";

/** Every new Gebeta promo is 5% until this rule is changed. Stored on the code and copied onto the order. */
export const PROMO_DISCOUNT_PERCENT = 5;

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function roundPromoMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizePromoCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "");
}

export function generatePromoCode(existing: Iterable<string>): string {
  const taken = new Set(existing);
  const bytes = new Uint8Array(6);
  for (let attempt = 0; attempt < 12; attempt += 1) {
    crypto.getRandomValues(bytes);
    let body = "";
    for (const byte of bytes) body += ALPHABET[byte % ALPHABET.length];
    const code = `GBT-${body}`;
    if (!taken.has(code)) return code;
  }
  throw new Error("Could not generate a unique promo code.");
}

/** Discount applies to food and eligible add-ons. Delivery is added after this amount. */
export function promoDiscountAmount(foodSubtotal: number, percent: number): number {
  return roundPromoMoney(roundPromoMoney(foodSubtotal) * (percent / 100));
}

export function priceWithPromo(food: number, delivery: number, percent: number | null) {
  const foodRounded = roundPromoMoney(food);
  const deliveryRounded = roundPromoMoney(delivery);
  const discount = percent ? promoDiscountAmount(foodRounded, percent) : 0;
  return {
    food: foodRounded,
    discount,
    delivery: deliveryRounded,
    percent: percent && discount >= 0 ? percent : null,
    total: roundPromoMoney(foodRounded - discount + deliveryRounded),
  };
}

export function findPromo(db: Database, raw: string): PromoCode | undefined {
  const code = normalizePromoCode(raw);
  if (!code) return undefined;
  return db.promoCodes.find((entry) => entry.code === code);
}

export function promoProblem(promo: PromoCode | undefined): string | null {
  if (!promo) return "This promo code is invalid. Please check the code and try again.";
  if (promo.status === "used") return "This promo code has already been used.";
  if (promo.status === "disabled") return "This promo code is no longer available.";
  if (promo.status !== "available") return "This promo code is invalid. Please check the code and try again.";
  return null;
}

export function claimPromo(db: Database, order: OrderRecord, at: string): string | null {
  if (!order.promoCode) return null;
  const promo = findPromo(db, order.promoCode);
  const problem = promoProblem(promo);
  if (problem || !promo) return problem ?? "This promo code is invalid. Please check the code and try again.";
  promo.status = "used";
  promo.usedAt = at;
  promo.usedByUserId = order.userId;
  promo.usedByName = order.customerName;
  promo.orderId = order.id;
  promo.orderNumber = order.number;
  return null;
}

export function dropPromo(order: OrderRecord): void {
  const delivery = order.fulfillment === "delivery" ? roundPromoMoney(order.deliveryFee ?? 0) : 0;
  order.promoCode = null;
  order.promoPercent = null;
  order.promoDiscount = null;
  order.total = roundPromoMoney(order.subtotal + delivery);
}
