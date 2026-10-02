import Link from "next/link";
import { Shell } from "@/components/page-intro";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <Shell>
      <h1 className="font-display text-5xl">That page is not on the table.</h1>
      <p className="mt-3 text-muted-foreground">The link may be old, or the order may belong to another account.</p>
      <Button className="mt-6 h-11 px-4" render={<Link href="/" />}>
        Back to Gebeta
      </Button>
    </Shell>
  );
}
