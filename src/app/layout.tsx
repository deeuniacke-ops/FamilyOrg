import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import Toast from "@/components/Toast";

export const metadata: Metadata = {
  title: "Clann",
  description: "Family organiser for calendars, routines, activities and family plans",
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
        <div className="min-h-screen max-w-lg mx-auto pb-safe">
          <Header />
          <main className="px-4 py-4">{children}</main>
        </div>
        <BottomNav />
        <Toast />
      </body>
    </html>
  );
}
