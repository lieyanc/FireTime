import fs from "fs";
import path from "path";
import type {
  AppSettings,
  DayData,
  GlobalTodoList,
  ScheduleTemplate,
  User,
  DailyTaskList,
  DailyCheckInData,
  UserDailyCheckIns,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DAYS_DIR = path.join(DATA_DIR, "days");
const CHECKINS_DIR = path.join(DATA_DIR, "checkins");

// Ensure data directories exist
function ensureDataDirs() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DAYS_DIR)) {
    fs.mkdirSync(DAYS_DIR, { recursive: true });
  }
  if (!fs.existsSync(CHECKINS_DIR)) {
    fs.mkdirSync(CHECKINS_DIR, { recursive: true });
  }
}

// Users
export function getUsers(): User[] {
  ensureDataDirs();
  const filePath = path.join(DATA_DIR, "users.json");
  if (!fs.existsSync(filePath)) {
    const defaultUsers: User[] = [
      { id: "user1", name: "用户 1" },
      { id: "user2", name: "用户 2" },
    ];
    fs.writeFileSync(filePath, JSON.stringify(defaultUsers, null, 2));
    return defaultUsers;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function updateUser(id: string, name: string, avatar?: string, progressColor?: string): User[] {
  const users = getUsers();
  const user = users.find((u) => u.id === id);
  if (user) {
    user.name = name;
    if (avatar !== undefined) {
      user.avatar = avatar;
    }
    if (progressColor !== undefined) {
      user.progressColor = progressColor;
    }
    const filePath = path.join(DATA_DIR, "users.json");
    fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
  }
  return users;
}

// App Settings (vacation, subjects)
export function getSettings(): AppSettings {
  ensureDataDirs();
  const filePath = path.join(DATA_DIR, "settings.json");
  if (!fs.existsSync(filePath)) {
    const defaultSettings: AppSettings = {
      vacation: {
        name: "寒假",
        startDate: "2026-01-15",
        endDate: "2026-02-15",
      },
      exams: [
        { id: "exam-1", name: "开学考", date: "2026-02-17" },
      ],
      subjects: [
        {
          id: "math",
          name: "数学",
          color: "#3b82f6",
          homework: [
            { id: "math-1", title: "寒假作业本", totalPages: 60, completedPages: { user1: 0, user2: 0 }, unit: "页" },
          ],
        },
        {
          id: "chinese",
          name: "语文",
          color: "#ef4444",
          homework: [
            { id: "chinese-1", title: "阅读理解", totalPages: 30, completedPages: { user1: 0, user2: 0 }, unit: "篇" },
          ],
        },
        {
          id: "english",
          name: "英语",
          color: "#22c55e",
          homework: [
            { id: "english-1", title: "单词本", totalPages: 500, completedPages: { user1: 0, user2: 0 }, unit: "词" },
          ],
        },
        {
          id: "physics",
          name: "物理",
          color: "#f59e0b",
          homework: [
            { id: "physics-1", title: "练习册", totalPages: 40, completedPages: { user1: 0, user2: 0 }, unit: "页" },
          ],
        },
        {
          id: "chemistry",
          name: "化学",
          color: "#8b5cf6",
          homework: [
            { id: "chemistry-1", title: "实验报告", totalPages: 15, completedPages: { user1: 0, user2: 0 }, unit: "篇" },
          ],
        },
        {
          id: "biology",
          name: "生物",
          color: "#06b6d4",
          homework: [
            { id: "biology-1", title: "知识梳理", totalPages: 25, completedPages: { user1: 0, user2: 0 }, unit: "页" },
          ],
        },
      ],
    };
    fs.writeFileSync(filePath, JSON.stringify(defaultSettings, null, 2));
    return defaultSettings;
  }
  const settings = JSON.parse(fs.readFileSync(filePath, "utf-8")) as AppSettings;
  // Migrate old data format: convert completedPages from number to object
  let needsSave = false;
  for (const subject of settings.subjects) {
    for (const hw of subject.homework) {
      if (typeof hw.completedPages === "number") {
        // Migrate: assign old value to user1, set user2 to 0
        (hw as any).completedPages = { user1: hw.completedPages as unknown as number, user2: 0 };
        needsSave = true;
      }
    }
  }
  if (needsSave) {
    fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
  }
  return settings;
}

export function saveSettings(settings: AppSettings): void {
  ensureDataDirs();
  const filePath = path.join(DATA_DIR, "settings.json");
  fs.writeFileSync(filePath, JSON.stringify(settings, null, 2));
}

// Global TodoList (independent of days)
export function getGlobalTodos(): GlobalTodoList {
  ensureDataDirs();
  const filePath = path.join(DATA_DIR, "todos.json");
  if (!fs.existsSync(filePath)) {
    const defaultTodos: GlobalTodoList = {
      user1: [],
      user2: [],
    };
    fs.writeFileSync(filePath, JSON.stringify(defaultTodos, null, 2));
    return defaultTodos;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function saveGlobalTodos(todos: GlobalTodoList): void {
  ensureDataDirs();
  const filePath = path.join(DATA_DIR, "todos.json");
  fs.writeFileSync(filePath, JSON.stringify(todos, null, 2));
}

// Templates
export function getTemplates(): ScheduleTemplate[] {
  ensureDataDirs();
  const filePath = path.join(DATA_DIR, "templates.json");
  if (!fs.existsSync(filePath)) {
    const defaultTemplates: ScheduleTemplate[] = [
      {
        id: "default",
        name: "默认日程",
        isDefault: true,
        blocks: [
          { id: "1", startTime: "07:00", endTime: "08:00", label: "起床洗漱", category: "routine" },
          { id: "2", startTime: "08:00", endTime: "09:00", label: "早餐", category: "meal" },
          { id: "3", startTime: "09:00", endTime: "12:00", label: "学习/工作", category: "work" },
          { id: "4", startTime: "12:00", endTime: "13:00", label: "午餐", category: "meal" },
          { id: "5", startTime: "13:00", endTime: "14:00", label: "午休", category: "rest" },
          { id: "6", startTime: "14:00", endTime: "18:00", label: "学习/工作", category: "work" },
          { id: "7", startTime: "18:00", endTime: "19:00", label: "晚餐", category: "meal" },
          { id: "8", startTime: "19:00", endTime: "21:00", label: "自由时间", category: "free" },
          { id: "9", startTime: "21:00", endTime: "22:00", label: "整理/准备睡觉", category: "routine" },
          { id: "10", startTime: "22:00", endTime: "23:00", label: "睡觉", category: "sleep" },
        ],
      },
    ];
    fs.writeFileSync(filePath, JSON.stringify(defaultTemplates, null, 2));
    return defaultTemplates;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function saveTemplates(templates: ScheduleTemplate[]): void {
  ensureDataDirs();
  const filePath = path.join(DATA_DIR, "templates.json");
  fs.writeFileSync(filePath, JSON.stringify(templates, null, 2));
}

export function getDefaultTemplate(): ScheduleTemplate | undefined {
  const templates = getTemplates();
  return templates.find((t) => t.isDefault) || templates[0];
}

// Day Data
function getDayFilePath(date: string): string {
  return path.join(DAYS_DIR, `${date}.json`);
}

function createDayDataFromTemplate(date: string): DayData {
  const template = getDefaultTemplate();
  const blocks = template?.blocks || [];

  return {
    date,
    user1: {
      schedule: blocks.map((b) => ({ ...b })),
      tasks: [],
    },
    user2: {
      schedule: blocks.map((b) => ({ ...b })),
      tasks: [],
    },
  };
}

export function getDayData(date: string): DayData {
  ensureDataDirs();
  const filePath = getDayFilePath(date);

  if (!fs.existsSync(filePath)) {
    // Create new day from default template
    const dayData = createDayDataFromTemplate(date);
    fs.writeFileSync(filePath, JSON.stringify(dayData, null, 2));
    return dayData;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function saveDayData(data: DayData): void {
  ensureDataDirs();
  const filePath = getDayFilePath(data.date);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function getAllDayDates(): string[] {
  ensureDataDirs();
  if (!fs.existsSync(DAYS_DIR)) {
    return [];
  }

  const files = fs.readdirSync(DAYS_DIR);
  return files
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort();
}

export function getMonthDayData(year: number, month: number): DayData[] {
  const allDates = getAllDayDates();
  const monthPrefix = `${year}-${(month + 1).toString().padStart(2, "0")}`;
  const monthDates = allDates.filter((d) => d.startsWith(monthPrefix));

  return monthDates.map((date) => getDayData(date));
}

// Daily Tasks (每日固定打卡任务)
export function getDailyTasks(): DailyTaskList {
  ensureDataDirs();
  const filePath = path.join(DATA_DIR, "daily-tasks.json");
  if (!fs.existsSync(filePath)) {
    const defaults: DailyTaskList = {
      tasks: [
        { id: "dt-1", title: "背单词", target: 50, unit: "词", subjectId: "english", homeworkId: "english-1" },
        { id: "dt-2", title: "数学练习", target: 2, unit: "页", subjectId: "math", homeworkId: "math-1" },
        { id: "dt-3", title: "语文阅读", target: 1, unit: "篇", subjectId: "chinese", homeworkId: "chinese-1" },
        { id: "dt-4", title: "物理刷题", target: 2, unit: "页", subjectId: "physics", homeworkId: "physics-1" },
        { id: "dt-5", title: "化学练习", target: 1, unit: "篇", subjectId: "chemistry", homeworkId: "chemistry-1" },
        { id: "dt-6", title: "课外阅读", target: 30, unit: "分钟" },
      ],
    };
    fs.writeFileSync(filePath, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function saveDailyTasks(data: DailyTaskList): void {
  ensureDataDirs();
  const filePath = path.join(DATA_DIR, "daily-tasks.json");
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Daily Check-ins (每日打卡记录)
export function getDailyCheckIns(date: string): DailyCheckInData {
  ensureDataDirs();
  const filePath = path.join(CHECKINS_DIR, `${date}.json`);
  if (!fs.existsSync(filePath)) {
    const empty: DailyCheckInData = {
      date,
      checkIns: { user1: [], user2: [] },
      homeworkProgress: { user1: [], user2: [] },
    };
    return empty;
  }
  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  // 确保旧数据有 homeworkProgress 字段
  if (!data.homeworkProgress) {
    data.homeworkProgress = { user1: [], user2: [] };
  }
  return data;
}

export function saveDailyCheckIns(data: DailyCheckInData): void {
  ensureDataDirs();
  const filePath = path.join(CHECKINS_DIR, `${data.date}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// 获取某作业的所有进度记录（跨日期追踪）
export function getHomeworkProgressHistory(
  subjectId: string,
  homeworkId: string
): Array<{ date: string; userId: string; amount: number; source: string; timestamp: string }> {
  const dates = getAllCheckInDates();
  const history: Array<{ date: string; userId: string; amount: number; source: string; timestamp: string }> = [];

  for (const date of dates) {
    const data = getDailyCheckIns(date);
    if (!data.homeworkProgress) continue;

    for (const userId of ["user1", "user2"] as const) {
      const entries = data.homeworkProgress[userId] || [];
      for (const entry of entries) {
        if (entry.subjectId === subjectId && entry.homeworkId === homeworkId) {
          history.push({
            date,
            userId,
            amount: entry.amount,
            source: entry.source,
            timestamp: entry.timestamp,
          });
        }
      }
    }
  }

  return history.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// 获取所有打卡日期
export function getAllCheckInDates(): string[] {
  ensureDataDirs();
  if (!fs.existsSync(CHECKINS_DIR)) return [];
  return fs.readdirSync(CHECKINS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(".json", ""))
    .sort();
}

// 计算连续打卡天数
export function getStreak(userId: "user1" | "user2", today: string): number {
  const dates = getAllCheckInDates().reverse(); // 从最新日期开始
  const tasks = getDailyTasks();
  const totalTasks = tasks.tasks.length;
  if (totalTasks === 0) return 0;

  let streak = 0;
  // 从今天往前逐天检查
  const todayDate = new Date(today);
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(todayDate);
    checkDate.setDate(checkDate.getDate() - i);
    const dateStr = checkDate.toISOString().split("T")[0];

    const data = getDailyCheckIns(dateStr);
    const userCheckIns = data.checkIns[userId];
    const completedCount = userCheckIns.filter((c) => c.completed).length;

    if (completedCount >= totalTasks) {
      streak++;
    } else {
      // 如果是今天且还没全部完成，不断连续
      if (i === 0) continue;
      break;
    }
  }
  return streak;
}
