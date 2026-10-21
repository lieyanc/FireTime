import { Navigate } from "react-router";
import { getToday } from "@/lib/dates";

export default function TodayPage() {
  return <Navigate to={`/day/${getToday()}`} replace />;
}
