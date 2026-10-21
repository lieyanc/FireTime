import useSWR from "swr";
import type { GlobalTodoList, GlobalTodoItem, UserId, TodoStatus } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useGlobalTodos() {
  const { data, error, isLoading, mutate } = useSWR<{ todos: GlobalTodoList }>(
    "/api/todos",
    fetcher
  );

  const todos = data?.todos || { user1: [], user2: [] };

  const updateTodos = async (newTodos: GlobalTodoList) => {
    await fetch("/api/todos", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newTodos),
    });
    mutate();
  };

  const addTodo = async (userId: UserId, todo: GlobalTodoItem) => {
    const newTodos = {
      ...todos,
      [userId]: [...todos[userId], todo],
    };
    await updateTodos(newTodos);
  };

  const setTodoStatus = async (userId: UserId, todoId: string, status: TodoStatus) => {
    const newTodos = {
      ...todos,
      [userId]: todos[userId].map((t) =>
        t.id === todoId ? { ...t, status } : t
      ),
    };
    await updateTodos(newTodos);
  };

  const cycleTodoStatus = async (userId: UserId, todoId: string) => {
    const todo = todos[userId].find((t) => t.id === todoId);
    if (!todo) return;

    // pending -> in_progress -> completed -> pending
    const nextStatus: Record<TodoStatus, TodoStatus> = {
      pending: "in_progress",
      in_progress: "completed",
      completed: "pending",
    };
    await setTodoStatus(userId, todoId, nextStatus[todo.status]);
  };

  const deleteTodo = async (userId: UserId, todoId: string) => {
    const newTodos = {
      ...todos,
      [userId]: todos[userId].filter((t) => t.id !== todoId),
    };
    await updateTodos(newTodos);
  };

  const linkTodoToBlock = async (userId: UserId, todoId: string, blockId: string | undefined) => {
    const newTodos = {
      ...todos,
      [userId]: todos[userId].map((t) =>
        t.id === todoId ? { ...t, linkedBlockId: blockId } : t
      ),
    };
    await updateTodos(newTodos);
  };

  return {
    todos,
    isLoading,
    error,
    mutate,
    updateTodos,
    addTodo,
    setTodoStatus,
    cycleTodoStatus,
    deleteTodo,
    linkTodoToBlock,
  };
}
