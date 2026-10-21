import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Calendar, Flame, GraduationCap } from "lucide-react";
import type { VacationSettings, ExamCountdown } from "@/lib/types";
import { getVacationProgress } from "@/hooks/use-settings";
import { getToday, formatShortDate, parseDate } from "@/lib/dates";

interface VacationProgressProps {
  vacation: VacationSettings;
  exams?: ExamCountdown[];
}

export function VacationProgress({ vacation, exams = [] }: VacationProgressProps) {
  const today = getToday();
  const { daysPassed, totalDays, percentage, daysRemaining } = getVacationProgress(
    vacation.startDate,
    vacation.endDate,
    today
  );

  // 计算最近的考试倒计时
  const upcomingExams = exams
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const getExamDaysLeft = (examDate: string) => {
    const exam = parseDate(examDate);
    const now = parseDate(today);
    return Math.ceil((exam.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Flame className="h-5 w-5 text-orange-500" />
          {vacation.name}进度
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            {formatShortDate(vacation.startDate)} - {formatShortDate(vacation.endDate)}
          </span>
          <span className="font-medium">
            第 {daysPassed}/{totalDays} 天
          </span>
        </div>

        <div className="space-y-1">
          <Progress value={percentage} className="h-3" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>已过 {Math.round(percentage)}%</span>
            <span>剩余 {daysRemaining} 天</span>
          </div>
        </div>

        {/* 考试倒计时 */}
        {upcomingExams.length > 0 && (
          <div className="pt-2 border-t space-y-1.5">
            {upcomingExams.slice(0, 2).map((exam) => {
              const daysLeft = getExamDaysLeft(exam.date);
              return (
                <div
                  key={exam.id}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <GraduationCap className="h-4 w-4" />
                    {exam.name}
                  </span>
                  <span className={`font-bold ${daysLeft <= 7 ? "text-red-500" : daysLeft <= 14 ? "text-orange-500" : "text-primary"}`}>
                    {daysLeft} 天
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
