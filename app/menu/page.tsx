import { PackageBoard } from "@/components/package-board";
import { PageIntro, Shell } from "@/components/page-intro";
import { readDb } from "@/lib/store";

export const dynamic = "force-dynamic";

export default function MenuPage() {
  const prices = Object.fromEntries(
    readDb()
      .menu.filter((item) => item.available)
      .map((item) => [item.id, item.price]),
  );

  return (
    <Shell>
      <PageIntro
        eyebrow="Packages"
        title="Two standard tables. Extras only if you ask."
        lede="The fasting package and the non-fasting package already include their dishes. Open extra meals to add something, then start a weekly plan or a catering order."
      />
      <PackageBoard prices={prices} />
    </Shell>
  );
}
