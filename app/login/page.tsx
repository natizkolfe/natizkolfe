import { Suspense } from "react";
import { AuthScreen } from "@/components/auth-screen";

export default function LoginPage() {
  return (
    <Suspense fallback={<p className="px-6 py-10 text-muted-foreground">Opening sign in…</p>}>
      <AuthScreen mode="login" />
    </Suspense>
  );
}
