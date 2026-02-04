"use client";

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";
import { Label } from "./label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  presets?: string[];
  className?: string;
}

// Convert HEX to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Convert HSL to HEX
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (60 <= h && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (120 <= h && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (180 <= h && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (240 <= h && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else if (300 <= h && h < 360) {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const defaultPresets = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#14b8a6",
  "#6366f1",
  "#a855f7",
];

export function ColorPicker({
  value,
  onChange,
  presets = defaultPresets,
  className,
}: ColorPickerProps) {
  const [hexValue, setHexValue] = useState(value);
  const [hsl, setHsl] = useState(() => hexToHsl(value));

  useEffect(() => {
    setHexValue(value);
    setHsl(hexToHsl(value));
  }, [value]);

  const handleHexChange = useCallback(
    (hex: string) => {
      const cleanHex = hex.startsWith("#") ? hex : `#${hex}`;
      setHexValue(cleanHex);
      if (/^#[0-9A-Fa-f]{6}$/.test(cleanHex)) {
        setHsl(hexToHsl(cleanHex));
        onChange(cleanHex);
      }
    },
    [onChange]
  );

  const handleHslChange = useCallback(
    (field: "h" | "s" | "l", val: number) => {
      const newHsl = { ...hsl, [field]: val };
      setHsl(newHsl);
      const newHex = hslToHex(newHsl.h, newHsl.s, newHsl.l);
      setHexValue(newHex);
      onChange(newHex);
    },
    [hsl, onChange]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-9 h-9 rounded-md border-2 border-border transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            className
          )}
          style={{ backgroundColor: value }}
        />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <Tabs defaultValue="preset" className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-8">
            <TabsTrigger value="preset" className="text-xs">
              预设
            </TabsTrigger>
            <TabsTrigger value="hex" className="text-xs">
              HEX
            </TabsTrigger>
            <TabsTrigger value="hsl" className="text-xs">
              HSL
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preset" className="mt-3">
            <div className="grid grid-cols-6 gap-1.5">
              {presets.map((color) => (
                <button
                  key={color}
                  className={cn(
                    "w-8 h-8 rounded-md transition-all hover:scale-110",
                    value === color && "ring-2 ring-offset-2 ring-primary"
                  )}
                  style={{ backgroundColor: color }}
                  onClick={() => onChange(color)}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="hex" className="mt-3 space-y-3">
            <div className="flex items-center gap-2">
              <div
                className="w-10 h-10 rounded-md border shrink-0"
                style={{ backgroundColor: value }}
              />
              <div className="flex-1 space-y-1">
                <Label className="text-xs">HEX</Label>
                <Input
                  value={hexValue}
                  onChange={(e) => handleHexChange(e.target.value)}
                  placeholder="#000000"
                  className="h-8 font-mono text-sm"
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hsl" className="mt-3 space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-10 h-10 rounded-md border shrink-0"
                style={{ backgroundColor: value }}
              />
              <span className="font-mono text-xs text-muted-foreground">
                hsl({hsl.h}, {hsl.s}%, {hsl.l}%)
              </span>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-xs">色相 (H)</Label>
                  <span className="text-xs text-muted-foreground">{hsl.h}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={hsl.h}
                  onChange={(e) => handleHslChange("h", parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right,
                      hsl(0, ${hsl.s}%, ${hsl.l}%),
                      hsl(60, ${hsl.s}%, ${hsl.l}%),
                      hsl(120, ${hsl.s}%, ${hsl.l}%),
                      hsl(180, ${hsl.s}%, ${hsl.l}%),
                      hsl(240, ${hsl.s}%, ${hsl.l}%),
                      hsl(300, ${hsl.s}%, ${hsl.l}%),
                      hsl(360, ${hsl.s}%, ${hsl.l}%))`,
                  }}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-xs">饱和度 (S)</Label>
                  <span className="text-xs text-muted-foreground">{hsl.s}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hsl.s}
                  onChange={(e) => handleHslChange("s", parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right,
                      hsl(${hsl.h}, 0%, ${hsl.l}%),
                      hsl(${hsl.h}, 100%, ${hsl.l}%))`,
                  }}
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-xs">亮度 (L)</Label>
                  <span className="text-xs text-muted-foreground">{hsl.l}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={hsl.l}
                  onChange={(e) => handleHslChange("l", parseInt(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right,
                      hsl(${hsl.h}, ${hsl.s}%, 0%),
                      hsl(${hsl.h}, ${hsl.s}%, 50%),
                      hsl(${hsl.h}, ${hsl.s}%, 100%))`,
                  }}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
