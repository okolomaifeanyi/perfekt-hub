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

const MAX_BIO_LENGTH = 160;

const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required").max(80),
  bio: z
    .string()
    .max(MAX_BIO_LENGTH, `Bio must be under ${MAX_BIO_LENGTH} characters`)
    .optional(),
  website: z
    .string()
    .trim()
    .optional()
    .refine(
      val => {
        if (!val) return true;
        try {
          new URL(val.startsWith("http") ? val : `https://${val}`);
          return true;
        } catch {
          return false;
        }
      },
      { message: "Please enter a valid website URL" }
    ),
  location: z.string().max(100).optional(),
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
      fullName: profile.fullName ?? "",
      bio: profile.bio ?? "",
      website: profile.website ?? "",
      location: profile.location ?? "",
    },
    mode: "onChange",
  });

  async function onSubmit(values: ProfileForm) {
    const formData = {
      fullName: values.fullName,
      bio: values.bio || "",
      website: values.website || "",
      location: values.location || "",
    };
    const success = await saveProfile(formData);
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 p-2 overflow-y-auto">
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
              {form.formState.errors.website.message}
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
