import { describe, expect, it } from "vitest";
import { HASH_WIDTH, hashLine } from "../src/api.js";

describe("hashLine", () => {
  it("returns stable pure 4-character base64url hashes", () => {
    const first = hashLine("same content");
    expect(first).toBe(hashLine("same content"));
    expect(first).toHaveLength(HASH_WIDTH);
    expect(first).toMatch(/^[A-Za-z0-9_-]{4}$/);
    expect(first).not.toContain("=");
  });

  it("hashes duplicate content identically regardless of position", () => {
    const lines = ["dup", "other", "dup"];
    expect(lines.map(hashLine)).toEqual([hashLine("dup"), hashLine("other"), hashLine("dup")]);
  });

  it("supports unicode content", () => {
    expect(hashLine("雪│line🙂")).toMatch(/^[A-Za-z0-9_-]{4}$/);
  });
});
