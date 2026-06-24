import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hashLine } from "../src/api.js";
import {
  assertHashlineOutputFits,
  LLM_VISIBLE_OUTPUT_MAX_BYTES,
  LLM_VISIBLE_OUTPUT_MAX_LINES
} from "../src/output-size.js";
import { hashlinePatchTool } from "../src/tools/hashline-patch.js";
import { hashlineReadTool } from "../src/tools/hashline-read.js";

const makeTempDir = () => mkdtemp(join(tmpdir(), "pi-hashline-patch-"));
const row = (prefix: " " | "-" | "+", content: string) => `${prefix}${hashLine(content)}│${content}`;
const renderedRow = (content: string) => `${hashLine(content)}│${content}`;
const oversizedContent = () => "x".repeat(LLM_VISIBLE_OUTPUT_MAX_BYTES + 1);
const oneOverLineCap = () => Array.from({ length: LLM_VISIBLE_OUTPUT_MAX_LINES + 1 }, (_, index) => `line-${index}`);

describe("tool output size guards", () => {
  it("rejects hashline_read output for one overlarge line with pagination guidance", async () => {
    const dir = await makeTempDir();
    const file = join(dir, "large.txt");
    await writeFile(file, oversizedContent());

    await expect(
      hashlineReadTool.execute("tool-call", { path: "large.txt", limit: 1 }, undefined, undefined, { cwd: dir } as never)
    ).rejects.toThrow(/\[E_OUTPUT_TOO_LARGE\].*lower limit.*offset/);
  });

  it("rejects hashline_read output when rendered rows exceed the visible line cap", () => {
    const rows = oneOverLineCap();
    const rendered = rows.map(renderedRow).join("\n");

    expect(() => assertHashlineOutputFits("hashline_read", rendered, rows.length)).toThrow(
      /\[E_OUTPUT_TOO_LARGE\].*lines.*lower limit.*offset/
    );
  });

  it("rejects oversized hashline_patch success output before writing", async () => {
    const dir = await makeTempDir();
    const file = join(dir, "file.txt");
    await writeFile(file, "old");
    const hugeReplacement = oversizedContent();
    const diff = ["@@ @@", row("-", "old"), row("+", hugeReplacement)].join("\n");

    await expect(
      hashlinePatchTool.execute("tool-call", { path: "file.txt", patch: diff }, undefined, undefined, { cwd: dir } as never)
    ).rejects.toThrow(/\[E_OUTPUT_TOO_LARGE\].*No file was written/);
    await expect(readFile(file, "utf8")).resolves.toBe("old");
  });

  it("rejects hashline_patch output over the line cap before writing", async () => {
    const dir = await makeTempDir();
    const file = join(dir, "file.txt");
    await writeFile(file, "old");
    const insertedRows = oneOverLineCap();
    const diff = ["@@ @@", row("-", "old"), ...insertedRows.map((content) => row("+", content))].join("\n");

    await expect(
      hashlinePatchTool.execute("tool-call", { path: "file.txt", patch: diff }, undefined, undefined, { cwd: dir } as never)
    ).rejects.toThrow(/\[E_OUTPUT_TOO_LARGE\].*lines.*No file was written/);
    await expect(readFile(file, "utf8")).resolves.toBe("old");
  });
});
