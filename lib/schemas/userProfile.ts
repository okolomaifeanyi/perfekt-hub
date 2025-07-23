import { z } from "zod";

export const UserProfileSchema = z.object({
  uid: z.string(),
  email: z.string(),
  username: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  fullName: z.string().optional(),
  bio: z.string().optional(),
  interests: z.array(z.string()).optional(),
  receiveNewsletter: z.boolean().optional(),
  profilePicture: z
    .any()
    .refine(
      file => file instanceof File || file === null || file === undefined,
      { message: "Profile picture must be a file." }
    )
    .optional(),
  onboardingStep1Completed: z.boolean().optional(),
  onboardingCompleted: z.boolean().optional(),
  profilePictureUrl: z.string().optional(),
  profilePicturePublicId: z.string().optional(),
});

export type UserProfile = z.infer<typeof UserProfileSchema>;
