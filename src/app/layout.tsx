import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import FirestoreSync from "@/components/FirestoreSync";
import Toast from "@/components/Toast";
import AuthGate from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "Cluichí",
  description: "Cork Wanderers Hockey Club — availability, fixtures & squad planning",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Cluichí",
  },
  openGraph: {
    title: "Cluichí",
    description: "Cork Wanderers Hockey Club — availability, fixtures & squad planning",
    siteName: "Cluichí",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cluichí — Cork Wanderers Hockey",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cluichí",
    description: "Cork Wanderers Hockey Club — availability, fixtures & squad planning",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#1e3a6e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <AuthGate>
          <div className="min-h-screen max-w-lg mx-auto pb-safe">
            <Header />

            {/* Content */}
            <main className="px-4 py-4">{children}</main>
          </div>

          <BottomNav />
          <Toast />
          <FirestoreSync />
        </AuthGate>
      </body>
    </html>
  );
}
