"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Clock, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import type { TimeBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

interface CompactTimelineProps {
  schedule: TimeBlock[];
  onUpdate: (schedule: TimeBlock[]) => void;
  currentBlockId?: string;
}

const CATEGORIES = [
  { value: "routine", label: "日常", color: "bg-blue-500/80 dark:bg-blue-600/70" },
  { value: "meal", label: "用餐", color: "bg-orange-500/80 dark:bg-orange-600/70" },
  { value: "work", label: "工作", color: "bg-purple-500/80 dark:bg-purple-600/70" },
  { value: "rest", label: "休息", color: "bg-green-500/80 dark:bg-green-600/70" },
  { value: "free", label: "自由", color: "bg-yellow-500/80 dark:bg-yellow-600/70" },
  { value: "sleep", label: "睡眠", color: "bg-indigo-500/80 dark:bg-indigo-600/70" },
];

function getCategoryColor(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.color || "bg-gray-500/80";
}

function getMinutesFromMidnight(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// 时间选择器组件 - 使用滑块
function TimeRangeSelector({
  startTime,
  endTime,
  onStartChange,
  onEndChange,
}: {
  startTime: string;
  endTime: string;
  onStartChange: (time: string) => void;
  onEndChange: (time: string) => void;
}) {
  const [draftStartMinutes, setDraftStartMinutes] = useState(() =>
    getMinutesFromMidnight(startTime)
  );
  const [draftEndMinutes, setDraftEndMinutes] = useState(() =>
    getMinutesFromMidnight(endTime)
  );

  return (
    <div className="space-y-3 p-1">
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">开始</span>
          <span className="font-mono font-medium">
            {minutesToTime(draftStartMinutes)}
          </span>
        </div>
        <Slider
          value={[draftStartMinutes]}
          min={0}
          max={1439}
          step={15}
          onValueChange={([v]) => setDraftStartMinutes(v)}
          onValueCommit={([v]) => onStartChange(minutesToTime(v))}
          className="w-full"
        />
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">结束</span>
          <span className="font-mono font-medium">
            {minutesToTime(draftEndMinutes)}
          </span>
        </div>
        <Slider
          value={[draftEndMinutes]}
          min={0}
          max={1439}
          step={15}
          onValueChange={([v]) => setDraftEndMinutes(v)}
          onValueCommit={([v]) => onEndChange(minutesToTime(v))}
          className="w-full"
        />
      </div>
      {/* 快捷时长按钮 */}
      <div className="flex gap-1 pt-1">
        {[30, 60, 90, 120].map((mins) => (
          <Button
            key={mins}
            size="sm"
            variant="outline"
            className="flex-1 h-6 text-xs"
            onClick={() => {
              const nextEnd = Math.min(draftStartMinutes + mins, 1439);
              setDraftEndMinutes(nextEnd);
              onEndChange(minutesToTime(nextEnd));
            }}
          >
            {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function CompactTimeline({
  schedule,
  onUpdate,
  currentBlockId,
}: CompactTimelineProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editCategory, setEditCategory] = useState("");

  const sortedSchedule = [...schedule].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  const handleAddBlock = () => {
    const lastBlock = sortedSchedule[sortedSchedule.length - 1];
    const newStart = lastBlock ? lastBlock.endTime : "09:00";
    const startMinutes = getMinutesFromMidnight(newStart);
    const newEnd = minutesToTime(Math.min(startMinutes + 60, 1439));

    const newBlock: TimeBlock = {
      id: nanoid(),
      startTime: newStart,
      endTime: newEnd,
      label: "新时间段",
      category: "work",
    };
    onUpdate([...schedule, newBlock]);
  };

  const handleUpdateBlock = (id: string, field: keyof TimeBlock, value: string) => {
    onUpdate(
      schedule.map((block) =>
        block.id === id ? { ...block, [field]: value } : block
      )
    );
  };

  const handleDeleteBlock = (id: string) => {
    onUpdate(schedule.filter((block) => block.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const startEditing = (block: TimeBlock) => {
    setEditingId(block.id);
    setEditLabel(block.label);
    setEditCategory(block.category);
  };

  const saveEditing = () => {
    if (editingId) {
      onUpdate(
        schedule.map((block) =>
          block.id === editingId
            ? { ...block, label: editLabel, category: editCategory }
            : block
        )
      );
      setEditingId(null);
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  // 计算总时长
  const totalMinutes = sortedSchedule.reduce((acc, block) => {
    const start = getMinutesFromMidnight(block.startTime);
    const end = getMinutesFromMidnight(block.endTime);
    return acc + (end - start);
  }, 0);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}分钟`;
    if (mins === 0) return `${hours}小时`;
    return `${hours}h${mins}m`;
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            时间轴管理
          </span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-normal text-muted-foreground">
              共 {formatDuration(totalMinutes)}
            </span>
            <Button size="sm" onClick={handleAddBlock}>
              <Plus className="h-4 w-4 mr-1" />
              添加
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        {sortedSchedule.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无时间安排，点击添加开始规划
          </div>
        ) : (
          <div className="space-y-1">
            {sortedSchedule.map((block) => {
              const duration = getMinutesFromMidnight(block.endTime) - getMinutesFromMidnight(block.startTime);
              const isEditing = editingId === block.id;
              const isCurrent = currentBlockId === block.id;

              return (
                <div
                  key={block.id}
                  className={cn(
                    "group flex items-center gap-1.5 rounded-md transition-all p-1",
                    isCurrent && "ring-2 ring-red-500 ring-offset-1",
                    isEditing && "bg-muted"
                  )}
                >
                  {/* 颜色条 */}
                  <div
                    className={cn(
                      "w-1.5 h-8 rounded shrink-0",
                      getCategoryColor(block.category)
                    )}
                  />

                  {/* 时间选择器 - Popover */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <button className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0 w-24 text-left font-mono">
                        {block.startTime}-{block.endTime}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56" align="start">
                      <TimeRangeSelector
                        startTime={block.startTime}
                        endTime={block.endTime}
                        onStartChange={(t) => handleUpdateBlock(block.id, "startTime", t)}
                        onEndChange={(t) => handleUpdateBlock(block.id, "endTime", t)}
                      />
                    </PopoverContent>
                  </Popover>

                  {/* 标签和类别 */}
                  <div className="flex-1 flex items-center gap-2 min-w-0">
                    {isEditing ? (
                      <>
                        <Input
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="h-7 text-sm flex-1"
                          placeholder="活动名称"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveEditing();
                            if (e.key === "Escape") cancelEditing();
                          }}
                        />
                        <Select value={editCategory} onValueChange={setEditCategory}>
                          <SelectTrigger className="h-7 w-16 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                <span className="flex items-center gap-1.5">
                                  <span className={cn("w-2 h-2 rounded-full", cat.color)} />
                                  {cat.label}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={saveEditing}>
                          <Check className="h-3.5 w-3.5 text-green-500" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEditing}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <span
                          className="text-sm font-medium truncate flex-1 cursor-pointer hover:text-primary"
                          onClick={() => startEditing(block)}
                        >
                          {block.label}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDuration(duration)}
                        </span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100"
                          onClick={() => startEditing(block)}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteBlock(block.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 类别图例 */}
        <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t">
          {CATEGORIES.map((cat) => (
            <div key={cat.value} className="flex items-center gap-1 text-xs">
              <div className={cn("w-2.5 h-2.5 rounded-sm", cat.color)} />
              <span className="text-muted-foreground">{cat.label}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
