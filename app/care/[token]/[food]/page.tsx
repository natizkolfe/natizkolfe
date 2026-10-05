import { CarePageView, CareUnavailable } from "@/components/care-page";
import { findCareOrder, publicCare } from "@/lib/care";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CareFoodPage({ params }: { params: Promise<{ token: string; food: string }> }) {
  const { token, food } = await params;
  const order = findCareOrder(readDb(), token);
  const care = order ? publicCare(order, food) : null;
  if (care === "unknown-food") {
    return <CareUnavailable message="This sticker does not match a dish on the published care sheet for this order." />;
  }
  if (!care) {
    return (
      <CareUnavailable message="This care link is not available. Instructions are published when the order is confirmed." />
    );
  }
  return <CarePageView care={care} />;
}
