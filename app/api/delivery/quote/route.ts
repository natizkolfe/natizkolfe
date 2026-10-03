import { DeliveryError, quoteDelivery } from "@/lib/delivery";
import { errorMessage, fail, readJson } from "@/lib/http";
import { readDb } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const address = typeof body.address === "string" ? body.address : "";
    const quote = await quoteDelivery(readDb().settings, address);
    return Response.json({ quote });
  } catch (error) {
    if (error instanceof DeliveryError) return errorMessage(error.message);
    return fail(error);
  }
}
