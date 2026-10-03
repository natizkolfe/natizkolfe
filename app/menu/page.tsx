import { PackageBoard } from "@/components/package-board";
import { PageIntro, Shell } from "@/components/page-intro";

export default function MenuPage() {
  return (
    <Shell>
      <PageIntro
        eyebrow="Packages"
        title="Three ways to order the same standard price."
        lede="Catering starts at $21 per person. Fasting and non-fasting dishes are already included. A mixed order lets you choose from both, and only add-ons cost more."
      />
      <PackageBoard />
    </Shell>
  );
}
