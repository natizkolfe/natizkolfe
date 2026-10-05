import fs from "fs";
import path from "path";
import { seedCareInstructions } from "@/lib/care-seed";
import { seedMenu } from "@/lib/menu-seed";
import type { Database, Settings } from "@/lib/types";

const FILE = path.join(process.cwd(), "data", "db.json");

export const defaultSettings = (): Settings => ({
  minimumOrderLeadDays: 5,
  weeklyLeadDays: 5,
  cateringLeadDays: 5,
  minCateringGuests: 10,
  maxGuestsPerDay: 80,
  maxWeeklyServingsPerDay: 100,
  pickupAddress: "4473 Rowland N Dr, Stone Mountain, GA 30083",
  pickupInstructions: "Have the order ID ready. Staff match it before the food is handed over.",
  deliveryNote: "A driver will text when they are close. Keep the verification code handy.",
  deliveryOrigin: "4473 Rowland N Dr, Stone Mountain, GA 30083",
  deliveryRatePerMile: 2,
  maxDeliveryMiles: 0,
  minDeliveryFee: 0,
  deliveryEnabled: true,
  deliveryZipCodes: [],
  freeDelivery: false,
  staffPhone: "",
  timezone: "America/New_York",
});

function seed(): Database {
  return {
    users: [],
    sessions: [],
    orders: [],
    promoCodes: [],
    careInstructions: seedCareInstructions(),
    menu: seedMenu(),
    settings: defaultSettings(),
    seq: 1047,
  };
}

function read(): Database {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw) as Database;
    if (!parsed.menu?.length) parsed.menu = seedMenu();
    else {
      const ids = new Set(parsed.menu.map((item) => item.id));
      for (const item of seedMenu()) {
        if (!ids.has(item.id)) parsed.menu.push(item);
      }
    }
    if (!parsed.settings) parsed.settings = defaultSettings();
    parsed.settings = { ...defaultSettings(), ...parsed.settings };
    parsed.promoCodes ??= [];
    parsed.careInstructions ??= seedCareInstructions();
    for (const order of parsed.orders ?? []) {
      order.checks ??= [];
      order.notices ??= [];
      order.revisions ??= [];
      order.feedback ??= null;
      order.completedAt ??= null;
      order.promoCode ??= null;
      order.promoPercent ??= null;
      order.promoDiscount ??= null;
      order.careToken ??= null;
      order.care ??= null;
      for (const line of order.lines ?? []) {
        line.source ??= "included";
      }
    }
    return parsed;
  } catch {
    const db = seed();
    write(db);
    return db;
  }
}

function write(db: Database) {
  fs.mkdirSync(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, FILE);
}

let chain: Promise<unknown> = Promise.resolve();

export function readDb(): Database {
  return read();
}

export function withDb<T>(mutator: (db: Database) => T): Promise<T> {
  const task = chain.then(() => {
    const db = read();
    const result = mutator(db);
    write(db);
    return result;
  });
  chain = task.then(
    () => undefined,
    () => undefined,
  );
  return task;
}
