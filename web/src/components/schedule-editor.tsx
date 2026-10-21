import { useState } from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2, Clock, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TimeBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

const categories = [
  { value: "routine", label: "日常", color: "bg-blue-500" },
  { value: "meal", label: "用餐", color: "bg-orange-500" },
  { value: "work", label: "学习/工作", color: "bg-purple-500" },
  { value: "rest", label: "休息", color: "bg-green-500" },
  { value: "free", label: "自由时间", color: "bg-yellow-500" },
  { value: "sleep", label: "睡眠", color: "bg-indigo-500" },
  { value: "other", label: "其他", color: "bg-gray-500" },
];

function getCategoryColor(category: string): string {
  return categories.find((c) => c.value === category)?.color || "bg-gray-500";
}

function getCategoryLabel(category: string): string {
  return categories.find((c) => c.value === category)?.label || category;
}

interface ScheduleEditorProps {
  schedule: TimeBlock[];
  onUpdate: (schedule: TimeBlock[]) => void;
  currentBlockId?: string;
}

export function ScheduleEditor({
  schedule,
  onUpdate,
  currentBlockId,
}: ScheduleEditorProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editBlock, setEditBlock] = useState<TimeBlock | null>(null);

  const sortedSchedule = [...schedule].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  const handleAdd = (block: Omit<TimeBlock, "id">) => {
    const newBlock: TimeBlock = { ...block, id: nanoid() };
    onUpdate([...schedule, newBlock]);
    setIsAddOpen(false);
  };

  const handleEdit = (block: TimeBlock) => {
    onUpdate(schedule.map((b) => (b.id === block.id ? block : b)));
    setEditBlock(null);
  };

  const handleDelete = (id: string) => {
    onUpdate(schedule.filter((b) => b.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Clock className="h-5 w-5" />
          时间表
        </h3>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline">
              <Plus className="h-4 w-4 mr-1" />
              添加时间段
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>添加时间段</DialogTitle>
            </DialogHeader>
            <BlockForm onSubmit={handleAdd} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {sortedSchedule.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无时间段安排
          </div>
        ) : (
          sortedSchedule.map((block) => (
            <Card
              key={block.id}
              className={cn(
                "transition-all",
                currentBlockId === block.id && "ring-2 ring-primary"
              )}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div
                  className={cn(
                    "w-1 h-12 rounded-full",
                    getCategoryColor(block.category)
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{block.label}</span>
                    {currentBlockId === block.id && (
                      <Badge variant="default" className="text-xs">
                        当前
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>
                      {block.startTime} - {block.endTime}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {getCategoryLabel(block.category)}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Dialog
                    open={editBlock?.id === block.id}
                    onOpenChange={(open) => !open && setEditBlock(null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => setEditBlock(block)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>编辑时间段</DialogTitle>
                      </DialogHeader>
                      <BlockForm
                        initialData={block}
                        onSubmit={(data) =>
                          handleEdit({ ...data, id: block.id })
                        }
                      />
                    </DialogContent>
                  </Dialog>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(block.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

interface BlockFormProps {
  initialData?: TimeBlock;
  onSubmit: (block: Omit<TimeBlock, "id">) => void;
}

function BlockForm({ initialData, onSubmit }: BlockFormProps) {
  const [label, setLabel] = useState(initialData?.label || "");
  const [startTime, setStartTime] = useState(initialData?.startTime || "09:00");
  const [endTime, setEndTime] = useState(initialData?.endTime || "10:00");
  const [category, setCategory] = useState(initialData?.category || "work");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!label.trim()) return;
    onSubmit({ label, startTime, endTime, category });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="label">名称</Label>
        <Input
          id="label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="时间段名称"
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startTime">开始时间</Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="endTime">结束时间</Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">分类</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full", cat.color)} />
                  {cat.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full">
        {initialData ? "保存" : "添加"}
      </Button>
    </form>
  );
}
