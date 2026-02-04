"use client";

import { useState, useEffect } from "react";
import useSWR, { mutate } from "swr";
import { nanoid } from "nanoid";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Star,
  StarOff,
  Edit2,
  Moon,
  Sun,
  Monitor,
  Calendar,
  Save,
  Lock,
  LockOpen,
  LogOut,
  Camera,
  User as UserIcon,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HomeworkManager } from "@/components/homework-manager";
import { ColorPicker } from "@/components/ui/color-picker";
import { useSettings } from "@/hooks/use-settings";
import { useUser } from "@/components/user-provider";
import type { ScheduleTemplate, TimeBlock, User, UserId, ExamCountdown } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface PasswordStatus {
  user1: boolean;
  user2: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { currentUserId } = useUser();
  const [mounted, setMounted] = useState(false);
  const [passwordStatus, setPasswordStatus] = useState<PasswordStatus | null>(null);

  const { data: usersData, isLoading: usersLoading } = useSWR<{ users: User[] }>(
    "/api/users",
    fetcher
  );
  const { data: templatesData, isLoading: templatesLoading } = useSWR<{
    templates: ScheduleTemplate[];
  }>("/api/templates", fetcher);

  const { settings, isLoading: settingsLoading, updateSettings, updateSubjects } = useSettings();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Load password status
  useEffect(() => {
    fetch("/api/auth/password")
      .then((res) => res.json())
      .then(setPasswordStatus)
      .catch(console.error);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const refreshPasswordStatus = () => {
    fetch("/api/auth/password")
      .then((res) => res.json())
      .then(setPasswordStatus)
      .catch(console.error);
  };

  const users = usersData?.users || [];
  const templates = templatesData?.templates || [];

  const handleUserProfileChange = async (id: string, name: string, avatar?: string, progressColor?: string) => {
    await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, name, avatar, progressColor }),
    });
    mutate("/api/users");
  };

  const handleSetDefaultTemplate = async (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (!template) return;

    await fetch("/api/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...template, isDefault: true }),
    });
    mutate("/api/templates");
  };

  const handleDeleteTemplate = async (id: string) => {
    await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    mutate("/api/templates");
  };

  const handleSaveTemplate = async (template: ScheduleTemplate) => {
    const existing = templates.find((t) => t.id === template.id);
    if (existing) {
      await fetch("/api/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
    } else {
      await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(template),
      });
    }
    mutate("/api/templates");
  };

  const handleVacationChange = async (
    field: "name" | "startDate" | "endDate",
    value: string
  ) => {
    if (!settings) return;
    await updateSettings({
      ...settings,
      vacation: { ...settings.vacation, [field]: value },
    });
  };

  if (usersLoading || templatesLoading || settingsLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[200px]" />
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold">设置</h1>

      {/* 主题 */}
      <Card>
        <CardHeader>
          <CardTitle>主题</CardTitle>
          <CardDescription>选择应用的显示主题</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={theme === "light" ? "default" : "outline"}
              onClick={() => setTheme("light")}
              className="flex-1"
            >
              <Sun className="h-4 w-4 mr-2" />
              浅色
            </Button>
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              onClick={() => setTheme("dark")}
              className="flex-1"
            >
              <Moon className="h-4 w-4 mr-2" />
              深色
            </Button>
            <Button
              variant={theme === "system" ? "default" : "outline"}
              onClick={() => setTheme("system")}
              className="flex-1"
            >
              <Monitor className="h-4 w-4 mr-2" />
              系统
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 密码管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            密码保护
          </CardTitle>
          <CardDescription>为每个用户设置登录密码，保护你的数据</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.map((user) => (
            <PasswordManager
              key={user.id}
              userId={user.id}
              userName={user.name}
              hasPassword={passwordStatus?.[user.id] || false}
              onUpdate={refreshPasswordStatus}
            />
          ))}
          <Separator />
          <Button
            variant="outline"
            onClick={handleLogout}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            退出登录
          </Button>
        </CardContent>
      </Card>

      {/* 用户资料 */}
      <Card>
        <CardHeader>
          <CardTitle>用户资料</CardTitle>
          <CardDescription>编辑用户头像和显示名称</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.map((user) => (
            <UserProfileEditor
              key={user.id}
              user={user}
              onSave={(name, avatar, progressColor) => handleUserProfileChange(user.id, name, avatar, progressColor)}
            />
          ))}
        </CardContent>
      </Card>

      {/* 假期设置 */}
      {settings?.vacation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              假期设置
            </CardTitle>
            <CardDescription>设置假期的名称和日期范围</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>假期名称</Label>
                <Input
                  value={settings.vacation.name}
                  onChange={(e) => handleVacationChange("name", e.target.value)}
                  placeholder="如：寒假"
                />
              </div>
              <div className="space-y-2">
                <Label>开始日期</Label>
                <Input
                  type="date"
                  value={settings.vacation.startDate}
                  onChange={(e) => handleVacationChange("startDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>结束日期</Label>
                <Input
                  type="date"
                  value={settings.vacation.endDate}
                  onChange={(e) => handleVacationChange("endDate", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 考试倒计时 */}
      {settings && (
        <ExamManager
          exams={settings.exams || []}
          onUpdate={(exams) => updateSettings({ ...settings, exams })}
        />
      )}

      {/* 学科作业管理 */}
      {settings?.subjects && (
        <HomeworkManager
          subjects={settings.subjects}
          onUpdateSubjects={updateSubjects}
          userId={currentUserId}
          users={users}
        />
      )}

      {/* 模板管理 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>时间表模板</CardTitle>
            <CardDescription>管理预设的时间表模板，支持创建和编辑</CardDescription>
          </div>
          <TemplateDialog onSave={handleSaveTemplate} />
        </CardHeader>
        <CardContent className="space-y-3">
          {templates.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">暂无模板</p>
          ) : (
            templates.map((template) => (
              <div
                key={template.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="font-medium">{template.name}</span>
                  {template.isDefault && <Badge variant="default">默认</Badge>}
                  <span className="text-sm text-muted-foreground">
                    {template.blocks.length} 个时间段
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <TemplateDialog
                    initialData={template}
                    onSave={handleSaveTemplate}
                    trigger={
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleSetDefaultTemplate(template.id)}
                    disabled={template.isDefault}
                  >
                    {template.isDefault ? (
                      <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteTemplate(template.id)}
                    disabled={templates.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function UserProfileEditor({
  user,
  onSave,
}: {
  user: User;
  onSave: (name: string, avatar?: string, progressColor?: string) => void;
}) {
  const [name, setName] = useState(user.name);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progressColor, setProgressColor] = useState(user.progressColor || "#3b82f6");

  const handleSave = () => {
    if (name.trim() && name !== user.name) {
      onSave(name.trim(), user.avatar, progressColor);
    }
    setIsEditing(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", user.id);

      const res = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        onSave(user.name, data.avatar, progressColor);
      }
    } catch (error) {
      console.error("Avatar upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleColorChange = (color: string) => {
    setProgressColor(color);
    onSave(user.name, user.avatar, color);
  };

  return (
    <div className="flex items-center gap-4">
      {/* Avatar */}
      <div className="relative group">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <UserIcon className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
        <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          {uploading ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Camera className="w-4 h-4 text-white" />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
            disabled={uploading}
          />
        </label>
      </div>

      {/* Name & Color */}
      <div className="flex-1">
        <Label className="text-xs text-muted-foreground">
          {user.id === "user1" ? "用户 1" : "用户 2"}
        </Label>
        {isEditing ? (
          <div className="flex gap-2 mt-1">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSave()}
              autoFocus
              className="h-8"
            />
            <Button size="sm" onClick={handleSave}>
              保存
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-between mt-1">
            <span className="font-medium">{user.name}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Progress Color */}
      <div className="flex flex-col items-center gap-1">
        <Label className="text-[10px] text-muted-foreground">进度条</Label>
        <ColorPicker value={progressColor} onChange={handleColorChange} />
      </div>
    </div>
  );
}

function TemplateDialog({
  initialData,
  onSave,
  trigger,
}: {
  initialData?: ScheduleTemplate;
  onSave: (template: ScheduleTemplate) => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialData?.name || "");
  const [blocks, setBlocks] = useState<TimeBlock[]>(initialData?.blocks || []);

  // Reset form when dialog opens with initialData
  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setBlocks(initialData.blocks);
    } else if (open && !initialData) {
      setName("");
      setBlocks([]);
    }
  }, [open, initialData]);

  const handleAddBlock = () => {
    setBlocks([
      ...blocks,
      {
        id: nanoid(),
        startTime: "09:00",
        endTime: "10:00",
        label: "新时间段",
        category: "work",
      },
    ]);
  };

  const handleRemoveBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
  };

  const handleBlockChange = (
    id: string,
    field: keyof TimeBlock,
    value: string
  ) => {
    setBlocks(blocks.map((b) => (b.id === id ? { ...b, [field]: value } : b)));
  };

  const handleSave = () => {
    if (!name.trim()) return;

    onSave({
      id: initialData?.id || nanoid(),
      name: name.trim(),
      blocks,
      isDefault: initialData?.isDefault || false,
    });

    setOpen(false);
  };

  const categories = [
    { value: "routine", label: "日常" },
    { value: "meal", label: "用餐" },
    { value: "work", label: "工作/学习" },
    { value: "rest", label: "休息" },
    { value: "free", label: "自由时间" },
    { value: "sleep", label: "睡眠" },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" />
            新建模板
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "编辑模板" : "新建时间表模板"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>模板名称</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入模板名称"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>时间段</Label>
              <Button size="sm" variant="outline" onClick={handleAddBlock}>
                <Plus className="h-4 w-4 mr-1" />
                添加
              </Button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {blocks
                .sort((a, b) => a.startTime.localeCompare(b.startTime))
                .map((block) => (
                  <div
                    key={block.id}
                    className="flex items-center gap-2 p-2 border rounded"
                  >
                    <Input
                      type="time"
                      className="w-28"
                      value={block.startTime}
                      onChange={(e) =>
                        handleBlockChange(block.id, "startTime", e.target.value)
                      }
                    />
                    <span>-</span>
                    <Input
                      type="time"
                      className="w-28"
                      value={block.endTime}
                      onChange={(e) =>
                        handleBlockChange(block.id, "endTime", e.target.value)
                      }
                    />
                    <Input
                      className="flex-1"
                      value={block.label}
                      onChange={(e) =>
                        handleBlockChange(block.id, "label", e.target.value)
                      }
                      placeholder="名称"
                    />
                    <select
                      className="h-9 rounded-md border bg-background px-2 text-sm"
                      value={block.category}
                      onChange={(e) =>
                        handleBlockChange(block.id, "category", e.target.value)
                      }
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 shrink-0"
                      onClick={() => handleRemoveBlock(block.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              {blocks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  点击添加按钮创建时间段
                </p>
              )}
            </div>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={!name.trim()}>
            <Save className="h-4 w-4 mr-2" />
            {initialData ? "保存修改" : "创建模板"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PasswordManager({
  userId,
  userName,
  hasPassword,
  onUpdate,
}: {
  userId: UserId;
  userName: string;
  hasPassword: boolean;
  onUpdate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setIsEditing(false);
  };

  const handleSetPassword = async () => {
    if (newPassword.length < 4) {
      setError("密码至少需要4位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          newPassword,
          currentPassword: hasPassword ? currentPassword : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "设置失败");
        return;
      }

      onUpdate();
      resetForm();
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePassword = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/password", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          currentPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "移除失败");
        return;
      }

      onUpdate();
      resetForm();
    } catch {
      setError("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{userName}</span>
          {hasPassword ? (
            <Badge variant="default" className="gap-1">
              <Lock className="h-3 w-3" />
              已设置
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <LockOpen className="h-3 w-3" />
              未设置
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
        >
          {isEditing ? "取消" : hasPassword ? "修改" : "设置"}
        </Button>
      </div>

      {isEditing && (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
          {hasPassword && (
            <div className="space-y-2">
              <Label>当前密码</Label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="请输入当前密码"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>新密码</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="请输入新密码（至少4位）"
            />
          </div>
          <div className="space-y-2">
            <Label>确认新密码</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入新密码"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <Button
              onClick={handleSetPassword}
              disabled={loading || !newPassword || !confirmPassword || (hasPassword && !currentPassword)}
              className="flex-1"
            >
              {loading ? "处理中..." : hasPassword ? "更新密码" : "设置密码"}
            </Button>
            {hasPassword && (
              <Button
                variant="destructive"
                onClick={handleRemovePassword}
                disabled={loading || !currentPassword}
              >
                移除密码
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ExamManager({
  exams,
  onUpdate,
}: {
  exams: ExamCountdown[];
  onUpdate: (exams: ExamCountdown[]) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");

  const handleAdd = () => {
    if (!newName.trim() || !newDate) return;
    onUpdate([
      ...exams,
      { id: nanoid(), name: newName.trim(), date: newDate },
    ]);
    setNewName("");
    setNewDate("");
  };

  const handleDelete = (id: string) => {
    onUpdate(exams.filter((e) => e.id !== id));
  };

  const handleEdit = (exam: ExamCountdown) => {
    setEditingId(exam.id);
    setEditName(exam.name);
    setEditDate(exam.date);
  };

  const handleSaveEdit = () => {
    if (!editingId || !editName.trim() || !editDate) return;
    onUpdate(
      exams.map((e) =>
        e.id === editingId ? { ...e, name: editName.trim(), date: editDate } : e
      )
    );
    setEditingId(null);
    setEditName("");
    setEditDate("");
  };

  const sortedExams = [...exams].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          考试倒计时
        </CardTitle>
        <CardDescription>添加重要考试，在首页显示倒计时</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 添加新考试 */}
        <div className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="考试名称"
            className="flex-1"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Input
            type="date"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-40"
          />
          <Button onClick={handleAdd} disabled={!newName.trim() || !newDate}>
            <Plus className="h-4 w-4 mr-1" />
            添加
          </Button>
        </div>

        {/* 考试列表 */}
        {sortedExams.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">暂无考试</p>
        ) : (
          <div className="space-y-2">
            {sortedExams.map((exam) => (
              <div
                key={exam.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                {editingId === exam.id ? (
                  <div className="flex gap-2 flex-1 mr-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1"
                      autoFocus
                    />
                    <Input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-40"
                    />
                    <Button size="sm" onClick={handleSaveEdit}>
                      保存
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingId(null)}
                    >
                      取消
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{exam.name}</span>
                      <Badge variant="outline">{exam.date}</Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(exam)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(exam.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
