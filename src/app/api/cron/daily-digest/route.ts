import { NextRequest, NextResponse } from "next/server";
import type { FamilyActivity } from "@/lib/family-store";
import type { MyIdentity } from "@/lib/member-link";
import { matchRoles, describeActivityForMe } from "@/lib/activity-roles";

function localDate(d: Date): string {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function letterFor(name: string): string {
  const match = name.trim().match(/[a-zA-Z]/);
  return match ? match[0].toUpperCase() : "C";
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
      process.env.VAPID_SUBJECT || "mailto:cluichiapp@gmail.com",
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
    const byFamily = new Map<string, { title: string; time: string; allDay?: boolean; owner?: string[]; collector?: string[]; childIds: string[] }[]>();
    for (const docSnap of activitiesSnap.docs) {
      const familyId = docSnap.ref.parent.parent?.id;
      if (!familyId) continue;
      const activity = docSnap.data() as FamilyActivity;
      const occurrence = occursOnDate(activity, targetDate);
      if (!occurrence || occurrence.cancelled) continue;
      const list = byFamily.get(familyId) || [];
      list.push({ title: occurrence.title, time: occurrence.time, allDay: occurrence.allDay, owner: occurrence.owner, collector: occurrence.collector, childIds: occurrence.childIds || [] });
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

      const familySettings = await db.collection("families").doc(familyId).collection("settings").doc("family").get();
      const familyName = (familySettings.data()?.name as string) || "Family";
      const icon = `${request.nextUrl.origin}/api/family-icon/${letterFor(familyName)}/192`;

      const childrenSnap = await db.collection("families").doc(familyId).collection("children").get();
      const childNameById = new Map(childrenSnap.docs.map((d) => [d.id, (d.data()?.name as string) || ""]));

      activities.sort((a, b) => (a.allDay ? "" : a.time).localeCompare(b.allDay ? "" : b.time));
      const title = type === "morning" ? "Good morning! ☀️ Here's your day" : "Getting ready for tomorrow";
      const shown = activities.slice(0, 4).map((a) => (a.allDay ? a.title : `${a.time} ${a.title}`));
      const body = shown.join(", ") + (activities.length > 4 ? ` +${activities.length - 4} more` : "");

      // Personalize per-subscription when the device tagged itself with a
      // "who am I" identity (src/lib/member-link.ts, device-local, no
      // sign-in required) - untagged subscriptions still get the generic
      // family-wide digest above, unchanged.
      let sentAny = false;
      for (const subDoc of subsSnap.docs) {
        const sub = subDoc.data() as { endpoint?: string; keys?: { p256dh?: string; auth?: string }; identity?: MyIdentity };
        if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue;

        const identity = sub.identity;
        let sendTitle = title;
        let sendBody = body;
        if (identity) {
          const lines = activities.flatMap((a) => {
            const roles = matchRoles(identity, a);
            if (!roles.length) return [];
            const childNames = a.childIds.map((id) => childNameById.get(id)).filter((n): n is string => !!n);
            return describeActivityForMe(roles, a, childNames);
          });
          if (!lines.length) continue; // personalized + nothing for them today - skip rather than send the generic one
          sendTitle = type === "morning" ? `Good morning, ${identity.name}! ☀️` : `Heads up, ${identity.name} — tomorrow`;
          const shownMine = lines.slice(0, 4);
          sendBody = shownMine.join(", ") + (lines.length > 4 ? ` +${lines.length - 4} more` : "");
        }

        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
            JSON.stringify({ title: sendTitle, body: sendBody, icon, url: "/" })
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
