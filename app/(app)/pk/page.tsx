"use client";

import { useUser } from "@/components/user-provider";
import { useDayData } from "@/hooks/use-day-data";
import { useWeekData } from "@/hooks/use-week-data";
import { useSettings } from "@/hooks/use-settings";
import { useDailyCheckIns } from "@/hooks/use-daily-tasks";
import { getToday, formatDisplayDate } from "@/lib/dates";
import { PKComparison } from "@/components/pk-comparison";
import { DailyPKView } from "@/components/daily-checkin";
import { Skeleton } from "@/components/ui/skeleton";

export default function PKPage() {
  const today = getToday();
  const { users } = useUser();
  const { dayData, isLoading } = useDayData(today, "user1");
  const { weekData } = useWeekData(today);
  const { settings } = useSettings();
  const { checkIns, streaks, tasks: checkInTasks, isLoading: checkInsLoading } = useDailyCheckIns(today);

  const user1 = users.find((u) => u.id === "user1") || {
    id: "user1" as const,
    name: "用户 1",
  };
  const user2 = users.find((u) => u.id === "user2") || {
    id: "user2" as const,
    name: "用户 2",
  };

  if (isLoading || checkInsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 gap-8">
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[200px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">双人 PK</h1>

      {/* 每日打卡 PK */}
      <DailyPKView
        user1={user1}
        user2={user2}
        tasks={checkInTasks}
        checkIns1={checkIns.user1}
        checkIns2={checkIns.user2}
        streak1={streaks.user1}
        streak2={streaks.user2}
        subjects={settings?.subjects}
      />

      {/* 原有的任务 PK */}
      <PKComparison
        user1={user1}
        user2={user2}
        user1Data={dayData?.user1}
        user2Data={dayData?.user2}
        dateLabel={`今日 - ${formatDisplayDate(today)}`}
        weekData={weekData}
      />
    </div>
  );
}
