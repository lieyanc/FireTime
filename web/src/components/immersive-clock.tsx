import { useFullClock } from "@/hooks/use-clock";
import { useCurrentBlock } from "@/hooks/use-current-block";
import type { Task, TimeBlock } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ImmersiveClockProps {
  schedule: TimeBlock[];
  tasks: Task[];
  onTaskToggle: (taskId: string) => void;
}

export function ImmersiveClock({
  schedule,
  tasks,
  onTaskToggle,
}: ImmersiveClockProps) {
  const time = useFullClock();
  const { currentBlock, nextBlock } = useCurrentBlock(schedule);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");
  const seconds = time.getSeconds().toString().padStart(2, "0");

  // Get tasks linked to current block
  const currentTasks = currentBlock
    ? tasks.filter((t) => t.linkedBlockId === currentBlock.id)
    : [];

  const dateStr = time.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-background to-muted/50 dark:from-background dark:to-black flex flex-col items-center justify-center p-8">
      <div className="text-center space-y-8">
        {/* Date */}
        <p className="text-lg text-muted-foreground">{dateStr}</p>

        {/* Clock */}
        <div className="font-mono text-8xl md:text-9xl font-bold tracking-tight">
          <span>{hours}</span>
          <span className="animate-pulse">:</span>
          <span>{minutes}</span>
          <span className="text-muted-foreground text-6xl md:text-7xl ml-2">
            {seconds}
          </span>
        </div>

        {/* Current Block */}
        {currentBlock ? (
          <div className="space-y-2">
            <Badge variant="default" className="text-lg px-4 py-1">
              当前: {currentBlock.label}
            </Badge>
            <p className="text-muted-foreground">
              {currentBlock.startTime} - {currentBlock.endTime}
            </p>
          </div>
        ) : nextBlock ? (
          <div className="space-y-2">
            <Badge variant="secondary" className="text-lg px-4 py-1">
              下一个: {nextBlock.label}
            </Badge>
            <p className="text-muted-foreground">
              {nextBlock.startTime} 开始
            </p>
          </div>
        ) : (
          <Badge variant="outline" className="text-lg px-4 py-1">
            无安排
          </Badge>
        )}

        {/* Current Tasks */}
        {currentTasks.length > 0 && (
          <Card className="max-w-md mx-auto mt-8">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                当前时段任务
              </h3>
              <div className="space-y-2">
                {currentTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    onClick={() => onTaskToggle(task.id)}
                  >
                    <Checkbox checked={task.completed} />
                    <span
                      className={cn(
                        task.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
