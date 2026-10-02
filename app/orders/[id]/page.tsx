"use client";

import { useParams } from "next/navigation";
import { OrderDetail } from "@/components/order-views";

export default function OrderPage() {
  const params = useParams<{ id: string }>();
  return <OrderDetail orderId={params.id} />;
}
