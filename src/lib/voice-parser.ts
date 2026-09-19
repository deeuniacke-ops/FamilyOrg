import { getChildren } from "./family-store";

const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const hours: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
};

function normalise(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
}

function localDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(text: string) {
  const date = new Date();
  if (text.includes("tomorrow")) { date.setDate(date.getDate() + 1); return localDate(date); }
  if (text.includes("today")) return localDate(date);

  const numericDate = text.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(january|february|march|april|may|june|july|august|september|october|november|december)\b/);
  if (numericDate) {
    const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    const result = new Date(date.getFullYear(), months.indexOf(numericDate[2]), Number(numericDate[1]), 12);
    if (result < date) result.setFullYear(result.getFullYear() + 1);
    return localDate(result);
  }

  const target = weekdays.findIndex((day) => text.includes(day));
  if (target < 0) return "";
  let diff = (target - date.getDay() + 7) % 7;
  if (!diff) diff = 7;
  date.setDate(date.getDate() + diff);
  return localDate(date);
}

function parseTime(text: string) {
  const half = text.match(/half\s+past\s+(\w+)/);
  if (half && hours[half[1]]) return `${String(hours[half[1]]).padStart(2, "0")}:30`;

  const numeric = text.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm|a m|p m)?/);
  if (numeric) {
    let hour = Number(numeric[1]);
    const minute = Number(numeric[2] ?? 0);
    const ampm = (numeric[3] || "").replace(/\s/g, "");
    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;
    if (!ampm && hour >= 1 && hour <= 6) hour += 12;
    if (hour <= 23 && minute <= 59) return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const oclock = text.match(/(\w+)\s*o'?clock/);
  if (oclock && hours[oclock[1]]) return `${String(hours[oclock[1]]).padStart(2, "0")}:00`;
  return "";
}

function parseDuration(text: string) {
  const mins = text.match(/(\d+)\s*(?:minutes?|mins?)/);
  if (mins) return Number(mins[1]);
  if (text.includes("two hours")) return 120;
  if (text.includes("three hours")) return 180;
  return 60;
}

export function parseTranscriptLocally(transcript: string) {
  const text = normalise(transcript);
  const children = getChildren();
  const child = children.find((item) => {
    const childName = normalise(item.name);
    const firstName = childName.split(" ")[0];
    return text.includes(childName) || text.includes(firstName) || text.includes(normalise(item.initials));
  });

  let title = transcript;
  if (child) title = title.replace(new RegExp(child.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig"), "");
  title = title
    .replace(/\b(has|have|is|are|on|at|for|today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|next|this|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|quarter|past|after|to|o'clock|hour|hours|minutes|minute|am|pm)\b/gi, " ")
    .replace(/\b\d{1,2}(?::\d{2})?\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const date = parseDate(text);
  const time = parseTime(text);

  return {
    activities: [{
      childId: child?.id ?? "",
      title: title || "Activity",
      date,
      time,
      durationMinutes: parseDuration(text),
    }],
    message: child && date && time
      ? `Added ${title || "activity"} for ${child.name}`
      : `I heard "${transcript}", but need the child's name, day and time.`,
    ok: !!(child && date && time),
  };
}
