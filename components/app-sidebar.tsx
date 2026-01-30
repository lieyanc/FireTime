"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  Clock,
  Swords,
  Settings,
  UserRound,
  ArrowLeftRight,
  Link2,
  ClipboardCheck,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { useUser } from "@/components/user-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getToday } from "@/lib/dates";

export function AppSidebar() {
  const pathname = usePathname();
  const { currentUser, otherUser, setCurrentUserId, currentUserId } = useUser();
  const [today, setToday] = useState<string | null>(null);

  // 只在客户端获取今天的日期，避免hydration mismatch
  useEffect(() => {
    setToday(getToday());
  }, []);

  const switchUser = () => {
    setCurrentUserId(currentUserId === "user1" ? "user2" : "user1");
  };

  const navItems = [
    { title: "仪表盘", icon: LayoutDashboard, href: "/dashboard" },
    { title: "今日", icon: CalendarDays, href: today ? `/day/${today}` : "/dashboard" },
    { title: "每日打卡", icon: ClipboardCheck, href: "/checkin" },
    { title: "任务分配", icon: Link2, href: "/assign" },
    { title: "月历", icon: CalendarDays, href: "/calendar" },
    { title: "时钟", icon: Clock, href: "/clock" },
    { title: "PK", icon: Swords, href: "/pk" },
    { title: "设置", icon: Settings, href: "/settings" },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1">
          <Clock className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold">FireTime</span>
        </div>
      </SidebarHeader>
      <SidebarSeparator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.href ||
                      (item.title === "今日" && pathname.startsWith("/day/"))
                    }
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <button
          onClick={switchUser}
          className="flex w-full items-center gap-3 rounded-md px-2 py-2 hover:bg-sidebar-accent transition-colors"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              <UserRound className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col items-start text-sm">
            <span className="font-medium">{currentUser?.name || "加载中..."}</span>
            <span className="text-xs text-muted-foreground">
              切换到 {otherUser?.name || "..."}
            </span>
          </div>
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
