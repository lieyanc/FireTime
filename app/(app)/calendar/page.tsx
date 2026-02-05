"use client";

import { useState } from "react";
import { useUser } from "@/components/user-provider";
import { useCalendarData } from "@/hooks/use-calendar-data";
import { CalendarView } from "@/components/calendar-view";
import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarPage() {
  const { currentUserId } = useUser();
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const { allDays, isLoading } = useCalendarData(year, month);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">月度日历</h1>
      <div className="max-w-lg mx-auto">
        <CalendarView
          year={year}
          month={month}
          allDays={allDays}
          userId={currentUserId}
          onMonthChange={(y, m) => {
            setYear(y);
            setMonth(m);
          }}
        />
      </div>
    </div>
  );
}
