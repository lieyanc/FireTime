import { NextResponse } from "next/server";
import { getUsers, updateUser } from "@/lib/store";

export async function GET() {
  const users = getUsers();
  return NextResponse.json({ users });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { id, name, avatar, progressColor } = body;

  if (!id || !name) {
    return NextResponse.json({ error: "Missing id or name" }, { status: 400 });
  }

  const users = updateUser(id, name, avatar, progressColor);
  return NextResponse.json({ users });
}
