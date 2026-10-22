import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Reads the tokens from globals.css and checks WCAG AA contrast in both themes.
const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const tokens = new Map<string, { light: string; dark: string }>();
for (const [, name, light, dark] of css.matchAll(
  /--color-([\w-]+):\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\)/gi,
)) {
  tokens.set(name!, { light: light!, dark: dark! });
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const surfaces = ["canvas", "surface", "surface-muted"];
// [foreground, background, minimum ratio]
const pairs: [string, string, number][] = [
  ...surfaces.flatMap((bg) => [
    ["text", bg, 4.5] as [string, string, number],
    ["text-muted", bg, 4.5] as [string, string, number],
    ["accent", bg, 4.5] as [string, string, number], // links
    ["focus", bg, 3] as [string, string, number], // focus ring
    ["border-strong", bg, 3] as [string, string, number], // form control edges
  ]),
  ["on-accent", "accent", 4.5],
  ["on-accent", "accent-hover", 4.5],
  ["on-danger", "danger", 4.5],
  ["on-danger", "danger-hover", 4.5],
  ...["success", "warning", "danger", "info", "neutral"].flatMap((tone) => [
    [tone, `${tone}-soft`, 4.5] as [string, string, number],
    [tone, "surface", 4.5] as [string, string, number],
    // Alerts put regular and muted text on the soft tone backgrounds.
    ["text", `${tone}-soft`, 4.5] as [string, string, number],
    ["text-muted", `${tone}-soft`, 4.5] as [string, string, number],
  ]),
];

describe("theme tokens", () => {
  it("are all parsed from globals.css", () => {
    expect(tokens.size).toBeGreaterThan(20);
  });

  for (const theme of ["light", "dark"] as const) {
    it.each(pairs)(`${theme}: %s on %s meets %d:1`, (fg, bg, min) => {
      const f = tokens.get(fg);
      const b = tokens.get(bg);
      expect(f, fg).toBeDefined();
      expect(b, bg).toBeDefined();
      expect(contrast(f![theme], b![theme])).toBeGreaterThanOrEqual(min);
    });
  }
});
