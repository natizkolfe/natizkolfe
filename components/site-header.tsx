"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { MesobMark } from "@/components/mark";
import { useAuth } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "cn";

const LINKS = [
  { href: "/menu", label: "Menu" },
  { href: "/order?kind=weekly", label: "Weekly meals" },
  { href: "/order?kind=catering", label: "Catering" },
  { href: "/orders", label: "Your orders" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const { user, staff, ready } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <MesobMark className="size-8" />
          <span className="font-display text-2xl leading-none tracking-tight">Gebeta</span>
        </Link>
        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href || (link.href.startsWith("/order") && pathname.startsWith("/order"));
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground",
                  active && "bg-card text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
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
              <SheetTitle className="font-display text-2xl">Gebeta</SheetTitle>
            </SheetHeader>
            <nav className="grid gap-1 px-4">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2 py-3 text-base"
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/account" onClick={() => setOpen(false)} className="rounded-md px-2 py-3 text-base">
                Account
              </Link>
              {staff ? (
                <Link href="/admin" onClick={() => setOpen(false)} className="rounded-md px-2 py-3 text-base">
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
