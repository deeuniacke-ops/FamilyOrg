import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import type { FamilyActivity, Child } from "@/lib/family-store";
import { overlapIds } from "@/lib/clashes";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_ROWS = 6;

export async function GET(request: NextRequest) {
  const familyId = request.nextUrl.searchParams.get("familyId");
  const date = request.nextUrl.searchParams.get("date");
  if (!familyId || !date || !DATE_RE.test(date)) {
    return new Response("Missing or invalid familyId/date", { status: 400 });
  }

  const { getAdminDb } = await import("@/lib/firebase-admin");
  const { occursOnDate } = await import("@/lib/recurrence");
  const db = getAdminDb();
  const familyRef = db.collection("families").doc(familyId);

  const [childrenSnap, activitiesSnap, settingsSnap] = await Promise.all([
    familyRef.collection("children").get(),
    familyRef.collection("activities").get(),
    familyRef.collection("settings").doc("family").get(),
  ]);

  const children = childrenSnap.docs.map((d) => d.data() as Child);
  const familyName = (settingsSnap.data()?.name as string) || "Family";

  const occurrences = activitiesSnap.docs
    .map((d) => occursOnDate(d.data() as FamilyActivity, date))
    .filter((a): a is FamilyActivity => !!a && !a.cancelled)
    .sort((a, b) => a.time.localeCompare(b.time));

  const clashIds = overlapIds(occurrences);
  const visible = occurrences.slice(0, MAX_ROWS);
  const extraCount = occurrences.length - visible.length;

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-IE", {
    weekday: "long", day: "numeric", month: "short",
  });

  const ROW_H = 118, GAP = 14, HEADER_H = 170, FOOTER_H = 84, PAD = 32;
  const emptyH = visible.length === 0 ? 140 : 0;
  const rowsBlockH = visible.length * ROW_H + Math.max(0, visible.length - 1) * GAP + (extraCount > 0 ? 44 : 0) + emptyH;
  const height = HEADER_H + PAD * 2 + rowsBlockH + FOOTER_H;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#f8fafc", fontFamily: "sans-serif" }}>
        <div style={{
          display: "flex", flexDirection: "column", justifyContent: "center",
          height: HEADER_H, padding: "0 40px",
          background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%)",
        }}>
          <span style={{ fontSize: 34, fontWeight: 800, color: "white" }}>{dateLabel}</span>
          <span style={{ fontSize: 22, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>
            The {familyName} Family Agenda
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: GAP, padding: PAD, flex: 1 }}>
          {visible.length === 0 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
              <span style={{ fontSize: 24, color: "#94a3b8", fontWeight: 600 }}>Nothing on today 🎉</span>
            </div>
          )}
          {visible.map((activity) => {
            const activityChildren = children.filter((c) => activity.childIds.includes(c.id));
            const hasClash = clashIds.has(activity.id);
            return (
              <div key={activity.id} style={{
                display: "flex", alignItems: "center", gap: 16,
                height: ROW_H, borderRadius: 16, background: "white",
                borderLeft: `6px solid ${activityChildren[0]?.color || "#e2e8f0"}`,
                padding: "0 20px", boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 48, height: 48, borderRadius: 24,
                  background: activityChildren[0]?.color || "#e2e8f0",
                  fontSize: 16, fontWeight: 800, color: "#334155",
                }}>
                  {activityChildren[0]?.initials || "?"}
                </div>
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {activity.allDay ? "All day" : activity.time} · {activity.title}
                  </span>
                  {activity.location && (
                    <span style={{ fontSize: 16, color: "#64748b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>📍 {activity.location}</span>
                  )}
                  {!!activity.owner?.length && (
                    <span style={{ fontSize: 16, color: "#ec4899", fontWeight: 600 }}>🚗 {activity.owner.join(", ")}</span>
                  )}
                </div>
                {hasClash && (
                  <div style={{
                    display: "flex", alignItems: "center", padding: "6px 12px",
                    borderRadius: 999, background: "#fee2e2", color: "#dc2626",
                    fontSize: 14, fontWeight: 800,
                  }}>
                    ⚠ Clash
                  </div>
                )}
              </div>
            );
          })}
          {extraCount > 0 && (
            <span style={{ display: "flex", fontSize: 16, color: "#94a3b8", fontWeight: 600, justifyContent: "center" }}>
              +{extraCount} more
            </span>
          )}
        </div>

        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          height: FOOTER_H, background: "#1e1b2e",
        }}>
          <span style={{ fontSize: 15, color: "white", fontWeight: 700 }}>Cluichi — one shared calendar for the whole family</span>
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>family-org-omega.vercel.app</span>
        </div>
      </div>
    ),
    { width: 1080, height, headers: { "Cache-Control": "private, max-age=30" } }
  );
}
