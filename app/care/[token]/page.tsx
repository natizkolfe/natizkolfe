import { CarePageView, CareUnavailable } from "@/components/care-page";
import { findCareOrder, publicCare } from "@/lib/care";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CareOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const order = findCareOrder(readDb(), token);
  const care = order ? publicCare(order) : null;
  if (!care || care === "unknown-food") {
    return (
      <CareUnavailable message="This care link is not available. Instructions are published when the order is confirmed." />
    );
  }
  return <CarePageView care={care} />;
}
