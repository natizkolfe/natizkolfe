"use client";

import { useParams } from "next/navigation";
import { KitchenTicket } from "@/components/kitchen";
import { useAuth } from "@/components/providers";

export default function AdminOrderPage() {
  const { staff } = useAuth();
  const params = useParams<{ id: string }>();
  if (!staff) return null;
  return <KitchenTicket orderId={params.id} />;
}
