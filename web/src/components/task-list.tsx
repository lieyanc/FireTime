import { useState } from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2, ListTodo, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { Task, TaskPriority, TimeBlock } from "@/lib/types";
import { cn } from "@/lib/utils";

const priorityConfig: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: "高", color: "bg-red-500" },
  medium: { label: "中", color: "bg-yellow-500" },
  low: { label: "低", color: "bg-green-500" },
};

interface TaskListProps {
  tasks: Task[];
  schedule: TimeBlock[];
  onUpdate: (tasks: Task[]) => void;
}

export function TaskList({ tasks, schedule, onUpdate }: TaskListProps) {
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("medium");
  const [linkedBlockId, setLinkedBlockId] = useState<string>("none");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const newTask: Task = {
      id: nanoid(),
      title: newTitle.trim(),
      completed: false,
      priority: newPriority,
      linkedBlockId: linkedBlockId === "none" ? undefined : linkedBlockId,
    };

    onUpdate([...tasks, newTask]);
    setNewTitle("");
    setLinkedBlockId("none");
  };

  const handleToggle = (id: string) => {
    onUpdate(
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
  };

  const handleDelete = (id: string) => {
    onUpdate(tasks.filter((t) => t.id !== id));
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  // Sort: incomplete first, then by priority
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const getBlockLabel = (blockId?: string) => {
    if (!blockId) return null;
    const block = schedule.find((b) => b.id === blockId);
    return block?.label;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ListTodo className="h-5 w-5" />
          任务列表
        </h3>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{tasks.length} 已完成 ({Math.round(progress)}%)
        </span>
      </div>

      <form onSubmit={handleAdd} className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="添加新任务..."
          className="flex-1"
        />
        <Select
          value={newPriority}
          onValueChange={(v) => setNewPriority(v as TaskPriority)}
        >
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.entries(priorityConfig) as [TaskPriority, typeof priorityConfig.high][]).map(
              ([value, config]) => (
                <SelectItem key={value} value={value}>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-2 h-2 rounded-full", config.color)} />
                    {config.label}
                  </div>
                </SelectItem>
              )
            )}
          </SelectContent>
        </Select>
        {schedule.length > 0 && (
          <Select value={linkedBlockId} onValueChange={setLinkedBlockId}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="关联时间段" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">无</SelectItem>
              {schedule.map((block) => (
                <SelectItem key={block.id} value={block.id}>
                  {block.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button type="submit" size="icon">
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      <div className="space-y-2">
        {sortedTasks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            暂无任务
          </div>
        ) : (
          sortedTasks.map((task) => (
            <Card
              key={task.id}
              className={cn(
                "transition-all",
                task.completed && "opacity-60"
              )}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => handleToggle(task.id)}
                />
                <div className="flex-1 min-w-0">
                  <span
                    className={cn(
                      "block",
                      task.completed && "line-through text-muted-foreground"
                    )}
                  >
                    {task.title}
                  </span>
                  {task.linkedBlockId && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      {getBlockLabel(task.linkedBlockId)}
                    </span>
                  )}
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs",
                    priorityConfig[task.priority].color,
                    "text-white border-0"
                  )}
                >
                  {priorityConfig[task.priority].label}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleDelete(task.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
