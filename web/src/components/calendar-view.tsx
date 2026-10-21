import { useMemo } from "react";
import { Link } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { DayData, UserId } from "@/lib/types";
import { getDayStatus, getStatusColor } from "@/hooks/use-calendar-data";
import { cn } from "@/lib/utils";
import { formatDate, isToday, parseDate } from "@/lib/dates";

const weekDays = ["一", "二", "三", "四", "五", "六", "日"];

interface CalendarViewProps {
  year: number;
  month: number;
  allDays: DayData[];
  userId: UserId;
  onMonthChange: (year: number, month: number) => void;
  selectedDate?: string;
}

export function CalendarView({
  year,
  month,
  allDays,
  userId,
  onMonthChange,
  selectedDate,
}: CalendarViewProps) {
  const calendarData = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Get day of week for first day (0 = Sunday, 1 = Monday, etc)
    let startDayOfWeek = firstDay.getDay();
    // Convert to Monday-first (0 = Monday, 6 = Sunday)
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    const dayMap = new Map<string, DayData>();
    allDays.forEach((d) => dayMap.set(d.date, d));

    const weeks: { date: string; dayNum: number | null; status: ReturnType<typeof getDayStatus> }[][] = [];
    let currentWeek: typeof weeks[0] = [];

    // Add empty days for start
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push({ date: "", dayNum: null, status: "unplanned" });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = formatDate(new Date(year, month, day));
      const dayData = dayMap.get(date);
      const status = getDayStatus(dayData, userId);

      currentWeek.push({ date, dayNum: day, status });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Fill remaining days
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push({ date: "", dayNum: null, status: "unplanned" });
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    return weeks;
  }, [year, month, allDays, userId]);

  const handlePrevMonth = () => {
    if (month === 0) {
      onMonthChange(year - 1, 11);
    } else {
      onMonthChange(year, month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 11) {
      onMonthChange(year + 1, 0);
    } else {
      onMonthChange(year, month + 1);
    }
  };

  const monthName = new Date(year, month).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
  });

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">{monthName}</h2>
        <Button variant="ghost" size="icon" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-muted-foreground py-2"
          >
            {day}
          </div>
        ))}

        {calendarData.flat().map((day, i) => (
          <div key={i} className="aspect-square p-0.5">
            {day.dayNum !== null ? (
              <Link to={`/day/${day.date}`}>
                <div
                  className={cn(
                    "h-full w-full rounded-md flex flex-col items-center justify-center text-sm transition-all hover:ring-2 hover:ring-primary",
                    isToday(day.date) && "ring-2 ring-primary",
                    selectedDate === day.date && "bg-primary text-primary-foreground"
                  )}
                >
                  <span className={cn(isToday(day.date) && "font-bold")}>
                    {day.dayNum}
                  </span>
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full mt-0.5",
                      getStatusColor(day.status)
                    )}
                  />
                </div>
              </Link>
            ) : (
              <div className="h-full w-full" />
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span>完成</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500" />
          <span>部分</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500" />
          <span>未完成</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" />
          <span>未规划</span>
        </div>
      </div>
    </Card>
  );
}
