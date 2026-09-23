import { NextRequest, NextResponse } from "next/server";
import type { FamilyActivity } from "@/lib/family-store";

function localDate(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export async function GET(request: NextRequest) {
  try {
    // Vercel Cron automatically sends this header when CRON_SECRET is set —
    // rejects anyone else from triggering the job.
    const authHeader = request.headers.get("authorization");
    if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const type = request.nextUrl.searchParams.get("type");
    if (type !== "morning" && type !== "evening") {
      return NextResponse.json({ error: "Missing or invalid ?type" }, { status: 400 });
    }
    // For manual re-testing only — still requires the same secret, so this
    // isn't a public bypass, just skips the "already sent today" guard.
    const force = request.nextUrl.searchParams.get("force") === "true";

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate || !process.env.FIREBASE_SERVICE_ACCOUNT) {
      return NextResponse.json({ error: "Push isn't fully configured yet." }, { status: 500 });
    }

    const { default: webpush } = await import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:deeuniacke@gmail.com",
      vapidPublic,
      vapidPrivate
    );

    const { getAdminDb } = await import("@/lib/firebase-admin");
    const { occursOnDate } = await import("@/lib/recurrence");
    const db = getAdminDb();

    const now = new Date();
    const targetDate = type === "morning" ? localDate(now) : localDate(new Date(now.getTime() + 86_400_000));

    // Scan every family's activities via a collection-group query — only
    // possible here because admin credentials bypass the security rules
    // that (correctly) block this from any normal client.
    const activitiesSnap = await db.collectionGroup("activities").get();
    const byFamily = new Map<string, { title: string; time: string; allDay?: boolean }[]>();
    for (const docSnap of activitiesSnap.docs) {
      const familyId = docSnap.ref.parent.parent?.id;
      if (!familyId) continue;
      const activity = docSnap.data() as FamilyActivity;
      const occurrence = occursOnDate(activity, targetDate);
      if (!occurrence) continue;
      const list = byFamily.get(familyId) || [];
      list.push({ title: occurrence.title, time: occurrence.time, allDay: occurrence.allDay });
      byFamily.set(familyId, list);
    }

    let familiesNotified = 0;
    let devicesSent = 0;

    for (const [familyId, activities] of byFamily) {
      // Dedup — skip if this family already got today's digest of this type
      const dedupRef = db.collection("families").doc(familyId).collection("notifiedDigests").doc(`${targetDate}_${type}`);
      if (!force && (await dedupRef.get()).exists) continue;

      const subsSnap = await db.collection("families").doc(familyId).collection("pushSubscriptions").get();
      if (subsSnap.empty) continue;

      activities.sort((a, b) => (a.allDay ? "" : a.time).localeCompare(b.allDay ? "" : b.time));
      const title = type === "morning" ? "Good morning! ☀️ Here's your day" : "Getting ready for tomorrow";
      const shown = activities.slice(0, 4).map((a) => (a.allDay ? a.title : `${a.time} ${a.title}`));
      const body = shown.join(", ") + (activities.length > 4 ? ` +${activities.length - 4} more` : "");

      let sentAny = false;
      for (const subDoc of subsSnap.docs) {
        const sub = subDoc.data() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
        if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue;
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
            JSON.stringify({ title, body, url: "/" })
          );
          devicesSent++;
          sentAny = true;
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) await subDoc.ref.delete();
        }
      }

      if (sentAny) {
        await dedupRef.set({ sentAt: new Date().toISOString() });
        familiesNotified++;
      }
    }

    return NextResponse.json({ type, targetDate, familiesNotified, devicesSent });
  } catch (error) {
    console.error("daily-digest error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed: ${detail}` }, { status: 500 });
  }
}
