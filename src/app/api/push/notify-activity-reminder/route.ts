import { NextRequest, NextResponse } from "next/server";
import type { MyIdentity } from "@/lib/member-link";
import { matchRoles, describeActivityForMe } from "@/lib/activity-roles";

function letterFor(name: string): string {
  const match = name.trim().match(/[a-zA-Z]/);
  return match ? match[0].toUpperCase() : "C";
}

/** "Today" / "Tomorrow" / a weekday label, relative to right now - makes an
 *  instant reminder read naturally regardless of how far out the activity is. */
function dayLabel(date: string): string {
  const target = new Date(date + "T12:00:00");
  const now = new Date();
  const todayStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
  if (date === todayStr) return "Today";
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.getFullYear() + "-" + String(tomorrow.getMonth() + 1).padStart(2, "0") + "-" + String(tomorrow.getDate()).padStart(2, "0");
  if (date === tomorrowStr) return "Tomorrow";
  return target.toLocaleDateString("en-IE", { weekday: "long", day: "numeric", month: "short" });
}

export async function POST(request: NextRequest) {
  try {
    const { familyId, activity } = await request.json();
    if (typeof familyId !== "string" || !familyId || !activity) {
      return NextResponse.json({ error: "Missing familyId/activity" }, { status: 400 });
    }

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate || !process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Fire-and-forget from the client's point of view — never surface as
      // an error to someone who was just trying to save an activity.
      return NextResponse.json({ sent: 0 });
    }

    const { default: webpush } = await import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:cluichiapp@gmail.com",
      vapidPublic,
      vapidPrivate
    );

    const { getAdminDb } = await import("@/lib/firebase-admin");
    const db = getAdminDb();

    const [subsSnap, childrenSnap, familySettings] = await Promise.all([
      db.collection("families").doc(familyId).collection("pushSubscriptions").get(),
      db.collection("families").doc(familyId).collection("children").get(),
      db.collection("families").doc(familyId).collection("settings").doc("family").get(),
    ]);
    if (subsSnap.empty) return NextResponse.json({ sent: 0 });

    const childNameById = new Map(childrenSnap.docs.map((d) => [d.id, (d.data()?.name as string) || ""]));
    const familyName = (familySettings.data()?.name as string) || "Family";
    const icon = `${request.nextUrl.origin}/api/family-icon/${letterFor(familyName)}/192`;
    const label = dayLabel(activity.date);

    let sent = 0;
    for (const subDoc of subsSnap.docs) {
      const sub = subDoc.data() as { endpoint?: string; keys?: { p256dh?: string; auth?: string }; identity?: MyIdentity };
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth || !sub.identity) continue;

      const roles = matchRoles(sub.identity, activity);
      if (!roles.length) continue; // only ping the people actually involved in this activity

      const childNames = (activity.childIds as string[]).map((id) => childNameById.get(id)).filter((n): n is string => !!n);
      const lines = describeActivityForMe(roles, activity, childNames);

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          JSON.stringify({ title: `Hi ${sub.identity.name}`, body: `${label} — ${lines.join(" · ")}`, icon, url: "/" })
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) await subDoc.ref.delete();
      }
    }

    return NextResponse.json({ sent });
  } catch (error) {
    console.error("notify-activity-reminder error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
