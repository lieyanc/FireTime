"use client";

import { useState, useCallback } from "react";
import { nanoid } from "nanoid";
import { Plus, Trash2, Edit2, GraduationCap, GripVertical, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ColorPicker } from "@/components/ui/color-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Subject, HomeworkItem, UserId, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { getSubjectProgress } from "@/hooks/use-settings";

interface HomeworkManagerProps {
  subjects: Subject[];
  onUpdateSubjects: (subjects: Subject[]) => void;
  userId: UserId;
  users?: User[];
  compact?: boolean;
}

export function HomeworkManager({
  subjects,
  onUpdateSubjects,
  userId,
  users,
  compact = false,
}: HomeworkManagerProps) {
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());

  const overallProgress = getSubjectProgress(subjects, userId);

  const user1 = users?.find((u) => u.id === "user1");
  const user2 = users?.find((u) => u.id === "user2");
  const user1Name = user1?.name || "用户1";
  const user2Name = user2?.name || "用户2";

  const toggleExpanded = (id: string) => {
    const next = new Set(expandedSubjects);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedSubjects(next);
  };

  const handleAddSubject = (subject: Subject) => {
    onUpdateSubjects([...subjects, subject]);
    setIsAddSubjectOpen(false);
  };

  const handleUpdateSubject = (updated: Subject) => {
    onUpdateSubjects(subjects.map((s) => (s.id === updated.id ? updated : s)));
    setEditingSubject(null);
  };

  const handleDeleteSubject = (id: string) => {
    onUpdateSubjects(subjects.filter((s) => s.id !== id));
  };

  const handleUpdateProgress = (subjectId: string, homeworkId: string, value: number) => {
    onUpdateSubjects(
      subjects.map((s) => {
        if (s.id === subjectId) {
          return {
            ...s,
            homework: s.homework.map((h) =>
              h.id === homeworkId
                ? {
                    ...h,
                    completedPages: {
                      ...h.completedPages,
                      [userId]: Math.min(h.totalPages, Math.max(0, value)),
                    },
                  }
                : h
            ),
          };
        }
        return s;
      })
    );
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5" />
            作业进度
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {Math.round(overallProgress.percentage)}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Progress value={overallProgress.percentage} className="h-2" />
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-1">
            {overallProgress.bySubject.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="text-xs truncate flex-1">{s.name}</span>
                <span className="text-[10px] text-muted-foreground w-7 text-right">
                  {Math.round(s.percentage)}%
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-base">
            <GraduationCap className="h-5 w-5" />
            学科作业管理
          </span>
          <Dialog open={isAddSubjectOpen} onOpenChange={setIsAddSubjectOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-1" />
                添加学科
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加学科</DialogTitle>
              </DialogHeader>
              <SubjectForm
                onSubmit={handleAddSubject}
                onCancel={() => setIsAddSubjectOpen(false)}
                user1Name={user1Name}
                user2Name={user2Name}
              />
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* 总体进度 */}
        <div className="p-3 bg-muted/50 rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium">总体进度</span>
            <span>
              {overallProgress.completedItems}/{overallProgress.totalItems} (
              {Math.round(overallProgress.percentage)}%)
            </span>
          </div>
          <Progress value={overallProgress.percentage} className="h-3" />
        </div>

        {/* 各学科 */}
        {subjects.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            暂无学科，点击添加学科开始管理作业
          </div>
        ) : (
          <div className="space-y-2">
            {subjects.map((subject) => {
              const subjectProgress = overallProgress.bySubject.find(
                (s) => s.id === subject.id
              );
              const isExpanded = expandedSubjects.has(subject.id);

              return (
                <Collapsible
                  key={subject.id}
                  open={isExpanded}
                  onOpenChange={() => toggleExpanded(subject.id)}
                >
                  <div className="border rounded-lg overflow-hidden">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer">
                        <div
                          className="w-4 h-4 rounded-full shrink-0"
                          style={{ backgroundColor: subject.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{subject.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {subject.homework.length} 项作业
                            </Badge>
                          </div>
                          <Progress
                            value={subjectProgress?.percentage || 0}
                            className="h-1.5 mt-1"
                          />
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {Math.round(subjectProgress?.percentage || 0)}%
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 transition-transform",
                            isExpanded && "rotate-180"
                          )}
                        />
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="border-t p-3 space-y-3 bg-muted/30">
                        {/* 作业列表 */}
                        {subject.homework.map((hw) => (
                          <div key={hw.id} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{hw.title}</span>
                              <span className="text-muted-foreground">
                                {hw.completedPages[userId] || 0}/{hw.totalPages} {hw.unit}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress
                                value={((hw.completedPages[userId] || 0) / hw.totalPages) * 100}
                                className="h-2 flex-1"
                              />
                              <Input
                                type="number"
                                className="w-20 h-7 text-sm"
                                value={hw.completedPages[userId] || 0}
                                min={0}
                                max={hw.totalPages}
                                onChange={(e) =>
                                  handleUpdateProgress(
                                    subject.id,
                                    hw.id,
                                    parseInt(e.target.value) || 0
                                  )
                                }
                              />
                            </div>
                          </div>
                        ))}

                        {/* 操作按钮 */}
                        <div className="flex gap-2 pt-2 border-t">
                          <Dialog
                            open={editingSubject?.id === subject.id}
                            onOpenChange={(open) =>
                              !open && setEditingSubject(null)
                            }
                          >
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1"
                                onClick={() => setEditingSubject(subject)}
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                编辑
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>编辑学科</DialogTitle>
                              </DialogHeader>
                              <SubjectForm
                                initialData={subject}
                                onSubmit={handleUpdateSubject}
                                onCancel={() => setEditingSubject(null)}
                                user1Name={user1Name}
                                user2Name={user2Name}
                              />
                            </DialogContent>
                          </Dialog>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteSubject(subject.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// 学科表单
function SubjectForm({
  initialData,
  onSubmit,
  onCancel,
  user1Name,
  user2Name,
}: {
  initialData?: Subject;
  onSubmit: (subject: Subject) => void;
  onCancel: () => void;
  user1Name: string;
  user2Name: string;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [color, setColor] = useState(initialData?.color || "#3b82f6");
  const [assignedTo, setAssignedTo] = useState<"both" | "user1" | "user2">(
    initialData?.assignedTo || "both"
  );
  const [homework, setHomework] = useState<HomeworkItem[]>(
    initialData?.homework || []
  );
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const addHomework = () => {
    setHomework([
      ...homework,
      {
        id: nanoid(),
        title: "新作业",
        totalPages: 10,
        completedPages: { user1: 0, user2: 0 },
        unit: "页",
      },
    ]);
  };

  const updateHomework = (id: string, field: keyof HomeworkItem, value: string | number) => {
    setHomework(
      homework.map((h) => (h.id === id ? { ...h, [field]: value } : h))
    );
  };

  const removeHomework = (id: string) => {
    setHomework(homework.filter((h) => h.id !== id));
  };

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newHomework = [...homework];
    const draggedItem = newHomework[draggedIndex];
    newHomework.splice(draggedIndex, 1);
    newHomework.splice(index, 0, draggedItem);
    setHomework(newHomework);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit({
      id: initialData?.id || nanoid(),
      name: name.trim(),
      color,
      homework,
      assignedTo,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>学科名称</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="如：数学"
        />
      </div>

      <div className="space-y-2">
        <Label>归属</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={assignedTo === "both" ? "default" : "outline"}
            onClick={() => setAssignedTo("both")}
            className="flex-1"
          >
            共同
          </Button>
          <Button
            type="button"
            size="sm"
            variant={assignedTo === "user1" ? "default" : "outline"}
            onClick={() => setAssignedTo("user1")}
            className="flex-1"
          >
            仅{user1Name}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={assignedTo === "user2" ? "default" : "outline"}
            onClick={() => setAssignedTo("user2")}
            className="flex-1"
          >
            仅{user2Name}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          选课不同时，可设置学科仅属于某一用户
        </p>
      </div>

      <div className="space-y-2">
        <Label>颜色</Label>
        <div className="flex items-center gap-2">
          <ColorPicker value={color} onChange={setColor} />
          <span className="text-sm text-muted-foreground font-mono">{color}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>作业项目</Label>
          <Button size="sm" variant="outline" onClick={addHomework}>
            <Plus className="h-4 w-4 mr-1" />
            添加
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">拖拽左侧手柄可调整顺序</p>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {homework.map((hw, index) => (
            <div
              key={hw.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-2 p-2 border rounded bg-background",
                draggedIndex === index && "opacity-50 border-primary"
              )}
            >
              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" />
              <Input
                className="flex-1"
                value={hw.title}
                onChange={(e) => updateHomework(hw.id, "title", e.target.value)}
                placeholder="作业名称"
              />
              <Input
                type="number"
                className="w-20"
                value={hw.totalPages}
                onChange={(e) =>
                  updateHomework(hw.id, "totalPages", parseInt(e.target.value) || 0)
                }
              />
              <Input
                className="w-16"
                value={hw.unit}
                onChange={(e) => updateHomework(hw.id, "unit", e.target.value)}
                placeholder="单位"
              />
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0"
                onClick={() => removeHomework(hw.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          取消
        </Button>
        <Button className="flex-1" onClick={handleSubmit} disabled={!name.trim()}>
          {initialData ? "保存" : "添加"}
        </Button>
      </div>
    </div>
  );
}
