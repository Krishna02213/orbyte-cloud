import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orbyte Cloud — Cloud systems that stay boring",
  description:
    "Cloud architecture, Kubernetes, platform engineering, security, FinOps, and 24/7 reliability for teams that need to ship with confidence.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
