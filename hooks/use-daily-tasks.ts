import useSWR from "swr";
import type {
  AppSettings,
  DailyTask,
  DailyCheckIn,
  DailyTaskList,
  UserId,
  UserDailyCheckIns,
  HomeworkProgressEntry,
  UserHomeworkProgress,
} from "@/lib/types";

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
  homeworkProgress?: UserHomeworkProgress;
  streaks: { user1: number; user2: number };
  tasks: DailyTask[];
}

export function useDailyCheckIns(date: string) {
  const { data, error, isLoading, mutate } = useSWR<CheckInResponse>(
    `/api/checkins/${date}`,
    fetcher
  );

  const checkIns = data?.checkIns || { user1: [], user2: [] };
  const homeworkProgress = data?.homeworkProgress || { user1: [], user2: [] };
  const streaks = data?.streaks || { user1: 0, user2: 0 };
  const tasks = data?.tasks || [];

  // 更新打卡数据（包含作业进度记录）
  const updateCheckInsWithProgress = async (
    newCheckIns: UserDailyCheckIns,
    newProgress?: UserHomeworkProgress
  ) => {
    await fetch(`/api/checkins/${date}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checkIns: newCheckIns,
        homeworkProgress: newProgress || homeworkProgress,
      }),
    });
    mutate();
  };

  // 更新作业总进度（增减量）- 按用户
  const adjustHomeworkProgress = async (
    subjectId: string,
    homeworkId: string,
    delta: number, // 正数增加，负数减少
    userId: UserId
  ) => {
    if (delta === 0) return;

    const settingsRes = await fetch("/api/settings");
    const { settings } = (await settingsRes.json()) as { settings?: AppSettings };
    if (!settings) return;

    const newSubjects = settings.subjects.map((subject) => {
      if (subject.id !== subjectId) return subject;
      return {
        ...subject,
        homework: subject.homework.map((homework) => {
          if (homework.id !== homeworkId) return homework;
          const currentValue = homework.completedPages[userId] || 0;
          const newValue = Math.max(
            0,
            Math.min(homework.totalPages, currentValue + delta)
          );
          return {
            ...homework,
            completedPages: { ...homework.completedPages, [userId]: newValue },
          };
        }),
      };
    });

    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...settings, subjects: newSubjects }),
    });
  };

  // 添加作业进度记录条目
  const addProgressEntry = (
    userId: UserId,
    currentProgress: UserHomeworkProgress,
    entry: HomeworkProgressEntry
  ): UserHomeworkProgress => {
    return {
      ...currentProgress,
      [userId]: [...currentProgress[userId], entry],
    };
  };

  // 移除作业进度记录条目（根据taskId）
  const removeProgressEntry = (
    userId: UserId,
    currentProgress: UserHomeworkProgress,
    taskId: string
  ): UserHomeworkProgress => {
    return {
      ...currentProgress,
      [userId]: currentProgress[userId].filter((e) => e.taskId !== taskId),
    };
  };

  // 切换打卡状态
  const toggleCheckIn = async (userId: UserId, taskId: string, amount?: number) => {
    const task = tasks.find((t) => t.id === taskId);
    const userCheckIns = [...checkIns[userId]];
    const existingIdx = userCheckIns.findIndex((c) => c.taskId === taskId);
    const existing = existingIdx >= 0 ? userCheckIns[existingIdx] : null;

    let newProgress = { ...homeworkProgress };

    if (existing?.completed) {
      // 取消打卡：回退已同步的作业进度
      const syncedAmount = existing.syncedAmount || 0;

      if (syncedAmount > 0 && task?.subjectId && task?.homeworkId) {
        // 从作业进度中减去（传入 userId）
        await adjustHomeworkProgress(task.subjectId, task.homeworkId, -syncedAmount, userId);
        // 移除进度记录
        newProgress = removeProgressEntry(userId, newProgress, taskId);
      }

      userCheckIns[existingIdx] = {
        ...existing,
        completed: false,
        amount: 0,
        syncedAmount: 0,
        completedAt: undefined,
      };
    } else {
      // 完成打卡
      const targetAmount = amount ?? task?.target ?? 0;

      // 计算需要同步的增量
      const previousSynced = existing?.syncedAmount || 0;
      const delta = targetAmount - previousSynced;

      if (delta > 0 && task?.subjectId && task?.homeworkId) {
        // 增加作业进度（传入 userId）
        await adjustHomeworkProgress(task.subjectId, task.homeworkId, delta, userId);
        // 添加进度记录
        newProgress = addProgressEntry(userId, newProgress, {
          subjectId: task.subjectId,
          homeworkId: task.homeworkId,
          amount: targetAmount,
          source: "checkin",
          taskId,
          timestamp: new Date().toISOString(),
        });
      }

      if (existingIdx >= 0) {
        userCheckIns[existingIdx] = {
          ...existing!,
          completed: true,
          amount: targetAmount,
          syncedAmount: targetAmount,
          completedAt: new Date().toISOString(),
        };
      } else {
        userCheckIns.push({
          taskId,
          completed: true,
          amount: targetAmount,
          syncedAmount: targetAmount,
          completedAt: new Date().toISOString(),
        });
      }
    }

    await updateCheckInsWithProgress(
      { ...checkIns, [userId]: userCheckIns },
      newProgress
    );
  };

  // 设置打卡数量（滑块调整）
  const setCheckInAmount = async (userId: UserId, taskId: string, amount: number) => {
    const task = tasks.find((t) => t.id === taskId);
    const userCheckIns = [...checkIns[userId]];
    const existingIdx = userCheckIns.findIndex((c) => c.taskId === taskId);
    const existing = existingIdx >= 0 ? userCheckIns[existingIdx] : null;
    const target = task?.target ?? 0;

    const previousSynced = existing?.syncedAmount || 0;
    const wasCompleted = existing?.completed ?? false;
    const isNowCompleted = amount >= target;

    let newProgress = { ...homeworkProgress };
    let newSyncedAmount = previousSynced;

    // 只有在完成状态下才同步到作业进度
    if (isNowCompleted && task?.subjectId && task?.homeworkId) {
      const delta = amount - previousSynced;
      if (delta !== 0) {
        await adjustHomeworkProgress(task.subjectId, task.homeworkId, delta, userId);
        newSyncedAmount = amount;

        // 更新或添加进度记录
        newProgress = removeProgressEntry(userId, newProgress, taskId);
        newProgress = addProgressEntry(userId, newProgress, {
          subjectId: task.subjectId,
          homeworkId: task.homeworkId,
          amount,
          source: "checkin",
          taskId,
          timestamp: new Date().toISOString(),
        });
      }
    } else if (!isNowCompleted && previousSynced > 0 && task?.subjectId && task?.homeworkId) {
      // 从完成变为未完成，回退进度
      await adjustHomeworkProgress(task.subjectId, task.homeworkId, -previousSynced, userId);
      newSyncedAmount = 0;
      newProgress = removeProgressEntry(userId, newProgress, taskId);
    }

    if (existingIdx >= 0) {
      userCheckIns[existingIdx] = {
        ...existing!,
        amount,
        completed: isNowCompleted,
        syncedAmount: newSyncedAmount,
        completedAt: isNowCompleted ? new Date().toISOString() : undefined,
      };
    } else {
      userCheckIns.push({
        taskId,
        completed: isNowCompleted,
        amount,
        syncedAmount: newSyncedAmount,
        completedAt: isNowCompleted ? new Date().toISOString() : undefined,
      });
    }

    await updateCheckInsWithProgress(
      { ...checkIns, [userId]: userCheckIns },
      newProgress
    );
  };

  return {
    checkIns,
    homeworkProgress,
    streaks,
    tasks,
    isLoading,
    error,
    mutate,
    toggleCheckIn,
    setCheckInAmount,
  };
}
