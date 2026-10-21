import { useMemo } from "react";
import type { TimeBlock } from "@/lib/types";
import { getCurrentTime, isTimeInRange } from "@/lib/dates";
import { useClock } from "./use-clock";

export function useCurrentBlock(schedule: TimeBlock[]) {
  const currentTime = useClock();

  const currentBlock = useMemo(() => {
    return schedule.find((block) =>
      isTimeInRange(currentTime, block.startTime, block.endTime)
    );
  }, [schedule, currentTime]);

  const nextBlock = useMemo(() => {
    if (!schedule.length) return undefined;

    const sortedBlocks = [...schedule].sort((a, b) =>
      a.startTime.localeCompare(b.startTime)
    );

    const currentIndex = currentBlock
      ? sortedBlocks.findIndex((b) => b.id === currentBlock.id)
      : -1;

    if (currentIndex >= 0 && currentIndex < sortedBlocks.length - 1) {
      return sortedBlocks[currentIndex + 1];
    }

    // Find first block after current time
    const time = currentTime;
    return sortedBlocks.find((block) => block.startTime > time);
  }, [schedule, currentBlock, currentTime]);

  return { currentBlock, nextBlock, currentTime };
}
