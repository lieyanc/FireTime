"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  ClipboardCheck,
  Link2,
  Calendar,
  Clock,
  Swords,
  Settings,
  PanelLeftIcon,
  UserRound,
  ArrowLeftRight,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUser } from "@/components/user-provider";

// Constants
const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED_WIDTH = 48;
const SIDEBAR_COOKIE_NAME = "sidebar_state";
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

// Navigation items
const navItems = [
  { title: "仪表盘", icon: LayoutDashboard, href: "/dashboard" },
  { title: "今日", icon: CalendarDays, href: "/day" },
  { title: "每日打卡", icon: ClipboardCheck, href: "/checkin" },
  { title: "任务分配", icon: Link2, href: "/assign" },
  { title: "月历", icon: Calendar, href: "/calendar" },
  { title: "时钟", icon: Clock, href: "/clock" },
  { title: "PK", icon: Swords, href: "/pk" },
  { title: "设置", icon: Settings, href: "/settings" },
];

// Context
type SidebarContextValue = {
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  toggle: () => void;
  isMobile: boolean;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return context;
}

// Provider
export function SidebarProvider({
  children,
  defaultExpanded = true,
}: {
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const isMobile = useIsMobile();
  const [expanded, setExpandedState] = React.useState(defaultExpanded);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const setExpanded = React.useCallback((value: boolean) => {
    setExpandedState(value);
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${value}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  }, []);

  const toggle = React.useCallback(() => {
    if (isMobile) {
      setMobileOpen((prev) => !prev);
    } else {
      setExpanded(!expanded);
    }
  }, [isMobile, expanded, setExpanded]);

  // Keyboard shortcut (Cmd/Ctrl + B)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "b" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggle]);

  const value = React.useMemo(
    () => ({
      expanded,
      setExpanded,
      toggle,
      isMobile,
      mobileOpen,
      setMobileOpen,
    }),
    [expanded, setExpanded, toggle, isMobile, mobileOpen]
  );

  return (
    <SidebarContext.Provider value={value}>
      <TooltipProvider delayDuration={0}>
        <div className="flex min-h-screen w-full">{children}</div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

// Sidebar Trigger Button (only for mobile header)
export function SidebarTrigger({ className }: { className?: string }) {
  const { toggle, isMobile } = useSidebar();

  // Only render on mobile - desktop has toggle in sidebar header
  if (!isMobile) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)}
      onClick={toggle}
    >
      <PanelLeftIcon className="h-4 w-4" />
      <span className="sr-only">切换侧边栏</span>
    </Button>
  );
}

// Header brand - shows "FireTime" when sidebar is collapsed
export function SidebarHeaderBrand() {
  const { expanded, isMobile } = useSidebar();

  // Only show when desktop and collapsed
  if (isMobile || expanded) return null;

  return (
    <Link href="/dashboard" className="font-bold text-sm hover:text-foreground/80 transition-colors">
      FireTime
    </Link>
  );
}

// Sidebar Inset (main content wrapper)
export function SidebarInset({ children }: { children: React.ReactNode }) {
  const { expanded, isMobile } = useSidebar();

  return (
    <div
      className="flex flex-1 flex-col transition-[margin] duration-300 ease-in-out"
      style={{
        marginLeft: isMobile ? 0 : expanded ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
      }}
    >
      {children}
    </div>
  );
}

// Sidebar Navigation Content
function SidebarNav({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const { currentUser, otherUser, setCurrentUserId, currentUserId } = useUser();
  const { expanded, isMobile, toggle } = useSidebar();

  const isCollapsed = !isMobile && !expanded;

  const switchUser = () => {
    setCurrentUserId(currentUserId === "user1" ? "user2" : "user1");
  };

  // Helper to wrap element in Tooltip when collapsed
  const withTooltip = (element: React.ReactElement, label: string) => {
    if (!isCollapsed) return element;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{element}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={8}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <nav className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Header - h-14 aligns with top header bar */}
      <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border justify-center">
        {withTooltip(
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggle}
          >
            <PanelLeftIcon className="h-4 w-4" />
            <span className="sr-only">切换侧边栏</span>
          </Button>,
          "展开侧边栏"
        )}
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-2">
        <ul className="flex flex-col gap-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/day" && pathname.startsWith("/day/"));

            const link = (
              <Link
                href={item.href}
                onClick={onNavClick}
                className={cn(
                  "flex h-10 items-center text-sm font-medium transition-colors duration-200 mx-1 rounded-lg",
                  "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                  isCollapsed ? "justify-center px-0" : "px-3 gap-3"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && (
                  <span className="truncate">{item.title}</span>
                )}
              </Link>
            );

            return <li key={item.href}>{withTooltip(link, item.title)}</li>;
          })}
        </ul>
      </div>

      {/* Separator */}
      <div className="mx-2 h-px bg-sidebar-border" />

      {/* Footer: User Switcher */}
      <div className="shrink-0 py-2">
        {withTooltip(
          <button
            onClick={switchUser}
            className={cn(
              "flex h-12 w-full items-center text-sm font-medium transition-colors duration-200 mx-1 rounded-lg",
              "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
              isCollapsed ? "justify-center px-0 w-auto" : "px-3 gap-3"
            )}
            style={{ width: isCollapsed ? "calc(100% - 8px)" : "calc(100% - 8px)" }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <UserRound className="h-4 w-4" />
            </span>
            {!isCollapsed && (
              <span className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate text-sm font-medium">
                    {currentUser?.name || "加载中..."}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    切换到 {otherUser?.name || "..."}
                  </span>
                </span>
                <ArrowLeftRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </span>
            )}
          </button>,
          `切换到 ${otherUser?.name || "..."}`
        )}
      </div>
    </nav>
  );
}

// Main Sidebar Component
export function AppSidebar() {
  const { expanded, isMobile, mobileOpen, setMobileOpen } = useSidebar();

  // Mobile: Sheet drawer
  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0" showCloseButton={false}>
          <SheetHeader className="sr-only">
            <SheetTitle>导航菜单</SheetTitle>
            <SheetDescription>应用导航菜单</SheetDescription>
          </SheetHeader>
          <SidebarNav onNavClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Fixed sidebar
  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 border-r bg-sidebar text-sidebar-foreground transition-[width] duration-300 ease-in-out"
      style={{ width: expanded ? SIDEBAR_WIDTH : SIDEBAR_COLLAPSED_WIDTH }}
    >
      <SidebarNav />
    </aside>
  );
}
