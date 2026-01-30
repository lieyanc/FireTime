import { NextResponse } from "next/server";
import { getDailyCheckIns, saveDailyCheckIns, getStreak, getDailyTasks } from "@/lib/store";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const data = getDailyCheckIns(date);
  const tasks = getDailyTasks();

  // 计算连续打卡
  const streak1 = getStreak("user1", date);
  const streak2 = getStreak("user2", date);

  return NextResponse.json({
    ...data,
    streaks: { user1: streak1, user2: streak2 },
    tasks: tasks.tasks,
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ date: string }> }
) {
  const { date } = await params;
  const body = await request.json();
  saveDailyCheckIns({ date, checkIns: body.checkIns });
  return NextResponse.json({ success: true });
}
