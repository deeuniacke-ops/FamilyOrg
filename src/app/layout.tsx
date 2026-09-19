import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import FamilyGate from "@/components/FamilyGate";

export async function generateMetadata(): Promise<Metadata> {
  const cookieStore = await cookies();
  const raw = cookieStore.get("family_letter")?.value ?? "";
  const match = raw.match(/[a-zA-Z]/);
  const letter = match ? match[0].toUpperCase() : "C";

  return {
    title: "Clann",
    description: "Family organiser for calendars, routines, activities and family plans",
    manifest: `/api/family-manifest/${letter}`,
    icons: { apple: `/api/family-icon/${letter}/192` },
    appleWebApp: {
      capable: true,
      title: "Clann",
      statusBarStyle: "default",
    },
  };
}

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
