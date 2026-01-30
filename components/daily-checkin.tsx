"use client";

import { useState } from "react";
import { nanoid } from "nanoid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Circle,
  Flame,
  Plus,
  Settings2,
  Trash2,
  Trophy,
  Zap,
  Edit2,
  Link2,
} from "lucide-react";
import type { DailyTask, DailyCheckIn, User, UserId, Subject, HomeworkItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DailyCheckInCardProps {
  user: User;
  userId: UserId;
  tasks: DailyTask[];
  checkIns: DailyCheckIn[];
  streak: number;
  subjects?: Subject[];
  onToggle: (taskId: string) => void;
  onSetAmount: (taskId: string, amount: number) => void;
}

export function DailyCheckInCard({
  user,
  userId,
  tasks,
  checkIns,
  streak,
  subjects = [],
  onToggle,
  onSetAmount,
}: DailyCheckInCardProps) {
  const completedCount = tasks.filter((task) => {
    const ci = checkIns.find((c) => c.taskId === task.id);
    return ci?.completed;
  }).length;
  const totalCount = tasks.length;
  const percentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const allDone = completedCount === totalCount && totalCount > 0;

  const getSubjectColor = (subjectId?: string) => {
    if (!subjectId) return undefined;
    return subjects.find((s) => s.id === subjectId)?.color;
  };

  const getHomeworkInfo = (task: DailyTask) => {
    if (!task.subjectId || !task.homeworkId) return null;
    const subject = subjects.find((s) => s.id === task.subjectId);
    const homework = subject?.homework.find((h) => h.id === task.homeworkId);
    if (!homework) return null;
    return { subject, homework };
  };

  return (
    <Card className={cn(allDone && "ring-2 ring-green-500/50")}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <span>{user.name}</span>
          <div className="ml-auto flex items-center gap-2">
            {streak > 0 && (
              <span className="flex items-center gap-1 text-sm text-orange-500 font-normal">
                <Flame className="h-4 w-4" />
                {streak}天
              </span>
            )}
            <span className="text-sm font-normal text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Progress value={percentage} className="h-2" />

        <div className="space-y-2">
          {tasks.map((task) => {
            const ci = checkIns.find((c) => c.taskId === task.id);
            const isCompleted = ci?.completed ?? false;
            const currentAmount = ci?.amount ?? 0;
            const subjectColor = getSubjectColor(task.subjectId);
            const hwInfo = getHomeworkInfo(task);

            return (
              <div
                key={task.id}
                className={cn(
                  "flex items-center gap-3 p-2 rounded-lg transition-all",
                  isCompleted
                    ? "bg-green-500/10 dark:bg-green-500/5"
                    : "hover:bg-muted/50"
                )}
              >
                {/* 打卡按钮 */}
                <button
                  onClick={() => onToggle(task.id)}
                  className={cn(
                    "shrink-0 transition-all",
                    isCompleted ? "text-green-500 scale-110" : "text-muted-foreground hover:text-primary"
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </button>

                {/* 学科色条 */}
                {subjectColor && (
                  <div
                    className="w-1 h-6 rounded-full shrink-0"
                    style={{ backgroundColor: subjectColor }}
                  />
                )}

                {/* 任务信息 */}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "text-sm font-medium",
                    isCompleted && "text-green-600 dark:text-green-400"
                  )}>
                    {task.title}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <span>目标: {task.target} {task.unit}</span>
                    {hwInfo && (
                      <span className="flex items-center gap-0.5 text-blue-500">
                        <Link2 className="h-3 w-3" />
                        {hwInfo.homework.title}
                      </span>
                    )}
                  </div>
                </div>

                {/* 进度滑块 */}
                <div className="flex items-center gap-2 w-32 shrink-0">
                  <Slider
                    value={[currentAmount]}
                    min={0}
                    max={task.target}
                    step={1}
                    onValueChange={([v]) => onSetAmount(task.id, v)}
                    className="flex-1"
                  />
                  <span className={cn(
                    "text-xs font-mono w-12 text-right",
                    isCompleted ? "text-green-500 font-bold" : "text-muted-foreground"
                  )}>
                    {currentAmount}/{task.target}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {allDone && (
          <div className="text-center py-2 text-green-500 font-medium flex items-center justify-center gap-1">
            <Trophy className="h-4 w-4" />
            今日全部完成!
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// PK 对比视图
interface DailyPKViewProps {
  user1: User;
  user2: User;
  tasks: DailyTask[];
  checkIns1: DailyCheckIn[];
  checkIns2: DailyCheckIn[];
  streak1: number;
  streak2: number;
  subjects?: Subject[];
}

export function DailyPKView({
  user1,
  user2,
  tasks,
  checkIns1,
  checkIns2,
  streak1,
  streak2,
  subjects = [],
}: DailyPKViewProps) {
  const getCompleted = (checkIns: DailyCheckIn[]) =>
    tasks.filter((t) => checkIns.find((c) => c.taskId === t.id)?.completed).length;

  const completed1 = getCompleted(checkIns1);
  const completed2 = getCompleted(checkIns2);
  const total = tasks.length;

  const pct1 = total > 0 ? (completed1 / total) * 100 : 0;
  const pct2 = total > 0 ? (completed2 / total) * 100 : 0;

  const winner =
    completed1 === completed2 ? "tie" : completed1 > completed2 ? "user1" : "user2";

  const getSubjectColor = (subjectId?: string) =>
    subjects.find((s) => s.id === subjectId)?.color;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Zap className="h-5 w-5 text-yellow-500" />
          每日打卡 PK
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 总分对比 */}
        <div className="flex items-center gap-4">
          <div className="flex-1 text-center">
            <div className={cn(
              "text-3xl font-bold",
              winner === "user1" ? "text-green-500" : "text-muted-foreground"
            )}>
              {completed1}/{total}
            </div>
            <div className="text-sm text-muted-foreground">{user1.name}</div>
            {streak1 > 0 && (
              <div className="text-xs text-orange-500 flex items-center justify-center gap-0.5 mt-1">
                <Flame className="h-3 w-3" /> 连续{streak1}天
              </div>
            )}
          </div>

          <div className="text-2xl font-bold text-muted-foreground">VS</div>

          <div className="flex-1 text-center">
            <div className={cn(
              "text-3xl font-bold",
              winner === "user2" ? "text-green-500" : "text-muted-foreground"
            )}>
              {completed2}/{total}
            </div>
            <div className="text-sm text-muted-foreground">{user2.name}</div>
            {streak2 > 0 && (
              <div className="text-xs text-orange-500 flex items-center justify-center gap-0.5 mt-1">
                <Flame className="h-3 w-3" /> 连续{streak2}天
              </div>
            )}
          </div>
        </div>

        {/* 进度条对比 */}
        <div className="space-y-1">
          <div className="flex gap-1 h-3">
            <div
              className="bg-blue-500 rounded-l-full transition-all"
              style={{ width: `${pct1}%` }}
            />
            <div className="flex-1" />
            <div
              className="bg-green-500 rounded-r-full transition-all"
              style={{ width: `${pct2}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(pct1)}%</span>
            <span>{Math.round(pct2)}%</span>
          </div>
        </div>

        {/* 逐项对比 */}
        <div className="space-y-1.5 pt-2 border-t">
          {tasks.map((task) => {
            const ci1 = checkIns1.find((c) => c.taskId === task.id);
            const ci2 = checkIns2.find((c) => c.taskId === task.id);
            const done1 = ci1?.completed ?? false;
            const done2 = ci2?.completed ?? false;
            const amt1 = ci1?.amount ?? 0;
            const amt2 = ci2?.amount ?? 0;
            const color = getSubjectColor(task.subjectId);

            return (
              <div key={task.id} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center text-sm">
                {/* 用户1状态 */}
                <div className="flex items-center gap-1.5 justify-end">
                  <span className={cn(
                    "text-xs font-mono",
                    done1 ? "text-green-500" : "text-muted-foreground"
                  )}>
                    {amt1}/{task.target}
                  </span>
                  {done1 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {/* 任务名 */}
                <div className="flex items-center gap-1.5 text-center">
                  {color && (
                    <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: color }} />
                  )}
                  <span className="font-medium text-xs">{task.title}</span>
                </div>

                {/* 用户2状态 */}
                <div className="flex items-center gap-1.5">
                  {done2 ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className={cn(
                    "text-xs font-mono",
                    done2 ? "text-green-500" : "text-muted-foreground"
                  )}>
                    {amt2}/{task.target}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// 单个任务编辑表单
interface TaskFormProps {
  task?: DailyTask;
  subjects: Subject[];
  onSave: (task: DailyTask) => void;
  onCancel: () => void;
}

function TaskForm({ task, subjects, onSave, onCancel }: TaskFormProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [target, setTarget] = useState(task?.target?.toString() || "10");
  const [unit, setUnit] = useState(task?.unit || "页");
  const [subjectId, setSubjectId] = useState(task?.subjectId || "");
  const [homeworkId, setHomeworkId] = useState(task?.homeworkId || "");

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const homeworkItems = selectedSubject?.homework || [];

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      id: task?.id || nanoid(),
      title: title.trim(),
      target: parseInt(target) || 10,
      unit: unit.trim() || "项",
      subjectId: subjectId || undefined,
      homeworkId: homeworkId || undefined,
    });
  };

  // 选择作业时自动填充单位
  const handleHomeworkChange = (hwId: string) => {
    setHomeworkId(hwId);
    if (hwId) {
      const hw = homeworkItems.find((h) => h.id === hwId);
      if (hw) {
        setUnit(hw.unit);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>任务名称</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="如：背单词"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>每日目标</Label>
          <Input
            type="number"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            min={1}
          />
        </div>
        <div className="space-y-2">
          <Label>单位</Label>
          <Input
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="页/词/题"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>关联学科（可选）</Label>
        <Select value={subjectId} onValueChange={(v) => { setSubjectId(v === "none" ? "" : v); setHomeworkId(""); }}>
          <SelectTrigger>
            <SelectValue placeholder="选择学科" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">不关联</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {subjectId && homeworkItems.length > 0 && (
        <div className="space-y-2">
          <Label>关联作业（完成打卡自动累计进度）</Label>
          <Select value={homeworkId} onValueChange={handleHomeworkChange}>
            <SelectTrigger>
              <SelectValue placeholder="选择作业项" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">不关联</SelectItem>
              {homeworkItems.map((h) => (
                <SelectItem key={h.id} value={h.id}>
                  {h.title} ({h.completedPages}/{h.totalPages} {h.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            打卡完成后，会自动将完成量累加到作业进度
          </p>
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          取消
        </Button>
        <Button className="flex-1" onClick={handleSave} disabled={!title.trim()}>
          保存
        </Button>
      </div>
    </div>
  );
}

// 任务管理对话框
interface DailyTaskManagerProps {
  tasks: DailyTask[];
  subjects?: Subject[];
  onAdd: (task: DailyTask) => void;
  onRemove: (taskId: string) => void;
  onEdit: (taskId: string, updates: Partial<DailyTask>) => void;
}

export function DailyTaskManager({
  tasks,
  subjects = [],
  onAdd,
  onRemove,
  onEdit,
}: DailyTaskManagerProps) {
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DailyTask | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const getSubjectInfo = (task: DailyTask) => {
    if (!task.subjectId) return null;
    const subject = subjects.find((s) => s.id === task.subjectId);
    const homework = task.homeworkId
      ? subject?.homework.find((h) => h.id === task.homeworkId)
      : null;
    return { subject, homework };
  };

  const handleSave = (task: DailyTask) => {
    if (editingTask) {
      onEdit(editingTask.id, task);
    } else {
      onAdd(task);
    }
    setEditingTask(null);
    setIsAdding(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Settings2 className="h-4 w-4 mr-1" />
          管理任务
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>管理每日打卡任务</DialogTitle>
        </DialogHeader>

        {editingTask || isAdding ? (
          <TaskForm
            task={editingTask || undefined}
            subjects={subjects}
            onSave={handleSave}
            onCancel={() => { setEditingTask(null); setIsAdding(false); }}
          />
        ) : (
          <div className="space-y-4">
            {/* 现有任务列表 */}
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {tasks.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  暂无任务，点击下方按钮添加
                </div>
              ) : (
                tasks.map((task) => {
                  const info = getSubjectInfo(task);
                  return (
                    <div key={task.id} className="flex items-center gap-2 p-2 border rounded-md">
                      {info?.subject && (
                        <div
                          className="w-1.5 h-8 rounded-full shrink-0"
                          style={{ backgroundColor: info.subject.color }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{task.title}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span>{task.target} {task.unit}/天</span>
                          {info?.homework && (
                            <span className="flex items-center gap-0.5 text-blue-500">
                              <Link2 className="h-3 w-3" />
                              {info.homework.title}
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        onClick={() => setEditingTask(task)}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                        onClick={() => onRemove(task.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            {/* 添加按钮 */}
            <Button className="w-full" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4 mr-1" />
              添加新任务
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
