import { createBrowserRouter, Navigate } from "react-router";
import AppLayout from "@/components/app-layout";
import AssignPage from "@/pages/assign";
import CalendarPage from "@/pages/calendar";
import CheckInPage from "@/pages/checkin";
import ClockPage from "@/pages/clock";
import DashboardPage from "@/pages/dashboard";
import DayPage from "@/pages/day";
import TodayPage from "@/pages/day-redirect";
import LoginPage from "@/pages/login";
import PKPage from "@/pages/pk";
import SettingsPage from "@/pages/settings";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "day", element: <TodayPage /> },
      { path: "day/:date", element: <DayPage /> },
      { path: "calendar", element: <CalendarPage /> },
      { path: "checkin", element: <CheckInPage /> },
      { path: "assign", element: <AssignPage /> },
      { path: "pk", element: <PKPage /> },
      { path: "clock", element: <ClockPage /> },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <Navigate to="/dashboard" replace /> },
    ],
  },
]);
