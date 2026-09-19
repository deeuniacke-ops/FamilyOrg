import { NextRequest, NextResponse } from "next/server";

type Child = { id: string; name: string; age?: number; initials?: string };

type Activity = {
  childId: string;
  title: string;
  date: string;
  time: string;
  durationMinutes: number;
  location?: string;
  notes?: string;
};

const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const spokenHours: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function localDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(text: string) {
  const date = new Date();
  if (text.includes("tomorrow")) date.setDate(date.getDate() + 1);
  else if (text.includes("today")) return localDate(date);
  else {
    const numeric = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
    if (numeric) {
      const result = new Date(date.getFullYear(), months.indexOf(numeric[2]), Number(numeric[1]), 12);
      if (result < new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)) result.setFullYear(result.getFullYear() + 1);
      return localDate(result);
    }
    const weekday = weekdays.findIndex((day) => text.includes(day));
    if (weekday < 0) return "";
    let difference = (weekday - date.getDay() + 7) % 7;
    if (!difference) difference = 7;
    date.setDate(date.getDate() + difference);
  }
  return localDate(date);
}

function parseTime(text: string) {
  const half = text.match(/half\s+past\s+(\w+)/);
  if (half && spokenHours[half[1]]) return `${String(spokenHours[half[1]]).padStart(2, "0")}:30`;

  const quarter = text.match(/quarter\s+(past|after)\s+(\w+)/);
  if (quarter && spokenHours[quarter[2]]) return `${String(spokenHours[quarter[2]]).padStart(2, "0")}:15`;

  const numeric = text.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (numeric) {
    let hour = Number(numeric[1]);
    const minute = Number(numeric[2] || 0);
    if (numeric[3] === "pm" && hour < 12) hour += 12;
    if (numeric[3] === "am" && hour === 12) hour = 0;
    if (!numeric[3] && hour >= 1 && hour <= 6) hour += 12;
    if (hour <= 23 && minute <= 59) return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const spoken = Object.entries(spokenHours).find(([word]) => new RegExp(`\\b${word}\\b`).test(text));
  return spoken ? `${String(spoken[1]).padStart(2, "0")}:00` : "";
}

function parseDuration(text: string) {
  const minutes = text.match(/(\d+)\s*(?:minutes?|mins?)/);
  if (minutes) return Number(minutes[1]);
  if (text.includes("two hours")) return 120;
  if (text.includes("three hours")) return 180;
  return 60;
}

function localFallback(transcript: string, children: Child[]) {
  const text = normalise(transcript);
  const child = children.find((item) => {
    const name = normalise(item.name);
    const firstName = name.split(" ")[0];
    return text.includes(name) || text.includes(firstName) || (item.initials && text.includes(normalise(item.initials)));
  });
  const date = parseDate(text);
  const time = parseTime(text);
  let title = transcript;
  if (child) title = title.replace(new RegExp(child.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "");
  title = title.replace(/\b(has|have|is|are|on|at|for|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next|this|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|quarter|past|after|hour|hours|minutes|minute|am|pm)\b/gi, " ").replace(/\b\d{1,2}(?::\d{2})?\b/g, " ").replace(/\s+/g, " ").trim();

  const activity: Activity = { childId: child?.id || "", title: title || "Activity", date, time, durationMinutes: parseDuration(text) };
  return {
    activities: [activity],
    message: child && date && time ? `Added ${activity.title} for ${child.name}` : `I heard “${transcript}”, but need the child's name, day and time.`,
  };
}

const SYSTEM_PROMPT = `You are a voice-input parser for a family activity organiser app. Today's date is {{TODAY}}. The children are:\n{{CHILDREN}}\nReturn only valid JSON with this shape: {"activities":[{"childId":"","title":"","date":"YYYY-MM-DD","time":"HH:MM","durationMinutes":60}],"message":""}. Resolve relative dates and times. Return one activity per child/activity.`;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
    const children = Array.isArray(body.children) ? body.children as Child[] : [];
    if (!transcript) return NextResponse.json({ error: "No transcript provided" }, { status: 400 });

    const fallback = () => NextResponse.json(localFallback(transcript, children));
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return fallback();

    try {
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      const client = new Anthropic({ apiKey });
      const today = localDate(new Date());
      const childrenList = children.map((child) => `- ${child.name} (id: ${child.id})`).join("\n") || "No children registered";
      const response = await client.messages.create({
        model: process.env.ANTHROPIC_MODEL || "claude-haiku-4-5",
        max_tokens: 512,
        system: SYSTEM_PROMPT.replace("{{TODAY}}", today).replace("{{CHILDREN}}", childrenList),
        messages: [{ role: "user", content: transcript }],
      });
      const text = response.content.filter((block) => block.type === "text").map((block) => block.text).join("");
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return fallback();
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    } catch (error) {
      console.error("Voice AI unavailable; using local parser:", error);
      return fallback();
    }
  } catch (error) {
    console.error("Parse voice request error:", error);
    return NextResponse.json({ error: "Failed to parse voice input" }, { status: 500 });
  }
}
