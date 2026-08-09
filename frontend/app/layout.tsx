import type { Metadata } from "next";

import { AppShell } from "@/components/AppShell";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "BidSight | Procurement Intelligence",
    template: "%s | BidSight",
  },
  description:
    "AI-assisted vendor quotation evaluation with transparent compliance scoring.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
