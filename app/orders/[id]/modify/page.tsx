"use client";

import { useParams } from "next/navigation";
import { ModifyOrder } from "@/components/modify-order";

export default function ModifyOrderPage() {
  const params = useParams<{ id: string }>();
  return <ModifyOrder orderId={params.id} />;
}
