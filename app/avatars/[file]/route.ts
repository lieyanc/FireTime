import { NextResponse, type NextRequest } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const AVATARS_DIR = path.join(process.cwd(), "data", "avatars");
const LEGACY_AVATARS_DIR = path.join(process.cwd(), "public", "avatars");

export const runtime = "nodejs";

function contentTypeFromExt(ext: string) {
  switch (ext.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ file: string }> }
) {
  const { file } = await params;
  const safeName = path.basename(file);
  const ext = safeName.split(".").pop() || "";
  const contentType = contentTypeFromExt(ext);

  if (!contentType) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = path.join(AVATARS_DIR, safeName);
  const legacyFilePath = path.join(LEGACY_AVATARS_DIR, safeName);

  try {
    const bytes = await readFile(filePath).catch(() => readFile(legacyFilePath));
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
