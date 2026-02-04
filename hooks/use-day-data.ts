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
    // Optimistically update local cache to avoid UI "refresh" while dragging.
    mutate(
      (current) => {
        if (!current?.data) return current;
        return {
          ...current,
          data: {
            ...current.data,
            [userId]: {
              ...current.data[userId],
              schedule,
            },
          },
        };
      },
      { revalidate: false }
    );

    try {
      const res = await fetch(`/api/schedules/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, schedule }),
      });
      if (!res.ok) throw new Error("Failed to update schedule");
    } catch {
      // Rollback by revalidating if the write fails.
      mutate();
    }
  };

  const updateTasks = async (tasks: Task[]) => {
    mutate(
      (current) => {
        if (!current?.data) return current;
        return {
          ...current,
          data: {
            ...current.data,
            [userId]: {
              ...current.data[userId],
              tasks,
            },
          },
        };
      },
      { revalidate: false }
    );

    try {
      const res = await fetch(`/api/tasks/${date}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tasks }),
      });
      if (!res.ok) throw new Error("Failed to update tasks");
    } catch {
      mutate();
    }
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
