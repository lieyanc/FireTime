import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link2, Clock, ListTodo, X, Circle, Play, CheckCircle2 } from "lucide-react";
import type { GlobalTodoItem, TimeBlock, UserId, TodoStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface TaskAssignmentProps {
  userId: UserId;
  userName: string;
  todos: GlobalTodoItem[];
  schedule: TimeBlock[];
  onLinkTodo: (todoId: string, blockId: string | undefined) => void;
  onCycleTodoStatus: (todoId: string) => void;
}

const statusConfig: Record<TodoStatus, { icon: typeof Circle; color: string }> = {
  pending: { icon: Circle, color: "text-muted-foreground" },
  in_progress: { icon: Play, color: "text-blue-500" },
  completed: { icon: CheckCircle2, color: "text-green-500" },
};

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    routine: "bg-blue-500/80 dark:bg-blue-600/70",
    meal: "bg-orange-500/80 dark:bg-orange-600/70",
    work: "bg-purple-500/80 dark:bg-purple-600/70",
    rest: "bg-green-500/80 dark:bg-green-600/70",
    free: "bg-yellow-500/80 dark:bg-yellow-600/70",
    sleep: "bg-indigo-500/80 dark:bg-indigo-600/70",
  };
  return colors[category] || "bg-gray-500/80 dark:bg-gray-600/70";
}

export function TaskAssignment({
  userId,
  userName,
  todos,
  schedule,
  onLinkTodo,
  onCycleTodoStatus,
}: TaskAssignmentProps) {
  const [selectedTodo, setSelectedTodo] = useState<string | null>(null);

  const sortedSchedule = [...schedule].sort((a, b) =>
    a.startTime.localeCompare(b.startTime)
  );

  const getBlockTodos = (blockId: string) =>
    todos.filter((t) => t.linkedBlockId === blockId);

  const unassignedTodos = todos.filter((t) => !t.linkedBlockId);

  const handleAssign = (blockId: string) => {
    if (selectedTodo) {
      onLinkTodo(selectedTodo, blockId);
      setSelectedTodo(null);
    }
  };

  const handleUnassign = (todoId: string) => {
    onLinkTodo(todoId, undefined);
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-5 w-5" />
          {userName} - 任务分配
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-[1fr_2fr] divide-x h-[500px]">
          {/* 左侧：未分配任务 */}
          <div className="flex flex-col">
            <div className="p-2 border-b bg-muted/30">
              <span className="text-sm font-medium flex items-center gap-1">
                <ListTodo className="h-4 w-4" />
                待分配任务
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-1">
                {unassignedTodos.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    所有任务已分配
                  </div>
                ) : (
                  unassignedTodos.map((todo) => {
                    const StatusIcon = statusConfig[todo.status].icon;
                    return (
                      <div
                        key={todo.id}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-all",
                          selectedTodo === todo.id
                            ? "bg-primary text-primary-foreground"
                            : "hover:bg-muted",
                          todo.status === "completed" && "opacity-50"
                        )}
                        onClick={() =>
                          setSelectedTodo(selectedTodo === todo.id ? null : todo.id)
                        }
                      >
                        <button
                          className={cn(
                            "transition-colors",
                            selectedTodo === todo.id ? "text-primary-foreground" : statusConfig[todo.status].color
                          )}
                          onClick={(e) => {
                            e.stopPropagation();
                            onCycleTodoStatus(todo.id);
                          }}
                        >
                          <StatusIcon className="h-4 w-4" />
                        </button>
                        <span
                          className={cn(
                            "text-sm flex-1",
                            todo.status === "completed" && "line-through"
                          )}
                        >
                          {todo.title}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
            {selectedTodo && (
              <div className="p-2 border-t bg-primary/10 text-sm">
                点击右侧时间段分配任务
              </div>
            )}
          </div>

          {/* 右侧：时间表和已分配任务 */}
          <div className="flex flex-col">
            <div className="p-2 border-b bg-muted/30">
              <span className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                时间表
              </span>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-2 space-y-2">
                {sortedSchedule.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-4">
                    暂无时间安排
                  </div>
                ) : (
                  sortedSchedule.map((block) => {
                    const blockTodos = getBlockTodos(block.id);
                    return (
                      <div
                        key={block.id}
                        className={cn(
                          "border rounded-lg overflow-hidden transition-all",
                          selectedTodo && "cursor-pointer hover:ring-2 hover:ring-primary"
                        )}
                        onClick={() => selectedTodo && handleAssign(block.id)}
                      >
                        <div
                          className={cn(
                            "p-2 text-white flex items-center gap-2",
                            getCategoryColor(block.category)
                          )}
                        >
                          <span className="text-xs opacity-80">
                            {block.startTime} - {block.endTime}
                          </span>
                          <span className="font-medium flex-1">{block.label}</span>
                          {blockTodos.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {blockTodos.length}
                            </Badge>
                          )}
                        </div>

                        {blockTodos.length > 0 && (
                          <div className="p-2 space-y-1 bg-muted/30">
                            {blockTodos.map((todo) => {
                              const StatusIcon = statusConfig[todo.status].icon;
                              return (
                                <div
                                  key={todo.id}
                                  className="flex items-center gap-2 text-sm group"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    className={cn("transition-colors", statusConfig[todo.status].color)}
                                    onClick={() => onCycleTodoStatus(todo.id)}
                                  >
                                    <StatusIcon className="h-4 w-4" />
                                  </button>
                                  <span
                                    className={cn(
                                      "flex-1",
                                      todo.status === "completed" && "line-through text-muted-foreground"
                                    )}
                                  >
                                    {todo.title}
                                  </span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                    onClick={() => handleUnassign(todo.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
