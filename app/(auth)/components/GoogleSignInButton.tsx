"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { StopCircle } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const GoogleSignInButton = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) throw error;
    } catch (authError) {
      console.error("Google sign-in error:", authError);
      setError(
        authError instanceof Error
          ? authError.message
          : "Google sign-in failed."
      );
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
        {loading ? "Redirecting..." : "Sign in with Google"}
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
