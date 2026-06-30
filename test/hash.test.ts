import { describe, expect, it } from "vitest";
import { HASH_WIDTH, entropy, hashLengthForLine, hashLine } from "../src/api.js";

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

  it("chooses visible hash lengths from trimmed length and entropy", () => {
    expect(hashLengthForLine("")).toBe(1);
    expect(hashLengthForLine("        }")).toBe(1);
    expect(hashLengthForLine("short")).toBe(2);
    expect(hashLengthForLine("aaaaaaaaaaaaaaaa")).toBe(2);
    expect(hashLengthForLine("const enabled = true;")).toBe(3);
    expect(hashLengthForLine("function parsePatchOp(line: string): PatchOp {")).toBe(4);
    expect(entropy(" alpha ")).toBe(entropy("alpha"));
  });
});
