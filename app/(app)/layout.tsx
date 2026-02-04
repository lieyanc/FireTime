"use client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Home, Clock } from "lucide-react";
import { useUser } from "@/components/user-provider";
import { useClock } from "@/hooks/use-clock";
import Link from "next/link";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { currentUser } = useUser();
  const currentTime = useClock();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />

          {/* 返回主页 */}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <Home className="h-4 w-4 mr-1" />
              主页
            </Link>
          </Button>

          <div className="flex-1" />

          {/* 全局时间 */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono tabular-nums">{currentTime}</span>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* 当前用户名 */}
          {currentUser && (
            <span className="text-sm font-medium">{currentUser.name}</span>
          )}

          <Separator orientation="vertical" className="h-6" />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">切换主题</span>
          </Button>
        </header>
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
