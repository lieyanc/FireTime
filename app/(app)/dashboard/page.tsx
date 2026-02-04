"use client";

import { useState, useMemo } from "react";
import { nanoid } from "nanoid";
import Link from "next/link";
import { useUser } from "@/components/user-provider";
import { useDayData } from "@/hooks/use-day-data";
import { useSettings, getVacationProgress, getSubjectProgress } from "@/hooks/use-settings";
import { useGlobalTodos } from "@/hooks/use-global-todos";
import { useDailyCheckIns, useDailyTasks } from "@/hooks/use-daily-tasks";
import { useClock } from "@/hooks/use-clock";
import { getToday, formatDisplayDate, parseTime, parseDate } from "@/lib/dates";
import { DailyTaskManager } from "@/components/daily-checkin";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Flame,
  GraduationCap,
  BookOpen,
  Zap,
  ListTodo,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Play,
  Timer,
  ChevronRight,
  Target,
  ArrowRight,
} from "lucide-react";
import type {
  TimeBlock,
  DailyTask,
  DailyCheckIn,
  GlobalTodoItem,
  User,
  UserId,
  TodoStatus,
  Subject,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// === Helpers ===

function getMinutes(time: string): number {
  const { hours, minutes } = parseTime(time);
  return hours * 60 + minutes;
}

function getCurrentPrevNext(schedule: TimeBlock[], currentTime: string) {
  const now = getMinutes(currentTime);
  const sorted = [...schedule].sort(
    (a, b) => getMinutes(a.startTime) - getMinutes(b.startTime)
  );

  let prevBlock: TimeBlock | null = null;
  let currentBlock: TimeBlock | null = null;
  let nextBlock: TimeBlock | null = null;

  for (let i = 0; i < sorted.length; i++) {
    const start = getMinutes(sorted[i].startTime);
    const end = getMinutes(sorted[i].endTime);

    if (now >= start && now < end) {
      // Found current block
      currentBlock = sorted[i];
      prevBlock = sorted[i - 1] || null;
      nextBlock = sorted[i + 1] || null;
      break;
    }

    if (now < start) {
      // We're before this block, so prev is the one before, next is this one
      prevBlock = sorted[i - 1] || null;
      nextBlock = sorted[i];
      break;
    }

    // If we're past all blocks
    if (i === sorted.length - 1 && now >= end) {
      prevBlock = sorted[i];
    }
  }

  return { prevBlock, currentBlock, nextBlock };
}

function getBlockProgress(block: TimeBlock, currentTime: string): number {
  const now = getMinutes(currentTime);
  const start = getMinutes(block.startTime);
  const end = getMinutes(block.endTime);
  if (now < start) return 0;
  if (now >= end) return 100;
  return ((now - start) / (end - start)) * 100;
}

const categoryColors: Record<string, string> = {
  routine: "bg-blue-400",
  meal: "bg-orange-400",
  work: "bg-purple-400",
  rest: "bg-green-400",
  free: "bg-yellow-400",
  sleep: "bg-indigo-400",
};

// === Page ===

export default function DashboardPage() {
  const today = getToday();
  const { users, currentUser, currentUserId } = useUser();
  const { dayData, isLoading: dayLoading } = useDayData(today, "user1");
  const { settings, isLoading: settingsLoading, updateSubjects } = useSettings();
  const {
    todos,
    isLoading: todosLoading,
    addTodo,
    cycleTodoStatus,
    deleteTodo,
  } = useGlobalTodos();
  const { tasks: dailyTasks, addTask, removeTask, editTask } = useDailyTasks();
  const {
    checkIns,
    streaks,
    tasks: checkInTasks,
    isLoading: checkInsLoading,
  } = useDailyCheckIns(today);
  const currentTime = useClock();

  const user1 = users.find((u) => u.id === "user1") || {
    id: "user1" as const,
    name: "用户 1",
  };
  const user2 = users.find((u) => u.id === "user2") || {
    id: "user2" as const,
    name: "用户 2",
  };

  const isLoading =
    dayLoading || settingsLoading || todosLoading || checkInsLoading;

  // Computed
  const vacationInfo = useMemo(() => {
    if (!settings?.vacation) return null;
    return getVacationProgress(
      settings.vacation.startDate,
      settings.vacation.endDate,
      today
    );
  }, [settings?.vacation, today]);

  const homeworkInfo = useMemo(() => {
    if (!settings?.subjects) return null;
    return getSubjectProgress(settings.subjects, currentUserId);
  }, [settings?.subjects, currentUserId]);

  const schedule1 = dayData?.user1?.schedule || [];
  const schedule2 = dayData?.user2?.schedule || [];
  const { prevBlock: pb1, currentBlock: cb1, nextBlock: nb1 } = getCurrentPrevNext(
    schedule1,
    currentTime
  );
  const { prevBlock: pb2, currentBlock: cb2, nextBlock: nb2 } = getCurrentPrevNext(
    schedule2,
    currentTime
  );

  const upcomingExams = useMemo(() => {
    if (!settings?.exams) return [];
    return settings.exams
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [settings?.exams, today]);

  const getExamDaysLeft = (examDate: string) => {
    const exam = parseDate(examDate);
    const now = parseDate(today);
    return Math.ceil(
      (exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
  };

  const checkIn1Count = checkInTasks.filter((t) =>
    checkIns.user1.find((c) => c.taskId === t.id)?.completed
  ).length;
  const checkIn2Count = checkInTasks.filter((t) =>
    checkIns.user2.find((c) => c.taskId === t.id)?.completed
  ).length;
  const totalCheckins = checkInTasks.length;

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
          <Skeleton className="h-[280px] lg:col-span-3 rounded-xl" />
          <Skeleton className="h-[280px] lg:col-span-2 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{currentUser?.name}</h1>
          <span className="text-sm text-muted-foreground">
            {formatDisplayDate(today)}
          </span>
        </div>
        <div className="flex-1 flex justify-center">
          <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
            {currentTime}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/checkin">
            <Badge variant="default" className="cursor-pointer text-xs">
              每日打卡
            </Badge>
          </Link>
          <Link href={`/day/${today}`}>
            <Badge
              variant="outline"
              className="cursor-pointer text-xs hover:bg-accent"
            >
              管理时间表
            </Badge>
          </Link>
          <DailyTaskManager
            tasks={dailyTasks}
            subjects={settings?.subjects}
            userId={currentUserId}
            onAdd={addTask}
            onRemove={removeTask}
            onEdit={editTask}
          />
        </div>
      </div>

      {/* ─── Current Activity Banner ─── */}
      <div className="rounded-xl border bg-gradient-to-r from-primary/8 via-primary/4 to-transparent p-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5" />
            时间轴
          </span>
          <Link
            href={`/day/${today}`}
            className="flex items-center gap-0.5 hover:text-primary"
          >
            查看完整时间表 <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* User 1 Timeline */}
          <TimelineSlot
            user={user1}
            prevBlock={pb1}
            currentBlock={cb1}
            nextBlock={nb1}
            currentTime={currentTime}
          />
          {/* User 2 Timeline */}
          <TimelineSlot
            user={user2}
            prevBlock={pb2}
            currentBlock={cb2}
            nextBlock={nb2}
            currentTime={currentTime}
          />
        </div>
      </div>

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Vacation */}
        <div className="rounded-xl border p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Flame className="h-3.5 w-3.5 text-orange-500" />
            {settings?.vacation?.name || "假期"}
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums">
              {vacationInfo?.daysPassed || 0}
            </span>
            <span className="text-sm text-muted-foreground">
              / {vacationInfo?.totalDays || 0} 天
            </span>
          </div>
          <Progress value={vacationInfo?.percentage || 0} className="h-1.5" />
          <div className="text-[10px] text-muted-foreground">
            剩余 {vacationInfo?.daysRemaining || 0} 天 ·{" "}
            {Math.round(vacationInfo?.percentage || 0)}%
          </div>
        </div>

        {/* Exam */}
        <div className="rounded-xl border p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5 text-blue-500" />
            考试倒计时
          </div>
          {upcomingExams.length > 0 ? (
            <div className="space-y-1">
              {upcomingExams.slice(0, 2).map((exam) => {
                const days = getExamDaysLeft(exam.date);
                return (
                  <div
                    key={exam.id}
                    className="flex items-baseline justify-between"
                  >
                    <span className="text-xs truncate mr-2">{exam.name}</span>
                    <span
                      className={cn(
                        "text-xl font-bold tabular-nums",
                        days <= 7
                          ? "text-red-500"
                          : days <= 14
                          ? "text-orange-500"
                          : "text-primary"
                      )}
                    >
                      {days}
                      <span className="text-xs font-normal ml-0.5">天</span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground pt-1">暂无考试</div>
          )}
        </div>

        {/* Homework */}
        <div className="rounded-xl border p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <BookOpen className="h-3.5 w-3.5 text-green-500" />
            作业总进度
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold tabular-nums">
              {Math.round(homeworkInfo?.percentage || 0)}
            </span>
            <span className="text-sm text-muted-foreground">%</span>
          </div>
          <Progress value={homeworkInfo?.percentage || 0} className="h-1.5" />
          <div className="text-[10px] text-muted-foreground">
            {homeworkInfo?.completedItems || 0} /{" "}
            {homeworkInfo?.totalItems || 0} 总量
          </div>
        </div>

        {/* Check-in */}
        <div className="rounded-xl border p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5 text-purple-500" />
            今日打卡
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl font-bold tabular-nums">
                  {checkIn1Count}
                </span>
                <span className="text-xs text-muted-foreground">
                  /{totalCheckins}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                {user1.name}
                {streaks.user1 > 0 && (
                  <span className="text-orange-500 flex items-center">
                    <Flame className="h-2.5 w-2.5" />
                    {streaks.user1}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-0.5">
                <span className="text-xl font-bold tabular-nums">
                  {checkIn2Count}
                </span>
                <span className="text-xs text-muted-foreground">
                  /{totalCheckins}
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                {user2.name}
                {streaks.user2 > 0 && (
                  <span className="text-orange-500 flex items-center">
                    <Flame className="h-2.5 w-2.5" />
                    {streaks.user2}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main: Check-in + Todos ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Check-in - 3 cols */}
        <div className="lg:col-span-3 rounded-xl border">
          <div className="flex items-center justify-between p-3 pb-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Zap className="h-4 w-4 text-yellow-500" />
              每日打卡
            </div>
            <Link
              href="/checkin"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5"
            >
              详情 <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 divide-x px-1 pb-3">
            <CheckInColumn
              user={user1}
              tasks={checkInTasks}
              checkIns={checkIns.user1}
              streak={streaks.user1}
              subjects={settings?.subjects || []}
            />
            <CheckInColumn
              user={user2}
              tasks={checkInTasks}
              checkIns={checkIns.user2}
              streak={streaks.user2}
              subjects={settings?.subjects || []}
            />
          </div>
        </div>

        {/* Todos - 2 cols */}
        <div
          className="lg:col-span-2 rounded-xl border flex flex-col overflow-hidden"
          style={{ maxHeight: 380 }}
        >
          <CompactTodoList
            user1={user1}
            user2={user2}
            currentUserId={currentUser?.id || "user1"}
            todos1={todos.user1}
            todos2={todos.user2}
            onAddTodo={addTodo}
            onCycleTodoStatus={cycleTodoStatus}
            onDeleteTodo={deleteTodo}
          />
        </div>
      </div>

      {/* ─── Homework Grid ─── */}
      {settings?.subjects && settings.subjects.length > 0 && (
        <div className="rounded-xl border p-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <BookOpen className="h-4 w-4 text-green-500" />
              作业进度明细
            </div>
            <Link
              href="/settings"
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5"
            >
              管理 <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-3">
            {settings.subjects.map((subject) => {
              const assignedTo = subject.assignedTo || "both";
              const showUser1 = assignedTo === "both" || assignedTo === "user1";
              const showUser2 = assignedTo === "both" || assignedTo === "user2";

              return (
                <div key={subject.id} className="space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: subject.color }}
                    />
                    <span className="text-xs font-medium">{subject.name}</span>
                    {assignedTo !== "both" && (
                      <span className="text-[9px] text-muted-foreground">
                        ({assignedTo === "user1" ? users[0]?.name : users[1]?.name})
                      </span>
                    )}
                  </div>
                  {subject.homework.map((hw) => {
                    const pct1 = (hw.completedPages.user1 / hw.totalPages) * 100;
                    const pct2 = (hw.completedPages.user2 / hw.totalPages) * 100;
                    return (
                      <div key={hw.id} className="space-y-0.5">
                        <div className="text-[10px] text-muted-foreground flex justify-between">
                          <span>{hw.title}</span>
                          <span className="tabular-nums">/{hw.totalPages}{hw.unit}</span>
                        </div>
                        {showUser1 && showUser2 ? (
                          <div className="flex gap-1 h-1.5">
                            <div className="flex-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-blue-500 transition-all"
                                style={{ width: `${Math.min(100, pct1)}%` }}
                              />
                            </div>
                            <div className="flex-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 transition-all"
                                style={{ width: `${Math.min(100, pct2)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <Progress
                            value={showUser1 ? pct1 : pct2}
                            className="h-1.5"
                          />
                        )}
                        <div className="flex text-[9px] text-muted-foreground tabular-nums">
                          {showUser1 && (
                            <span className={cn("text-blue-500", !showUser2 && "flex-1")}>
                              {hw.completedPages.user1}
                            </span>
                          )}
                          {showUser1 && showUser2 && <span className="flex-1" />}
                          {showUser2 && (
                            <span className="text-green-500 text-right">
                              {hw.completedPages.user2}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          {/* 图例 */}
          <div className="flex items-center justify-center gap-4 mt-3 pt-2 border-t text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {users[0]?.name || "用户1"}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {users[1]?.name || "用户2"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// === Timeline Slot (shows prev, current, next) ===
function TimelineSlot({
  user,
  prevBlock,
  currentBlock,
  nextBlock,
  currentTime,
}: {
  user: User;
  prevBlock: TimeBlock | null;
  currentBlock: TimeBlock | null;
  nextBlock: TimeBlock | null;
  currentTime: string;
}) {
  const progress = currentBlock ? getBlockProgress(currentBlock, currentTime) : 0;

  return (
    <div className="space-y-2">
      {/* User header */}
      <div className="text-xs font-medium text-muted-foreground">{user.name}</div>

      {/* Timeline */}
      <div className="space-y-1.5">
        {/* Previous block */}
        {prevBlock && (
          <TimeBlockItem
            block={prevBlock}
            type="past"
          />
        )}

        {/* Current block */}
        {currentBlock ? (
          <TimeBlockItem
            block={currentBlock}
            type="current"
            progress={progress}
          />
        ) : (
          <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-muted/30">
            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
            <span className="text-xs text-muted-foreground">当前空闲</span>
          </div>
        )}

        {/* Next block */}
        {nextBlock && (
          <TimeBlockItem
            block={nextBlock}
            type="future"
          />
        )}

        {/* No schedule */}
        {!prevBlock && !currentBlock && !nextBlock && (
          <div className="text-xs text-muted-foreground text-center py-2">
            今日无安排
          </div>
        )}
      </div>
    </div>
  );
}

// === Time Block Item ===
function TimeBlockItem({
  block,
  type,
  progress,
}: {
  block: TimeBlock;
  type: "past" | "current" | "future";
  progress?: number;
}) {
  const dotColor = categoryColors[block.category] || "bg-gray-400";

  const containerStyles = {
    past: "opacity-50",
    current: "bg-primary/10 border border-primary/20",
    future: "opacity-70",
  };

  return (
    <div className={cn(
      "flex items-center gap-2 py-1.5 px-2 rounded-md transition-all",
      containerStyles[type]
    )}>
      {/* Category dot */}
      <div className={cn(
        "w-1.5 h-1.5 rounded-full shrink-0",
        dotColor,
        type === "past" && "opacity-50"
      )} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn(
            "text-xs truncate",
            type === "current" && "font-medium"
          )}>
            {block.label}
          </span>
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {block.startTime}-{block.endTime}
          </span>
        </div>

        {/* Progress bar for current */}
        {type === "current" && progress !== undefined && (
          <div className="flex items-center gap-1.5 mt-1">
            <Progress value={progress} className="h-1 flex-1" />
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {Math.round(progress)}%
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// === Check-in Column ===
function CheckInColumn({
  user,
  tasks,
  checkIns,
  streak,
  subjects,
}: {
  user: User;
  tasks: DailyTask[];
  checkIns: DailyCheckIn[];
  streak: number;
  subjects: Subject[];
}) {
  const completed = tasks.filter((t) =>
    checkIns.find((c) => c.taskId === t.id)?.completed
  ).length;
  const total = tasks.length;
  const pct = total > 0 ? (completed / total) * 100 : 0;

  return (
    <div className="px-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{user.name}</span>
        <div className="flex items-center gap-2 text-xs">
          {streak > 0 && (
            <span className="text-orange-500 flex items-center gap-0.5">
              <Flame className="h-3 w-3" />
              {streak}天
            </span>
          )}
          <span className="text-muted-foreground tabular-nums">
            {completed}/{total}
          </span>
        </div>
      </div>
      <Progress value={pct} className="h-1" />

      {/* Task list */}
      <div className="space-y-1">
        {tasks.map((task) => {
          const ci = checkIns.find((c) => c.taskId === task.id);
          const done = ci?.completed ?? false;
          const amt = ci?.amount ?? 0;
          const color = subjects.find((s) => s.id === task.subjectId)?.color;

          return (
            <div key={task.id} className="flex items-center gap-1.5 text-xs">
              {done ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              {color && (
                <div
                  className="w-1 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
              )}
              <span
                className={cn(
                  "truncate flex-1",
                  done && "text-green-600 dark:text-green-400"
                )}
              >
                {task.title}
              </span>
              <span
                className={cn(
                  "font-mono text-[10px] shrink-0 tabular-nums",
                  done ? "text-green-500" : "text-muted-foreground"
                )}
              >
                {amt}/{task.target}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// === Compact Todo List ===
const statusConfig: Record<
  TodoStatus,
  { icon: typeof Circle; color: string }
> = {
  pending: { icon: Circle, color: "text-muted-foreground" },
  in_progress: { icon: Play, color: "text-blue-500" },
  completed: { icon: CheckCircle2, color: "text-green-500" },
};

function CompactTodoList({
  user1,
  user2,
  currentUserId,
  todos1,
  todos2,
  onAddTodo,
  onCycleTodoStatus,
  onDeleteTodo,
}: {
  user1: User;
  user2: User;
  currentUserId: UserId;
  todos1: GlobalTodoItem[];
  todos2: GlobalTodoItem[];
  onAddTodo: (userId: UserId, todo: GlobalTodoItem) => void;
  onCycleTodoStatus: (userId: UserId, todoId: string) => void;
  onDeleteTodo: (userId: UserId, todoId: string) => void;
}) {
  const [newTodo1, setNewTodo1] = useState("");
  const [newTodo2, setNewTodo2] = useState("");

  const sortTodos = (todos: GlobalTodoItem[]) =>
    [...todos].sort((a, b) => {
      const order: Record<TodoStatus, number> = {
        in_progress: 0,
        pending: 1,
        completed: 2,
      };
      if (order[a.status] !== order[b.status])
        return order[a.status] - order[b.status];
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const sortedTodos1 = sortTodos(todos1);
  const sortedTodos2 = sortTodos(todos2);

  const counts1 = {
    done: todos1.filter((t) => t.status === "completed").length,
    total: todos1.length,
  };
  const counts2 = {
    done: todos2.filter((t) => t.status === "completed").length,
    total: todos2.length,
  };

  const handleAdd = (userId: UserId, title: string, clearFn: () => void) => {
    if (!title.trim()) return;
    onAddTodo(userId, {
      id: nanoid(),
      title: title.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
    });
    clearFn();
  };

  const renderTodoList = (
    userId: UserId,
    user: User,
    todos: GlobalTodoItem[],
    counts: { done: number; total: number },
    newTodo: string,
    setNewTodo: (v: string) => void
  ) => (
    <div className="flex-1 min-w-0 flex flex-col">
      {/* User Header */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium truncate">{user.name}</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {counts.done}/{counts.total}
        </span>
      </div>

      {/* Add Input */}
      <div className="flex gap-1 mb-1.5">
        <Input
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" && handleAdd(userId, newTodo, () => setNewTodo(""))
          }
          placeholder="添加..."
          className="h-6 text-[11px] px-2"
        />
        <Button
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={() => handleAdd(userId, newTodo, () => setNewTodo(""))}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {/* Todo List */}
      <ScrollArea className="flex-1">
        <div className="space-y-0.5 pr-1">
          {todos.length === 0 ? (
            <div className="text-center text-[10px] text-muted-foreground py-4">
              暂无
            </div>
          ) : (
            todos.map((todo) => {
              const StatusIcon = statusConfig[todo.status].icon;
              return (
                <div
                  key={todo.id}
                  className={cn(
                    "flex items-center gap-1 py-0.5 px-1 rounded hover:bg-muted/50 group",
                    todo.status === "completed" && "opacity-50"
                  )}
                >
                  <button
                    onClick={() => onCycleTodoStatus(userId, todo.id)}
                    className={cn("shrink-0", statusConfig[todo.status].color)}
                  >
                    <StatusIcon className="h-3 w-3" />
                  </button>
                  <span
                    className={cn(
                      "text-[11px] flex-1 truncate",
                      todo.status === "completed" &&
                        "line-through text-muted-foreground"
                    )}
                  >
                    {todo.title}
                  </span>
                  <button
                    onClick={() => onDeleteTodo(userId, todo.id)}
                    className="opacity-0 group-hover:opacity-100 text-destructive shrink-0"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-1.5 p-3 pb-2 text-sm font-medium">
        <ListTodo className="h-4 w-4" />
        待办事项
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 flex gap-3 px-3 pb-2 min-h-0">
        {renderTodoList("user1", user1, sortedTodos1, counts1, newTodo1, setNewTodo1)}
        <div className="w-px bg-border shrink-0" />
        {renderTodoList("user2", user2, sortedTodos2, counts2, newTodo2, setNewTodo2)}
      </div>
    </>
  );
}
