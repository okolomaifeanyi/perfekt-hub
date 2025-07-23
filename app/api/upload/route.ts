import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

   const mimeType = file.type;
  const resourceType = mimeType.startsWith("video")
    ? "video"
    : mimeType.startsWith("image")
    ? "image"
    : "raw";

  try {
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "feelvalue",
            resource_type: resourceType,
            public_id: file.name.split(".")[0],
            filename_override: file.name,
          },
          (err, result) => {
            if (err) return reject(err);
            resolve(result);
          }
        )
        .end(buffer);
    });

    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    console.error(err);
    const errorMessage =
      err instanceof Error ? err.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
