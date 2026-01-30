"use client";

import { use } from "react";
import Link from "next/link";
import { useUser } from "@/components/user-provider";
import { useDayData } from "@/hooks/use-day-data";
import { useGlobalTodos } from "@/hooks/use-global-todos";
import { useCurrentBlock } from "@/hooks/use-current-block";
import { formatDisplayDate, addDays, isToday } from "@/lib/dates";
import { CompactTimeline } from "@/components/compact-timeline";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, ListTodo, Circle, Play, CheckCircle2, Loader2 } from "lucide-react";
import type { TodoStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ date: string }>;
}

const statusConfig: Record<TodoStatus, { icon: typeof Circle; color: string }> = {
  pending: { icon: Circle, color: "text-muted-foreground" },
  in_progress: { icon: Play, color: "text-blue-500" },
  completed: { icon: CheckCircle2, color: "text-green-500" },
};

export default function DayPage({ params }: PageProps) {
  const { date } = use(params);
  const { currentUserId, currentUser } = useUser();
  const { schedule, isLoading: dayLoading, isValidating, updateSchedule } = useDayData(date, currentUserId);
  const { todos, isLoading: todosLoading, cycleTodoStatus, linkTodoToBlock } = useGlobalTodos();
  const { currentBlock } = useCurrentBlock(schedule);

  const prevDate = addDays(date, -1);
  const nextDate = addDays(date, 1);

  // 只在首次加载（没有缓存数据）时显示骨架屏
  const showSkeleton = (dayLoading && schedule.length === 0) || todosLoading;

  // 获取当前用户的待办
  const userTodos = currentUserId ? todos[currentUserId] : [];

  // 按状态分组
  const inProgressTodos = userTodos.filter((t) => t.status === "in_progress");
  const pendingTodos = userTodos.filter((t) => t.status === "pending");
  const completedTodos = userTodos.filter((t) => t.status === "completed");

  if (showSkeleton) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-[500px] lg:col-span-2" />
          <Skeleton className="h-[500px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 顶部导航 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href={`/day/${prevDate}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold">{formatDisplayDate(date)}</h1>
            {isToday(date) && <Badge variant="default" className="text-xs">今天</Badge>}
            {isValidating && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          <Link href={`/day/${nextDate}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
        <span className="text-sm text-muted-foreground">{currentUser?.name}</span>
      </div>

      {/* 主要内容 */}
      <div className={cn(
        "grid gap-4 lg:grid-cols-3 transition-opacity duration-200",
        isValidating && "opacity-60"
      )}>
        {/* 左侧：紧凑时间轴 */}
        <div className="lg:col-span-2">
          <CompactTimeline
            schedule={schedule}
            onUpdate={updateSchedule}
            currentBlockId={isToday(date) ? currentBlock?.id : undefined}
          />
        </div>

        {/* 右侧：待办快速视图 */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="h-5 w-5" />
              待办事项
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {completedTodos.length}/{userTodos.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 进行中 */}
            {inProgressTodos.length > 0 && (
              <div>
                <div className="text-xs font-medium text-blue-500 mb-1">进行中</div>
                <div className="space-y-1">
                  {inProgressTodos.map((todo) => {
                    const StatusIcon = statusConfig[todo.status].icon;
                    return (
                      <div
                        key={todo.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 group"
                      >
                        <button
                          className={cn("shrink-0", statusConfig[todo.status].color)}
                          onClick={() => cycleTodoStatus(currentUserId, todo.id)}
                        >
                          <StatusIcon className="h-4 w-4" />
                        </button>
                        <span className="text-sm truncate flex-1">{todo.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* 待做 */}
            {pendingTodos.length > 0 && (
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">待做</div>
                <div className="space-y-1">
                  {pendingTodos.slice(0, 5).map((todo) => {
                    const StatusIcon = statusConfig[todo.status].icon;
                    return (
                      <div
                        key={todo.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 group"
                      >
                        <button
                          className={cn("shrink-0", statusConfig[todo.status].color)}
                          onClick={() => cycleTodoStatus(currentUserId, todo.id)}
                        >
                          <StatusIcon className="h-4 w-4" />
                        </button>
                        <span className="text-sm truncate flex-1">{todo.title}</span>
                      </div>
                    );
                  })}
                  {pendingTodos.length > 5 && (
                    <div className="text-xs text-muted-foreground pl-6">
                      +{pendingTodos.length - 5} 更多
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 已完成 */}
            {completedTodos.length > 0 && (
              <div>
                <div className="text-xs font-medium text-green-500 mb-1">已完成</div>
                <div className="space-y-1">
                  {completedTodos.slice(0, 3).map((todo) => {
                    const StatusIcon = statusConfig[todo.status].icon;
                    return (
                      <div
                        key={todo.id}
                        className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/50 group opacity-50"
                      >
                        <button
                          className={cn("shrink-0", statusConfig[todo.status].color)}
                          onClick={() => cycleTodoStatus(currentUserId, todo.id)}
                        >
                          <StatusIcon className="h-4 w-4" />
                        </button>
                        <span className="text-sm truncate flex-1 line-through">{todo.title}</span>
                      </div>
                    );
                  })}
                  {completedTodos.length > 3 && (
                    <div className="text-xs text-muted-foreground pl-6">
                      +{completedTodos.length - 3} 更多
                    </div>
                  )}
                </div>
              </div>
            )}

            {userTodos.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">
                暂无待办事项
              </div>
            )}

            {/* 快速链接 */}
            <div className="pt-2 border-t">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="w-full">
                  返回首页管理待办
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
