"use client";

import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, Check } from "lucide-react";
import Webcam from "react-webcam";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import {
//   Drawer,
//   DrawerContent,
//   DrawerHeader,
//   DrawerTitle,
//   DrawerTrigger,
// } from "@/components/ui/drawer";
// import { useMediaQuery } from "@/hooks/useMediaQuery";
import Cropper from "react-easy-crop";
import getCroppedImg from "@/lib/utils";
import {
  ArrowsPointingInIcon,
  ChevronDoubleDownIcon,
  ChevronDoubleUpIcon,
  PencilIcon,
  ScaleIcon,
} from "@heroicons/react/24/solid";
import { ResponsiveSheet } from "@/components/ReponsiveSheet";

type Props = {
  onChange: (url: string) => void;
  position?: "top-right" | "bottom-right";
  uid: string;
  type: "avatar" | "coverImage";
};

export default function EditImageButton({
  onChange,
  position = "bottom-right",
  uid,
  type,
}: Props) {
  const [open, setOpen] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // const isDesktop = useMediaQuery("(min-width: 768px)");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const webcamRef = useRef<Webcam | null>(null);
  const cropContainerRef = useRef<HTMLDivElement | null>(null);

  // Use Twitter-style for cover: 3:1 (which is close to 1500x500)
  const aspect = type === "avatar" ? 1 / 1 : 3 / 1;

  const triggerFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const captureAndOpenCrop = () => {
    const snap = webcamRef.current?.getScreenshot();
    if (!snap) {
      toast.error("Failed to capture photo.");
      return;
    }
    setImageSrc(snap);
    setShowWebcam(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const onCropComplete = (_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const applyPreset = (preset: "center" | "top" | "bottom") => {
    switch (preset) {
      case "center":
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        break;
      case "top":
        setCrop({ x: 0, y: -20 });
        setZoom(1.05);
        break;
      case "bottom":
        setCrop({ x: 0, y: 20 });
        setZoom(1.05);
        break;
    }
  };

  const fitToFrame = () => {
    // reset crop & zoom to defaults
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleConfirmCrop = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      toast.error("Please crop an image first.");
      return;
    }
    setLoading(true);
    try {
      // Provide type into your getCroppedImg so it can optionally yield correct final dimensions
      const { file } = await getCroppedImg(imageSrc, croppedAreaPixels);

      const date = new Date();
      const isoDate = date.toISOString().split("T")[0];
      const filename = `${isoDate}_${date.getTime()}_${type}`;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", `${uid}/${type}`);
      formData.append("public_id", filename);

      const res = await fetch("/api/upload-profile-pic", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data?.secure_url) {
        onChange(data.secure_url);
        toast.success("Image updated");
      } else {
        console.error("Upload returned unexpected payload:", data);
        toast.error("Upload failed");
      }

      // reset
      setImageSrc(null);
      setCroppedAreaPixels(null);
      setOpen(false);
    } catch (err) {
      console.error("Crop/upload error:", err);
      toast.error("Error uploading image");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) {
      setImageSrc(null);
      setShowWebcam(false);
      setCroppedAreaPixels(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    }
  }, [open]);

  const CropArea = (
    <div className="w-full">
      <div
        ref={cropContainerRef}
        className="relative w-1/2 bg-black rounded overflow-hidden flex mx-auto"
        style={{
          height: type === "avatar" ? 200 : 280,
        }}
      >
        <Cropper
          image={imageSrc!}
          crop={crop}
          zoom={zoom}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
          objectFit="contain"
          // showGrid
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="secondary"
            onClick={() => applyPreset("center")}
            title="Center"
          >
            <ArrowsPointingInIcon className="size-5" />
          </Button>
          {type === "coverImage" && (
            <>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => applyPreset("top")}
                title="Top"
              >
                <ChevronDoubleUpIcon className="size-5" />
              </Button>
              <Button
                size="icon"
                variant="secondary"
                onClick={() => applyPreset("bottom")}
                title="Bottom"
              >
                <ChevronDoubleDownIcon className="size-5" />
              </Button>
            </>
          )}
          <Button
            size="icon"
            variant="secondary"
            onClick={fitToFrame}
            title="Fit to frame"
          >
            <ScaleIcon className="size-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span>Zoom: </span>
          <Input
            aria-label="Zoom"
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-16"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setImageSrc(null);
              setCroppedAreaPixels(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirmCrop} disabled={loading}>
            {loading ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </div>
  );

  const CameraArea = (
    <div className="flex flex-col items-center gap-3">
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        className="rounded max-w-full"
        videoConstraints={{ facingMode: "user" }}
      />
      <div className="flex gap-2">
        <Button onClick={captureAndOpenCrop}>
          <Check className="h-4 w-4" />
        </Button>
        <Button onClick={() => setShowWebcam(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  const InitialArea = (
    <div className="flex flex-col gap-3 items-center">
      <div className="flex gap-2">
        <Button variant="outline" onClick={triggerFile}>
          <Upload className="h-4 w-4 mr-1" /> Upload
        </Button>
        <Button variant="outline" onClick={() => setShowWebcam(true)}>
          <Camera className="h-4 w-4 mr-1" /> Camera
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        {type === "avatar" ? "Avatar: square crop." : "Cover: wide (3:1)."}
      </p>
    </div>
  );

  const Content = (
    <>
      {!imageSrc ? (showWebcam ? CameraArea : InitialArea) : CropArea}
      <Input
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={fileInputRef as any}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
    </>
  );

  return (
    <div
      className={`absolute ${
        position === "top-right" ? "top-2 right-2" : "bottom-0 right-0 z-10"
      }`}
    >
      <ResponsiveSheet
        open={open}
        setOpen={setOpen}
        title="Edit Image"
        desc="Make changes to your image here."
        trigger={
          <Button
            variant="secondary"
            size="icon"
            className="bg-background/60 rounded-full"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
        }
      >
        {Content}
      </ResponsiveSheet>
      {/* {isDesktop ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="bg-background/60 rounded-full"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent
            className={type === "coverImage" ? "max-w-5xl w-full" : "max-w-md"}
          >
            <DialogHeader>
              <DialogTitle>Edit Image</DialogTitle>
            </DialogHeader>
            {Content}
          </DialogContent>
        </Dialog>
      ) : (
        <Drawer open={open} onOpenChange={setOpen} modal={!imageSrc}>
          <DrawerTrigger asChild>
            <Button
              variant="secondary"
              size="icon"
              className="bg-background/60 rounded-full"
            >
              <PencilIcon className="h-4 w-4" />
            </Button>
          </DrawerTrigger>
          <DrawerContent
          // className={type === "coverImage" ? "max-w-5xl w-full" : ""}
          >
            <div className="flex flex-col w-full">
              <DrawerHeader>
                <DrawerTitle>Edit Image</DrawerTitle>
              </DrawerHeader>
              <div className="p-2">{Content}</div>
            </div>
          </DrawerContent>
        </Drawer>
      )} */}
    </div>
  );
}
