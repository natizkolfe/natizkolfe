"use client";

import { Button } from "@/components/ui/button";
import { Shell } from "@/components/page-intro";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <Shell>
      <h1 className="font-display text-5xl">This page stumbled.</h1>
      <p className="mt-3 text-muted-foreground">The order data is still on the server. Try the page again.</p>
      <Button className="mt-6 h-11 px-4" onClick={() => reset()}>
        Try again
      </Button>
    </Shell>
  );
}
