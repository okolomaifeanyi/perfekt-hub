import { z } from "zod";

export const OnboardingStep1Schema = z.object({
  fullName: z.string().min(3).trim(),
  bio: z
    .string()
    .max(200)
    .optional()
    .transform(e => (e === "" ? undefined : e)),
  profilePicture: z
    .any()
    .refine(
      file => file instanceof File || file === null || file === undefined,
      { message: "Profile picture must be a file." }
    )
    .optional(),
});

export const OnboardingStep2Schema = z.object({
  interests: z.array(z.string().min(1)).min(1),
  receiveNewsletter: z.boolean().optional(),
});
