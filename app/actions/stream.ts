"use server";

import { StreamClient } from "@stream-io/node-sdk";
import { getUserFromSession } from "@/lib/auth/getUserFromSession";

// Stream Video powers both 1:1 audio calls and group audio rooms — the SDK
// (@stream-io/video-react-sdk / @stream-io/node-sdk) and API credentials
// (STREAM_API_KEY/STREAM_SECRET_KEY) were already installed/configured in
// this project but never actually wired into any UI. This mints the
// short-lived user token the client SDK needs to connect; the actual user
// record (name/photo) is upserted implicitly when the client calls
// connectUser() with those details, so nothing else is needed server-side.
export async function getStreamToken(): Promise<{ apiKey: string; token: string; uid: string }> {
  const { uid } = await getUserFromSession();
  if (!uid) throw new Error("Unauthorized");

  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_SECRET_KEY;
  if (!apiKey || !apiSecret) {
    throw new Error("Calling is not configured on this deployment");
  }

  const client = new StreamClient(apiKey, apiSecret);
  const token = client.generateUserToken({ user_id: uid, validity_in_seconds: 60 * 60 * 4 });

  return { apiKey, token, uid };
}
