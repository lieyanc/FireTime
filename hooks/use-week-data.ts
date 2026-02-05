import useSWR from "swr";
import type { DayData } from "@/lib/types";
import { getWeekStart, addDays } from "@/lib/dates";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useWeekData(date: string) {
  const weekStart = getWeekStart(date);
  const weekEnd = addDays(weekStart, 6);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Fetch only this week's data instead of all days
  const { data, error, isLoading, mutate } = useSWR<{ data: DayData[] }>(
    `/api/days?from=${weekStart}&to=${weekEnd}`,
    fetcher
  );

  const weekData = (data?.data || []).sort((a, b) => a.date.localeCompare(b.date));

  return {
    weekData,
    weekDates,
    isLoading,
    error,
    mutate,
  };
}
