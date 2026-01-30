import useSWR from "swr";
import type { DailyTask, DailyCheckIn, DailyTaskList, UserId, UserDailyCheckIns } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useDailyTasks() {
  const { data, error, isLoading, mutate } = useSWR<DailyTaskList>(
    "/api/daily-tasks",
    fetcher
  );

  const tasks = data?.tasks || [];

  const updateTasks = async (newTasks: DailyTask[]) => {
    await fetch("/api/daily-tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tasks: newTasks }),
    });
    mutate();
  };

  const addTask = async (task: DailyTask) => {
    await updateTasks([...tasks, task]);
  };

  const removeTask = async (taskId: string) => {
    await updateTasks(tasks.filter((t) => t.id !== taskId));
  };

  const editTask = async (taskId: string, updates: Partial<DailyTask>) => {
    await updateTasks(
      tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
    );
  };

  return { tasks, isLoading, error, mutate, updateTasks, addTask, removeTask, editTask };
}

interface CheckInResponse {
  date: string;
  checkIns: UserDailyCheckIns;
  streaks: { user1: number; user2: number };
  tasks: DailyTask[];
}

export function useDailyCheckIns(date: string) {
  const { data, error, isLoading, mutate } = useSWR<CheckInResponse>(
    `/api/checkins/${date}`,
    fetcher
  );

  const checkIns = data?.checkIns || { user1: [], user2: [] };
  const streaks = data?.streaks || { user1: 0, user2: 0 };
  const tasks = data?.tasks || [];

  const updateCheckIns = async (newCheckIns: UserDailyCheckIns) => {
    await fetch(`/api/checkins/${date}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkIns: newCheckIns }),
    });
    mutate();
  };

  // 更新作业进度
  const updateHomeworkProgress = async (
    subjectId: string,
    homeworkId: string,
    addAmount: number
  ) => {
    // 获取当前设置
    const settingsRes = await fetch("/api/settings");
    const { settings } = await settingsRes.json();
    if (!settings) return;

    // 找到对应的作业并更新
    const newSubjects = settings.subjects.map((s: any) => {
      if (s.id === subjectId) {
        return {
          ...s,
          homework: s.homework.map((h: any) => {
            if (h.id === homeworkId) {
              const newCompleted = Math.min(h.totalPages, h.completedPages + addAmount);
              return { ...h, completedPages: newCompleted };
            }
            return h;
          }),
        };
      }
      return s;
    });

    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, subjects: newSubjects }),
    });
  };

  const toggleCheckIn = async (userId: UserId, taskId: string, amount?: number) => {
    const task = tasks.find((t) => t.id === taskId);
    const userCheckIns = [...checkIns[userId]];
    const existing = userCheckIns.findIndex((c) => c.taskId === taskId);

    if (existing >= 0) {
      // toggle off
      if (userCheckIns[existing].completed) {
        userCheckIns[existing] = { ...userCheckIns[existing], completed: false, amount: 0 };
      } else {
        const targetAmount = amount ?? task?.target ?? 0;
        userCheckIns[existing] = {
          ...userCheckIns[existing],
          completed: true,
          amount: targetAmount,
          completedAt: new Date().toISOString(),
        };
        // 同步作业进度
        if (task?.subjectId && task?.homeworkId) {
          await updateHomeworkProgress(task.subjectId, task.homeworkId, targetAmount);
        }
      }
    } else {
      const targetAmount = amount ?? task?.target ?? 0;
      userCheckIns.push({
        taskId,
        completed: true,
        amount: targetAmount,
        completedAt: new Date().toISOString(),
      });
      // 同步作业进度
      if (task?.subjectId && task?.homeworkId) {
        await updateHomeworkProgress(task.subjectId, task.homeworkId, targetAmount);
      }
    }

    await updateCheckIns({ ...checkIns, [userId]: userCheckIns });
  };

  const setCheckInAmount = async (userId: UserId, taskId: string, amount: number) => {
    const task = tasks.find((t) => t.id === taskId);
    const userCheckIns = [...checkIns[userId]];
    const existing = userCheckIns.findIndex((c) => c.taskId === taskId);
    const target = task?.target ?? 0;

    const previousAmount = existing >= 0 ? userCheckIns[existing].amount : 0;
    const wasCompleted = existing >= 0 ? userCheckIns[existing].completed : false;
    const isNowCompleted = amount >= target;

    if (existing >= 0) {
      userCheckIns[existing] = {
        ...userCheckIns[existing],
        amount,
        completed: isNowCompleted,
        completedAt: isNowCompleted ? new Date().toISOString() : undefined,
      };
    } else {
      userCheckIns.push({
        taskId,
        completed: isNowCompleted,
        amount,
        completedAt: isNowCompleted ? new Date().toISOString() : undefined,
      });
    }

    // 同步作业进度 - 只在首次完成时更新
    if (!wasCompleted && isNowCompleted && task?.subjectId && task?.homeworkId) {
      await updateHomeworkProgress(task.subjectId, task.homeworkId, amount);
    }

    await updateCheckIns({ ...checkIns, [userId]: userCheckIns });
  };

  return {
    checkIns,
    streaks,
    tasks,
    isLoading,
    error,
    mutate,
    toggleCheckIn,
    setCheckInAmount,
  };
}
