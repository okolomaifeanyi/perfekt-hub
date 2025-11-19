// app/api/upload/route.ts
import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const MAX_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Max 100MB." },
        { status: 413 }
      );
    }

    // Correct MIME detection
    const isVideo = file.type.startsWith("video/");
    const isImage = file.type.startsWith("image/");
    const resource_type = isVideo ? "video" : isImage ? "image" : "raw";

    if (resource_type === "raw") {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "feelvalue",
          resource_type: resource_type as "image" | "video" | "raw",
          public_id: `${Date.now()}-${Math.random()
            .toString(36)
            .substring(2, 8)}`,
          // Better video settings
          ...(isVideo && {
            format: "mp4",
            quality: "auto:good",
            fetch_format: "auto",
          }),
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );

      // This is CRUCIAL: end() must be called on the stream returned
      uploadStream.end(buffer);
    });

    return NextResponse.json({ success: true, result });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Upload failed:", err);
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}

// Optional: Increase body size limit (Vercel Pro required for >10MB)
export const config = {
  api: {
    bodyParser: false, // Required for large files
  },
};
