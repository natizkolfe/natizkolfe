export type OrderKind = "weekly" | "catering";
export type Fulfillment = "pickup" | "delivery";
export type FastingPreference = "fasting" | "non_fasting" | "mixed";
export type MealSlot = "lunch" | "dinner";
export type SpiceLevel = "none" | "mild" | "medium" | "hot" | "extra";
export type MenuCategory = "platter" | "stew" | "salad" | "side" | "condiment";

export type OrderStatus =
  | "payment_pending"
  | "confirmed"
  | "preparing"
  | "quality_check"
  | "ready"
  | "out_for_delivery"
  | "picked_up"
  | "delivered"
  | "completed"
  | "cancelled";

export interface MenuExtra {
  id: string;
  name: string;
  price: number;
}

export interface MenuChoice {
  label: string;
  options: string[];
  defaultOption: string;
}

export interface MenuItem {
  id: string;
  name: string;
  amharic: string;
  description: string;
  category: MenuCategory;
  fasting: boolean;
  canChooseFastingStyle: boolean;
  price: number;
  ingredients: string[];
  allergenHints: string[];
  dietaryOptions: string[];
  allowSpice: boolean;
  spiceLevels: SpiceLevel[];
  defaultSpice: SpiceLevel | null;
  choice: MenuChoice | null;
  sauces: string[];
  preferredOptions: string[];
  extras: MenuExtra[];
  available: boolean;
  featured: boolean;
  swatch: string;
  kitchenNote: string;
}

export interface Customization {
  spiceLevel: SpiceLevel | null;
  allergens: string[];
  excludedIngredients: string[];
  preferredIngredients: string[];
  dietary: string[];
  fastingStyle: "fasting" | "non_fasting" | null;
  choice: string | null;
  sauces: string[];
  extras: string[];
  notes: string;
}

export interface DraftLine {
  lineId: string;
  itemId: string;
  quantity: number;
  dayIndex: number | null;
  mealSlot: MealSlot | null;
  customization: Customization;
  source?: "included" | "addon";
  /** Weekly portion the customer chose. Catering lines leave this empty. */
  portionId?: string | null;
}

export interface DeliveryQuote {
  address: string;
  miles: number;
  ratePerMile: number;
  fee: number;
}

export interface OrderDraft {
  kind: OrderKind;
  fulfillment: Fulfillment;
  fastingPreference: FastingPreference;
  durationDays: 7 | 14;
  startDate: string;
  guestCount: number;
  eventDate: string;
  eventTime: string;
  address: string;
  /** Set only after the customer accepts a calculated delivery fee. */
  delivery: DeliveryQuote | null;
  lines: DraftLine[];
}

export interface OrderLine {
  lineId: string;
  itemId: string;
  name: string;
  amharic: string;
  quantity: number;
  unitPrice: number;
  total: number;
  dayIndex: number | null;
  mealSlot: MealSlot | null;
  customization: Customization;
  summary: string[];
  source: "included" | "addon";
  portionId: string | null;
}

export interface PaymentAttempt {
  at: string;
  success: boolean;
  message: string;
}

export interface StatusEvent {
  status: OrderStatus;
  at: string;
  note: string;
}

export interface PrepCheck {
  id: string;
  label: string;
  done: boolean;
}

export type NoticeKind =
  | "staff_new_order"
  | "customer_confirmation"
  | "ready_pickup"
  | "out_for_delivery"
  | "thank_you"
  | "order_updated";

export interface OrderNotice {
  id: string;
  kind: NoticeKind;
  audience: "staff" | "customer";
  title: string;
  body: string;
  at: string;
  acknowledgedAt: string | null;
}

export interface OrderRevision {
  at: string;
  summary: string[];
  acknowledgedAt: string | null;
}

export interface OrderFeedback {
  rating: number;
  comment: string;
  at: string;
}

export interface OrderRecord {
  id: string;
  number: string;
  userId: string;
  status: OrderStatus;
  kind: OrderKind;
  fulfillment: Fulfillment;
  fastingPreference: FastingPreference;
  durationDays: number | null;
  startDate: string | null;
  guestCount: number | null;
  eventDate: string | null;
  eventTime: string | null;
  address: string;
  deliveryMiles: number | null;
  deliveryFee: number | null;
  deliveryRate: number | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  lines: OrderLine[];
  subtotal: number;
  total: number;
  createdAt: string;
  updatedAt: string;
  paidAt: string | null;
  paymentLast4: string | null;
  attempts: PaymentAttempt[];
  verificationCode: string | null;
  smsSentAt: string | null;
  smsBody: string | null;
  statusHistory: StatusEvent[];
  kitchenNote: string;
  checks: PrepCheck[];
  notices: OrderNotice[];
  revisions: OrderRevision[];
  feedback: OrderFeedback | null;
  completedAt: string | null;
}

export interface Preferences {
  fastingPreference: FastingPreference;
  spiceLevel: SpiceLevel | null;
  allergens: string[];
  dislikedIngredients: string[];
  dietary: string[];
  notes: string;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
  preferences: Preferences;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  preferences: Preferences;
}

export interface SessionRecord {
  id: string;
  tokenHash: string;
  kind: "customer" | "staff";
  userId: string | null;
  expiresAt: string;
}

export interface Settings {
  weeklyLeadDays: number;
  cateringLeadDays: number;
  minCateringGuests: number;
  maxGuestsPerDay: number;
  maxWeeklyServingsPerDay: number;
  pickupAddress: string;
  pickupInstructions: string;
  deliveryNote: string;
  /** Kitchen location used to measure driving distance. */
  deliveryOrigin: string;
  /** Dollars charged for each driving mile. */
  deliveryRatePerMile: number;
  /** 0 means no maximum. */
  maxDeliveryMiles: number;
  /** 0 means no minimum. */
  minDeliveryFee: number;
  deliveryEnabled: boolean;
  /** Empty means every ZIP code is allowed. */
  deliveryZipCodes: string[];
  freeDelivery: boolean;
  /** Phone that receives the new-order alert when the staff portal is open. */
  staffPhone: string;
  timezone: string;
}

export interface PublicSettings extends Settings {
  today: string;
  earliestWeeklyDate: string;
  earliestCateringDate: string;
}

export interface Database {
  users: UserRecord[];
  sessions: SessionRecord[];
  orders: OrderRecord[];
  menu: MenuItem[];
  settings: Settings;
  seq: number;
}

export interface AuthState {
  user: PublicUser | null;
  staff: boolean;
}
