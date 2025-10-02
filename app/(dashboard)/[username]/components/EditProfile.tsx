"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEditProfile } from "@/hooks/useEditProfile";
import { UserProps } from "@/lib/types";
import { UserPen } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { ResponsiveSheet } from "@/components/ReponsiveSheet";

// const MAX_BIO_LENGTH = 160;

export const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  bio: z.string().optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  location: z.string().optional(),
  education: z.string().optional(),
  company: z.string().optional(),
  linkedin: z.string().url("Invalid URL").optional().or(z.literal("")),
  github: z.string().url("Invalid URL").optional().or(z.literal("")),
  twitter: z.string().url("Invalid URL").optional().or(z.literal("")),
  work: z.string().optional(),
  phoneNumber: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const EditProfile = ({
  profile,
  setOpenEdit,
  openEdit,
}: {
  profile: UserProps;
  openEdit: boolean;
  setOpenEdit: Dispatch<SetStateAction<boolean>>;
}) => {
  const { saveProfile, isSaving } = useEditProfile(profile.uid);

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName || "",
      bio: profile?.bio || "",
      website: profile?.website || "",
      location: profile?.location || "",
      education: profile?.education || "",
      company: profile?.company || "",
      linkedin: profile?.linkedin || "",
      github: profile?.github || "",
      twitter: profile?.twitter || "",
      work: profile?.work || "",
      phoneNumber: profile?.phoneNumber || "",
    },
  });

  async function onSubmit(values: ProfileForm) {
    // strip out empty values so we don’t overwrite Firestore with ""
    const cleaned = Object.fromEntries(
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      Object.entries(values).filter(([_, v]) => v !== "" && v !== undefined)
    );

    const success = await saveProfile(cleaned);
    if (success) {
      setOpenEdit(false);
    }
  }

  return (
    <ResponsiveSheet
      open={openEdit}
      setOpen={setOpenEdit}
      title="Edit profile"
      desc="Make changes to your profile here."
      trigger={
        <Button size="sm" variant="outline">
          <UserPen className="h-4 w-4" /> Edit Profile
        </Button>
      }
    >
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="grid gap-4 p-2 overflow-y-auto"
      >
        {/* Full name */}
        <div className="grid gap-2">
          <label htmlFor="fullName" className="text-sm font-medium">
            Full name
          </label>
          <Input
            id="fullName"
            placeholder="Enter your full name"
            {...form.register("fullName")}
          />
          {form.formState.errors.fullName && (
            <p className="text-xs text-red-500">
              {form.formState.errors.fullName.message}
            </p>
          )}
        </div>

        {/* Phone number */}
        <div className="grid gap-2">
          <label htmlFor="phoneNumber" className="text-sm font-medium">
            Phone Number
          </label>
          <Input
            id="phoneNumber"
            type="tel"
            placeholder="+2348012345678"
            {...form.register("phoneNumber")}
          />
          {form.formState.errors.phoneNumber && (
            <p className="text-xs text-red-500">
              {form.formState.errors.phoneNumber.message}
            </p>
          )}
        </div>

        {/* Bio */}
        <div className="grid gap-2">
          <label htmlFor="bio" className="text-sm font-medium">
            Bio
          </label>
          <Textarea
            id="bio"
            rows={4}
            placeholder="Tell us about yourself..."
            {...form.register("bio")}
          />
          {form.formState.errors.bio && (
            <p className="text-xs text-red-500">
              {form.formState.errors.bio.message}
            </p>
          )}
        </div>

        {/* Website */}
        <div className="grid gap-2">
          <label htmlFor="website" className="text-sm font-medium">
            Website
          </label>
          <Input
            id="website"
            type="url"
            placeholder="example.com"
            {...form.register("website")}
          />
          {form.formState.errors.website && (
            <p className="text-xs text-red-500">
              {form.formState.errors.website?.message?.toString()}
            </p>
          )}
        </div>

        {/* Location */}
        <div className="grid gap-2">
          <label htmlFor="location" className="text-sm font-medium">
            Location
          </label>
          <Input
            id="location"
            placeholder="City, Country"
            {...form.register("location")}
          />
          {form.formState.errors.location && (
            <p className="text-xs text-red-500">
              {form.formState.errors.location.message}
            </p>
          )}
        </div>

        {/* Education */}
        <div className="grid gap-2">
          <label htmlFor="education" className="text-sm font-medium">
            Education
          </label>
          <Input
            id="education"
            placeholder="School / University"
            {...form.register("education")}
          />
        </div>

        {/* Work */}
        <div className="grid gap-2">
          <label htmlFor="work" className="text-sm font-medium">
            Work
          </label>
          <Input id="work" placeholder="Job title" {...form.register("work")} />
        </div>

        {/* Company */}
        <div className="grid gap-2">
          <label htmlFor="company" className="text-sm font-medium">
            Company
          </label>
          <Input
            id="company"
            placeholder="Company name"
            {...form.register("company")}
          />
        </div>

        {/* Socials */}
        <div className="grid gap-2">
          <label htmlFor="linkedin" className="text-sm font-medium">
            LinkedIn
          </label>
          <Input
            id="linkedin"
            placeholder="https://linkedin.com/in/..."
            {...form.register("linkedin")}
          />
        </div>
        <div className="grid gap-2">
          <label htmlFor="github" className="text-sm font-medium">
            GitHub
          </label>
          <Input
            id="github"
            placeholder="https://github.com/..."
            {...form.register("github")}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              form.reset();
              setOpenEdit(false);
            }}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </ResponsiveSheet>
  );
};

export default EditProfile;
