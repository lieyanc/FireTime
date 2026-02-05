import { NextResponse } from "next/server";
import { getDailyCheckIns, saveDailyCheckIns, getStreaks, getDailyTasks, getSettings } from "@/lib/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const data = getDailyCheckIns(date);
  const tasks = getDailyTasks();
  const settings = getSettings();

  // 计算连续打卡
  const streaks = getStreaks(date, { tasks, settings });

  return NextResponse.json({
    ...data,
    streaks,
    tasks: tasks.tasks,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const body = await request.json();
  saveDailyCheckIns({
    date,
    checkIns: body.checkIns,
    homeworkProgress: body.homeworkProgress,
  });
  return NextResponse.json({ success: true });
}
