import { NextRequest, NextResponse } from "next/server";

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const SYSTEM_PROMPT = `You are reading a photo of a whole school-year calendar for a family activity organiser app - typically a grid of small month calendars (e.g. August through the following July), where school closures, holidays, mid-terms, and similar are marked purely by the background colour of each day cell, explained by a legend/key somewhere in or near the image. Today's date is {{TODAY}}.

First locate the legend/key and read what each colour/marking means before deciding anything is a closure. Scan every month grid in the image. Merge consecutive calendar days that share the same legend meaning into a single date range - do not emit a separate one-day entry for each day of a multi-day break. Resolve each month against the correct year: the school year runs from around August to the following July, so use {{TODAY}} to work out which named month belongs to which calendar year (e.g. "August" is this year if today is before it, "July" is likely next year). Ignore ordinary weekends and normal term-time days - only emit genuine closure/holiday/break markings from the legend. If the legend is missing, illegible, or a colour's meaning is ambiguous, do not guess at what it means - leave those days out of "closures" entirely and explain what you couldn't read in "message".

Return only valid JSON with this shape: {"closures":[{"label":"","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD"}],"message":""}. "label" should be a short, human-readable name for the closure (e.g. "Mid-term break", "Christmas break"), taken from the legend's own wording where possible. "startDate" and "endDate" are inclusive. Only return an empty closures array if the image genuinely contains no readable school-year calendar, and say why in "message".`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const imageData = typeof body.image === "string" ? body.image : "";
    const mediaType = typeof body.mediaType === "string" ? body.mediaType : "image/jpeg";
    if (!imageData) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        closures: [],
        message: "Reading photos needs Claude to be configured for this app — ask whoever set it up to add an API key.",
      });
    }

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });
      const today = localDate(new Date());

      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL_SCHOOL_CALENDAR || "claude-sonnet-5",
        max_tokens: 2048,
        thinking: { type: "disabled" },
        system: SYSTEM_PROMPT.replace(/\{\{TODAY\}\}/g, today),
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType as "image/jpeg" | "image/png", data: imageData } },
              { type: "text", text: "Extract the school closures/holidays from this calendar image." },
            ],
          },
        ],
      });
      const text = response.content.filter((block) => block.type === "text").map((block) => block.text).join("");
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return NextResponse.json({ closures: [], message: "Couldn't make sense of that photo — try again or add dates manually." });
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    } catch (error) {
      console.error("School calendar parsing failed:", error);
      return NextResponse.json({ closures: [], message: "Couldn't read that photo — try again or add dates manually." });
    }
  } catch (error) {
    console.error("Parse school calendar request error:", error);
    return NextResponse.json({ error: "Failed to parse image" }, { status: 500 });
  }
}
