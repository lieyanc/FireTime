import { useState } from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2, Link2, ListTodo, Clock, Circle, Play, CheckCircle2, CalendarClock, User as UserIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { GlobalTodoItem, TimeBlock, User, UserId, TodoStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DualTodoListProps {
  user1: User;
  user2: User;
  currentUserId: UserId;
  todos1: GlobalTodoItem[];
  todos2: GlobalTodoItem[];
  schedule1?: TimeBlock[];
  schedule2?: TimeBlock[];
  onAddTodo: (userId: UserId, todo: GlobalTodoItem) => void;
  onCycleTodoStatus: (userId: UserId, todoId: string) => void;
  onDeleteTodo: (userId: UserId, todoId: string) => void;
}

const statusConfig: Record<TodoStatus, { icon: typeof Circle; color: string; label: string }> = {
  pending: { icon: Circle, color: "text-muted-foreground", label: "待做" },
  in_progress: { icon: Play, color: "text-blue-500", label: "进行中" },
  completed: { icon: CheckCircle2, color: "text-green-500", label: "完成" },
};

export function DualTodoList({
  user1,
  user2,
  currentUserId,
  todos1,
  todos2,
  schedule1 = [],
  schedule2 = [],
  onAddTodo,
  onCycleTodoStatus,
  onDeleteTodo,
}: DualTodoListProps) {
  const [newTodo1, setNewTodo1] = useState("");
  const [newTodo2, setNewTodo2] = useState("");
  const [deadline1, setDeadline1] = useState("");
  const [deadline2, setDeadline2] = useState("");

  const handleAddTodo = (
    targetUserId: UserId,
    title: string,
    setTitle: (v: string) => void,
    deadline: string,
    setDeadline: (v: string) => void
  ) => {
    if (!title.trim()) return;
    const todo: GlobalTodoItem = {
      id: nanoid(),
      title: title.trim(),
      status: "pending",
      createdAt: new Date().toISOString(),
      deadline: deadline || undefined,
      createdBy: targetUserId !== currentUserId ? currentUserId : undefined,
    };
    onAddTodo(targetUserId, todo);
    setTitle("");
    setDeadline("");
  };

  const getBlockLabel = (blockId: string | undefined, schedule: TimeBlock[]) => {
    if (!blockId) return null;
    return schedule.find((b) => b.id === blockId)?.label;
  };

  const getStatusCounts = (todos: GlobalTodoItem[]) => ({
    pending: todos.filter((t) => t.status === "pending").length,
    inProgress: todos.filter((t) => t.status === "in_progress").length,
    completed: todos.filter((t) => t.status === "completed").length,
    total: todos.length,
  });

  const formatDeadline = (deadline?: string) => {
    if (!deadline) return null;
    const d = new Date(deadline);
    const now = new Date();
    const diffHours = (d.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (diffHours < 0) return { text: "已过期", urgent: true };
    if (diffHours < 24) return { text: `${Math.ceil(diffHours)}h`, urgent: true };
    const days = Math.ceil(diffHours / 24);
    return { text: `${days}d`, urgent: days <= 2 };
  };

  const renderTodoList = (
    userId: UserId,
    todos: GlobalTodoItem[],
    schedule: TimeBlock[],
    newTodo: string,
    setNewTodo: (v: string) => void,
    deadline: string,
    setDeadline: (v: string) => void,
    otherUserName: string
  ) => {
    const sortedTodos = [...todos].sort((a, b) => {
      // 进行中 > 待做 > 完成
      const statusOrder = { in_progress: 0, pending: 1, completed: 2 };
      if (statusOrder[a.status] !== statusOrder[b.status]) {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      // 有DDL的优先
      if (a.deadline && !b.deadline) return -1;
      if (!a.deadline && b.deadline) return 1;
      if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return (
      <div className="flex flex-col h-full">
        {/* 添加输入框 */}
        <div className="p-2 border-b space-y-1">
          <div className="flex gap-1">
            <Input
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddTodo(userId, newTodo, setNewTodo, deadline, setDeadline)}
              placeholder="添加待办..."
              className="h-8 text-sm"
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button size="icon" variant="outline" className="h-8 w-8 shrink-0">
                  <CalendarClock className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="end">
                <Input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="text-sm"
                />
              </PopoverContent>
            </Popover>
            <Button
              size="icon"
              className="h-8 w-8 shrink-0"
              onClick={() => handleAddTodo(userId, newTodo, setNewTodo, deadline, setDeadline)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 待办列表 */}
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {sortedTodos.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                暂无待办
              </div>
            ) : (
              sortedTodos.map((todo) => {
                const StatusIcon = statusConfig[todo.status].icon;
                const deadlineInfo = formatDeadline(todo.deadline);
                const isFromOther = todo.createdBy && todo.createdBy !== userId;

                return (
                  <div
                    key={todo.id}
                    className={cn(
                      "flex items-start gap-2 p-2 rounded-md hover:bg-muted/50 group",
                      todo.status === "completed" && "opacity-50"
                    )}
                  >
                    <button
                      onClick={() => onCycleTodoStatus(userId, todo.id)}
                      className={cn("mt-0.5 transition-colors", statusConfig[todo.status].color)}
                    >
                      <StatusIcon className="h-4 w-4" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <span
                        className={cn(
                          "text-sm block",
                          todo.status === "completed" && "line-through text-muted-foreground"
                        )}
                      >
                        {todo.title}
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        {todo.linkedBlockId && (
                          <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                            <Link2 className="h-3 w-3" />
                            {getBlockLabel(todo.linkedBlockId, schedule)}
                          </span>
                        )}
                        {deadlineInfo && (
                          <span className={cn(
                            "text-xs flex items-center gap-0.5",
                            deadlineInfo.urgent ? "text-red-500" : "text-muted-foreground"
                          )}>
                            <Clock className="h-3 w-3" />
                            {deadlineInfo.text}
                          </span>
                        )}
                        {isFromOther && (
                          <span className="text-xs text-blue-500 flex items-center gap-0.5">
                            <UserIcon className="h-3 w-3" />
                            {otherUserName}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={() => onDeleteTodo(userId, todo.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    );
  };

  const counts1 = getStatusCounts(todos1);
  const counts2 = getStatusCounts(todos2);

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListTodo className="h-5 w-5" />
          待办事项
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="text-blue-500">{user1.name}: {counts1.completed}/{counts1.total}</span>
            <span className="text-green-500">{user2.name}: {counts2.completed}/{counts2.total}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-60px)]">
        <div className="grid grid-cols-2 h-full divide-x">
          {/* 用户1 */}
          <div className="flex flex-col h-full">
            <div className="px-2 py-1 border-b bg-muted/30 flex items-center justify-between">
              <span className="text-sm font-medium">{user1.name}</span>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">{counts1.pending}</span>
                <span className="text-blue-500">{counts1.inProgress}</span>
                <span className="text-green-500">{counts1.completed}</span>
              </div>
            </div>
            {renderTodoList("user1", todos1, schedule1, newTodo1, setNewTodo1, deadline1, setDeadline1, user2.name)}
          </div>

          {/* 用户2 */}
          <div className="flex flex-col h-full">
            <div className="px-2 py-1 border-b bg-muted/30 flex items-center justify-between">
              <span className="text-sm font-medium">{user2.name}</span>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground">{counts2.pending}</span>
                <span className="text-blue-500">{counts2.inProgress}</span>
                <span className="text-green-500">{counts2.completed}</span>
              </div>
            </div>
            {renderTodoList("user2", todos2, schedule2, newTodo2, setNewTodo2, deadline2, setDeadline2, user1.name)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
