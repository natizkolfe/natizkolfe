import { Suspense } from "react";
import { OrderSetup } from "@/components/order-setup";

export default function OrderPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10 text-muted-foreground">Setting the kitchen calendar…</p>}>
      <OrderSetup />
    </Suspense>
  );
}
