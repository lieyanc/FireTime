export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00");
}

export function getToday(): string {
  return formatDate(new Date());
}

export function addDays(dateStr: string, days: number): string {
  const date = parseDate(dateStr);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

export function getMonthDates(year: number, month: number): string[] {
  const dates: string[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, month, d);
    dates.push(formatDate(date));
  }

  return dates;
}

export function getWeekStart(dateStr: string): string {
  const date = parseDate(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
  date.setDate(diff);
  return formatDate(date);
}

export function getDayOfWeek(dateStr: string): number {
  return parseDate(dateStr).getDay();
}

export function formatDisplayDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

export function formatShortDate(dateStr: string): string {
  const date = parseDate(dateStr);
  return date.toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

export function isToday(dateStr: string): boolean {
  return dateStr === getToday();
}

export function isSameMonth(dateStr: string, year: number, month: number): boolean {
  const date = parseDate(dateStr);
  return date.getFullYear() === year && date.getMonth() === month;
}

export function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return { hours, minutes };
}

export function formatTime(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export function isTimeInRange(
  currentTime: string,
  startTime: string,
  endTime: string
): boolean {
  const current = parseTime(currentTime);
  const start = parseTime(startTime);
  const end = parseTime(endTime);

  const currentMinutes = current.hours * 60 + current.minutes;
  const startMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export function getCurrentTime(): string {
  const now = new Date();
  return formatTime(now.getHours(), now.getMinutes());
}
