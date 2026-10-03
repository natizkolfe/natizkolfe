"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Menu } from "lucide-react";
import { useAuth, useDraft } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "cn";

const LINKS = [
  { href: "/menu", label: "Packages" },
  { href: "/order?kind=weekly", label: "Weekly meals" },
  { href: "/order?kind=catering", label: "Catering" },
  { href: "/orders", label: "Your orders" },
];

function linkActive(href: string, pathname: string, kind: string | null) {
  const [path, query] = href.split("?");
  const onOrder = pathname === "/order" || pathname.startsWith("/order/");
  if (query) {
    const linkKind = new URLSearchParams(query).get("kind");
    return onOrder && kind === linkKind;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

function NavLinks({
  className,
  linkClassName,
  onNavigate,
}: {
  className: string;
  linkClassName: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const params = useSearchParams();
  const { draft } = useDraft();
  const onOrder = pathname === "/order" || pathname.startsWith("/order/");
  const requested = params.get("kind");
  const kind = requested === "weekly" || requested === "catering" ? requested : onOrder ? (draft?.kind ?? null) : null;

  return (
    <nav className={className}>
      {LINKS.map((link) => {
        const active = linkActive(link.href, pathname, kind);
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(linkClassName, active && "bg-card text-foreground")}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const { user, staff, ready } = useAuth();
  const [open, setOpen] = useState(false);
  const accountActive = pathname === "/account" || pathname.startsWith("/account/");
  const kitchenActive = pathname === "/admin" || pathname.startsWith("/admin/");

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center">
          <img src="/gebeta-logo.png" alt="Gebeta" className="h-16 w-auto rounded-xl" />
        </Link>
        <Suspense
          fallback={
            <nav className="ml-4 hidden items-center gap-1 md:flex">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          }
        >
          <NavLinks
            className="ml-4 hidden items-center gap-1 md:flex"
            linkClassName="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
          />
        </Suspense>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {staff ? (
            <Button variant="outline" className="h-9 bg-card px-3" render={<Link href="/admin" />}>
              Kitchen
            </Button>
          ) : null}
          {ready && user ? (
            <Button variant="outline" className="h-9 bg-card px-3" render={<Link href="/account" />}>
              {user.name.split(" ")[0]}
            </Button>
          ) : (
            <Button variant="outline" className="h-9 bg-card px-3" render={<Link href="/login" />}>
              Sign in
            </Button>
          )}
          <Button className="h-9 px-3" render={<Link href="/order" />}>
            Start an order
          </Button>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            className="ml-auto inline-flex size-10 items-center justify-center rounded-md border border-border bg-card md:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(100%,20rem)]">
            <SheetHeader>
              <SheetTitle>
                <img src="/gebeta-logo.png" alt="Gebeta" className="h-16 w-auto rounded-xl" />
              </SheetTitle>
            </SheetHeader>
            <Suspense
              fallback={
                <nav className="grid gap-1 px-4">
                  {LINKS.map((link) => (
                    <Link key={link.href} href={link.href} className="rounded-md px-2 py-3 text-base">
                      {link.label}
                    </Link>
                  ))}
                </nav>
              }
            >
              <NavLinks
                className="grid gap-1 px-4"
                linkClassName="rounded-md px-2 py-3 text-base text-muted-foreground hover:text-foreground"
                onNavigate={() => setOpen(false)}
              />
            </Suspense>
            <nav className="grid gap-1 px-4">
              <Link
                href="/account"
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-2 py-3 text-base text-muted-foreground hover:text-foreground",
                  accountActive && "bg-card text-foreground",
                )}
              >
                Account
              </Link>
              {staff ? (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-2 py-3 text-base text-muted-foreground hover:text-foreground",
                    kitchenActive && "bg-card text-foreground",
                  )}
                >
                  Kitchen
                </Link>
              ) : null}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
