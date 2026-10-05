import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { HideOnCare } from "@/components/hide-on-care";
import { Providers } from "@/components/providers";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: {
    default: "Gebeta — Ethiopian catering and weekly meals",
    template: "%s · Gebeta",
  },
  description:
    "Order fasting and non-fasting Ethiopian food for the week or for a gathering. Customize each dish, pay before the kitchen starts, and pick up with a verification code.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <Providers>
          <HideOnCare>
            <SiteHeader />
          </HideOnCare>
          <main className="flex-1">{children}</main>
          <HideOnCare>
            <SiteFooter />
          </HideOnCare>
        </Providers>
      </body>
    </html>
  );
}
