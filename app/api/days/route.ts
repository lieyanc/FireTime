import { NextResponse } from "next/server";
import { getAllDayDates, getDayData } from "@/lib/store";

function isValidDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from") || undefined;
  const to = url.searchParams.get("to") || undefined;

  if (from && !isValidDate(from)) {
    return NextResponse.json({ error: "Invalid from date" }, { status: 400 });
  }
  if (to && !isValidDate(to)) {
    return NextResponse.json({ error: "Invalid to date" }, { status: 400 });
  }
  if (from && to && from > to) {
    return NextResponse.json({ error: "from must be <= to" }, { status: 400 });
  }

  let dates = getAllDayDates();
  if (from) dates = dates.filter((d) => d >= from);
  if (to) dates = dates.filter((d) => d <= to);

  const data = dates.map((date) => getDayData(date));
  return NextResponse.json({ data });
}
