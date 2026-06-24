import { describe, expect, it } from "vitest";
import { hashLine, parsePatch } from "../src/api.js";

const row = (prefix: " " | "-" | "+", content: string) => `${prefix}${hashLine(content)}│${content}`;

describe("patch parser", () => {
  it("accepts optional file headers and hash-only hunks", () => {
    const patch = parsePatch(["--- a/file", "+++ b/file", "@@ @@", row(" ", "ctx"), row("-", "old"), row("+", "new")].join("\n"));
    expect(patch.oldFile).toBe("a/file");
    expect(patch.newFile).toBe("b/file");
    expect(patch.hunks[0].ops.map((op) => op.kind)).toEqual(["context", "delete", "insert"]);
  });

  it("allows separator in operation content", () => {
    const patch = parsePatch(["@@ @@", row("+", "a│b")].join("\n"));
    expect(patch.hunks[0].ops[0].content).toBe("a│b");
  });

  it("rejects line-number hunk headers", () => {
    expect(() => parsePatch(`@@ -1,1 +1,1 @@\n${row(" ", "ctx")}`)).toThrow("[E_INVALID_PATCH]");
  });

  it("rejects bad hashes and hash/content mismatches", () => {
    expect(() => parsePatch("@@ @@\n abcd│ctx")).toThrow("[E_INVALID_PATCH]");
    expect(() => parsePatch("@@ @@\n a*c!│ctx")).toThrow("[E_INVALID_PATCH]");
    expect(() => parsePatch(`@@ @@\n+${hashLine("actual")}│different`)).toThrow("[E_INVALID_PATCH]");
  });

  it("rejects multiple file sections", () => {
    const patch = ["--- a", "+++ b", "@@ @@", row(" ", "ctx"), "--- c", "+++ d"].join("\n");
    expect(() => parsePatch(patch)).toThrow("[E_INVALID_PATCH]");
  });
});
