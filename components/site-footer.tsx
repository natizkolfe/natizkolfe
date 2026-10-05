import Link from "next/link";

const ORDER_LINKS = [
  { href: "/menu", label: "Packages" },
  { href: "/order?kind=weekly", label: "Weekly meal preparation" },
  { href: "/order?kind=catering", label: "Catering by guest count" },
];

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border print:hidden">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl">Gebeta</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            Ethiopian meals for the week, and catering counted by the guest. Payment clears before anything is cooked.
          </p>
        </div>
        <div className="text-sm leading-6">
          <p className="font-medium">Kitchen</p>
          <p className="text-muted-foreground">4473 Rowland N Dr, Stone Mountain, GA 30083</p>
          <p className="text-muted-foreground">Orders need at least one week of notice.</p>
          <Link href="/admin" className="mt-2 inline-block text-primary">
            Staff entrance
          </Link>
        </div>
        <div className="text-sm leading-6">
          <p className="font-medium">Order</p>
          <div className="grid text-muted-foreground">
            {ORDER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
