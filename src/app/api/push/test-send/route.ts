import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { familyId } = await request.json();
    if (typeof familyId !== "string" || !familyId) {
      return NextResponse.json({ error: "Missing familyId" }, { status: 400 });
    }

    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate) {
      return NextResponse.json({ error: "Push isn't configured yet (missing VAPID keys)." }, { status: 500 });
    }
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return NextResponse.json({ error: "Push isn't configured yet (missing service account)." }, { status: 500 });
    }

    const { default: webpush } = await import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:deeuniacke@gmail.com",
      vapidPublic,
      vapidPrivate
    );

    const { getAdminDb } = await import("@/lib/firebase-admin");
    const db = getAdminDb();
    const snapshot = await db
      .collection("families")
      .doc(familyId)
      .collection("pushSubscriptions")
      .get();

    if (snapshot.empty) {
      return NextResponse.json({ sent: 0, total: 0, message: "No devices enabled for this family yet." });
    }

    let sent = 0;
    const errors: string[] = [];
    for (const docSnap of snapshot.docs) {
      const sub = docSnap.data() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
      if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) continue;
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          JSON.stringify({ title: "Cluichí Home", body: "This is a test notification 🎉", url: "/" })
        );
        sent++;
      } catch (err) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await docSnap.ref.delete();
        } else {
          errors.push(err instanceof Error ? err.message : String(err));
        }
      }
    }

    return NextResponse.json({ sent, total: snapshot.size, errors });
  } catch (error) {
    console.error("push test-send error:", error);
    const detail = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: `Failed to send test notification: ${detail}` }, { status: 500 });
  }
}
