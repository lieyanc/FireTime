import type { DailyTask, Subject, UserId } from "./types";

function isSubjectForUser(subject: Subject, userId: UserId): boolean {
  const assignedTo = subject.assignedTo || "both";
  return assignedTo === "both" || assignedTo === userId;
}

export function isDailyTaskForUser(
  task: DailyTask,
  subjects: Subject[] | undefined,
  userId: UserId
): boolean {
  // 没有关联学科的任务，默认双方可见
  if (!task.subjectId) return true;
  const subject = subjects?.find((s) => s.id === task.subjectId);
  // 找不到学科时保持可见，避免误隐藏旧数据
  if (!subject) return true;
  return isSubjectForUser(subject, userId);
}

export function filterDailyTasksForUser(
  tasks: DailyTask[],
  subjects: Subject[] | undefined,
  userId: UserId
): DailyTask[] {
  return tasks.filter((t) => isDailyTaskForUser(t, subjects, userId));
}

