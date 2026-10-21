import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProgressRing } from "@/components/progress-ring";
import { Checkbox } from "@/components/ui/checkbox";
import type { DayData, Task, User, UserDayData, UserId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatShortDate } from "@/lib/dates";

interface PKComparisonProps {
  user1: User;
  user2: User;
  user1Data: UserDayData | undefined;
  user2Data: UserDayData | undefined;
  dateLabel: string;
  weekData?: DayData[];
}

function getProgress(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  return (tasks.filter((t) => t.completed).length / tasks.length) * 100;
}

function getUserWeekProgress(weekData: DayData[], userId: UserId): { date: string; progress: number }[] {
  return weekData.map((day) => {
    const userData = day[userId];
    const tasks = userData?.tasks || [];
    return {
      date: day.date,
      progress: getProgress(tasks),
    };
  });
}

export function PKComparison({
  user1,
  user2,
  user1Data,
  user2Data,
  dateLabel,
  weekData = [],
}: PKComparisonProps) {
  const user1Tasks = user1Data?.tasks || [];
  const user2Tasks = user2Data?.tasks || [];

  const user1Progress = getProgress(user1Tasks);
  const user2Progress = getProgress(user2Tasks);

  const user1Completed = user1Tasks.filter((t) => t.completed).length;
  const user2Completed = user2Tasks.filter((t) => t.completed).length;

  const user1Week = getUserWeekProgress(weekData, "user1");
  const user2Week = getUserWeekProgress(weekData, "user2");

  // Calculate weekly average
  const user1WeekAvg = user1Week.length > 0
    ? user1Week.reduce((sum, d) => sum + d.progress, 0) / user1Week.length
    : 0;
  const user2WeekAvg = user2Week.length > 0
    ? user2Week.reduce((sum, d) => sum + d.progress, 0) / user2Week.length
    : 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-center">{dateLabel}</h2>

      {/* Progress Rings */}
      <div className="grid grid-cols-2 gap-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-lg">{user1.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ProgressRing
              progress={user1Progress}
              size={140}
              color="stroke-blue-500"
              label={`${user1Completed}/${user1Tasks.length}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-center text-lg">{user2.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <ProgressRing
              progress={user2Progress}
              size={140}
              color="stroke-green-500"
              label={`${user2Completed}/${user2Tasks.length}`}
            />
          </CardContent>
        </Card>
      </div>

      {/* Today Comparison Bar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">今日对比</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{user1.name}</span>
            <span className="text-sm font-medium">{user2.name}</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden flex">
            <div
              className="bg-blue-500 transition-all duration-500"
              style={{
                width: `${user1Progress}%`,
              }}
            />
            <div className="flex-1" />
            <div
              className="bg-green-500 transition-all duration-500"
              style={{
                width: `${user2Progress}%`,
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
            <span>{Math.round(user1Progress)}%</span>
            <span>{Math.round(user2Progress)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Comparison */}
      {weekData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center justify-between">
              <span>本周趋势</span>
              <span className="text-xs font-normal text-muted-foreground">
                平均: {user1.name} {Math.round(user1WeekAvg)}% vs {user2.name} {Math.round(user2WeekAvg)}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {user1Week.map((day, i) => (
                <div key={day.date} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatShortDate(day.date)}</span>
                    <div className="flex gap-4">
                      <span className="text-blue-500">{Math.round(day.progress)}%</span>
                      <span className="text-green-500">{Math.round(user2Week[i]?.progress || 0)}%</span>
                    </div>
                  </div>
                  <div className="flex gap-1 h-2">
                    <div className="flex-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${day.progress}%` }}
                      />
                    </div>
                    <div className="flex-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${user2Week[i]?.progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Task Lists Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">任务列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {user1Tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无任务
              </p>
            ) : (
              user1Tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox checked={task.completed} disabled />
                  <span
                    className={cn(
                      "flex-1",
                      task.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">任务列表</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-80 overflow-y-auto">
            {user2Tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                暂无任务
              </p>
            ) : (
              user2Tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <Checkbox checked={task.completed} disabled />
                  <span
                    className={cn(
                      "flex-1",
                      task.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
