"use client";

import { useUser } from "@/components/user-provider";
import { useSettings } from "@/hooks/use-settings";
import { useDailyCheckIns, useDailyTasks } from "@/hooks/use-daily-tasks";
import { getToday, formatDisplayDate } from "@/lib/dates";
import { DailyCheckInCard, DailyPKView, DailyTaskManager } from "@/components/daily-checkin";
import { Skeleton } from "@/components/ui/skeleton";

export default function CheckInPage() {
  const today = getToday();
  const { users } = useUser();
  const { settings } = useSettings();
  const { tasks: dailyTasks, addTask, removeTask, editTask } = useDailyTasks();
  const {
    checkIns,
    streaks,
    tasks: checkInTasks,
    isLoading,
    toggleCheckIn,
    setCheckInAmount,
  } = useDailyCheckIns(today);

  const user1 = users.find((u) => u.id === "user1") || { id: "user1" as const, name: "用户 1" };
  const user2 = users.find((u) => u.id === "user2") || { id: "user2" as const, name: "用户 2" };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">每日打卡</h1>
          <p className="text-muted-foreground">{formatDisplayDate(today)}</p>
        </div>
        <DailyTaskManager
          tasks={dailyTasks}
          subjects={settings?.subjects}
          onAdd={addTask}
          onRemove={removeTask}
          onEdit={editTask}
        />
      </div>

      {/* PK 总览 */}
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

      {/* 双人打卡面板 */}
      <div className="grid gap-4 md:grid-cols-2">
        <DailyCheckInCard
          user={user1}
          userId="user1"
          tasks={checkInTasks}
          checkIns={checkIns.user1}
          streak={streaks.user1}
          subjects={settings?.subjects}
          onToggle={(taskId) => toggleCheckIn("user1", taskId)}
          onSetAmount={(taskId, amount) => setCheckInAmount("user1", taskId, amount)}
        />
        <DailyCheckInCard
          user={user2}
          userId="user2"
          tasks={checkInTasks}
          checkIns={checkIns.user2}
          streak={streaks.user2}
          subjects={settings?.subjects}
          onToggle={(taskId) => toggleCheckIn("user2", taskId)}
          onSetAmount={(taskId, amount) => setCheckInAmount("user2", taskId, amount)}
        />
      </div>
    </div>
  );
}
