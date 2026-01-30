"use client";

import { useUser } from "@/components/user-provider";
import { useDayData } from "@/hooks/use-day-data";
import { useSettings } from "@/hooks/use-settings";
import { useGlobalTodos } from "@/hooks/use-global-todos";
import { useDailyCheckIns, useDailyTasks } from "@/hooks/use-daily-tasks";
import { useClock } from "@/hooks/use-clock";
import { getToday, formatDisplayDate } from "@/lib/dates";
import { VacationProgress } from "@/components/vacation-progress";
import { DualScheduleView } from "@/components/dual-schedule-view";
import { DualTodoList } from "@/components/dual-todo-list";
import { HomeworkManager } from "@/components/homework-manager";
import { DailyPKView, DailyTaskManager } from "@/components/daily-checkin";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const today = getToday();
  const { users, currentUser } = useUser();
  const { dayData, isLoading: dayLoading } = useDayData(today, "user1");
  const { settings, isLoading: settingsLoading, updateSubjects } = useSettings();
  const { todos, isLoading: todosLoading, addTodo, cycleTodoStatus, deleteTodo } = useGlobalTodos();
  const { tasks: dailyTasks, addTask, removeTask, editTask } = useDailyTasks();
  const { checkIns, streaks, tasks: checkInTasks, isLoading: checkInsLoading } = useDailyCheckIns(today);
  const currentTime = useClock();

  const user1 = users.find((u) => u.id === "user1") || { id: "user1" as const, name: "用户 1" };
  const user2 = users.find((u) => u.id === "user2") || { id: "user2" as const, name: "用户 2" };

  const isLoading = dayLoading || settingsLoading || todosLoading || checkInsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
          <Skeleton className="h-[120px]" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-[400px] lg:col-span-2" />
          <Skeleton className="h-[400px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">你好, {currentUser?.name}</h1>
          <p className="text-muted-foreground">{formatDisplayDate(today)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/checkin">
            <Badge variant="default" className="text-sm cursor-pointer">
              每日打卡
            </Badge>
          </Link>
          <Link href={`/day/${today}`}>
            <Badge variant="outline" className="text-sm cursor-pointer hover:bg-accent">
              管理时间表
            </Badge>
          </Link>
        </div>
      </div>

      {/* 顶部统计 */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* 假期进度 + 考试倒计时 */}
        {settings?.vacation && (
          <VacationProgress vacation={settings.vacation} exams={settings.exams} />
        )}

        {/* 作业进度（紧凑版） */}
        {settings?.subjects && (
          <HomeworkManager
            subjects={settings.subjects}
            onUpdateSubjects={updateSubjects}
            compact
          />
        )}

        {/* 每日打卡PK */}
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
      </div>

      {/* 主要内容：双人时间表 + 待办列表 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* 双人时间表 */}
        <div className="lg:col-span-2">
          <DualScheduleView
            user1={user1}
            user2={user2}
            schedule1={dayData?.user1?.schedule || []}
            schedule2={dayData?.user2?.schedule || []}
            currentTime={currentTime}
            todos1={todos.user1}
            todos2={todos.user2}
          />
        </div>

        {/* 待办列表 */}
        <div className="h-[500px]">
          <DualTodoList
            user1={user1}
            user2={user2}
            currentUserId={currentUser?.id || "user1"}
            todos1={todos.user1}
            todos2={todos.user2}
            schedule1={dayData?.user1?.schedule || []}
            schedule2={dayData?.user2?.schedule || []}
            onAddTodo={addTodo}
            onCycleTodoStatus={cycleTodoStatus}
            onDeleteTodo={deleteTodo}
          />
        </div>
      </div>
    </div>
  );
}
