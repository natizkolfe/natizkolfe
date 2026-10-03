import fs from "fs";
import path from "path";
import { seedMenu } from "@/lib/menu-seed";
import type { Database, Settings } from "@/lib/types";

const FILE = path.join(process.cwd(), "data", "db.json");

export const defaultSettings = (): Settings => ({
  weeklyLeadDays: 7,
  cateringLeadDays: 7,
  minCateringGuests: 10,
  maxGuestsPerDay: 80,
  maxWeeklyServingsPerDay: 100,
  pickupAddress: "Gebeta Kitchen, 412 East 9th Street",
  pickupInstructions:
    "Use the side door marked Gebeta. Have your verification code ready for the kitchen.",
  deliveryNote: "A driver will text when they are close. Keep the verification code handy.",
  deliveryOrigin: "4473 Rowland N Dr, Stone Mountain, GA 30083",
  deliveryRatePerMile: 2,
  maxDeliveryMiles: 0,
  minDeliveryFee: 0,
  deliveryEnabled: true,
  deliveryZipCodes: [],
  freeDelivery: false,
  timezone: "America/New_York",
});

function seed(): Database {
  return {
    users: [],
    sessions: [],
    orders: [],
    menu: seedMenu(),
    settings: defaultSettings(),
    seq: 2400,
  };
}

function read(): Database {
  try {
    const raw = fs.readFileSync(FILE, "utf8");
    const parsed = JSON.parse(raw) as Database;
    if (!parsed.menu?.length) parsed.menu = seedMenu();
    if (!parsed.settings) parsed.settings = defaultSettings();
    parsed.settings = { ...defaultSettings(), ...parsed.settings };
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
