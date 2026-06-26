import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hashLine } from "../src/api.js";
import { readTool } from "../src/tools/hashline-read.js";

const makeTempDir = () => mkdtemp(join(tmpdir(), "pi-hashline-patch-"));
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lJ3rZQAAAABJRU5ErkJggg==",
  "base64"
);

const firstText = (result: Awaited<ReturnType<typeof readTool.execute>>) => {
  const content = result.content[0];
  if (content.type !== "text") {
    throw new Error("Expected first content item to be text");
  }
  return content.text;
};

describe("read tool", () => {
  it("is agent-visible as read and returns plain content for text files by default", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "file.txt"), "alpha\nbeta\n");

    const result = await readTool.execute("tool-call", { path: "file.txt" }, undefined, undefined, { cwd: dir } as never);

    expect(readTool.name).toBe("read");
    expect(firstText(result)).toBe("alpha\nbeta");
  });

  it("returns variable HASH│content rows when includeHashes is true", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "file.txt"), "short\nconst enabled = true;\nfunction parsePatchOp(line: string): PatchOp {\n");

    const result = await readTool.execute("tool-call", { path: "file.txt", includeHashes: true }, undefined, undefined, { cwd: dir } as never);

    expect(firstText(result)).toBe([
      "short",
      `${hashLine("const enabled = true;").slice(0, 3)}│const enabled = true;`,
      `${hashLine("function parsePatchOp(line: string): PatchOp {")}│function parsePatchOp(line: string): PatchOp {`
    ].join("\n"));
  });

  it("delegates supported images to Pi's built-in read behavior", async () => {
    const dir = await makeTempDir();
    await writeFile(join(dir, "image.png"), tinyPng);

    const result = await readTool.execute("tool-call", { path: "image.png" }, undefined, undefined, { cwd: dir } as never);

    expect(firstText(result)).toContain("Read image file [image/png]");
    expect(firstText(result)).not.toContain("│");
  });
});
