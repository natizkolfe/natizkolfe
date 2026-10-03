import type { DeliveryQuote, Settings } from "@/lib/types";

const USER_AGENT = "Gebeta/1.0 (delivery distance quote)";

export class DeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DeliveryError";
  }
}

interface GeocodeHit {
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: { road?: string; house_number?: string; postcode?: string };
}

interface LocatedAddress {
  lat: number;
  lon: number;
  label: string;
  zip: string | null;
}

const originCache = new Map<string, { lat: number; lon: number; at: number }>();

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundMiles(meters: number): number {
  return Math.round((meters / 1609.344) * 10) / 10;
}

function zipOf(postcode: string | undefined, label: string): string | null {
  const fromPost = postcode?.match(/\d{5}/)?.[0];
  if (fromPost) return fromPost;
  return label.match(/\b(\d{5})(?:-\d{4})?\b/)?.[1] ?? null;
}

async function geocode(query: string, limit: number): Promise<GeocodeHit[]> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("countrycodes", "us");
  url.searchParams.set("q", query);
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new DeliveryError("We couldn't look up that address. Check it and try again.");
  const data = (await response.json()) as GeocodeHit[];
  return Array.isArray(data) ? data : [];
}

function usable(hit: GeocodeHit): hit is GeocodeHit & { lat: string; lon: string; display_name: string } {
  return Boolean(hit.lat && hit.lon && hit.display_name && (hit.address?.road || hit.address?.house_number));
}

async function censusLocate(query: string): Promise<LocatedAddress | null> {
  const url = new URL("https://geocoding.geo.census.gov/geocoder/locations/onelineaddress");
  url.searchParams.set("address", query);
  url.searchParams.set("benchmark", "Public_AR_Current");
  url.searchParams.set("format", "json");
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) return null;
  const data = (await response.json()) as {
    result?: {
      addressMatches?: {
        matchedAddress?: string;
        coordinates?: { x?: number; y?: number };
        addressComponents?: { zip?: string };
      }[];
    };
  };
  const match = data.result?.addressMatches?.find(
    (item) => typeof item.coordinates?.x === "number" && typeof item.coordinates?.y === "number" && item.matchedAddress,
  );
  if (!match?.matchedAddress || match.coordinates?.x == null || match.coordinates.y == null) return null;
  return {
    lat: match.coordinates.y,
    lon: match.coordinates.x,
    label: match.matchedAddress,
    zip: zipOf(match.addressComponents?.zip, match.matchedAddress),
  };
}

async function locateAddress(query: string): Promise<LocatedAddress | null> {
  const census = await censusLocate(query);
  if (census) return census;
  const hits = await geocode(query, 5);
  const hit = hits.find(usable);
  if (!hit) return null;
  return {
    lat: Number(hit.lat),
    lon: Number(hit.lon),
    label: hit.display_name,
    zip: zipOf(hit.address?.postcode, hit.display_name),
  };
}

async function originPoint(origin: string): Promise<{ lat: number; lon: number }> {
  const cached = originCache.get(origin);
  if (cached && Date.now() - cached.at < 60 * 60 * 1000) return cached;
  const located = await locateAddress(origin);
  if (!located || !Number.isFinite(located.lat) || !Number.isFinite(located.lon)) {
    throw new DeliveryError("The kitchen's delivery location could not be found. Update it in settings.");
  }
  const point = { lat: located.lat, lon: located.lon, at: Date.now() };
  originCache.set(origin, point);
  return point;
}

async function drivingMeters(from: { lat: number; lon: number }, to: { lat: number; lon: number }): Promise<number> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lon},${from.lat};${to.lon},${to.lat}?overview=false`;
  const response = await fetch(url, {
    headers: { accept: "application/json", "user-agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) {
    throw new DeliveryError("We couldn't calculate the driving distance. Check the address and try again.");
  }
  const data = (await response.json()) as { code?: string; routes?: { distance?: number }[] };
  const meters = data.code === "Ok" ? data.routes?.[0]?.distance : undefined;
  if (typeof meters !== "number" || !Number.isFinite(meters) || meters <= 0) {
    throw new DeliveryError("We couldn't calculate the driving distance. Check the address and try again.");
  }
  return meters;
}

export function priceDelivery(miles: number, settings: Pick<Settings, "deliveryRatePerMile" | "minDeliveryFee" | "freeDelivery">): number {
  if (settings.freeDelivery) return 0;
  const calculated = roundMoney(miles * settings.deliveryRatePerMile);
  return roundMoney(Math.max(calculated, settings.minDeliveryFee));
}

export async function suggestAddresses(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (trimmed.length < 5) return [];
  const hits = await geocode(trimmed, 5);
  return hits.filter(usable).map((hit) => hit.display_name).slice(0, 5);
}

/** Driving distance from the configured kitchen location. Does not add anything to an order. */
export async function quoteDelivery(settings: Settings, rawAddress: string): Promise<DeliveryQuote> {
  if (!settings.deliveryEnabled) throw new DeliveryError("Delivery is not available right now. Pickup has no delivery fee.");
  const address = rawAddress.trim();
  if (address.length < 8) throw new DeliveryError("Enter a street address, city, and ZIP code.");
  const located = await locateAddress(address);
  if (!located) {
    throw new DeliveryError("We couldn't verify that address. Check the street, city, and ZIP, then calculate again.");
  }
  if (settings.deliveryZipCodes.length > 0 && (!located.zip || !settings.deliveryZipCodes.includes(located.zip))) {
    throw new DeliveryError("That address is outside the ZIP codes we deliver to.");
  }
  const start = await originPoint(settings.deliveryOrigin);
  const meters = await drivingMeters(start, located);
  const miles = roundMiles(meters);
  if (settings.maxDeliveryMiles > 0 && miles > settings.maxDeliveryMiles) {
    throw new DeliveryError(
      `We deliver up to ${settings.maxDeliveryMiles} miles. This address is ${miles} miles away by road.`,
    );
  }
  return {
    address: located.label,
    miles,
    ratePerMile: settings.deliveryRatePerMile,
    fee: priceDelivery(miles, settings),
  };
}
