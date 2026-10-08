import { fulfillmentDate } from "@/lib/orders";
import { FASTING_LABEL, FULFILLMENT_LABEL, KIND_LABEL } from "@/lib/format";
import type { OrderRecord } from "@/lib/types";

const HEADERS = [
  "Order number",
  "Created date",
  "Paid date",
  "Service date",
  "Status",
  "Service",
  "Meal type",
  "Fulfillment",
  "Customer name",
  "Phone",
  "Email",
  "Guests / days",
  "Subtotal",
  "Promo code",
  "Promo discount",
  "Delivery fee",
  "Total",
  "Card last4",
] as const;

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function stampInZone(iso: string | null | undefined, timeZone: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function yearMonthInZone(iso: string, timeZone: string): { year: number; month: number } | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  if (!year || !month) return null;
  return { year, month };
}

export function ordersForMonth(orders: OrderRecord[], year: number, month: number, timeZone: string): OrderRecord[] {
  return orders
    .filter((order) => {
      const stamp = yearMonthInZone(order.createdAt, timeZone);
      return stamp?.year === year && stamp?.month === month;
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function monthlyOrdersCsv(orders: OrderRecord[], year: number, month: number, timeZone: string): string {
  const rows = ordersForMonth(orders, year, month, timeZone).map((order) => {
    const size =
      order.kind === "catering"
        ? order.guestCount != null
          ? `${order.guestCount} guests`
          : ""
        : order.durationDays != null
          ? `${order.durationDays} days`
          : "";
    return [
      order.number,
      stampInZone(order.createdAt, timeZone),
      stampInZone(order.paidAt, timeZone),
      fulfillmentDate(order) || "",
      order.status,
      KIND_LABEL[order.kind],
      FASTING_LABEL[order.fastingPreference],
      FULFILLMENT_LABEL[order.fulfillment],
      order.customerName,
      order.customerPhone,
      order.customerEmail,
      size,
      order.subtotal.toFixed(2),
      order.promoCode ?? "",
      order.promoDiscount != null ? order.promoDiscount.toFixed(2) : "",
      order.deliveryFee != null ? order.deliveryFee.toFixed(2) : "",
      order.total.toFixed(2),
      order.paymentLast4 ?? "",
    ]
      .map(csvCell)
      .join(",");
  });

  return [`\uFEFF${HEADERS.join(",")}`, ...rows].join("\r\n");
}

export function reportFileName(year: number, month: number): string {
  return `gebeta-orders-${year}-${String(month).padStart(2, "0")}.csv`;
}
