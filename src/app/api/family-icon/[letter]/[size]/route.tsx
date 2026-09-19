import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

function sanitizeLetter(raw: string): string {
  const match = decodeURIComponent(raw).trim().match(/[a-zA-Z]/);
  return match ? match[0].toUpperCase() : "C";
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ letter: string; size: string }> }) {
  const { letter: rawLetter, size: rawSize } = await params;
  const letter = sanitizeLetter(rawLetter);
  const size = rawSize === "512" ? 512 : 192;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%)",
        }}
      >
        <span style={{ fontSize: size * 0.58, fontWeight: 800, color: "white", lineHeight: 1 }}>
          {letter}
        </span>
      </div>
    ),
    { width: size, height: size }
  );
}
