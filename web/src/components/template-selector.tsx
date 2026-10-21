import { useState } from "react";
import { nanoid } from "nanoid";
import { FileDown, ChevronDown, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTemplates } from "@/hooks/use-templates";
import type { ScheduleTemplate, TimeBlock } from "@/lib/types";

interface TemplateSelectorProps {
  currentSchedule: TimeBlock[];
  onApply: (blocks: TimeBlock[]) => void;
}

export function TemplateSelector({
  currentSchedule,
  onApply,
}: TemplateSelectorProps) {
  const { templates, defaultTemplate, isLoading } = useTemplates();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null);

  const handleSelect = (template: ScheduleTemplate) => {
    // 如果当前有时间表，先确认
    if (currentSchedule.length > 0) {
      setSelectedTemplate(template);
      setConfirmOpen(true);
    } else {
      applyTemplate(template);
    }
  };

  const applyTemplate = (template: ScheduleTemplate) => {
    // 生成新的 ID 避免冲突
    const newBlocks = template.blocks.map((block) => ({
      ...block,
      id: nanoid(),
    }));
    onApply(newBlocks);
    setConfirmOpen(false);
    setSelectedTemplate(null);
  };

  if (isLoading || templates.length === 0) {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1">
            <FileDown className="h-4 w-4" />
            应用模板
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {templates.map((template) => (
            <DropdownMenuItem
              key={template.id}
              onClick={() => handleSelect(template)}
              className="flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {template.isDefault && (
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                )}
                {template.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {template.blocks.length} 段
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>应用模板</AlertDialogTitle>
            <AlertDialogDescription>
              当前日期已有 {currentSchedule.length} 个时间段。
              应用模板「{selectedTemplate?.name}」将替换现有的所有时间段。
              此操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTemplate && applyTemplate(selectedTemplate)}
            >
              确认应用
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
