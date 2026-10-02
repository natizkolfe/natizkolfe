import { OrderError } from "@/lib/orders";

export type IdContext = { params: Promise<{ id: string }> };

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {};
  }
  return body as Record<string, unknown>;
}

export function fail(error: unknown) {
  if (error instanceof OrderError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return Response.json({ error: "Something went wrong. Try again." }, { status: 500 });
}

export function errorMessage(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
