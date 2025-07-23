import { z } from "zod";

const reservedUsernames = [
  "admin",
  "support",
  "settings",
  "profile",
  "login",
  "logout",
  "signup",
  "dashboard",
  "api",
  "root",
  "help",
];

export const SignupFormSchema = z
  .object({
    username: z
      .string()
      .min(2, { message: "Username must be at least 2 characters long." })
      .max(20, { message: "Username must be at most 20 characters long." })
      .regex(/^[a-zA-Z0-9_]+$/, {
        message: "Only letters, numbers, and underscores are allowed.",
      })
      .transform(val => val.toLowerCase().trim())
      .refine(val => !reservedUsernames.includes(val), {
        message: "This username is reserved. Choose another.",
      }),
    email: z.string().email({ message: "Please enter a valid email." }).trim(),
    password: z
      .string()
      .min(8, { message: "Be at least 8 characters long" })
      .regex(/[a-zA-Z]/, { message: "Contain at least one letter." })
      .regex(/[0-9]/, { message: "Contain at least one number." })
      .regex(/[^a-zA-Z0-9]/, {
        message: "Contain at least one special character.",
      })
      .trim(),
    password2: z.string().trim(),
  })
  .refine(data => data.password === data.password2, {
    message: "Passwords do not match.",
    path: ["password2"], // The error will show under password2
  });

export const SigninFormSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
  password: z
    .string()
    .min(8, { message: "Be at least 8 characters long" })
    .regex(/[a-zA-Z]/, { message: "Contain at least one letter." })
    .regex(/[0-9]/, { message: "Contain at least one number." })
    .regex(/[^a-zA-Z0-9]/, {
      message: "Contain at least one special character.",
    })
    .trim(),
});

export type FormState =
  | {
      errors?: {
        username?: string[];
        email?: string[];
        password?: string[];
        password2?: string[];
      };
      message?: string;
      values?: {
        username?: string;
        email?: string;
      };
    }
  | undefined;
