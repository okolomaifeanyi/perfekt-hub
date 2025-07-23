"use client";

import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import Image from "next/image";
import { AlertCircle, CalendarIcon, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, AlertDescription } from "./ui/alert";
import PhoneInput from "react-phone-input-2";
import "react-phone-input-2/lib/high-res.css";
import { cn } from "@/lib/utils";
import { parse, isValid } from "date-fns";

// Updated schema with stricter validation
const schema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters long")
    .max(100, "Full name must be under 100 characters"),
  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
  gender: z.enum(["male", "female", "other"], {
    required_error: "Gender is required",
  }),
  dob: z
    .string()
    .min(1, "Date of birth is required")
    .refine(
      val => {
        const parsed = parse(val, "MMMM dd, yyyy", new Date());
        return isValid(parsed);
      },
      { message: "Invalid date format" }
    ),
  photoURL: z.string().url("Profile picture is required"),
});

type FormData = z.infer<typeof schema>;

export default function CompleteProfileModal({
  onClose,
}: {
  onClose: () => void;
}) {
  const [show, setShow] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date | undefined>();
  const [month, setMonth] = useState<Date>(new Date());
  const [open, setOpen] = useState(false);

  const {
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      phoneNumber: "",
      gender: "male", // Default to a valid enum value
      dob: "",
      photoURL: "",
    },
  });

  const photoURL = watch("photoURL");

  useEffect(() => {
    const checkProfile = async () => {
      try {
        const res = await fetch("/api/user-profile");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        if (!data.completedProfile) setShow(true);

        setValue("fullName", data.fullName || "");
        setValue("phoneNumber", data.phoneNumber || "");
        setValue("gender", data.gender || "male");
        setValue("dob", data.dob || "");
        setValue("photoURL", data.photoURL || "");
      } catch {
        toast.error("Failed to load profile data. Please try again.");
      }
    };
    checkProfile();
  }, [setValue]);

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
      console.log("Upload error:", error);

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
      if (url) setValue("photoURL", url);
      setShowWebcam(false);
    } catch (error) {
      console.log("Capture error:", error);

      toast.error("Failed to process photo. Please try again.");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadToCloudinary(file);
      if (url) setValue("photoURL", url);
    }
  };

  const onSubmit = async (form: FormData) => {
    setLoading(true);
    try {
      const res = await fetch("/api/complete-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error("Failed to save profile");

      const { getAuth, updateProfile } = await import("firebase/auth");
      const auth = getAuth();
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: form.fullName,
          photoURL: form.photoURL,
        });
      }

      toast.success("Profile completed successfully.");
      onClose();
    } catch (error) {
      console.log("Profile save error:", error);

      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  function formatDate(date: Date | undefined) {
    if (!date || !isValid(date)) return "";
    return date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <Dialog open={show} onOpenChange={open => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] max-h-[calc(100vh-6rem)] overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Complete Your Profile</DialogTitle>
          </DialogHeader>

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
            <Label htmlFor="phone">Phone Number</Label>
            <PhoneInput
              country={"ng"}
              value={watch("phoneNumber").replace("+", "")}
              onChange={value => setValue("phoneNumber", `+${value}`)}
              autoFormat
              enableAreaCodes
              enableTerritories
              enableSearch
              dropdownClass={cn(
                "!bg-popover !text-popover-foreground border border-border rounded-md shadow-md max-h-60 overflow-y-auto z-50",
                "[&_ul]:!bg-popover",
                "[&_li]:!bg-popover [&_li]:!text-popover-foreground",
                "[&_li:hover]:!bg-accent [&_li:hover]:!text-accent-foreground",
                "[&_li.selected]:!bg-accent [&_li.selected]:!text-accent-foreground"
              )}
              searchClass="!bg-popover !text-popover-foreground"
              buttonClass={cn(
                "!bg-background dark:!bg-input/30 !text-foreground !border-border",
                "hover:!bg-accent hover:!text-accent-foreground",
                "focus:!bg-accent focus:!text-accent-foreground",
                "rounded-l-md transition-colors"
              )}
              inputProps={{
                name: "phone",
                required: true,
                className: cn(
                  "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
                  "bg-background dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border px-3 py-1 pl-14 text-base shadow-xs",
                  "transition-[color,box-shadow] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
                  "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
                  "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
                ),
              }}
            />
            {errors.phoneNumber && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="mt-1 h-5 w-5" />
                <AlertDescription>
                  <p className="text-sm">{errors.phoneNumber.message}</p>
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="grid gap-3">
            <Label>Gender</Label>
            <Select
              value={watch("gender")}
              onValueChange={value =>
                setValue("gender", value as "male" | "female" | "other")
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.gender && (
              <Alert variant="destructive">
                <AlertCircle className="mt-1 h-5 w-5" />
                <AlertDescription>
                  <p className="text-sm">{errors.gender.message}</p>
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
                placeholder="June 01, 2025"
                className="bg-background dark:bg-input/30 pr-10"
                onChange={e => {
                  const raw = e.target.value;
                  setValue("dob", raw);
                  const parsedDate = parse(raw, "MMMM dd, yyyy", new Date());
                  if (isValid(parsedDate)) {
                    setDate(parsedDate);
                    setMonth(parsedDate);
                  }
                }}
                onKeyDown={e => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setOpen(true);
                  }
                }}
              />
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="absolute top-1/2 right-2 size-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <CalendarIcon className="size-3.5" />
                    <span className="sr-only">Select date</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-auto overflow-hidden p-0 bg-popover text-popover-foreground border border-border rounded-md shadow-md"
                  align="end"
                  alignOffset={-8}
                  sideOffset={10}
                >
                  <Calendar
                    mode="single"
                    selected={date}
                    captionLayout="dropdown"
                    month={month}
                    onMonthChange={setMonth}
                    onSelect={date => {
                      if (date) {
                        setDate(date);
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
              <Image
                src={photoURL}
                alt="Profile picture preview"
                width={80}
                height={80}
                className="rounded object-cover"
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
                <Button
                  variant="secondary"
                  type="button"
                  onClick={captureAndUpload}
                >
                  Capture Photo
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowWebcam(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </span>
              ) : (
                "Save Profile"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
