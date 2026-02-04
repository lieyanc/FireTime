"use client";

import { useState } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, Sun, Home, Flame, Edit3, Check, X, User as UserIcon } from "lucide-react";
import { useUser } from "@/components/user-provider";
import { useSettings } from "@/hooks/use-settings";
import { useClock } from "@/hooks/use-clock";
import Link from "next/link";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useTheme();
  const { currentUser } = useUser();
  const currentTime = useClock();
  const { settings, updateSettings } = useSettings();
  const [editingMotto, setEditingMotto] = useState(false);
  const [mottoValue, setMottoValue] = useState("");

  const handleEditMotto = () => {
    setMottoValue(settings?.motto || "");
    setEditingMotto(true);
  };

  const handleSaveMotto = async () => {
    if (settings) {
      await updateSettings({ ...settings, motto: mottoValue });
    }
    setEditingMotto(false);
  };

  const handleCancelMotto = () => {
    setEditingMotto(false);
    setMottoValue("");
  };

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

          {/* 中间区域: FireTime + 时间 + 格言 */}
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="font-bold text-lg">FireTime</span>
              <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
                {currentTime}
              </span>
            </div>
            <Popover open={editingMotto} onOpenChange={(open) => !open && handleCancelMotto()}>
              <PopoverTrigger asChild>
                <button
                  onClick={handleEditMotto}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group"
                >
                  {settings?.motto || "点击设置格言"}
                  <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-2">
                  <label className="text-sm font-medium">设置格言</label>
                  <Input
                    value={mottoValue}
                    onChange={(e) => setMottoValue(e.target.value)}
                    placeholder="输入你的格言..."
                    onKeyDown={(e) => e.key === "Enter" && handleSaveMotto()}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" onClick={handleCancelMotto}>
                      <X className="h-3 w-3 mr-1" />
                      取消
                    </Button>
                    <Button size="sm" onClick={handleSaveMotto}>
                      <Check className="h-3 w-3 mr-1" />
                      保存
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex-1" />

          {/* 右侧: 用户头像和名字 */}
          {currentUser && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
                {currentUser.avatar ? (
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <UserIcon className="w-4 h-4 text-muted-foreground" />
                )}
              </div>
              <span className="text-sm font-medium">{currentUser.name}</span>
            </div>
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
