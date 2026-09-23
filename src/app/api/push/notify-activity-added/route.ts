import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { familyId, body: incomingBody } = await request.json();
    if (typeof familyId !== "string" || !familyId) {
      return NextResponse.json({ error: "Missing familyId" }, { status: 400 });
    }

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate || !process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Fire-and-forget from the client's point of view — never surface as
      // an error to the person who was just trying to save an activity.
      return NextResponse.json({ sent: 0 });
    }

    const { default: webpush } = await import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:deeuniacke@gmail.com",
      vapidPublic,
      vapidPrivate
    );

    const { getAdminDb } = await import("@/lib/firebase-admin");
    const db = getAdminDb();

    const subsSnap = await db.collection("families").doc(familyId).collection("pushSubscriptions").get();
    if (subsSnap.empty) return NextResponse.json({ sent: 0 });

    const familySettings = await db.collection("families").doc(familyId).collection("settings").doc("family").get();
    const familyName = (familySettings.data()?.name as string) || "Family";
    const letterMatch = familyName.trim().match(/[a-zA-Z]/);
    const letter = letterMatch ? letterMatch[0].toUpperCase() : "C";
    const icon = `${request.nextUrl.origin}/api/family-icon/${letter}/192`;

    const body = typeof incomingBody === "string" && incomingBody.trim() ? incomingBody.trim() : "Check the calendar for details.";

    let sent = 0;
    for (const subDoc of subsSnap.docs) {
      const sub = subDoc.data() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          JSON.stringify({ title: "New activity added", body, icon, url: "/" })
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) await subDoc.ref.delete();
      }
    }

    return NextResponse.json({ sent });
  } catch (error) {
    console.error("notify-activity-added error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
