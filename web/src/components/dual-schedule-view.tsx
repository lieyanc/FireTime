import { useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, Users } from "lucide-react";
import type { TimeBlock, User, GlobalTodoItem } from "@/lib/types";
import { cn } from "@/lib/utils";
import { parseTime } from "@/lib/dates";

interface DualScheduleViewProps {
  user1: User;
  user2: User;
  schedule1: TimeBlock[];
  schedule2: TimeBlock[];
  currentTime: string;
  todos1?: GlobalTodoItem[];
  todos2?: GlobalTodoItem[];
}

// 获取时间段的分钟数用于定位
function getMinutesFromMidnight(time: string): number {
  const { hours, minutes } = parseTime(time);
  return hours * 60 + minutes;
}

// 检查当前时间是否在时间段内
function isCurrentBlock(block: TimeBlock, currentTime: string): boolean {
  const current = getMinutesFromMidnight(currentTime);
  const start = getMinutesFromMidnight(block.startTime);
  const end = getMinutesFromMidnight(block.endTime);
  return current >= start && current < end;
}

// 计算当前时间在时间段中的进度
function getBlockProgress(block: TimeBlock, currentTime: string): number {
  const current = getMinutesFromMidnight(currentTime);
  const start = getMinutesFromMidnight(block.startTime);
  const end = getMinutesFromMidnight(block.endTime);
  if (current < start) return 0;
  if (current >= end) return 100;
  return ((current - start) / (end - start)) * 100;
}

// 获取类别颜色 - 深色模式柔和颜色
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    routine: "bg-blue-500/80 dark:bg-blue-600/70",
    meal: "bg-orange-500/80 dark:bg-orange-600/70",
    work: "bg-purple-500/80 dark:bg-purple-600/70",
    rest: "bg-green-500/80 dark:bg-green-600/70",
    free: "bg-yellow-500/80 dark:bg-yellow-600/70",
    sleep: "bg-indigo-500/80 dark:bg-indigo-600/70",
  };
  return colors[category] || "bg-gray-500/80 dark:bg-gray-600/70";
}

export function DualScheduleView({
  user1,
  user2,
  schedule1,
  schedule2,
  currentTime,
  todos1 = [],
  todos2 = [],
}: DualScheduleViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const currentHourRef = useRef<HTMLDivElement>(null);

  // 合并所有时间点并排序
  const allTimeSlots = useMemo(() => {
    const times = new Set<string>();
    [...schedule1, ...schedule2].forEach((block) => {
      times.add(block.startTime);
      times.add(block.endTime);
    });
    return Array.from(times).sort();
  }, [schedule1, schedule2]);

  // 当前时间位置
  const currentMinutes = getMinutesFromMidnight(currentTime);
  const currentHour = Math.floor(currentMinutes / 60);

  // 自动滚动到当前时间
  useEffect(() => {
    if (currentHourRef.current) {
      currentHourRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentHour]);

  // 找到当前时间应该显示的位置
  const findCurrentBlock = (schedule: TimeBlock[]) => {
    return schedule.find((block) => isCurrentBlock(block, currentTime));
  };

  const currentBlock1 = findCurrentBlock(schedule1);
  const currentBlock2 = findCurrentBlock(schedule2);

  // 按开始时间排序
  const sortedSchedule1 = [...schedule1].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );
  const sortedSchedule2 = [...schedule2].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  // 获取关联到某个时间块的待办
  const getLinkedTodos = (blockId: string, todos: GlobalTodoItem[]) => {
    return todos.filter((t) => t.linkedBlockId === blockId && t.status !== "completed");
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5" />
          今日时间表
          <Badge variant="outline" className="ml-auto">
            <Clock className="h-3 w-3 mr-1" />
            {currentTime}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* 标题行 */}
        <div className="grid grid-cols-[60px_1fr_1fr] border-b sticky top-0 bg-background z-10">
          <div className="p-2 text-xs text-muted-foreground text-center border-r">
            时间
          </div>
          <div className="p-2 text-sm font-medium text-center border-r">
            {user1.name}
          </div>
          <div className="p-2 text-sm font-medium text-center">
            {user2.name}
          </div>
        </div>

        <ScrollArea className="h-[400px]">
          <div className="relative">
            {/* 时间轴 */}
            {sortedSchedule1.length > 0 || sortedSchedule2.length > 0 ? (
              <div className="divide-y">
                {/* 生成统一的时间行 */}
                {Array.from({ length: 24 }, (_, hour) => {
                  const timeStr = `${hour.toString().padStart(2, "0")}:00`;
                  const nextTimeStr = `${(hour + 1).toString().padStart(2, "0")}:00`;

                  // 找到该小时内的时间段
                  const block1 = sortedSchedule1.find(
                    (b) =>
                      getMinutesFromMidnight(b.startTime) <= hour * 60 &&
                      getMinutesFromMidnight(b.endTime) > hour * 60
                  );
                  const block2 = sortedSchedule2.find(
                    (b) =>
                      getMinutesFromMidnight(b.startTime) <= hour * 60 &&
                      getMinutesFromMidnight(b.endTime) > hour * 60
                  );

                  // 检查当前小时是否包含当前时间
                  const isCurrentHour =
                    currentMinutes >= hour * 60 && currentMinutes < (hour + 1) * 60;

                  // 只显示有安排的时间段
                  if (!block1 && !block2 && hour < 6) return null;
                  if (!block1 && !block2 && hour > 23) return null;

                  return (
                    <div
                      key={hour}
                      ref={isCurrentHour ? currentHourRef : undefined}
                      className={cn(
                        "grid grid-cols-[60px_1fr_1fr] min-h-[40px] relative",
                        isCurrentHour && "bg-primary/5"
                      )}
                    >
                      {/* 当前时间指示线 */}
                      {isCurrentHour && (
                        <div
                          className="absolute left-0 right-0 h-0.5 bg-red-500 z-20 pointer-events-none"
                          style={{
                            top: `${((currentMinutes - hour * 60) / 60) * 100}%`,
                          }}
                        >
                          <div className="absolute -left-1 -top-1 w-2 h-2 bg-red-500 rounded-full" />
                        </div>
                      )}

                      {/* 时间列 */}
                      <div className="p-2 text-xs text-muted-foreground text-center border-r flex items-center justify-center">
                        {timeStr}
                      </div>

                      {/* 用户1时间段 */}
                      <div className="p-1 border-r min-h-[40px]">
                        {block1 && block1.startTime === timeStr && (
                          <div
                            className={cn(
                              "rounded p-1.5 text-xs text-white h-full",
                              getCategoryColor(block1.category),
                              currentBlock1?.id === block1.id && "ring-2 ring-red-500"
                            )}
                            style={{
                              minHeight: `${
                                ((getMinutesFromMidnight(block1.endTime) -
                                  getMinutesFromMidnight(block1.startTime)) /
                                  60) *
                                40
                              }px`,
                            }}
                          >
                            <div className="font-medium truncate">{block1.label}</div>
                            <div className="text-[10px] opacity-80">
                              {block1.startTime}-{block1.endTime}
                            </div>
                            {currentBlock1?.id === block1.id && (
                              <div className="mt-1 h-1 bg-white/30 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-white transition-all"
                                  style={{ width: `${getBlockProgress(block1, currentTime)}%` }}
                                />
                              </div>
                            )}
                            {/* 显示关联的待办 */}
                            {getLinkedTodos(block1.id, todos1).map((todo) => (
                              <div key={todo.id} className="text-[10px] mt-0.5 truncate opacity-90">
                                · {todo.title}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* 用户2时间段 */}
                      <div className="p-1 min-h-[40px]">
                        {block2 && block2.startTime === timeStr && (
                          <div
                            className={cn(
                              "rounded p-1.5 text-xs text-white h-full",
                              getCategoryColor(block2.category),
                              currentBlock2?.id === block2.id && "ring-2 ring-red-500"
                            )}
                            style={{
                              minHeight: `${
                                ((getMinutesFromMidnight(block2.endTime) -
                                  getMinutesFromMidnight(block2.startTime)) /
                                  60) *
                                40
                              }px`,
                            }}
                          >
                            <div className="font-medium truncate">{block2.label}</div>
                            <div className="text-[10px] opacity-80">
                              {block2.startTime}-{block2.endTime}
                            </div>
                            {currentBlock2?.id === block2.id && (
                              <div className="mt-1 h-1 bg-white/30 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-white transition-all"
                                  style={{ width: `${getBlockProgress(block2, currentTime)}%` }}
                                />
                              </div>
                            )}
                            {/* 显示关联的待办 */}
                            {getLinkedTodos(block2.id, todos2).map((todo) => (
                              <div key={todo.id} className="text-[10px] mt-0.5 truncate opacity-90">
                                · {todo.title}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground">
                暂无时间安排
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
