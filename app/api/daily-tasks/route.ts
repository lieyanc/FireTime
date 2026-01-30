import { NextResponse } from "next/server";
import { getDailyTasks, saveDailyTasks } from "@/lib/store";
import type { DailyTaskList } from "@/lib/types";

export async function GET() {
  const data = getDailyTasks();
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  const body: DailyTaskList = await request.json();
  saveDailyTasks(body);
  return NextResponse.json({ success: true });
}
