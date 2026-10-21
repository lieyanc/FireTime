import useSWR from "swr";
import type { ScheduleTemplate } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useTemplates() {
  const { data, error, isLoading, mutate } = useSWR<{
    templates: ScheduleTemplate[];
  }>("/api/templates", fetcher, { keepPreviousData: true });

  const templates = data?.templates || [];
  const defaultTemplate = templates.find((t) => t.isDefault) || templates[0];

  return {
    templates,
    defaultTemplate,
    isLoading,
    error,
    mutate,
  };
}
