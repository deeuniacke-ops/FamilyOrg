import type { Metadata, Viewport } from "next";
import "./globals.css";
import FamilyGate from "@/components/FamilyGate";

export const metadata: Metadata = {
  title: "Clann",
  description: "Family organiser for calendars, routines, activities and family plans",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Clann",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#8b5cf6",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <FamilyGate>{children}</FamilyGate>
      </body>
    </html>
  );
}
