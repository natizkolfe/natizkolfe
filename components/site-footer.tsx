import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-3">
        <div>
          <p className="font-display text-2xl">Gebeta</p>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            Ethiopian meals for the week, and catering counted by the guest. Payment clears before anything is cooked.
          </p>
        </div>
        <div className="text-sm leading-6">
          <p className="font-medium">Kitchen</p>
          <p className="text-muted-foreground">Gebeta Kitchen, 412 East 9th Street</p>
          <p className="text-muted-foreground">Orders need at least one week of notice.</p>
          <Link href="/admin" className="mt-2 inline-block text-primary">
            Staff entrance
          </Link>
        </div>
        <div className="text-sm leading-6">
          <p className="font-medium">Order</p>
          <div className="grid text-muted-foreground">
            <Link href="/menu" className="hover:text-foreground">
              Packages
            </Link>
            <Link href="/order?kind=weekly" className="hover:text-foreground">
              Weekly meal preparation
            </Link>
            <Link href="/order?kind=catering" className="hover:text-foreground">
              Catering by guest count
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
