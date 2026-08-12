"use client";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { app } from "@/lib/app";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import GoogleSignInButton from "../../components/GoogleSignInButton";
import Link from "next/link";
import { loginClient } from "../../lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function OAuthErrorSync({ onError }: { onError: (message: string) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const authError = searchParams.get("authError");
    if (authError) onError(authError);
  }, [searchParams, onError]);

  return null;
}

export default function LoginForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    const formData = new FormData(e.currentTarget);
   const identifier = formData.get("identifier") as string;

    const password = formData.get("password") as string;

    try {
      const res = await loginClient(identifier, password);


      if (res?.error) {
        setErrorMsg(res.error);
        return;
      }

      setTimeout(() => {
        router.push("/");
      }, 200);
    } catch (error) {
      console.error("Unexpected error:", error);
      setErrorMsg("Unexpected error. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Suspense fallback={null}>
        <OAuthErrorSync onError={setErrorMsg} />
      </Suspense>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            Sign into <strong className="text-primary">{app.name}</strong>
          </CardTitle>
          <CardDescription>Enter these details to log in.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-6" onSubmit={handleLogin}>
            <div className="grid gap-2">
              <Label htmlFor="identifier">Email or Username*</Label>

              <Input
                required
                id="identifier"
                name="identifier"
                type="text"
                placeholder="Email or Username"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password*</Label>
              <div className="relative">
                <Input
                  required
                  id="password"
                  name="password"
                  type={isPasswordVisible ? "text" : "password"}
                  aria-describedby="password-error"
                />
                <Button
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  type="button"
                  className="absolute right-0 top-0"
                  variant="ghost"
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                >
                  {isPasswordVisible ? <EyeOff /> : <Eye />}
                </Button>
              </div>
            </div>

            <Button disabled={isLoading} type="submit">
              {isLoading ? "Signing In..." : "Sign In"}
            </Button>

            {errorMsg && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="mt-1 h-5 w-5" />
                <AlertTitle>Login Error</AlertTitle>
                <AlertDescription>
                  <p>{errorMsg}</p>
                </AlertDescription>
              </Alert>
            )}
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Link
            href="/signup"
            className={buttonVariants({ variant: "outline" }) + " w-full"}
          >
            Join {app.name}
          </Link>
          <GoogleSignInButton />
        </CardFooter>
      </Card>
    </div>
  );
}
