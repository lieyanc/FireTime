"use client";

import { useState, useEffect, useCallback } from "react";
import { SidebarProvider, SidebarInset, SidebarTrigger, SidebarHeaderBrand, useSidebar, AppSidebar } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Moon, Sun, Edit3, Check, X, User as UserIcon, Github, Server, Maximize, Minimize, Clock } from "lucide-react";
import { useUser } from "@/components/user-provider";
import { useSettings } from "@/hooks/use-settings";
import { useClock } from "@/hooks/use-clock";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// 构建信息
const BUILD_INFO = {
  commitId: process.env.NEXT_PUBLIC_COMMIT_ID || "dev",
  buildId: process.env.NEXT_PUBLIC_BUILD_ID || "local",
  buildTime: process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString(),
};

function HeaderContent() {
  const { theme, setTheme } = useTheme();
  const { currentUser } = useUser();
  const currentTime = useClock();
  const { settings, updateSettings } = useSettings();
  const { setExpanded } = useSidebar();
  const [editingMotto, setEditingMotto] = useState(false);
  const [mottoValue, setMottoValue] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [serverTime, setServerTime] = useState<string>("");

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // 退出全屏时恢复侧边栏
      if (!document.fullscreenElement) {
        setExpanded(true);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [setExpanded]);

  // 获取服务器时间
  useEffect(() => {
    const updateServerTime = () => {
      const now = new Date();
      setServerTime(now.toLocaleTimeString("zh-CN", { hour12: false }));
    };
    updateServerTime();
    const interval = setInterval(updateServerTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        // 进入全屏
        await document.documentElement.requestFullscreen();
        setExpanded(false);
      } else {
        // 退出全屏
        await document.exitFullscreen();
        setExpanded(true);
      }
    } catch (err) {
      console.error("Fullscreen error:", err);
    }
  }, [setExpanded]);

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

  // 格式化构建时间
  const formatBuildTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "unknown";
    }
  };

  return (
    <header className="relative flex h-14 items-center gap-2 border-b px-4">
      {/* Mobile only: sidebar trigger */}
      <SidebarTrigger />

      {/* Shows "FireTime" when sidebar is collapsed on desktop */}
      <SidebarHeaderBrand />

      {/* 左侧: 构建信息 */}
      <div className="flex flex-col text-xs text-muted-foreground">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="https://github.com/lieyanc/FireTime"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Github className="h-3.5 w-3.5" />
                <span className="font-mono">{BUILD_INFO.commitId}</span>
                {BUILD_INFO.buildId !== "local" && (
                  <span className="font-mono">#{BUILD_INFO.buildId}</span>
                )}
              </a>
            </TooltipTrigger>
            <TooltipContent>
              <p>查看 GitHub 仓库</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <div className="flex items-center gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Server className="h-3 w-3" />
                  <span className="font-mono">{formatBuildTime(BUILD_INFO.buildTime)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>构建时间</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="font-mono">{serverTime}</span>
          </div>
        </div>
      </div>

      {/* 中间: 时间钉死在屏幕中央 */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
        <span className="font-mono text-2xl font-semibold tabular-nums tracking-tight">
          {currentTime}
        </span>
      </div>

      <div className="flex-1" />

      {/* 右侧: 格言 + 用户 + 全屏 + 主题 */}
      <div className="flex items-center gap-3">
        {/* 格言 */}
        <Popover open={editingMotto} onOpenChange={(open) => !open && handleCancelMotto()}>
          <PopoverTrigger asChild>
            <button
              onClick={handleEditMotto}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 group max-w-48 truncate"
            >
              <span className="truncate">{settings?.motto || "点击设置格言"}</span>
              <Edit3 className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
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

        <Separator orientation="vertical" className="h-6" />

        {/* 用户头像和名字 */}
        {currentUser && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
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

        {/* 全屏按钮 */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
                <span className="sr-only">{isFullscreen ? "退出全屏" : "进入全屏"}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{isFullscreen ? "退出全屏" : "进入全屏"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">切换主题</span>
        </Button>
      </div>
    </header>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <HeaderContent />
        <main className="flex-1 overflow-auto p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
