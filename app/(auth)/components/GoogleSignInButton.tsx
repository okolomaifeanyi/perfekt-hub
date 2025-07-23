"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { saveOrUpdateUser } from "@/app/(auth)/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StopCircle } from "lucide-react";

const GoogleSignInButton = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const isNewUser = getAdditionalUserInfo(result)?.isNewUser;

      // Save or update user in Firestore
      await saveOrUpdateUser(user, result, isNewUser ?? false);

      // Send ID token to backend to create session
      const token = await user.getIdToken();
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (!res.ok) throw new Error("Failed to create session");

      router.push("/");
    } catch (error: unknown) {
      console.error("Google Sign-in error:", error);
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        "message" in error
      ) {
        const firebaseError = error as { code: string; message: string };
        switch (firebaseError.code) {
          case "auth/popup-closed-by-user":
            setError("You closed the popup too soon.");
            break;
          case "auth/cancelled-popup-request":
            setError("Another popup was already open.");
            break;
          case "auth/account-exists-with-different-credential":
            setError("This email is linked to another sign-in method.");
            break;
          case "auth/auth-domain-config-mismatch":
            setError("Check your Firebase domain configuration.");
            break;
          default:
            setError(`Sign-in failed: ${firebaseError.message}`);
        }
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <Button
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full"
        variant="secondary"
      >
        {loading ? (
          "Signing in..."
        ) : (
          <>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="white"
              className="mr-2"
            >
              <path d="M12.24 10.27v2.42c0 2.27-1.5 3.84-4.14 3.84-2.88 0-4.99-2.52-4.99-5.07s2.11-5.07 4.99-5.07c1.78 0 2.92.74 3.61 1.48l1.79-1.78c-1.12-1.07-2.61-1.92-5.4-1.92-4.48 0-8.15 3.65-8.15 8.15s3.67 8.15 8.15 8.15c4.71 0 7.82-3.32 7.82-7.98 0-.52-.05-1.09-.13-1.63h-7.69z" />
            </svg>
            Sign in with Google
          </>
        )}
      </Button>
      {error && (
        <Alert className="mt-2" variant="destructive">
          <StopCircle className="mt-1 h-5 w-5" />
          <AlertTitle>Google sign in error</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default GoogleSignInButton;
