"use client";

import { signup } from "@/app/actions/auth";
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
import { FormState } from "@/lib/definitions";
import { AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import GoogleSignInButton from "./GoogleSignInButton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import UsernameInput from "./UsernameInput";
import { getSignupAlertConfig } from "../lib/signup-feedback.mjs";

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    signup,
    undefined
  );
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const signupAlert = getSignupAlertConfig(state);

  const renderAlert = (
    title: string,
    description: string | string[],
    variant: "default" | "destructive" = "destructive"
  ) => (
    <Alert variant={variant}>
      {variant === "default" ? (
        <CheckCircle2 className="mt-1 h-5 w-5 text-green-600" />
      ) : (
        <AlertCircle className="mt-1 h-5 w-5" />
      )}
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {Array.isArray(description) ? (
          <ul className="list-disc list-inside space-y-1">
            {description.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        ) : (
          <p>{description}</p>
        )}
      </AlertDescription>
    </Alert>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            Join <strong className="text-primary">{app.name}</strong>
          </CardTitle>
          <CardDescription>
            Enter these details to create your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-6" action={action}>
            <UsernameInput state={state} renderAlert={renderAlert} />

            <div className="grid gap-2">
              <Label htmlFor="email">Email*</Label>
              <Input
                required
                id="email"
                name="email"
                type="email"
                placeholder="Email"
                defaultValue={state?.values?.email || ""}
                aria-describedby="email-error"
              />
              {state?.errors?.email &&
                renderAlert("Email Error", state.errors.email)}
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
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="absolute right-0 top-0"
                  variant="ghost"
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                >
                  {isPasswordVisible ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {state?.errors?.password &&
                renderAlert("Password Error", state.errors.password)}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password2">Confirm Password*</Label>
              <div className="relative">
                <Input
                  required
                  id="password2"
                  name="password2"
                  type={isPasswordVisible ? "text" : "password"}
                  aria-describedby="password2-error"
                />
                <Button
                  type="button"
                  onClick={() => setIsPasswordVisible(!isPasswordVisible)}
                  className="absolute right-0 top-0"
                  variant="ghost"
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                >
                  {isPasswordVisible ? <EyeOff /> : <Eye />}
                </Button>
              </div>
              {state?.errors?.password2 &&
                renderAlert("Confirm Password Error", state.errors.password2)}
            </div>

            <Button disabled={pending} type="submit">
              {pending ? "Signing up..." : "Sign Up"}
            </Button>

            {signupAlert &&
              renderAlert(
                signupAlert.title,
                signupAlert.description,
                signupAlert.variant
              )}
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <Link
            href="/login"
            className={buttonVariants({ variant: "outline" }) + " w-full"}
          >
            Login
          </Link>
          <GoogleSignInButton />
        </CardFooter>
      </Card>
    </div>
  );
}
