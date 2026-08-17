import { describe, expect, it } from "vitest";
import { isStopKeyword } from "../utils/phone";

describe("opt-out safety", () => {
  it("never treats a normal reply as STOP", () => {
    expect(isStopKeyword("Can I book for Tuesday?")).toBe(false);
  });
});
