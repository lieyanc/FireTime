import { useState, useEffect } from "react";
import { formatTime } from "@/lib/dates";

export function useClock() {
  const [time, setTime] = useState(() => {
    const now = new Date();
    return formatTime(now.getHours(), now.getMinutes());
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setTime(formatTime(now.getHours(), now.getMinutes()));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return time;
}

export function useFullClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return time;
}
