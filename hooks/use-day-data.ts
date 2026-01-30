import useSWR from "swr";
import type { DayData, Task, TimeBlock, UserId } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDayData(date: string, userId: UserId) {
  const { data, error, isLoading, isValidating, mutate } = useSWR<{ data: DayData }>(
    `/api/days/${date}`,
    fetcher,
    { keepPreviousData: true }
  );

  const dayData = data?.data;
  const userData = dayData?.[userId];

  const updateSchedule = async (schedule: TimeBlock[]) => {
    await fetch(`/api/schedules/${date}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, schedule }),
    });
    mutate();
  };

  const updateTasks = async (tasks: Task[]) => {
    await fetch(`/api/tasks/${date}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, tasks }),
    });
    mutate();
  };

  return {
    dayData,
    userData,
    schedule: userData?.schedule || [],
    tasks: userData?.tasks || [],
    isLoading,
    isValidating,
    error,
    mutate,
    updateSchedule,
    updateTasks,
  };
}
