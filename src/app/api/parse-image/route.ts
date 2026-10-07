import { NextRequest, NextResponse } from "next/server";

type Child = { id: string; name: string; age?: number; initials?: string };

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const SYSTEM_PROMPT = `You are reading a photo of something like a school note, appointment card, text message, or reminder for a family activity organiser app. Today's date is {{TODAY}}. The family members are:\n{{CHILDREN}}\nExtract every activity/appointment you can find in the image, no matter who it's for or what kind of activity or appointment it is - medical, cosmetic, sport, social, adult, child, anything. It is not your job to judge whether an event belongs in the calendar; only the user decides that. Never refuse to extract an event because it doesn't look child-related or doesn't match a listed family member. Return only valid JSON with this shape: {"activities":[{"childId":"","title":"","date":"YYYY-MM-DD","time":"HH:MM","durationMinutes":60,"location":"","notes":""}],"message":""}. Resolve relative or partial dates using today's date. If a family member's name in the image roughly matches one in the list, use their id; otherwise leave childId empty - an unmatched name is not a reason to drop the activity. For "notes", capture any other relevant detail from the image that isn't already covered by title/date/time/location - what to bring or wear, dress-up or colour themes, cost or donation amounts, fundraising context, sponsor/organiser names, or any other instruction a parent would need to act on. Keep it brief (a short sentence or two per activity); leave "notes" empty if there's genuinely nothing beyond the core details. Only return an empty activities array if the image genuinely contains no date/time/event information at all, and say why in "message".`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageData = typeof body.image === "string" ? body.image : "";
    const mediaType = typeof body.mediaType === "string" ? body.mediaType : "image/jpeg";
    const children = Array.isArray(body.children) ? (body.children as Child[]) : [];
    if (!imageData) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        activities: [],
        message: "Reading photos needs Claude to be configured for this app — ask whoever set it up to add an API key.",
      });
    }

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });
      const today = localDate(new Date());
      const childrenList = children.map((child) => `- ${child.name} (id: ${child.id})`).join("\n") || "No family members registered";

      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
        max_tokens: 1024,
        system: SYSTEM_PROMPT.replace("{{TODAY}}", today).replace("{{CHILDREN}}", childrenList),
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png", data: imageData } },
              { type: "text", text: "Extract the activity/activities from this photo." },
            ],
          },
        ],
      });
      const text = response.content.filter((block) => block.type === "text").map((block) => block.text).join("");
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return NextResponse.json({ activities: [], message: "Couldn't make sense of that photo — try again or add it manually." });
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    } catch (error) {
      console.error("Image parsing failed:", error);
      return NextResponse.json({ activities: [], message: "Couldn't read that photo — try again or add it manually." });
    }
  } catch (error) {
    console.error("Parse image request error:", error);
    return NextResponse.json({ error: "Failed to parse image" }, { status: 500 });
  }
}
