import { useUser } from "@/components/user-provider";
import { useDayData } from "@/hooks/use-day-data";
import { getToday } from "@/lib/dates";
import { ImmersiveClock } from "@/components/immersive-clock";
import { Skeleton } from "@/components/ui/skeleton";

export default function ClockPage() {
  const today = getToday();
  const { currentUserId } = useUser();
  const { schedule, tasks, isLoading, updateTasks } = useDayData(today, currentUserId);

  const handleTaskToggle = (taskId: string) => {
    const newTasks = tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    updateTasks(newTasks);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
        <Skeleton className="h-32 w-64" />
      </div>
    );
  }

  return (
    <ImmersiveClock
      schedule={schedule}
      tasks={tasks}
      onTaskToggle={handleTaskToggle}
    />
  );
}
