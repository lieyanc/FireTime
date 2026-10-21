import { useUser } from "@/components/user-provider";
import { useDayData } from "@/hooks/use-day-data";
import { useGlobalTodos } from "@/hooks/use-global-todos";
import { getToday, formatDisplayDate } from "@/lib/dates";
import { TaskAssignment } from "@/components/task-assignment";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AssignPage() {
  const today = getToday();
  const { users, currentUserId } = useUser();
  const { dayData, isLoading: dayLoading } = useDayData(today, "user1");
  const { todos, isLoading: todosLoading, cycleTodoStatus, linkTodoToBlock } = useGlobalTodos();

  const user1 = users.find((u) => u.id === "user1") || { id: "user1" as const, name: "用户 1" };
  const user2 = users.find((u) => u.id === "user2") || { id: "user2" as const, name: "用户 2" };

  const isLoading = dayLoading || todosLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-[500px]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">任务分配</h1>
        <p className="text-muted-foreground">
          将待办任务分配到今日时间段 - {formatDisplayDate(today)}
        </p>
      </div>

      <Tabs defaultValue={currentUserId} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="user1">{user1.name}</TabsTrigger>
          <TabsTrigger value="user2">{user2.name}</TabsTrigger>
        </TabsList>

        <TabsContent value="user1" className="mt-4">
          <TaskAssignment
            userId="user1"
            userName={user1.name}
            todos={todos.user1}
            schedule={dayData?.user1?.schedule || []}
            onLinkTodo={(todoId, blockId) => linkTodoToBlock("user1", todoId, blockId)}
            onCycleTodoStatus={(todoId) => cycleTodoStatus("user1", todoId)}
          />
        </TabsContent>

        <TabsContent value="user2" className="mt-4">
          <TaskAssignment
            userId="user2"
            userName={user2.name}
            todos={todos.user2}
            schedule={dayData?.user2?.schedule || []}
            onLinkTodo={(todoId, blockId) => linkTodoToBlock("user2", todoId, blockId)}
            onCycleTodoStatus={(todoId) => cycleTodoStatus("user2", todoId)}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
