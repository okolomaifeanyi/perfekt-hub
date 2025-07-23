import { z } from "zod";

export const SignUpFormSchema = z
  .object({
    username: z.string().min(2).trim(),
    email: z.string().email().trim(),
    password: z
      .string()
      .min(8)
      .regex(/[a-zA-Z]/)
      .regex(/[0-9]/)
      .regex(/[@$!%*?&]/)
      .regex(/^[^\s]+$/)
      .trim(),
    confirmPassword: z.string().min(6),
  })
  .refine(data => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });
