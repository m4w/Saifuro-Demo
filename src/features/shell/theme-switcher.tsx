"use client";

import { useSyncExternalStore } from "react";
import { MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { readTheme, setTheme, subscribeToTheme, type Theme } from "./theme";

const options: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: "system", label: "System", icon: MonitorIcon },
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
];

/** Native radio buttons styled as a segmented control: arrow keys work out of the box. */
export function ThemeSwitcher() {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    readTheme,
    () => "system" as Theme,
  );
  return (
    <fieldset>
      <legend className="mb-1.5 text-xs font-medium text-text-muted">
        Theme
      </legend>
      <div className="grid grid-cols-3 gap-0.5 rounded-md border border-border bg-surface-muted p-0.5">
        {options.map(({ value, label, icon: Icon }) => (
          <label
            key={value}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-1 rounded px-1.5 py-1 text-xs",
              "has-focus-visible:outline-2 has-focus-visible:outline-focus",
              theme === value
                ? "bg-surface font-medium text-text shadow-sm"
                : "text-text-muted hover:text-text",
            )}
          >
            <input
              type="radio"
              name="theme"
              value={value}
              checked={theme === value}
              onChange={() => setTheme(value)}
              className="sr-only"
            />
            <Icon size={14} />
            {label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
