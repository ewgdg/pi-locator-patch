import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hashLine } from "../src/api.js";
import { readHashTool } from "../src/tools/locator-read.js";

const makeTempDir = () => mkdtemp(join(tmpdir(), "pi-locator-patch-"));

const firstText = (result: Awaited<ReturnType<typeof readHashTool.execute>>) => {
  const content = result.content[0];
  if (content.type !== "text") {
    throw new Error("Expected first content item to be text");
  }
  return content.text;
};

describe("read_hash tool", () => {
  it("is agent-visible as read_hash and returns variable HASH│content rows", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "file.txt"), "short\nconst enabled = true;\nfunction parsePatchOp(line: string): PatchOp {\n");

    const result = await readHashTool.execute("tool-call", { path: "file.txt" }, undefined, undefined, { cwd: dir } as never);

    expect(readHashTool.name).toBe("read_hash");
    expect(firstText(result)).toBe([
      "short",
      `${hashLine("const enabled = true;").slice(0, 3)}│const enabled = true;`,
      `${hashLine("function parsePatchOp(line: string): PatchOp {")}│function parsePatchOp(line: string): PatchOp {`
    ].join("\n"));
  });
});
