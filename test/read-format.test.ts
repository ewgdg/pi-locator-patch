import { describe, expect, it } from "vitest";
import { hashLine, parseHashLine, renderHashLines, toHashLines } from "../src/api.js";

describe("read format", () => {
  it("renders exactly HASH│content rows with no counters", () => {
    const entries = toHashLines(["alpha", "", "alpha"]);
    expect(entries[0].hash).toBe(entries[2].hash);
    expect(renderHashLines(entries)).toBe(`${hashLine("alpha")}│alpha\n${hashLine("")}│\n${hashLine("alpha")}│alpha`);
  });

  it("parses content containing separator by splitting once", () => {
    const parsed = parseHashLine(`${hashLine("a│b")}│a│b`);
    expect(parsed).toEqual({ hash: hashLine("a│b"), content: "a│b" });
  });

  it("rejects malformed hashlines", () => {
    expect(() => parseHashLine("abc│bad width")).toThrow("[E_INVALID_PATCH]");
    expect(() => parseHashLine("abcd missing separator")).toThrow("[E_INVALID_PATCH]");
  });
});
