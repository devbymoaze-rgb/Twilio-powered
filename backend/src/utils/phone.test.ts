import { describe, expect, it } from "vitest";
import { isHelpKeyword, isStartKeyword, isStopKeyword, normalizePhone } from "./phone";

describe("normalizePhone", () => {
  it("adds +1 for 10-digit US numbers", () => {
    expect(normalizePhone("4155550100")).toBe("+14155550100");
  });

  it("keeps e164 numbers", () => {
    expect(normalizePhone("+44 7700 900123")).toBe("+447700900123");
  });
});

describe("compliance keywords", () => {
  it("detects STOP variants", () => {
    expect(isStopKeyword("stop")).toBe(true);
    expect(isStopKeyword("UNSUBSCRIBE")).toBe(true);
    expect(isStopKeyword("hello")).toBe(false);
  });

  it("detects HELP and START", () => {
    expect(isHelpKeyword("HELP")).toBe(true);
    expect(isStartKeyword("YES")).toBe(true);
  });
});
