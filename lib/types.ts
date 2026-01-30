export type UserId = "user1" | "user2";

export interface User {
  id: UserId;
  name: string;
}

export interface TimeBlock {
  id: string;
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  label: string;
  category: string;
}

export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  priority: TaskPriority;
  linkedBlockId?: string;
}

export interface UserDayData {
  schedule: TimeBlock[];
  tasks: Task[];
}

export interface DayData {
  date: string; // YYYY-MM-DD format
  user1: UserDayData;
  user2: UserDayData;
}

export interface ScheduleTemplate {
  id: string;
  name: string;
  blocks: TimeBlock[];
  isDefault: boolean;
}

// 假期设置
export interface VacationSettings {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  name: string; // e.g., "寒假"
}

// 考试倒计时
export interface ExamCountdown {
  id: string;
  name: string; // e.g., "开学考"
  date: string; // YYYY-MM-DD
}

// 学科作业
export interface HomeworkItem {
  id: string;
  title: string;
  totalPages: number;
  completedPages: number;
  unit: string;
}

export interface Subject {
  id: string;
  name: string;
  color: string;
  homework: HomeworkItem[];
}

// 待办状态: pending -> in_progress -> completed
export type TodoStatus = "pending" | "in_progress" | "completed";

// 独立的双人待办事项
export interface GlobalTodoItem {
  id: string;
  title: string;
  status: TodoStatus;
  createdAt: string;
  deadline?: string; // YYYY-MM-DD HH:mm
  createdBy?: UserId; // 如果由对方添加则记录
  linkedBlockId?: string;
  linkedSubjectId?: string;
}

export interface GlobalTodoList {
  user1: GlobalTodoItem[];
  user2: GlobalTodoItem[];
}

// 应用设置
export interface AppSettings {
  vacation: VacationSettings;
  subjects: Subject[];
  exams: ExamCountdown[];
}

// API Response types
export interface UsersResponse {
  users: User[];
}

export interface DayDataResponse {
  data: DayData;
}

export interface TemplatesResponse {
  templates: ScheduleTemplate[];
}

export interface SettingsResponse {
  settings: AppSettings;
}

export interface TodoListResponse {
  todos: GlobalTodoList;
}

// Day status for calendar coloring
export type DayStatus = "complete" | "partial" | "incomplete" | "unplanned";

// 每日固定任务（打卡任务）
export interface DailyTask {
  id: string;
  title: string;
  target: number; // 每日目标量
  unit: string; // 单位 (页、词、题、分钟等)
  subjectId?: string; // 关联学科
  homeworkId?: string; // 关联作业项（完成打卡时自动累加到作业进度）
  icon?: string; // 图标名称
}

// 每日打卡记录
export interface DailyCheckIn {
  taskId: string;
  completed: boolean;
  amount: number; // 实际完成量
  completedAt?: string; // 完成时间
}

// 用户每日打卡数据
export interface UserDailyCheckIns {
  user1: DailyCheckIn[];
  user2: DailyCheckIn[];
}

// 每日打卡存储结构
export interface DailyCheckInData {
  date: string;
  checkIns: UserDailyCheckIns;
}

// 每日任务列表
export interface DailyTaskList {
  tasks: DailyTask[];
}

// PK统计
export interface PKStats {
  date: string;
  user1: {
    completed: number;
    total: number;
    streak: number; // 连续打卡天数
  };
  user2: {
    completed: number;
    total: number;
    streak: number;
  };
}
