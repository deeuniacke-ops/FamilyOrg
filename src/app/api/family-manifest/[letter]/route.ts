import { NextRequest, NextResponse } from "next/server";

function sanitizeLetter(raw: string): string {
  const match = decodeURIComponent(raw).trim().match(/[a-zA-Z]/);
  return match ? match[0].toUpperCase() : "C";
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ letter: string }> }) {
  const { letter: rawLetter } = await params;
  const letter = sanitizeLetter(rawLetter);

  return NextResponse.json(
    {
      name: "Clann Family Organiser",
      short_name: "Clann",
      description: "One shared calendar for everyone's activities",
      start_url: "/",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#8b5cf6",
      icons: [
        { src: `/api/family-icon/${letter}/192`, sizes: "192x192", type: "image/png" },
        { src: `/api/family-icon/${letter}/512`, sizes: "512x512", type: "image/png" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
