import { describe, expect, it } from "vitest";
import { formatUsdc, usdc } from "./amount";
import { formatDateTime, formatDuration, formatRelative } from "./time";

describe("formatUsdc", () => {
  it.each([
    ["620000000", "620.00 USDC"],
    ["1240500000", "1,240.50 USDC"],
    ["0", "0.00 USDC"],
    ["1234567890123456", "1,234,567,890.12 USDC"],
  ])("formats %s as %s", (units, expected) => {
    expect(formatUsdc(units)).toBe(expected);
  });

  it("rounds half-up to the cent", () => {
    expect(formatUsdc("4999")).toBe("0.00 USDC"); // 0.004999
    expect(formatUsdc("5000")).toBe("0.01 USDC"); // 0.005
    expect(formatUsdc(7_255_000n)).toBe("7.26 USDC");
  });

  it("round-trips decimal strings written by hand", () => {
    expect(usdc("500")).toBe("500000000");
    expect(formatUsdc(usdc("1129.4"))).toBe("1,129.40 USDC");
  });
});

describe("time formatting", () => {
  it("formats absolute times with the time zone", () => {
    expect(formatDateTime("2026-10-22T10:20:30Z", "UTC")).toBe(
      "Oct 22, 2026, 10:20 AM UTC",
    );
  });

  it.each([
    [30_000, "under 1 min"],
    [45 * 60_000, "45 min"],
    [2 * 3_600_000, "2 h"],
    [2 * 3_600_000 + 5 * 60_000, "2 h 5 min"],
    [26 * 3_600_000, "1 d 2 h"],
    [3 * 86_400_000, "3 d"],
  ])("formats %d ms as %s", (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected);
  });

  it("formats relative times", () => {
    const now = Date.parse("2026-10-22T12:00:00Z");
    expect(formatRelative("2026-10-22T11:59:30Z", now)).toBe("just now");
    expect(formatRelative("2026-10-22T11:48:00Z", now)).toBe("12 min ago");
  });
});
