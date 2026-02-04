import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const AVATARS_DIR = path.join(process.cwd(), "public", "avatars");

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file || !userId) {
      return NextResponse.json({ error: "Missing file or userId" }, { status: 400 });
    }

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });
    }

    // Ensure avatars directory exists
    if (!existsSync(AVATARS_DIR)) {
      await mkdir(AVATARS_DIR, { recursive: true });
    }

    // Get file extension
    const ext = file.name.split(".").pop() || "png";
    const fileName = `${userId}.${ext}`;
    const filePath = path.join(AVATARS_DIR, fileName);

    // Write file
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const avatarUrl = `/avatars/${fileName}?t=${Date.now()}`;

    return NextResponse.json({ avatar: avatarUrl });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
