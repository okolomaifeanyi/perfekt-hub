"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEditProfile } from "@/hooks/useEditProfile";
import { UserProps } from "@/lib/types";
import { COUNTRIES } from "@/lib/countries.mjs";
import { MARITAL_STATUS_OPTIONS } from "@/lib/marital-status.mjs";
import { UserPen } from "lucide-react";
import { Dispatch, SetStateAction, useEffect } from "react";
import { ResponsiveSheet } from "@/components/ReponsiveSheet";

export const profileSchema = z.object({
  fullName: z.string().min(1, "Full name is required"),
  fullName_lowercase: z.string().min(1, "Internal error – name is required"),
  bio: z.string().optional(),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  location: z.string().optional(),
  country: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  relationship: z.string().optional(),
  education: z.string().optional(),
  company: z.string().optional(),
  linkedin: z.string().url("Invalid URL").optional().or(z.literal("")),
  github: z.string().url("Invalid URL").optional().or(z.literal("")),
  twitter: z.string().url("Invalid URL").optional().or(z.literal("")),
  work: z.string().optional(),
  phoneNumber: z
    .string()
    .optional()
    .refine(
      val => !val || /^\+?[0-9]{7,15}$/.test(val.replace(/\s/g, "")),
      "Enter a valid phone number"
    ),
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
      fullName_lowercase: profile?.fullName?.trim().toLowerCase() || "",
      bio: profile?.bio || "",
      website: profile?.website || "",
      location: profile?.location || "",
      country: profile?.country || "",
      gender: profile?.gender,
      relationship: profile?.relationship || "",
      education: profile?.education || "",
      company: profile?.company || "",
      linkedin: profile?.linkedin || "",
      github: profile?.github || "",
      twitter: profile?.twitter || "",
      work: profile?.work || "",
      phoneNumber: profile?.phoneNumber || "",
    },
  });

  // ──────────────────────────────────────────────────────────────
  // Sync fullName → fullName_lowercase
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === "fullName") {
        const lower = (value.fullName ?? "").trim().toLowerCase();
        form.setValue("fullName_lowercase", lower, { shouldDirty: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  useEffect(() => {
    const sub = form.watch((value, { name }) => {
      if (name === "fullName") {
        form.setValue(
          "fullName_lowercase",
          value.fullName?.trim().toLowerCase() ?? "",
          {
            shouldDirty: true,
          }
        );
      }
    });
    return () => sub.unsubscribe();
  }, [form]);

  async function onSubmit(values: ProfileForm) {
    const payload: Partial<UserProps> = {
      ...values,
    };

    // Remove empty optional fields, but keep fullName_lowercase
    Object.keys(payload).forEach(key => {
      const k = key as keyof typeof payload;
      if (
        (payload[k] === "" ||
          payload[k] === undefined ||
          payload[k] === null) &&
        k !== "fullName_lowercase"
      ) {
        delete payload[k];
      }
    });

    const success = await saveProfile(payload);
    if (success) setOpenEdit(false);
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
        </div>

        {/* Country — drives the "News near you" widget on Aside/Updates;
            left unset just hides that widget rather than guessing. */}
        <div className="grid gap-2">
          <label htmlFor="country" className="text-sm font-medium">
            Country
          </label>
          <Controller
            name="country"
            control={form.control}
            render={({ field }) => (
              // Always a defined string ("" or a country name), never
              // undefined — passing undefined on the first render then a
              // real value after picking one flips Select from uncontrolled
              // to controlled, which React warns about (confirmed live).
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="country" className="w-full">
                  <SelectValue placeholder="Select your country" />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(country => (
                    <SelectItem key={country.code} value={country.name}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Gender */}
        <div className="grid gap-2">
          <label htmlFor="gender" className="text-sm font-medium">
            Gender
          </label>
          <Controller
            name="gender"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="gender" className="w-full">
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Relationship status — used to keep married visitors out of
            Suggested Match's candidate pool (see app/actions/discover.ts). */}
        <div className="grid gap-2">
          <label htmlFor="relationship" className="text-sm font-medium">
            Relationship status
          </label>
          <Controller
            name="relationship"
            control={form.control}
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="relationship" className="w-full">
                  <SelectValue placeholder="Select relationship status" />
                </SelectTrigger>
                <SelectContent>
                  {MARITAL_STATUS_OPTIONS.map(status => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        {/* Education, Work, Company, Socials … (unchanged) */}
        {/* ... same as your original code ... */}

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
