import { MediaProps } from "@/lib/types";
import { Label } from "../ui/label";
import { buttonVariants } from "../ui/button";
import { Input } from "../ui/input";
import { toast } from "sonner";
import { PhotoIcon } from "@heroicons/react/24/solid";

export default function Media({
  setMedia,
  media,
}: {
  setMedia: React.Dispatch<React.SetStateAction<MediaProps[]>>;
  media: MediaProps[];
}) {
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    if (media.length > 4) {
      return toast("Upload failed", {
        description:
          "You can upload up to 4 media files in total — videos, images, or GIFs combined.",
      });
    }

    const previewList: MediaProps[] = [];

    Array.from(files).forEach(file => {
      const src = URL.createObjectURL(file);
      const type = file.type.startsWith("video") ? "video" : "image";

      previewList.push({ file, src, type });
    });

    if (media.length + previewList.length > 4) {
      toast("Upload failed", {
        description:
          "You can upload up to 4 media files in total — videos, images, or GIFs combined.",
      });
      return;
    }

    setMedia(prev => [...prev, ...previewList]);
  };

  //   const handleUpload = async () => {
  //     for (const media of previews) {
  //       const formData = new FormData();
  //       formData.append("file", media.file);
  //       formData.append("upload_preset", "your_upload_preset"); // for Cloudinary

  //       const res = await fetch(
  //         "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/upload",
  //         {
  //           method: "POST",
  //           body: formData,
  //         }
  //       );

  //       const data = await res.json();
  //       console.log("Uploaded:", data.secure_url);
  //     }
  //   };

  return (
    <>
      <Label
        title="Upload Media"
        htmlFor="picture"
        className={`${buttonVariants({
          variant: "secondary",
          size: "icon",
        })} cursor-pointer`}
      >
        <PhotoIcon className="text-primary size-4" />
      </Label>

      <Input
        className="hidden"
        id="picture"
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFiles}
      />

      {/* <div className="flex gap-4 overflow-x-auto">
        {previews.map((media, i) => (
          <div key={i} className="min-w-[200px]">
            {media.type === "image" ? (
              <img src={media.url} alt="preview" className="rounded-lg" />
            ) : (
              <video src={media.url} controls className="rounded-lg" />
            )}
          </div>
        ))}
      </div> */}

      {/* <button
        onClick={handleUpload}
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Upload to Cloudinary
      </button> */}
    </>
  );
}
