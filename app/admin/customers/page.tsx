"use client";

import { KitchenCustomers } from "@/components/kitchen";
import { useAuth } from "@/components/providers";

export default function AdminCustomersPage() {
  const { staff } = useAuth();
  if (!staff) return null;
  return <KitchenCustomers />;
}
