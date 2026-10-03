import type { FastingPreference, Fulfillment, OrderKind, OrderStatus, SpiceLevel } from "@/lib/types";

export function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export const SPICE_LABEL: Record<SpiceLevel, string> = {
  none: "No spice",
  mild: "Mild",
  medium: "Medium",
  hot: "Berbere hot",
  extra: "Extra hot",
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  payment_pending: "Payment pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  picked_up: "Picked up",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const KIND_LABEL: Record<OrderKind, string> = {
  weekly: "Weekly meals",
  catering: "Catering",
};

export const FULFILLMENT_LABEL: Record<Fulfillment, string> = {
  pickup: "Pickup",
  delivery: "Delivery",
};

export const FASTING_LABEL: Record<FastingPreference, string> = {
  fasting: "Fasting",
  non_fasting: "Non-fasting",
  mixed: "Mixed order",
};

export const CATEGORY_LABEL = {
  platter: "Platters",
  stew: "Stews and mains",
  salad: "Salads",
  side: "Sides",
  condiment: "Condiments",
} as const;

export const ALLERGENS = [
  "Peanuts",
  "Tree nuts",
  "Dairy",
  "Eggs",
  "Gluten",
  "Sesame",
  "Soy",
] as const;

export const DIETARY_PREFERENCES = [
  "No onion",
  "No garlic",
  "Less salt",
  "Teff only, no wheat",
  "No jalapeño",
] as const;

export const DISLIKED_INGREDIENTS = [
  "Onion",
  "Garlic",
  "Berbere",
  "Mitmita",
  "Jalapeño",
  "Niter kibbeh",
  "Egg",
  "Ayib",
  "Mustard",
  "Green chili",
] as const;

export function statusTone(status: OrderStatus): string {
  switch (status) {
    case "payment_pending":
      return "border-amber-700/30 bg-amber-100 text-amber-950";
    case "confirmed":
      return "border-primary/20 bg-primary/10 text-primary";
    case "preparing":
      return "border-[#8A5A22]/30 bg-[#F3E2C4] text-[#6A4312]";
    case "ready":
      return "border-gomen/30 bg-gomen/10 text-gomen";
    case "picked_up":
    case "delivered":
    case "completed":
      return "border-foreground/15 bg-secondary text-foreground";
    case "cancelled":
      return "border-border bg-muted text-muted-foreground";
  }
}
