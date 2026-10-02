import { Suspense } from "react";
import { AuthScreen } from "@/components/auth-screen";

export default function JoinPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10 text-muted-foreground">Opening account setup…</p>}>
      <AuthScreen mode="join" />
    </Suspense>
  );
}
