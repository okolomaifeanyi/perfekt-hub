"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import Webcam from "react-webcam";
import { AlertCircle, CalendarIcon, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription } from "./ui/alert";
import { parse, isValid } from "date-fns";
import { useUserStore } from "@/lib/store/useUserStore";
import { db } from "@/lib/supabase";
import { doc, updateDoc } from "@/lib/supabase";
import { getAuth, updateProfile } from "@/lib/supabase";
import { ResponsiveSheet } from "./ReponsiveSheet";
import { ContainedImage } from "./media/ContainedImage";
import { getProfileCompletion } from "@/lib/profile-completion.mjs";
import { MARITAL_STATUS_OPTIONS } from "@/lib/marital-status.mjs";
import { COUNTRIES } from "@/lib/countries.mjs";
import type { UserProps } from "@/lib/types";

// Only name + date of birth ever block onboarding — everything else used to
// be required in one long form (phone number included) before a visitor
// could do anything at all. Splitting into two steps and cutting it down to
// what the app actually needs lets step 1 finish the account in seconds;
// step 2 is a single skippable screen for the polish that improves match
// quality and personalization but was never truly required.
const step1Schema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters long")
    .max(100, "Full name must be under 100 characters"),
  dob: z
    .string()
    .min(1, "Date of birth is required")
    .refine(
      val => {
        const parsed = parse(val, "MMMM dd, yyyy", new Date());
        return isValid(parsed);
      },
      { message: "Invalid date format" }
    )
    .refine(
      val => {
        const parsed = parse(val, "MMMM dd, yyyy", new Date());
        if (!isValid(parsed)) return false;
        const today = new Date();
        const age = today.getFullYear() - parsed.getFullYear();
        const hasHadBirthdayThisYear =
          today.getMonth() > parsed.getMonth() ||
          (today.getMonth() === parsed.getMonth() &&
            today.getDate() >= parsed.getDate());
        const actualAge = hasHadBirthdayThisYear ? age : age - 1;
        return actualAge >= 18;
      },
      { message: "You must be at least 18 years old" }
    ),
});

type Step1Data = z.infer<typeof step1Schema>;
type Gender = "male" | "female" | "other";

export default function CompleteProfileModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const { user, setUser } = useUserStore();
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [showWebcam, setShowWebcam] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [month, setMonth] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);

  // Step 2 fields — no zod schema needed, nothing here is required.
  const [photoURL, setPhotoURL] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [relationship, setRelationship] = useState("");
  const [country, setCountry] = useState("");

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    defaultValues: { fullName: "", dob: "" },
  });

  // Populate from the store (fullName often already exists from OAuth
  // sign-in; dob never does, since nothing else in the app ever asks for it).
  // Depends only on the uid, not the whole `user` object — the store also
  // updates for unrelated reasons (online status, realtime fields), and
  // re-running this on every one of those would silently wipe out whatever
  // step 2 fields the visitor has already picked but not saved yet
  // (confirmed live: picking Relationship status was resetting Gender back
  // to empty because a background user-store update re-fired this effect).
  useEffect(() => {
    if (!user) return;
    if (!user.completedProfile) setShow(true);

    setValue("fullName", user.fullName || "");
    setValue("dob", user.dob || "");
    setPhotoURL(user.photoURL || "");
    setGender((user.gender as Gender) || "");
    setRelationship(user.relationship || "");
    setCountry(user.country || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  const uploadToCloudinary = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
      return "";
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB.");
      return "";
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload-profile-pic", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      return data.secure_url;
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload image. Please try again.");
      return "";
    }
  };

  const captureAndUpload = async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) {
      toast.error("Failed to capture photo. Please try again.");
      return;
    }

    try {
      const blob = await (await fetch(imageSrc)).blob();
      const file = new File([blob], "webcam.jpg", { type: "image/jpeg" });
      const url = await uploadToCloudinary(file);
      if (url) setPhotoURL(url);
      setShowWebcam(false);
    } catch (error) {
      console.error("Capture error:", error);
      toast.error("Failed to process photo. Please try again.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadToCloudinary(file);
      if (url) setPhotoURL(url);
    }
  };

  const submitStep1 = async (form: Step1Data) => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        fullName: form.fullName,
        dob: form.dob,
        fullName_lowercase: form.fullName.trim().toLowerCase(),
      });

      // completedProfile stays false until step 2 finishes or is skipped —
      // ClientLayout only mounts this modal while completedProfile is
      // false, so flipping it true here would unmount step 2 before it
      // ever had a chance to render (confirmed live).
      setUser({
        ...user,
        fullName: form.fullName,
        dob: form.dob,
      });

      setStep(2);
    } catch (error) {
      console.error("Profile save error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Shared by "Finish" (saves whatever step 2 fields were filled) and "Skip
  // for now" (saves nothing extra) — either way, completedProfile finally
  // flips true here so the wizard doesn't come back next visit.
  const finishOnboarding = async (updates: Partial<UserProps>) => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, { ...updates, completedProfile: true });
      setUser({ ...user, ...updates, completedProfile: true });

      // Secondary, non-critical sync — its failure shouldn't block closing
      // the wizard when the real save above already succeeded.
      if (updates.photoURL) {
        try {
          const auth = getAuth();
          if (auth.currentUser) {
            await updateProfile(auth.currentUser, { photoURL: updates.photoURL });
          }
        } catch (syncError) {
          console.error("Auth profile sync failed:", syncError);
        }
      }

      toast.success("Profile completed successfully.");
      onClose();
    } catch (error) {
      console.error("Profile save error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitStep2 = () => {
    const updates: Partial<UserProps> = {};
    if (photoURL) updates.photoURL = photoURL;
    if (gender) updates.gender = gender;
    if (relationship) updates.relationship = relationship;
    if (country) updates.country = country;
    void finishOnboarding(updates);
  };

  const skipStep2 = () => void finishOnboarding({});

  function formatDate(date: Date | undefined) {
    if (!date || !isValid(date)) return "";
    const month = date.toLocaleString("en-US", { month: "long" });
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month} ${day}, ${year}`;
  }

  const completion = getProfileCompletion({
    fullName: watch("fullName"),
    dob: watch("dob"),
    photoURL,
    gender,
    relationship,
    country,
    bio: user?.bio,
  });

  return (
    <ResponsiveSheet
      open={show}
      setOpen={open => !open && onClose()}
      title={step === 1 ? "Complete your profile" : "A few more details"}
      preventOutsideClose
    >
      {step === 1 ? (
        <form onSubmit={handleSubmit(submitStep1)} className="space-y-4">
          <p className="text-xs text-muted-foreground">Step 1 of 2 — just the essentials.</p>

          <div className="grid gap-3">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Enter your full name"
              value={watch("fullName")}
              onChange={e => setValue("fullName", e.target.value)}
            />
            {errors.fullName && (
              <Alert variant="destructive">
                <AlertCircle className="mt-1 h-5 w-5" />
                <AlertDescription>
                  <p className="text-sm">{errors.fullName.message}</p>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid gap-3">
            <Label htmlFor="dob">Date of Birth</Label>
            <div className="relative flex gap-2">
              <Input
                id="dob"
                value={watch("dob")}
                readOnly
                placeholder="Select your date of birth"
                className="bg-background dark:bg-input/30 pr-10 cursor-pointer"
                onClick={() => setOpen(true)}
              />

              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute top-1/2 right-2 size-6 -translate-y-1/2"
                  >
                    <CalendarIcon className="size-3.5" />
                  </Button>
                </PopoverTrigger>

                <PopoverContent align="end" sideOffset={10}>
                  <Calendar
                    mode="single"
                    selected={date}
                    captionLayout="dropdown"
                    month={month}
                    onMonthChange={setMonth}
                    onSelect={date => {
                      if (date) {
                        setDate(date);
                        setMonth(date);
                        setValue("dob", formatDate(date));
                        setOpen(false);
                      }
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {errors.dob && (
              <Alert variant="destructive">
                <AlertCircle className="mt-1 h-5 w-5" />
                <AlertDescription>
                  <p className="text-sm">{errors.dob.message}</p>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="mt-6 flex justify-end-safe">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                "Continue"
              )}
            </Button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Step 2 of 2 — optional, but a fuller profile means better matches and more
            relevant news for you ({completion.percent}% complete so far).
          </p>

          <div className="grid gap-3">
            <Label htmlFor="profile-pic">Profile Picture</Label>
            <Input
              id="profile-pic"
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowWebcam(true)}
            >
              Use Camera Instead
            </Button>
            {photoURL && (
              <ContainedImage
                src={photoURL}
                alt="Profile picture preview"
                sizes="80px"
                className="h-20 w-20 rounded p-1"
                imageClassName="rounded object-contain"
              />
            )}
          </div>

          {showWebcam && (
            <div className="grid gap-3">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="rounded w-full"
              />
              <div className="flex gap-2 mx-auto">
                <Button variant="secondary" type="button" onClick={captureAndUpload}>
                  Capture Photo
                </Button>
                <Button type="button" variant="destructive" onClick={() => setShowWebcam(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-3">
            <Label>Gender</Label>
            <Select value={gender} onValueChange={value => setGender(value as Gender)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3">
            <Label>Relationship status</Label>
            <Select value={relationship} onValueChange={setRelationship}>
              <SelectTrigger className="w-full">
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
          </div>

          <div className="grid gap-3">
            <Label>Country</Label>
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map(c => (
                  <SelectItem key={c.code} value={c.name}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mt-6 flex gap-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={skipStep2} disabled={loading}>
              Skip for now
            </Button>
            <Button type="button" className="flex-1" onClick={submitStep2} disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                "Finish"
              )}
            </Button>
          </div>
        </div>
      )}
    </ResponsiveSheet>
  );
}
