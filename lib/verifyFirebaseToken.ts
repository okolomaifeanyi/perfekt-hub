export async function verifyFirebaseToken(token: string): Promise<boolean> {
  try {
    // OPTION A: Use Firebase REST API to verify the token (runs at edge)
    const resp = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${process.env.FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: token }),
      }
    );

    if (!resp.ok) return false;
    const data = await resp.json();
    return !!data.users?.length;
  } catch (err) {
    console.error("Token verification failed:", err);
    return false;
  }
}
