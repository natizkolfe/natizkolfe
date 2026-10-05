"use client";

import { useParams } from "next/navigation";
import { CareLabels } from "@/components/care-labels";
import { useAuth } from "@/components/providers";

export default function OrderLabelsPage() {
  const { staff } = useAuth();
  const params = useParams<{ id: string }>();
  if (!staff || !params.id) return null;
  return <CareLabels orderId={params.id} />;
}
